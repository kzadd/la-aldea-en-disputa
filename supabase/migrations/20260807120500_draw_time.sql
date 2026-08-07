-- =============================================================================
-- La ronda 1 arranca con tiempo extra para el sorteo de personajes.
-- Sin esto, la animación de CharacterDraw (GAME_DESIGN §2.3) se come segundos
-- de la primera fase de decisión, que ya está corriendo contra el deadline.
-- =============================================================================

create or replace function public._draw_seconds() returns int
language sql immutable as $$ select 8 $$;
revoke execute on function public._draw_seconds() from public, anon, authenticated;

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

  perform _apply_production(v_game_id, 1);

  update games
     set round_phase = 'decision',
         round_deadline = now()
           + ((v_room.decision_timer_seconds + _draw_seconds()) || ' seconds')::interval
   where id = v_game_id;

  return v_game_id;
end;
$$;

grant execute on function public.start_game(uuid) to authenticated;
