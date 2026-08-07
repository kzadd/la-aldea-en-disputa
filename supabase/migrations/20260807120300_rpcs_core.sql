-- =============================================================================
-- Paso 2 — RPCs core (ARCHITECTURE §4, §8 paso 2)
-- create_room · join_room · leave_room · start_game · submit_action
-- resolve_round (versión mínima: construir + robar) · finish_game · tick_games
--
-- Todas SECURITY DEFINER y transaccionales. El cliente solo envía intenciones.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Ajustes de esquema que el motor de resolución necesita
-- -----------------------------------------------------------------------------

-- Desglose de puntos por camino (GAME_DESIGN §4.3), para el resumen final y
-- para `user_stats.most_used_path`.
alter table public.game_players
  add column if not exists pts_buildings   int not null default 0,
  add column if not exists pts_accumulator int not null default 0,
  add column if not exists pts_survivor    int not null default 0,
  add column if not exists pts_saboteur    int not null default 0,
  add column if not exists pts_mission     int not null default 0,
  add column if not exists dominant_path   text null;

-- "X ya confirmó" (ARCHITECTURE §5): solo el hecho, nunca el contenido.
create table if not exists public.round_confirmations (
  game_id      uuid not null references public.games(id) on delete cascade,
  round        int  not null,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  confirmed_at timestamptz not null default now(),
  primary key (game_id, round, user_id)
);
alter table public.round_confirmations enable row level security;
create policy round_confirmations_read on public.round_confirmations for select
  using (public.is_game_participant(game_id));
grant select on public.round_confirmations to authenticated;
alter publication supabase_realtime add table public.round_confirmations;

-- -----------------------------------------------------------------------------
-- 1. Helpers internos (prefijo _ : no son API para el cliente)
-- -----------------------------------------------------------------------------

-- Duración de la fase de revelación (GAME_DESIGN §6: 5-8 seg)
create or replace function public._reveal_seconds() returns int
language sql immutable as $$ select 7 $$;

create or replace function public._storage_limit(p_character text) returns int
language sql stable security definer set search_path = public as $$
  select storage_limit from characters_catalog where key = p_character;
$$;

-- Costo efectivo de una construcción para un personaje (pasiva del Herrero)
create or replace function public._building_cost(p_building text, p_character text)
returns table (wood int, stone int, gold int, food int)
language sql stable security definer set search_path = public as $$
  select b.cost_wood,
         greatest(0, b.cost_stone - case when p_character = 'herrero' then 1 else 0 end),
         b.cost_gold,
         b.cost_food
    from buildings_catalog b
   where b.key = p_building;
$$;

create or replace function public._sabotage_cost(p_type text)
returns table (wood int, stone int, gold int, food int)
language sql immutable as $$
  -- GAME_DESIGN §5.2
  select t.w, t.s, t.g, t.f from (values
    ('steal',  2,0,0,0),
    ('block',  0,3,1,0),
    ('damage', 0,0,3,0),
    ('spy',    0,0,1,1)
  ) t(k,w,s,g,f) where t.k = p_type;
$$;

create or replace function public._sabotage_cooldown(p_type text) returns int
language sql immutable as $$
  select case when p_type = 'spy' then 1 else 2 end;  -- GAME_DESIGN §5.2
$$;

create or replace function public._ev(
  p_game uuid, p_round int, p_type text, p_actor uuid, p_target uuid,
  p_payload jsonb, p_visibility text default 'public'
) returns void
language sql security definer set search_path = public as $$
  insert into round_events (game_id, round, type, actor_id, target_id, payload, visibility)
  values (p_game, p_round, p_type, p_actor, p_target, coalesce(p_payload,'{}'::jsonb), p_visibility);
$$;

-- -----------------------------------------------------------------------------
-- 2. SALAS
-- -----------------------------------------------------------------------------

create or replace function public.create_room(
  p_max_players int,
  p_target_points int,
  p_max_rounds int,
  p_decision_timer_seconds int
) returns public.rooms
language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_code text;
  v_room rooms;
  v_alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- sin I, L, O, 0, 1
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  if p_max_players not between 2 and 8 then raise exception 'max_players debe estar entre 2 y 8'; end if;
  if p_decision_timer_seconds not in (30,45,60) then raise exception 'Timer inválido'; end if;
  if p_target_points <= 0 or p_max_rounds <= 0 then raise exception 'Condición de victoria inválida'; end if;

  loop
    v_code := '';
    for i in 1..5 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from rooms where code = v_code);
  end loop;

  insert into rooms (code, host_id, max_players, target_points, max_rounds, decision_timer_seconds)
  values (v_code, v_uid, p_max_players, p_target_points, p_max_rounds, p_decision_timer_seconds)
  returning * into v_room;

  insert into room_players (room_id, user_id) values (v_room.id, v_uid);
  return v_room;
end;
$$;

create or replace function public.join_room(p_code text)
returns public.rooms
language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_room rooms;
  v_count int;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;

  select * into v_room from rooms where code = upper(trim(p_code)) for update;
  if not found then raise exception 'Sala no encontrada'; end if;
  if v_room.status <> 'lobby' then raise exception 'La partida ya empezó'; end if;

  if exists (select 1 from room_players where room_id = v_room.id and user_id = v_uid) then
    return v_room;  -- reingreso idempotente
  end if;

  select count(*) into v_count from room_players where room_id = v_room.id;
  if v_count >= v_room.max_players then raise exception 'Sala llena'; end if;

  insert into room_players (room_id, user_id) values (v_room.id, v_uid);
  return v_room;
end;
$$;

create or replace function public.leave_room(p_room_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_room rooms;
  v_next uuid;
begin
  select * into v_room from rooms where id = p_room_id for update;
  if not found then return; end if;
  if v_room.status <> 'lobby' then raise exception 'No se puede salir de una partida en curso'; end if;

  delete from room_players where room_id = p_room_id and user_id = v_uid;

  select user_id into v_next from room_players
   where room_id = p_room_id order by joined_at limit 1;

  if v_next is null then
    delete from rooms where id = p_room_id;          -- sala vacía
  elsif v_room.host_id = v_uid then
    update rooms set host_id = v_next where id = p_room_id;  -- traspaso de host
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. INICIO DE PARTIDA
-- -----------------------------------------------------------------------------

create or replace function public.start_game(p_room_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_room    rooms;
  v_game_id uuid;
  v_n       int;
begin
  select * into v_room from rooms where id = p_room_id for update;
  if not found then raise exception 'Sala no encontrada'; end if;
  if v_room.host_id <> v_uid then raise exception 'Solo el host puede iniciar'; end if;
  if v_room.status <> 'lobby' then raise exception 'La partida ya empezó'; end if;

  select count(*) into v_n from room_players where room_id = p_room_id;
  if v_n < 2 then raise exception 'Se necesitan al menos 2 jugadores'; end if;

  insert into games (room_id, status, current_round, round_phase)
  values (p_room_id, 'assigning', 1, 'production')
  returning id into v_game_id;

  update rooms set status = 'playing' where id = p_room_id;

  -- Personajes: sorteo sin repetir (GAME_DESIGN §2.3)
  insert into game_players (game_id, user_id, character_key)
  select v_game_id, p.user_id, c.key
    from (select user_id, row_number() over (order by random()) rn
            from room_players where room_id = p_room_id) p
    join (select key, row_number() over (order by random()) rn
            from characters_catalog) c using (rn);

  -- Misiones secretas: 1 por jugador, sin repetir dentro de la partida (§8.1)
  insert into player_missions (game_id, user_id, mission_key)
  select v_game_id, p.user_id, m.key
    from (select user_id, row_number() over (order by random()) rn
            from room_players where room_id = p_room_id) p
    join (select key, row_number() over (order by random()) rn
            from missions_catalog) m using (rn);

  -- Mazo de construcciones barajado (expandiendo `copies`)
  insert into game_deck (game_id, building_key, position)
  select v_game_id, key, row_number() over (order by random()) - 1
    from buildings_catalog b, generate_series(1, b.copies);

  -- Mercado: 6 slots servidos desde el tope del mazo
  insert into game_market (game_id, slot, building_key)
  select v_game_id, position, building_key
    from game_deck where game_id = v_game_id and position < 6;
  delete from game_deck where game_id = v_game_id and position < 6;

  -- Mazo de producción barajado
  insert into game_production_deck (game_id, card_key, position)
  select v_game_id, key, row_number() over (order by random()) - 1
    from production_cards c, generate_series(1, c.copies);

  update games set status = 'playing' where id = v_game_id;

  -- Ronda 1: producción y apertura de la fase de decisión.
  -- La fase 'production' es instantánea en el servidor; el cliente la anima a
  -- partir de los round_events (ARCHITECTURE §7 paso 2).
  perform _apply_production(v_game_id, 1);

  update games
     set round_phase = 'decision',
         round_deadline = now() + (v_room.decision_timer_seconds || ' seconds')::interval
   where id = v_game_id;

  return v_game_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. PRODUCCIÓN (GAME_DESIGN §3.2)
-- -----------------------------------------------------------------------------

create or replace function public._apply_production(p_game uuid, p_round int)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_n      int;
  v_size   int;
  v_card   production_cards;
  v_delta  int;
  v_w int; v_s int; v_g int; v_f int;
  r        record;
  v_lim    int;
  v_gain   jsonb;
begin
  select count(*) into v_n from game_players where game_id = p_game;
  select count(*) into v_size from game_production_deck where game_id = p_game;

  -- El mazo se recorre en ciclo si la partida dura más que el mazo
  select c.* into v_card
    from game_production_deck d
    join production_cards c on c.key = d.card_key
   where d.game_id = p_game and d.position = (p_round - 1) % v_size;

  select total_delta into v_delta from production_scaling
   where v_n between min_players and max_players;
  v_delta := coalesce(v_delta, 0);

  v_w := v_card.wood; v_s := v_card.stone; v_g := v_card.gold; v_f := v_card.food;

  -- El delta de escalado se aplica al recurso más abundante de la carta;
  -- en empate, prioridad madera > comida > piedra > oro.
  if v_delta <> 0 then
    if    v_w >= greatest(v_f, v_s, v_g) then v_w := greatest(0, v_w + v_delta);
    elsif v_f >= greatest(v_s, v_g)      then v_f := greatest(0, v_f + v_delta);
    elsif v_s >= v_g                     then v_s := greatest(0, v_s + v_delta);
    else                                      v_g := greatest(0, v_g + v_delta);
    end if;
  end if;

  for r in select * from game_players where game_id = p_game loop
    v_lim := _storage_limit(r.character_key);

    -- Bonus de edificios activos (los pausados por Daño no rinden esta ronda)
    with bonus as (
      select coalesce(sum(b.prod_wood),0)  w, coalesce(sum(b.prod_stone),0) s,
             coalesce(sum(b.prod_gold),0)  g, coalesce(sum(b.prod_food),0)  f
        from game_buildings gb
        join buildings_catalog b on b.key = gb.building_key
       where gb.game_id = p_game and gb.user_id = r.user_id
         and coalesce(gb.paused_until_round, 0) < p_round
    )
    update game_players gp
       set wood  = least(v_lim, gp.wood  + v_w + bonus.w),
           stone = least(v_lim, gp.stone + v_s + bonus.s),
           gold  = least(v_lim, gp.gold  + v_g + bonus.g),
           -- Pasiva de El Granjero: +1 comida garantizada
           food  = least(v_lim, gp.food  + v_f + bonus.f
                          + case when r.character_key = 'granjero' then 1 else 0 end)
      from bonus
     where gp.game_id = p_game and gp.user_id = r.user_id;

    select jsonb_build_object('wood', gp.wood, 'stone', gp.stone, 'gold', gp.gold, 'food', gp.food)
      into v_gain from game_players gp where gp.game_id = p_game and gp.user_id = r.user_id;

    perform _ev(p_game, p_round, 'production', null, r.user_id,
                jsonb_build_object('card', v_card.key, 'card_name', v_card.name, 'totals', v_gain));
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. ENVÍO DE DECISIÓN (ARCHITECTURE §4)
-- -----------------------------------------------------------------------------

create or replace function public.submit_action(
  p_game_id         uuid,
  p_build_slot      int  default null,
  p_build_slot_2    int  default null,   -- solo El Nómada, 1 vez por partida
  p_sabotage_type   text default null,
  p_sabotage_target uuid default null,
  p_sabotage_params jsonb default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_game games;
  v_me   game_players;
  v_k1 text; v_k2 text;
  v_w int := 0; v_s int := 0; v_g int := 0; v_f int := 0;
  c record;
  v_players int; v_confirmed int;
begin
  select * into v_game from games where id = p_game_id;
  if not found then raise exception 'Partida no encontrada'; end if;
  if v_game.status <> 'playing' then raise exception 'La partida no está en curso'; end if;
  if v_game.round_phase <> 'decision' then raise exception 'No es la fase de decisión'; end if;
  if now() > v_game.round_deadline then raise exception 'El tiempo de decisión ya venció'; end if;

  select * into v_me from game_players where game_id = p_game_id and user_id = v_uid;
  if not found then raise exception 'No participas en esta partida'; end if;

  ---------------------------------------------------------------- construcción
  if p_build_slot is not null then
    -- El Nómada es inmune a bloqueos de construcción (GAME_DESIGN §7)
    if v_me.blocked_next_round and v_me.character_key <> 'nomada' then
      raise exception 'Estás bloqueado: no puedes construir esta ronda';
    end if;

    select building_key into v_k1 from game_market
     where game_id = p_game_id and slot = p_build_slot;
    if v_k1 is null then raise exception 'Ese slot del mercado está vacío'; end if;

    select * into c from _building_cost(v_k1, v_me.character_key);
    v_w := v_w + c.wood; v_s := v_s + c.stone; v_g := v_g + c.gold; v_f := v_f + c.food;
  end if;

  if p_build_slot_2 is not null then
    if p_build_slot is null then raise exception 'La segunda construcción requiere la primera'; end if;
    if v_me.character_key <> 'nomada' then raise exception 'Solo El Nómada puede construir dos veces'; end if;
    if v_me.nomad_double_used then raise exception 'Ya usaste tu doble construcción'; end if;
    if p_build_slot_2 = p_build_slot then raise exception 'Elige dos slots distintos'; end if;

    select building_key into v_k2 from game_market
     where game_id = p_game_id and slot = p_build_slot_2;
    if v_k2 is null then raise exception 'Ese slot del mercado está vacío'; end if;

    select * into c from _building_cost(v_k2, v_me.character_key);
    v_w := v_w + c.wood; v_s := v_s + c.stone; v_g := v_g + c.gold; v_f := v_f + c.food;
  end if;

  ------------------------------------------------------------------- sabotaje
  if p_sabotage_type is not null then
    -- Paso 2 de la implementación: solo Robo. El resto llega en el paso 5.
    if p_sabotage_type <> 'steal' then
      raise exception 'Sabotaje no disponible todavía: %', p_sabotage_type;
    end if;
    if p_sabotage_target is null then raise exception 'Falta el objetivo'; end if;
    if p_sabotage_target = v_uid then raise exception 'No puedes auto-sabotearte'; end if;
    if not exists (select 1 from game_players
                    where game_id = p_game_id and user_id = p_sabotage_target) then
      raise exception 'Objetivo inválido';
    end if;
    if coalesce(p_sabotage_params->>'resource','') not in ('wood','stone','gold','food') then
      raise exception 'Elige qué recurso robar';
    end if;
    if exists (select 1 from sabotage_cooldowns
                where game_id = p_game_id and user_id = v_uid
                  and sabotage_type = p_sabotage_type
                  and available_from_round > v_game.current_round) then
      raise exception 'Ese sabotaje está en cooldown';
    end if;

    select * into c from _sabotage_cost(p_sabotage_type);
    v_w := v_w + c.wood; v_s := v_s + c.stone; v_g := v_g + c.gold; v_f := v_f + c.food;
  end if;

  ------------------------------------------------------------------- recursos
  if v_me.wood < v_w or v_me.stone < v_s or v_me.gold < v_g or v_me.food < v_f then
    raise exception 'Recursos insuficientes';
  end if;

  insert into round_actions (game_id, round, user_id, build_key, build_slot,
                             build_key_2, build_slot_2,
                             sabotage_type, sabotage_target, sabotage_params, confirmed_at)
  values (p_game_id, v_game.current_round, v_uid, v_k1, p_build_slot,
          v_k2, p_build_slot_2,
          p_sabotage_type, p_sabotage_target, p_sabotage_params, now())
  on conflict (game_id, round, user_id) do update
    set build_key = excluded.build_key, build_slot = excluded.build_slot,
        build_key_2 = excluded.build_key_2, build_slot_2 = excluded.build_slot_2,
        sabotage_type = excluded.sabotage_type, sabotage_target = excluded.sabotage_target,
        sabotage_params = excluded.sabotage_params, confirmed_at = now();

  insert into round_confirmations (game_id, round, user_id)
  values (p_game_id, v_game.current_round, v_uid)
  on conflict do nothing;

  -- Si ya confirmaron todos, se cierra la ronda de inmediato (ARCHITECTURE §5)
  select count(*) into v_players   from game_players where game_id = p_game_id;
  select count(*) into v_confirmed from round_actions
   where game_id = p_game_id and round = v_game.current_round;
  if v_confirmed >= v_players then
    perform resolve_round(p_game_id);
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. RESOLUCIÓN DE RONDA (ARCHITECTURE §4, GAME_DESIGN §5.4)
--    Versión mínima del paso 2: construcciones + robo.
-- -----------------------------------------------------------------------------

create or replace function public.resolve_round(p_game_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_game  games;
  v_room  rooms;
  v_round int;
  a       record;
  b       record;
  gp      game_players;
  tgt     game_players;
  c       record;
  v_next_key text;
  v_next_pos int;
  v_amount int; v_avail int; v_taken int; v_lim int;
  v_blocked text;
  v_wall uuid;
  v_res text;
  v_any_sabotage bool;
  v_finish bool := false;
begin
  -- Cerrojo: dos llamadas concurrentes (cron + último jugador) no deben resolver dos veces
  select * into v_game from games where id = p_game_id for update;
  if not found then return; end if;
  if v_game.status <> 'playing' or v_game.round_phase <> 'decision' then return; end if;

  select * into v_room from rooms where id = v_game.room_id;
  v_round := v_game.current_round;
  update games set round_phase = 'resolution' where id = p_game_id;

  -- 1. Jugadores sin acción => 'guardar' (GAME_DESIGN §6.1)
  insert into round_actions (game_id, round, user_id)
  select p_game_id, v_round, user_id from game_players where game_id = p_game_id
  on conflict do nothing;

  -- 2. CONSTRUCCIONES, en orden aleatorio (un slot solo lo compra uno)
  for a in
    select * from round_actions
     where game_id = p_game_id and round = v_round and build_key is not null
     order by random()
  loop
    for b in
      select a.build_key k, a.build_slot s, 1 n
      union all
      select a.build_key_2, a.build_slot_2, 2 where a.build_key_2 is not null
      order by n
    loop
      select * into gp from game_players where game_id = p_game_id and user_id = a.user_id for update;

      if gp.blocked_next_round and gp.character_key <> 'nomada' then
        perform _ev(p_game_id, v_round, 'build', a.user_id, null,
                    jsonb_build_object('building', b.k, 'success', false, 'reason', 'blocked'));
        continue;
      end if;

      -- ¿el slot sigue teniendo esa carta? Si otro se le adelantó, la compra falla
      -- y no se cobra nada (no recibió edificio).
      if not exists (select 1 from game_market
                      where game_id = p_game_id and slot = b.s and building_key = b.k) then
        perform _ev(p_game_id, v_round, 'build', a.user_id, null,
                    jsonb_build_object('building', b.k, 'success', false, 'reason', 'slot_taken'));
        continue;
      end if;

      select * into c from _building_cost(b.k, gp.character_key);
      if gp.wood < c.wood or gp.stone < c.stone or gp.gold < c.gold or gp.food < c.food then
        perform _ev(p_game_id, v_round, 'build', a.user_id, null,
                    jsonb_build_object('building', b.k, 'success', false, 'reason', 'no_resources'));
        continue;
      end if;

      update game_players
         set wood = wood - c.wood, stone = stone - c.stone,
             gold = gold - c.gold, food = food - c.food
       where game_id = p_game_id and user_id = a.user_id;

      insert into game_buildings (game_id, user_id, building_key, built_at_round, shield_charges)
      select p_game_id, a.user_id, b.k, v_round,
             case when bc.effect_key = 'muralla' then 1 else 0 end
        from buildings_catalog bc where bc.key = b.k;

      -- Puntos: valor de la carta + pasiva de La Arquitecta
      update game_players gpl
         set points        = gpl.points        + bc.points + case when gpl.character_key = 'arquitecta' then 1 else 0 end,
             pts_buildings = gpl.pts_buildings + bc.points + case when gpl.character_key = 'arquitecta' then 1 else 0 end
        from buildings_catalog bc
       where bc.key = b.k and gpl.game_id = p_game_id and gpl.user_id = a.user_id;

      if b.n = 2 then
        update game_players set nomad_double_used = true
         where game_id = p_game_id and user_id = a.user_id;
      end if;

      -- Reposición del mercado desde el mazo (GAME_DESIGN §4.1)
      select building_key, position into v_next_key, v_next_pos
        from game_deck where game_id = p_game_id order by position limit 1;
      update game_market set building_key = v_next_key
       where game_id = p_game_id and slot = b.s;
      if v_next_key is not null then
        delete from game_deck where game_id = p_game_id and position = v_next_pos;
      end if;

      perform _ev(p_game_id, v_round, 'build', a.user_id, null,
                  jsonb_build_object('building', b.k, 'success', true, 'slot', b.s));
    end loop;
  end loop;

  -- El bloqueo se consume en la ronda en que aplicó
  update game_players set blocked_next_round = false
   where game_id = p_game_id and blocked_next_round;

  -- 3. SABOTAJES. Primero se cobran todos los costos: los recursos gastados en
  --    la acción no se devuelven aunque el sabotaje falle (GAME_DESIGN §5.4).
  select exists (select 1 from round_actions
                  where game_id = p_game_id and round = v_round and sabotage_type is not null)
    into v_any_sabotage;

  for a in
    select * from round_actions
     where game_id = p_game_id and round = v_round and sabotage_type is not null
  loop
    select * into c from _sabotage_cost(a.sabotage_type);
    update game_players
       set wood = greatest(0, wood - c.wood), stone = greatest(0, stone - c.stone),
           gold = greatest(0, gold - c.gold), food = greatest(0, food - c.food)
     where game_id = p_game_id and user_id = a.user_id;

    insert into sabotage_cooldowns (game_id, user_id, sabotage_type, available_from_round)
    values (p_game_id, a.user_id, a.sabotage_type, v_round + _sabotage_cooldown(a.sabotage_type))
    on conflict (game_id, user_id, sabotage_type)
      do update set available_from_round = excluded.available_from_round;
  end loop;

  -- Efectos, en orden aleatorio entre sí (GAME_DESIGN §5.4)
  for a in
    select * from round_actions
     where game_id = p_game_id and round = v_round and sabotage_type = 'steal'
     order by random()
  loop
    select * into gp  from game_players where game_id = p_game_id and user_id = a.user_id for update;
    select * into tgt from game_players where game_id = p_game_id and user_id = a.sabotage_target for update;
    v_res := a.sabotage_params->>'resource';
    v_blocked := null;

    -- Defensa 1: pasiva de La Guardiana (primer sabotaje de toda la partida)
    if tgt.character_key = 'guardiana' and not tgt.guardian_shield_used then
      update game_players set guardian_shield_used = true
       where game_id = p_game_id and user_id = tgt.user_id;
      v_blocked := 'guardiana';
    else
      -- Defensa 2: Muralla (inmune a 1 sabotaje de robo)
      select gb.id into v_wall
        from game_buildings gb join buildings_catalog bc on bc.key = gb.building_key
       where gb.game_id = p_game_id and gb.user_id = tgt.user_id
         and bc.effect_key = 'muralla' and gb.shield_charges > 0
       limit 1;
      if v_wall is not null then
        update game_buildings set shield_charges = shield_charges - 1 where id = v_wall;
        v_blocked := 'muralla';
      end if;
    end if;

    if v_blocked is not null then
      perform _ev(p_game_id, v_round, 'steal', a.user_id, tgt.user_id,
                  jsonb_build_object('resource', v_res, 'success', false, 'blocked_by', v_blocked));
      continue;
    end if;

    -- El Saqueador roba el doble (GAME_DESIGN §7)
    v_amount := case when gp.character_key = 'saqueador' then 4 else 2 end;
    execute format('select %I from game_players where game_id=$1 and user_id=$2', v_res)
      into v_avail using p_game_id, tgt.user_id;
    v_taken := least(v_amount, v_avail);

    if v_taken < 1 then
      -- Sin nada que robar: fallido, y el costo ya se pagó (§5.4)
      perform _ev(p_game_id, v_round, 'steal', a.user_id, tgt.user_id,
                  jsonb_build_object('resource', v_res, 'success', false, 'reason', 'empty'));
      continue;
    end if;

    v_lim := _storage_limit(gp.character_key);
    execute format(
      'update game_players set %1$I = %1$I - $3 where game_id=$1 and user_id=$2', v_res)
      using p_game_id, tgt.user_id, v_taken;
    execute format(
      'update game_players set %1$I = least($4, %1$I + $3) where game_id=$1 and user_id=$2', v_res)
      using p_game_id, gp.user_id, v_taken, v_lim;

    -- Camino del Saboteador: +1 punto por sabotaje exitoso (GAME_DESIGN §4.3)
    update game_players
       set points = points + 1, pts_saboteur = pts_saboteur + 1
     where game_id = p_game_id and user_id = a.user_id;

    perform _ev(p_game_id, v_round, 'steal', a.user_id, tgt.user_id,
                jsonb_build_object('resource', v_res, 'amount', v_taken, 'success', true));
  end loop;

  -- 4. Camino del Superviviente: solo si hubo al menos un intento de sabotaje
  --    en la mesa (regla anti-pasividad, GAME_DESIGN §4.3)
  if v_any_sabotage then
    update game_players gpl
       set points = points + 1, pts_survivor = pts_survivor + 1
     where gpl.game_id = p_game_id
       and not exists (
         select 1 from round_events e
          where e.game_id = p_game_id and e.round = v_round
            and e.target_id = gpl.user_id
            and e.type in ('steal','block','damage')
            and (e.payload->>'success')::bool
       );
    perform _ev(p_game_id, v_round, 'points', null, null,
                jsonb_build_object('survivor_round', true));
  end if;

  -- 5. Condición de victoria (GAME_DESIGN §9)
  if exists (select 1 from game_players
              where game_id = p_game_id and points >= v_room.target_points)
     or v_round >= v_room.max_rounds then
    v_finish := true;
  end if;

  if v_finish then
    perform finish_game(p_game_id);
  else
    -- Fase de revelación: el servidor manda también aquí. `tick_games` la cierra.
    update games
       set round_phase = 'reveal',
           round_deadline = now() + (_reveal_seconds() || ' seconds')::interval
     where id = p_game_id;
  end if;
end;
$$;

-- Cierra la revelación y abre la siguiente ronda con su producción
create or replace function public._open_decision(p_game_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_game games;
  v_room rooms;
begin
  select * into v_game from games where id = p_game_id for update;
  if v_game.status <> 'playing' or v_game.round_phase <> 'reveal' then return; end if;
  select * into v_room from rooms where id = v_game.room_id;

  update games set current_round = current_round + 1, round_phase = 'production'
   where id = p_game_id;

  perform _apply_production(p_game_id, v_game.current_round + 1);

  update games
     set round_phase = 'decision',
         round_deadline = now() + (v_room.decision_timer_seconds || ' seconds')::interval
   where id = p_game_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 7. CIERRE DE PARTIDA (ARCHITECTURE §4)
-- -----------------------------------------------------------------------------

create or replace function public.finish_game(p_game_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_game   games;
  v_winner uuid;
  r        record;
begin
  select * into v_game from games where id = p_game_id for update;
  if v_game.status = 'finished' then return; end if;

  -- Misiones cumplidas: +5 (la verificación llega en el paso 6; aquí ya puntúa)
  update game_players gpl
     set points = gpl.points + m.points, pts_mission = m.points
    from player_missions pm
    join missions_catalog m on m.key = pm.mission_key
   where pm.game_id = p_game_id and pm.completed
     and gpl.game_id = p_game_id and gpl.user_id = pm.user_id;

  -- Camino del Acumulador: +1 punto por cada 3 recursos guardados (§4.3)
  update game_players
     set pts_accumulator = (wood + stone + gold + food) / 3,
         points = points + (wood + stone + gold + food) / 3
   where game_id = p_game_id;

  -- Camino dominante de cada jugador (para user_stats)
  update game_players gpl set dominant_path = d.path
    from (
      select gp.user_id,
             (array['constructor','acumulador','superviviente','saboteador'])[
               (select i from generate_subscripts(
                  array[gp.pts_buildings, gp.pts_accumulator, gp.pts_survivor, gp.pts_saboteur], 1) i
                 order by (array[gp.pts_buildings, gp.pts_accumulator, gp.pts_survivor, gp.pts_saboteur])[i] desc,
                          i limit 1)] as path
        from game_players gp where gp.game_id = p_game_id
    ) d
   where gpl.game_id = p_game_id and gpl.user_id = d.user_id;

  -- Ganador: más puntos; desempate por nº de edificios, luego por orden de ingreso
  select gp.user_id into v_winner
    from game_players gp
    left join (select user_id, count(*) n from game_buildings
                where game_id = p_game_id group by user_id) b using (user_id)
   where gp.game_id = p_game_id
   order by gp.points desc, coalesce(b.n,0) desc, gp.user_id
   limit 1;

  update games set status = 'finished', winner_id = v_winner,
                   finished_at = now(), round_phase = null, round_deadline = null
   where id = p_game_id;
  update rooms set status = 'finished' where id = v_game.room_id;

  perform _ev(p_game_id, v_game.current_round, 'game_end', null, v_winner,
              jsonb_build_object('winner', v_winner));

  -- Estadísticas globales (GAME_DESIGN §10.1)
  for r in select user_id from game_players where game_id = p_game_id loop
    insert into user_stats (user_id) values (r.user_id) on conflict do nothing;

    update user_stats us
       set games_played = us.games_played + 1,
           games_won    = us.games_won + case when r.user_id = v_winner then 1 else 0 end,
           favorite_character = (
             select gp.character_key from game_players gp
              where gp.user_id = r.user_id
              group by gp.character_key order by count(*) desc, gp.character_key limit 1),
           best_character = (
             select gp.character_key from game_players gp
               join games g on g.id = gp.game_id and g.status = 'finished'
              where gp.user_id = r.user_id
              group by gp.character_key
              order by avg(case when g.winner_id = r.user_id then 1.0 else 0.0 end) desc,
                       count(*) desc, gp.character_key limit 1),
           most_used_path = (
             select gp.dominant_path from game_players gp
              where gp.user_id = r.user_id and gp.dominant_path is not null
              group by gp.dominant_path order by count(*) desc, gp.dominant_path limit 1),
           updated_at = now()
     where us.user_id = r.user_id;
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- 8. RELOJ DEL SERVIDOR (ARCHITECTURE §5)
--    Punto de entrada único para la Edge Function / pg_cron. El deadline manda,
--    no el cliente.
-- -----------------------------------------------------------------------------

create or replace function public.tick_games()
returns int
language plpgsql security definer set search_path = public as $$
declare
  g record;
  n int := 0;
begin
  for g in
    select id, round_phase from games
     where status = 'playing' and round_deadline is not null and round_deadline <= now()
     order by round_deadline
  loop
    if g.round_phase = 'decision' then
      perform resolve_round(g.id);
      n := n + 1;
    elsif g.round_phase = 'reveal' then
      perform _open_decision(g.id);
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;

-- -----------------------------------------------------------------------------
-- 9. LECTURAS PRIVADAS
-- -----------------------------------------------------------------------------

create or replace function public.get_my_mission(p_game_id uuid)
returns table (mission_key text, name text, description text, points int, completed bool)
language sql security definer set search_path = public as $$
  select m.key, m.name, m.description, m.points, pm.completed
    from player_missions pm
    join missions_catalog m on m.key = pm.mission_key
   where pm.game_id = p_game_id and pm.user_id = auth.uid();
$$;

-- -----------------------------------------------------------------------------
-- 10. PERMISOS: solo la API pública es invocable por el cliente
-- -----------------------------------------------------------------------------

-- Revocación quirúrgica: solo los internos. Un `revoke on all functions` también
-- alcanzaría a los helpers que evalúan las políticas RLS (is_game_participant, …),
-- que el rol consultante SÍ necesita poder ejecutar.
revoke execute on function public._reveal_seconds()                    from public, anon, authenticated;
revoke execute on function public._storage_limit(text)                 from public, anon, authenticated;
revoke execute on function public._building_cost(text,text)            from public, anon, authenticated;
revoke execute on function public._sabotage_cost(text)                 from public, anon, authenticated;
revoke execute on function public._sabotage_cooldown(text)             from public, anon, authenticated;
revoke execute on function public._ev(uuid,int,text,uuid,uuid,jsonb,text) from public, anon, authenticated;
revoke execute on function public._apply_production(uuid,int)          from public, anon, authenticated;
revoke execute on function public._open_decision(uuid)                 from public, anon, authenticated;
revoke execute on function public.resolve_round(uuid)                  from public, anon, authenticated;
revoke execute on function public.finish_game(uuid)                    from public, anon, authenticated;
revoke execute on function public.tick_games()                         from public, anon, authenticated;

grant execute on function public.create_room(int,int,int,int)                         to authenticated;
grant execute on function public.join_room(text)                                      to authenticated;
grant execute on function public.leave_room(uuid)                                     to authenticated;
grant execute on function public.start_game(uuid)                                     to authenticated;
grant execute on function public.submit_action(uuid,int,int,text,uuid,jsonb)           to authenticated;
grant execute on function public.get_my_mission(uuid)                                 to authenticated;

-- `resolve_round`, `_open_decision` y `tick_games` las llama el reloj del servidor
-- (Edge Function con service_role), nunca el cliente. `finish_game` idem.
