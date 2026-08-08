-- =============================================================================
-- Flujo de partida: listos en el lobby, arranque sincronizado de la ronda 1,
-- poder deshacer la confirmación, reveal más corto y cierre anticipado del host.
--
-- El reloj de la ronda 1 era el problema de fondo: `start_game` lo arrancaba de
-- inmediato con 8 s de gracia por el sorteo, pero el sorteo termina cuando cada
-- jugador toca "A jugar", no a los 8 s. Quien se demoraba leyendo su misión
-- entraba con la ronda ya empezada. Ahora el reloj arranca cuando entró el
-- último, y los 8 s pasan a ser un tope por si alguien nunca entra.
-- =============================================================================

-- ----------------------------------------------------------------- 1. Listos
alter table public.room_players
  add column if not exists ready bool not null default false;

create or replace function public.set_ready(p_room_id uuid, p_ready bool)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if exists (select 1 from rooms where id = p_room_id and status <> 'lobby') then
    raise exception 'La partida ya empezó';
  end if;

  update room_players set ready = coalesce(p_ready, false)
   where room_id = p_room_id and user_id = auth.uid();
  if not found then raise exception 'No estás en esta sala'; end if;
end;
$$;

-- --------------------------------------------------- 2. Entrada a la partida
alter table public.game_players
  add column if not exists entered_at timestamptz null;

-- Tope para la ronda 1 mientras la gente termina el sorteo. Con `enter_game`
-- el reloj se reinicia completo, así que esto solo cubre al que nunca entra.
create or replace function public._draw_seconds() returns int
language sql immutable as $$ select 45 $$;
revoke execute on function public._draw_seconds() from public, anon, authenticated;

create or replace function public.enter_game(p_game_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_game    games;
  v_room    rooms;
  v_pending int;
begin
  select * into v_game from games where id = p_game_id for update;
  if not found then raise exception 'Partida no encontrada'; end if;

  update game_players set entered_at = coalesce(entered_at, now())
   where game_id = p_game_id and user_id = auth.uid();
  if not found then raise exception 'No participas en esta partida'; end if;

  if v_game.status <> 'playing' then return; end if;

  -- El reloj de la ronda 1 arranca de cero cuando entra el último
  if v_game.current_round = 1 and v_game.round_phase = 'decision' then
    select count(*) into v_pending
      from game_players where game_id = p_game_id and entered_at is null;
    if v_pending = 0 then
      select * into v_room from rooms where id = v_game.room_id;
      update games
         set round_deadline = now() + (v_room.decision_timer_seconds || ' seconds')::interval
       where id = p_game_id;
    end if;
  end if;
end;
$$;

-- ------------------------------------------------- 3. Deshacer la decisión
-- El espionaje ya se ejecutó y se cobró: esa marca se conserva para que no se
-- pueda espiar dos veces en la misma ronda.
create or replace function public.cancel_action(p_game_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_game games;
begin
  select * into v_game from games where id = p_game_id;
  if not found then raise exception 'Partida no encontrada'; end if;
  if v_game.round_phase <> 'decision' then raise exception 'Ya no es la fase de decisión'; end if;
  if now() > v_game.round_deadline then raise exception 'El tiempo de decisión ya venció'; end if;
  if not exists (select 1 from game_players
                  where game_id = p_game_id and user_id = auth.uid()) then
    raise exception 'No participas en esta partida';
  end if;

  update round_actions
     set build_key = null, build_slot = null, build_key_2 = null, build_slot_2 = null,
         sabotage_type   = case when sabotage_type = 'spy' then 'spy' end,
         sabotage_target = case when sabotage_type = 'spy' then sabotage_target end,
         sabotage_params = null
   where game_id = p_game_id and round = v_game.current_round and user_id = auth.uid();

  delete from round_confirmations
   where game_id = p_game_id and round = v_game.current_round and user_id = auth.uid();
end;
$$;

-- Sin esto, quien deshace su decisión sigue apareciendo confirmado en las
-- pantallas de los demás hasta el siguiente refetch.
drop trigger if exists rt_round_confirmations on public.round_confirmations;
create trigger rt_round_confirmations
  after insert or delete on public.round_confirmations
  for each row execute function public._rt_notify_game();

-- ---------------------------------------------------- 4. Reveal más corto
create or replace function public._reveal_seconds() returns int
language sql immutable as $$ select 5 $$;
revoke execute on function public._reveal_seconds() from public, anon, authenticated;

-- ------------------------------------------- 5. El host puede cerrar antes
create or replace function public.end_game_now(p_game_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_game games; v_room rooms;
begin
  select * into v_game from games where id = p_game_id;
  if not found then raise exception 'Partida no encontrada'; end if;
  select * into v_room from rooms where id = v_game.room_id;
  if v_room.host_id <> auth.uid() then
    raise exception 'Solo el host puede terminar la partida';
  end if;
  if v_game.status <> 'playing' then return; end if;

  perform finish_game(p_game_id);
end;
$$;

-- ------------------------------------- 6. start_game exige a todos listos
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
  if exists (select 1 from room_players where room_id = p_room_id and not ready) then
    raise exception 'Todavía hay jugadores que no están listos';
  end if;

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

  perform _apply_production(v_game_id, 1);

  update games
     set round_phase = 'decision',
         round_deadline = now()
           + ((v_room.decision_timer_seconds + _draw_seconds()) || ' seconds')::interval
   where id = v_game_id;

  return v_game_id;
end;
$$;

-- --------------------------------------------------------------- Permisos
revoke execute on function public.set_ready(uuid, bool)   from public, anon;
revoke execute on function public.enter_game(uuid)        from public, anon;
revoke execute on function public.cancel_action(uuid)     from public, anon;
revoke execute on function public.end_game_now(uuid)      from public, anon;
grant  execute on function public.set_ready(uuid, bool)   to authenticated;
grant  execute on function public.enter_game(uuid)        to authenticated;
grant  execute on function public.cancel_action(uuid)     to authenticated;
grant  execute on function public.end_game_now(uuid)      to authenticated;
grant  execute on function public.start_game(uuid)        to authenticated;
