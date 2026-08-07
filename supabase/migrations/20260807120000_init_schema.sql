-- =============================================================================
-- La Aldea en Disputa — Migración 001: esquema, catálogos y RLS
-- Ref: docs/ARCHITECTURE.md §2 (modelo de datos), §3 (seguridad y RLS), §8 paso 1
-- =============================================================================
-- Principio rector (ARCHITECTURE §1): server-authoritative.
-- Ninguna tabla de juego admite INSERT/UPDATE/DELETE desde el rol `authenticated`.
-- Toda escritura ocurre dentro de RPCs SECURITY DEFINER (migración siguiente).
-- Al habilitar RLS sin políticas de escritura, Postgres las deniega por defecto.
-- =============================================================================

create extension if not exists "pgcrypto";

-- =============================================================================
-- 1. CATÁLOGOS ESTÁTICOS (seed tables — ARCHITECTURE §2.2)
--    Fuente de verdad de costos/efectos: el servidor, no el cliente.
-- =============================================================================

-- 1.1 Personajes (GAME_DESIGN §7)
create table public.characters_catalog (
  key             text primary key,
  name            text not null,
  passive_key     text not null,           -- identificador que las RPCs conmutan
  passive_text    text not null,           -- copy para la UI
  path            text not null check (path in ('constructor','acumulador','superviviente','saboteador')),
  storage_limit   int  not null default 10 -- 15 para afinidad Acumuladora (GAME_DESIGN §3.3)
);

-- 1.2 Construcciones (GAME_DESIGN §4.2)
create table public.buildings_catalog (
  key             text primary key,
  name            text not null,
  tier            text not null check (tier in ('basico','intermedio','avanzado')),
  cost_wood       int  not null default 0 check (cost_wood  >= 0),
  cost_stone      int  not null default 0 check (cost_stone >= 0),
  cost_gold       int  not null default 0 check (cost_gold  >= 0),
  cost_food       int  not null default 0 check (cost_food  >= 0),
  points          int  not null check (points between 1 and 5),
  -- Bonus de producción por ronda mientras el edificio no esté pausado
  prod_wood       int  not null default 0,
  prod_stone      int  not null default 0,
  prod_gold       int  not null default 0,
  prod_food       int  not null default 0,
  effect_key      text null,               -- 'muralla' | 'torre_vigilancia' | 'mercado' | 'fortaleza'
  copies          int  not null default 1 check (copies >= 1), -- ejemplares en el mazo
  description     text not null
);

-- Un edificio "otorga bonus de producción" si alguna prod_* > 0 (usado por misiones)
create view public.buildings_with_production as
  select key from public.buildings_catalog
   where prod_wood + prod_stone + prod_gold + prod_food > 0;

-- 1.3 Misiones secretas (GAME_DESIGN §8) — todas +5 pts, sin niveles de dificultad
create table public.missions_catalog (
  key             text primary key,
  name            text not null,
  description     text not null,
  points          int  not null default 5 check (points = 5),
  check_key       text not null            -- identificador de la función de verificación
);

-- 1.4 Mazo de producción (GAME_DESIGN §3.2)
create table public.production_cards (
  key             text primary key,
  name            text not null,
  wood            int not null default 0 check (wood  >= 0),
  stone           int not null default 0 check (stone >= 0),
  gold            int not null default 0 check (gold  >= 0),
  food            int not null default 0 check (food  >= 0),
  copies          int not null default 1 check (copies >= 1)
);

-- Escalado por nº de jugadores (GAME_DESIGN §3.2: menos jugadores => menos producción).
-- `total_delta` se aplica al recurso más abundante de la carta revelada; en empate,
-- prioridad madera > comida > piedra > oro. Lo aplica resolve_round, nunca el cliente.
create table public.production_scaling (
  min_players     int primary key check (min_players between 2 and 8),
  max_players     int not null    check (max_players between 2 and 8),
  total_delta     int not null,
  note            text not null,
  check (max_players >= min_players)
);

-- =============================================================================
-- 2. PERFILES Y ESTADÍSTICAS
-- =============================================================================

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nickname    text not null check (char_length(nickname) between 2 and 16),
  created_at  timestamptz not null default now()
);

create table public.user_stats (
  user_id            uuid primary key references public.profiles(id) on delete cascade,
  games_played       int  not null default 0,
  games_won          int  not null default 0,
  -- winrate se calcula, no se guarda (ARCHITECTURE §2.1)
  favorite_character text null references public.characters_catalog(key),
  best_character     text null references public.characters_catalog(key),
  most_used_path     text null check (most_used_path in ('constructor','acumulador','superviviente','saboteador')),
  updated_at         timestamptz not null default now()
);

-- =============================================================================
-- 3. SALAS
-- =============================================================================

create table public.rooms (
  id                      uuid primary key default gen_random_uuid(),
  code                    text unique not null check (code ~ '^[A-Z0-9]{4,6}$'),
  host_id                 uuid not null references public.profiles(id),
  status                  text not null default 'lobby' check (status in ('lobby','playing','finished')),
  max_players             int  not null check (max_players between 2 and 8),
  target_points           int  not null check (target_points > 0),
  max_rounds              int  not null check (max_rounds > 0),
  decision_timer_seconds  int  not null check (decision_timer_seconds in (30,45,60)),
  created_at              timestamptz not null default now()
);

create table public.room_players (
  room_id   uuid not null references public.rooms(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index room_players_user_idx on public.room_players(user_id);

-- =============================================================================
-- 4. PARTIDAS
-- =============================================================================

create table public.games (
  id             uuid primary key default gen_random_uuid(),
  room_id        uuid not null references public.rooms(id) on delete cascade,
  status         text not null default 'assigning' check (status in ('assigning','playing','finished')),
  current_round  int  not null default 0,
  round_phase    text null check (round_phase in ('production','decision','reveal','resolution')),
  round_deadline timestamptz null,
  winner_id      uuid null references public.profiles(id),
  started_at     timestamptz not null default now(),
  finished_at    timestamptz null
);
create index games_room_idx on public.games(room_id);
-- Usado por el cron/Edge Function que cierra rondas vencidas (ARCHITECTURE §5)
create index games_deadline_idx on public.games(round_deadline)
  where status = 'playing';

create table public.game_players (
  game_id               uuid not null references public.games(id) on delete cascade,
  user_id               uuid not null references public.profiles(id) on delete cascade,
  character_key         text not null references public.characters_catalog(key),
  -- Recursos: el tope (10, o 15 en afinidad Acumuladora) se valida en las RPCs
  wood                  int  not null default 0 check (wood  >= 0),
  stone                 int  not null default 0 check (stone >= 0),
  gold                  int  not null default 0 check (gold  >= 0),
  food                  int  not null default 0 check (food  >= 0),
  points                int  not null default 0,
  connected             bool not null default true,
  -- Flags de estado por efectos
  blocked_next_round    bool not null default false, -- Bloqueo temporal
  guardian_shield_used  bool not null default false, -- pasiva de La Guardiana
  nomad_double_used     bool not null default false, -- habilidad única del Nómada
  -- Preferencia de comeback (ARCHITECTURE §4): evita una fase extra de input
  comeback_preference   text null check (comeback_preference in ('wood','stone','gold','food')),
  primary key (game_id, user_id),
  -- Personajes nunca se repiten en una misma partida (GAME_DESIGN §2.3)
  unique (game_id, character_key)
);
create index game_players_user_idx on public.game_players(user_id);

-- Misión secreta en tabla separada (ARCHITECTURE §3, Opción A recomendada):
-- RLS no oculta columnas, así que la misión vive fuera de game_players.
create table public.player_missions (
  game_id      uuid not null references public.games(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  mission_key  text not null references public.missions_catalog(key),
  completed    bool not null default false,
  primary key (game_id, user_id)
);

create table public.game_buildings (
  id                 uuid primary key default gen_random_uuid(),
  game_id            uuid not null references public.games(id) on delete cascade,
  user_id            uuid not null references public.profiles(id) on delete cascade,
  building_key       text not null references public.buildings_catalog(key),
  paused_until_round int null,              -- Daño a estructura
  built_at_round     int not null,
  -- Cargas de defensa consumibles (Muralla: inmune a 1 robo)
  shield_charges     int not null default 0 check (shield_charges >= 0)
);
create index game_buildings_owner_idx on public.game_buildings(game_id, user_id);

-- Mercado visible (6 slots) y mazo restante
create table public.game_market (
  game_id      uuid not null references public.games(id) on delete cascade,
  slot         int  not null check (slot between 0 and 5),
  building_key text null references public.buildings_catalog(key), -- NULL = mazo agotado
  primary key (game_id, slot)
);

create table public.game_deck (
  game_id      uuid not null references public.games(id) on delete cascade,
  building_key text not null references public.buildings_catalog(key),
  position     int  not null,               -- orden barajado
  primary key (game_id, position)
);

-- Mazo de producción barajado por partida (evita repetir cartas al azar puro)
create table public.game_production_deck (
  game_id      uuid not null references public.games(id) on delete cascade,
  card_key     text not null references public.production_cards(key),
  position     int  not null,
  primary key (game_id, position)
);

-- =============================================================================
-- 5. RONDA: DECISIONES, COOLDOWNS Y EVENTOS
-- =============================================================================

create table public.round_actions (
  game_id          uuid not null references public.games(id) on delete cascade,
  round            int  not null,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  build_key        text null references public.buildings_catalog(key),
  build_slot       int  null check (build_slot between 0 and 5),
  -- Habilidad única del Nómada: 2ª construcción en la misma ronda
  build_key_2      text null references public.buildings_catalog(key),
  build_slot_2     int  null check (build_slot_2 between 0 and 5),
  sabotage_type    text null check (sabotage_type in ('steal','block','damage','spy')),
  sabotage_target  uuid null references public.profiles(id),
  sabotage_params  jsonb null,              -- {resource:'gold'} | {building_id:...}
  confirmed_at     timestamptz not null default now(),
  primary key (game_id, round, user_id),
  -- Máx 1 construcción + 1 sabotaje: la coherencia fina la valida submit_action
  check ((build_key is null) = (build_slot is null)),
  check ((build_key_2 is null) = (build_slot_2 is null)),
  check (build_key_2 is null or build_key is not null),
  check ((sabotage_type is null) = (sabotage_target is null))
);

create table public.sabotage_cooldowns (
  game_id              uuid not null references public.games(id) on delete cascade,
  user_id              uuid not null references public.profiles(id) on delete cascade,
  sabotage_type        text not null check (sabotage_type in ('steal','block','damage','spy')),
  available_from_round int  not null,
  primary key (game_id, user_id, sabotage_type)
);

create table public.round_events (
  id         bigserial primary key,
  game_id    uuid not null references public.games(id) on delete cascade,
  round      int  not null,
  type       text not null check (type in (
               'production','build','steal','block','damage','spy_private',
               'points','mission','comeback','game_end')),
  actor_id   uuid null references public.profiles(id),
  target_id  uuid null references public.profiles(id),
  payload    jsonb not null default '{}'::jsonb,
  visibility text not null check (visibility in ('public','private')),
  created_at timestamptz not null default now()
);
create index round_events_game_round_idx on public.round_events(game_id, round, id);

-- =============================================================================
-- 6. HELPERS DE AUTORIZACIÓN
--    SECURITY DEFINER => no re-evalúan RLS, evitando recursión en las políticas.
-- =============================================================================

create or replace function public.is_game_participant(p_game_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from game_players
     where game_id = p_game_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_room_member(p_room_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from room_players
     where room_id = p_room_id and user_id = auth.uid()
  );
$$;

create or replace function public.game_is_finished(p_game_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from games where id = p_game_id and status = 'finished');
$$;

create or replace function public.game_current_round(p_game_id uuid)
returns int language sql stable security definer set search_path = public as $$
  select current_round from games where id = p_game_id;
$$;

-- =============================================================================
-- 7. RLS (ARCHITECTURE §3)
-- =============================================================================

alter table public.characters_catalog  enable row level security;
alter table public.buildings_catalog   enable row level security;
alter table public.missions_catalog    enable row level security;
alter table public.production_cards    enable row level security;
alter table public.production_scaling  enable row level security;
alter table public.profiles            enable row level security;
alter table public.user_stats          enable row level security;
alter table public.rooms               enable row level security;
alter table public.room_players        enable row level security;
alter table public.games               enable row level security;
alter table public.game_players        enable row level security;
alter table public.player_missions     enable row level security;
alter table public.game_buildings      enable row level security;
alter table public.game_market         enable row level security;
alter table public.game_deck           enable row level security;
alter table public.game_production_deck enable row level security;
alter table public.round_actions       enable row level security;
alter table public.sabotage_cooldowns  enable row level security;
alter table public.round_events        enable row level security;

-- 7.1 Catálogos: lectura pública (el cliente los usa para renderizar)
create policy catalog_read on public.characters_catalog for select using (true);
create policy catalog_read on public.buildings_catalog  for select using (true);
create policy catalog_read on public.missions_catalog   for select using (true);
create policy catalog_read on public.production_cards   for select using (true);
create policy catalog_read on public.production_scaling for select using (true);

-- 7.2 Perfiles y stats: públicos (leaderboard). El nickname propio es editable.
create policy profiles_read      on public.profiles  for select using (true);
create policy profiles_own_write on public.profiles  for update
  using (id = auth.uid()) with check (id = auth.uid());
create policy user_stats_read    on public.user_stats for select using (true);

-- 7.3 Salas: visibles para sus miembros (el join por código pasa por RPC)
create policy rooms_read on public.rooms for select
  using (public.is_room_member(id) or host_id = auth.uid());
create policy room_players_read on public.room_players for select
  using (public.is_room_member(room_id));

-- 7.4 Partida: estado público entre participantes
create policy games_read on public.games for select
  using (public.is_game_participant(id));
create policy game_players_read on public.game_players for select
  using (public.is_game_participant(game_id));
create policy game_buildings_read on public.game_buildings for select
  using (public.is_game_participant(game_id));
create policy game_market_read on public.game_market for select
  using (public.is_game_participant(game_id));
create policy sabotage_cooldowns_read on public.sabotage_cooldowns for select
  using (public.is_game_participant(game_id));

-- 7.5 Mazos: SIN política de lectura. Ver el mazo es ver el futuro del mercado.
--     (RLS habilitada + cero políticas = nadie lee salvo SECURITY DEFINER.)

-- 7.6 Misión secreta: solo el dueño, hasta que la partida termina (GAME_DESIGN §8.1)
create policy player_missions_read on public.player_missions for select
  using (user_id = auth.uid() or public.game_is_finished(game_id));

-- 7.7 Decisiones: propias siempre; ajenas solo de rondas ya reveladas
create policy round_actions_read on public.round_actions for select
  using (
    user_id = auth.uid()
    or (public.is_game_participant(game_id)
        and round < public.game_current_round(game_id))
  );

-- 7.8 Eventos: públicos para participantes; los privados (espionaje) solo al actor.
--     La víctima del espionaje nunca ve nada (GAME_DESIGN §5.3).
create policy round_events_read on public.round_events for select
  using (
    (visibility = 'public' and public.is_game_participant(game_id))
    or actor_id = auth.uid()
  );

-- 7.9 Escrituras: ninguna política de INSERT/UPDATE/DELETE en tablas de juego.
--     Además, revocamos privilegios de tabla para que ni un fallo de política abra
--     una escritura directa. Las RPCs corren como owner (SECURITY DEFINER).
revoke insert, update, delete on all tables in schema public from anon, authenticated;
grant  update (nickname) on public.profiles to authenticated;

-- =============================================================================
-- 8. ALTA DE PERFIL AL REGISTRARSE
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nickname)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'nickname',''), 'Aldeano' || substr(new.id::text, 1, 4))
  )
  on conflict (id) do nothing;

  insert into public.user_stats (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- 9. REALTIME (ARCHITECTURE §5) — Postgres Changes sobre el estado de partida
-- =============================================================================

alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.game_players;
alter publication supabase_realtime add table public.game_market;
alter publication supabase_realtime add table public.game_buildings;
alter publication supabase_realtime add table public.round_events;
alter publication supabase_realtime add table public.room_players;
alter publication supabase_realtime add table public.rooms;
