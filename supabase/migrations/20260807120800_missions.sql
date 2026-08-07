-- =============================================================================
-- Paso 6 — Verificación de misiones secretas (GAME_DESIGN §8)
--
-- Se evalúan al cerrar la partida, no ronda a ronda: varias son del tipo
-- "termina la partida con…" y solo tienen sentido al final. Todas valen +5
-- (§8.2), así que la verificación decide únicamente si se cumplió o no.
--
-- El Espionaje cuenta como sabotaje ejecutado con éxito para las misiones.
-- No hay riesgo de delatar al espía: las misiones se revelan recién al final
-- (§8.1), a diferencia de los puntos, que son públicos durante la partida.
-- =============================================================================

create or replace function public._check_mission(p_game uuid, p_user uuid, p_check text)
returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  gp game_players;
  v  bool := false;
begin
  select * into gp from game_players where game_id = p_game and user_id = p_user;
  if not found then return false; end if;

  case p_check

    -- ---------------------------------------------------------- construcción
    when 'build_basic_and_mid' then
      v := exists (select 1 from game_buildings gb join buildings_catalog b on b.key = gb.building_key
                    where gb.game_id = p_game and gb.user_id = p_user and b.tier = 'basico')
       and exists (select 1 from game_buildings gb join buildings_catalog b on b.key = gb.building_key
                    where gb.game_id = p_game and gb.user_id = p_user and b.tier = 'intermedio');

    when 'one_advanced_building' then
      v := exists (select 1 from game_buildings gb join buildings_catalog b on b.key = gb.building_key
                    where gb.game_id = p_game and gb.user_id = p_user and b.tier = 'avanzado');

    when 'three_buildings' then
      v := (select count(*) from game_buildings
             where game_id = p_game and user_id = p_user) >= 3;

    when 'three_basic_buildings' then
      v := (select count(*) from game_buildings gb join buildings_catalog b on b.key = gb.building_key
             where gb.game_id = p_game and gb.user_id = p_user and b.tier = 'basico') >= 3;

    when 'two_production_buildings' then
      v := (select count(*) from game_buildings gb
             where gb.game_id = p_game and gb.user_id = p_user
               and gb.building_key in (select key from buildings_with_production)) >= 2;

    when 'build_consecutive_rounds' then
      v := exists (select 1 from game_buildings a join game_buildings b
                     on b.game_id = a.game_id and b.user_id = a.user_id
                    and b.built_at_round = a.built_at_round + 1
                    where a.game_id = p_game and a.user_id = p_user);

    when 'ten_points_from_buildings' then
      v := gp.pts_buildings >= 10;

    -- --------------------------------------------------------------- sabotaje
    when 'two_distinct_sabotages' then
      v := (select count(distinct e.type) from round_events e
             where e.game_id = p_game and e.actor_id = p_user
               and (e.type = 'spy_private'
                    or (e.type in ('steal','block','damage')
                        and (e.payload->>'success')::bool))) >= 2;

    when 'sabotage_two_targets' then
      v := (select count(distinct e.target_id) from round_events e
             where e.game_id = p_game and e.actor_id = p_user and e.target_id is not null
               and (e.type = 'spy_private'
                    or (e.type in ('steal','block','damage')
                        and (e.payload->>'success')::bool))) >= 2;

    when 'steal_five_units' then
      v := coalesce((select sum((e.payload->>'amount')::int) from round_events e
                      where e.game_id = p_game and e.actor_id = p_user
                        and e.type = 'steal' and (e.payload->>'success')::bool), 0) >= 5;

    -- ---------------------------------------------------------- supervivencia
    when 'never_robbed' then
      v := not exists (select 1 from round_events e
                        where e.game_id = p_game and e.target_id = p_user
                          and e.type = 'steal' and (e.payload->>'success')::bool);

    when 'three_survivor_rounds' then
      -- pts_survivor es exactamente +1 por ronda sobrevivida (§4.3)
      v := gp.pts_survivor >= 3;

    -- ------------------------------------------------------------- acumulación
    when 'end_food_5'       then v := gp.food >= 5;
    when 'end_gold_5'       then v := gp.gold >= 5;
    when 'end_wood_stone_8' then v := gp.wood + gp.stone >= 8;
    when 'end_three_of_each' then
      v := gp.wood >= 3 and gp.stone >= 3 and gp.gold >= 3 and gp.food >= 3;

    else
      v := false;   -- misión sin verificación implementada: no se cumple
  end case;

  return coalesce(v, false);
end;
$$;

revoke execute on function public._check_mission(uuid,uuid,text) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- finish_game: marcar las misiones cumplidas ANTES de puntuarlas
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

  -- 1. Verificación de misiones (§8). Se evalúa con los recursos y edificios
  --    tal como quedaron, antes de sumar puntos de misión o de Acumulador.
  update player_missions pm
     set completed = _check_mission(p_game_id, pm.user_id, m.check_key)
    from missions_catalog m
   where m.key = pm.mission_key and pm.game_id = p_game_id;

  -- 2. Misiones cumplidas: +5 (§8.2)
  update game_players gpl
     set points = gpl.points + m.points, pts_mission = m.points
    from player_missions pm
    join missions_catalog m on m.key = pm.mission_key
   where pm.game_id = p_game_id and pm.completed
     and gpl.game_id = p_game_id and gpl.user_id = pm.user_id;

  -- 3. Camino del Acumulador: +1 por cada 3 recursos guardados (§4.3)
  update game_players
     set pts_accumulator = (wood + stone + gold + food) / 3,
         points = points + (wood + stone + gold + food) / 3
   where game_id = p_game_id;

  -- 4. Camino dominante de cada jugador (para user_stats)
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

  -- 5. Ganador: más puntos; desempate por nº de edificios, luego por user_id
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

  -- 6. Las misiones se revelan al cerrar (§8.1): un evento público por jugador
  for r in
    select pm.user_id, m.name, m.description, pm.completed
      from player_missions pm join missions_catalog m on m.key = pm.mission_key
     where pm.game_id = p_game_id
  loop
    perform _ev(p_game_id, v_game.current_round, 'mission', null, r.user_id,
                jsonb_build_object('name', r.name, 'description', r.description,
                                   'completed', r.completed));
  end loop;

  perform _ev(p_game_id, v_game.current_round, 'game_end', null, v_winner,
              jsonb_build_object('winner', v_winner));

  -- 7. Estadísticas globales (§10.1)
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

revoke execute on function public.finish_game(uuid) from public, anon, authenticated;
