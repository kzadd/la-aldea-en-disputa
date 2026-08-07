-- =============================================================================
-- Paso 5 — Sabotajes restantes, cooldowns y defensas
-- Bloqueo temporal · Daño a estructura · Espionaje (GAME_DESIGN §5)
-- Defensas: Muralla, Torre de Vigilancia, Fortaleza, y las pasivas de
-- La Guardiana y El Nómada (§5.5, §7)
--
-- Nota de diseño sobre el Espionaje: §5.3 lo declara la ÚNICA acción silenciosa
-- ("espiar perdería todo sentido si el espiado se entera"). Como los puntos son
-- públicos, cualquier efecto lateral visible lo delataría. Por eso el espionaje:
--   · no cuenta como "intento de sabotaje" para los puntos de Superviviente
--   · no otorga punto de Saboteador
--   · no consume el escudo de La Guardiana
-- Cualquiera de las tres cosas haría visible que alguien espió.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ESPIONAJE — se resuelve al instante, no en resolve_round
--    §5.2: "antes de confirmar tu propia decisión".
-- -----------------------------------------------------------------------------

create or replace function public.spy(p_game_id uuid, p_target uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_game games;
  v_me   game_players;
  v_tgt  game_players;
  c      record;
  v_prev round_actions;
  v_out  jsonb;
begin
  select * into v_game from games where id = p_game_id;
  if not found or v_game.status <> 'playing' then raise exception 'Partida no disponible'; end if;
  if v_game.round_phase <> 'decision' then raise exception 'No es la fase de decisión'; end if;
  if now() > v_game.round_deadline then raise exception 'El tiempo de decisión ya venció'; end if;

  select * into v_me from game_players where game_id = p_game_id and user_id = v_uid for update;
  if not found then raise exception 'No participas en esta partida'; end if;
  if p_target = v_uid then raise exception 'No puedes auto-sabotearte'; end if;

  select * into v_tgt from game_players where game_id = p_game_id and user_id = p_target;
  if not found then raise exception 'Objetivo inválido'; end if;

  if exists (select 1 from sabotage_cooldowns
              where game_id = p_game_id and user_id = v_uid and sabotage_type = 'spy'
                and available_from_round > v_game.current_round) then
    raise exception 'El espionaje está en cooldown';
  end if;

  -- 1 sabotaje por ronda (§5.1)
  select * into v_prev from round_actions
   where game_id = p_game_id and round = v_game.current_round and user_id = v_uid;
  if v_prev.sabotage_type is not null then
    raise exception 'Ya elegiste un sabotaje para esta ronda';
  end if;

  select * into c from _sabotage_cost('spy');
  if v_me.gold < c.gold or v_me.food < c.food then raise exception 'Recursos insuficientes'; end if;

  update game_players
     set gold = gold - c.gold, food = food - c.food
   where game_id = p_game_id and user_id = v_uid;

  insert into sabotage_cooldowns (game_id, user_id, sabotage_type, available_from_round)
  values (p_game_id, v_uid, 'spy', v_game.current_round + _sabotage_cooldown('spy'))
  on conflict (game_id, user_id, sabotage_type)
    do update set available_from_round = excluded.available_from_round;

  -- Queda anotado como el sabotaje de la ronda: ya se ejecutó y ya se pagó.
  insert into round_actions (game_id, round, user_id, sabotage_type, sabotage_target)
  values (p_game_id, v_game.current_round, v_uid, 'spy', p_target)
  on conflict (game_id, round, user_id) do update
    set sabotage_type = 'spy', sabotage_target = p_target,
        sabotage_params = null, confirmed_at = now();

  -- Recursos + decisión en curso + misión secreta del objetivo (§5.2)
  select jsonb_build_object(
           'target', p_target,
           'resources', jsonb_build_object('wood', v_tgt.wood, 'stone', v_tgt.stone,
                                           'gold', v_tgt.gold, 'food', v_tgt.food),
           'points', v_tgt.points,
           'decision', (select jsonb_build_object(
                                 'build', ra.build_key,
                                 'sabotage', ra.sabotage_type,
                                 'sabotage_target', ra.sabotage_target)
                          from round_actions ra
                         where ra.game_id = p_game_id and ra.round = v_game.current_round
                           and ra.user_id = p_target),
           'mission', (select jsonb_build_object('name', m.name, 'description', m.description)
                         from player_missions pm join missions_catalog m on m.key = pm.mission_key
                        where pm.game_id = p_game_id and pm.user_id = p_target))
    into v_out;

  -- Evento privado: solo lo ve el espía (RLS de round_events). La víctima no
  -- recibe nada, nunca (§5.3).
  perform _ev(p_game_id, v_game.current_round, 'spy_private', v_uid, p_target, v_out, 'private');

  return v_out;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. TORRE DE VIGILANCIA — "te está apuntando alguien", sin decir quién ni cuál
-- -----------------------------------------------------------------------------

create or replace function public.am_i_targeted(p_game_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_round int;
begin
  select current_round into v_round from games where id = p_game_id;
  if v_round is null then return false; end if;

  -- Sin Torre activa no hay aviso (una Torre dañada tampoco avisa)
  if not exists (
    select 1 from game_buildings gb join buildings_catalog b on b.key = gb.building_key
     where gb.game_id = p_game_id and gb.user_id = v_uid
       and b.effect_key = 'torre_vigilancia'
       and coalesce(gb.paused_until_round, 0) < v_round
  ) then
    return false;
  end if;

  -- Booleano y nada más: quién y con qué se sabrá en el reveal.
  -- El espionaje no dispara la alarma: es silencioso (§5.3).
  return exists (
    select 1 from round_actions
     where game_id = p_game_id and round = v_round
       and sabotage_target = v_uid and sabotage_type is not null and sabotage_type <> 'spy'
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. SUBMIT_ACTION — ahora acepta bloqueo y daño
-- -----------------------------------------------------------------------------

create or replace function public.submit_action(
  p_game_id         uuid,
  p_build_slot      int  default null,
  p_build_slot_2    int  default null,
  p_sabotage_type   text default null,
  p_sabotage_target uuid default null,
  p_sabotage_params jsonb default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_game games;
  v_me   game_players;
  v_prev round_actions;
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

  select * into v_prev from round_actions
   where game_id = p_game_id and round = v_game.current_round and user_id = v_uid;

  ---------------------------------------------------------------- construcción
  if p_build_slot is not null then
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
  -- El espionaje ya se ejecutó y se cobró en su propia RPC: no se toca acá.
  if v_prev.sabotage_type = 'spy' then
    if p_sabotage_type is not null and p_sabotage_type <> 'spy' then
      raise exception 'Ya espiaste esta ronda: solo se permite 1 sabotaje';
    end if;
    p_sabotage_type := 'spy';
    p_sabotage_target := v_prev.sabotage_target;
    p_sabotage_params := null;

  elsif p_sabotage_type = 'spy' then
    raise exception 'El espionaje se ejecuta con la acción de espiar, no al confirmar';

  elsif p_sabotage_type is not null then
    if p_sabotage_type not in ('steal','block','damage') then
      raise exception 'Sabotaje inválido: %', p_sabotage_type;
    end if;
    if p_sabotage_target is null then raise exception 'Falta el objetivo'; end if;
    if p_sabotage_target = v_uid then raise exception 'No puedes auto-sabotearte'; end if;
    if not exists (select 1 from game_players
                    where game_id = p_game_id and user_id = p_sabotage_target) then
      raise exception 'Objetivo inválido';
    end if;
    if exists (select 1 from sabotage_cooldowns
                where game_id = p_game_id and user_id = v_uid
                  and sabotage_type = p_sabotage_type
                  and available_from_round > v_game.current_round) then
      raise exception 'Ese sabotaje está en cooldown';
    end if;

    if p_sabotage_type = 'steal'
       and coalesce(p_sabotage_params->>'resource','') not in ('wood','stone','gold','food') then
      raise exception 'Elige qué recurso robar';
    end if;

    if p_sabotage_type = 'damage' then
      if not exists (select 1 from game_buildings
                      where game_id = p_game_id
                        and user_id = p_sabotage_target
                        and id = (p_sabotage_params->>'building_id')::uuid) then
        raise exception 'Elige un edificio válido del rival';
      end if;
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

  select count(*) into v_players   from game_players where game_id = p_game_id;
  select count(*) into v_confirmed from round_confirmations
   where game_id = p_game_id and round = v_game.current_round;
  if v_confirmed >= v_players then
    perform resolve_round(p_game_id);
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. RESOLVE_ROUND — los tres sabotajes que se resuelven en la ronda
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
  v_bid uuid;
  v_any_sabotage bool;
  v_finish bool := false;
begin
  select * into v_game from games where id = p_game_id for update;
  if not found then return; end if;
  if v_game.status <> 'playing' or v_game.round_phase <> 'decision' then return; end if;

  select * into v_room from rooms where id = v_game.room_id;
  v_round := v_game.current_round;
  update games set round_phase = 'resolution' where id = p_game_id;

  -- 1. Sin acción => guardar (§6.1)
  insert into round_actions (game_id, round, user_id)
  select p_game_id, v_round, user_id from game_players where game_id = p_game_id
  on conflict do nothing;

  -- 2. CONSTRUCCIONES primero: lo gastado en construir ya no se puede robar (§5.4)
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

      update game_players gpl
         set points        = gpl.points        + bc.points + case when gpl.character_key = 'arquitecta' then 1 else 0 end,
             pts_buildings = gpl.pts_buildings + bc.points + case when gpl.character_key = 'arquitecta' then 1 else 0 end
        from buildings_catalog bc
       where bc.key = b.k and gpl.game_id = p_game_id and gpl.user_id = a.user_id;

      if b.n = 2 then
        update game_players set nomad_double_used = true
         where game_id = p_game_id and user_id = a.user_id;
      end if;

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

  -- 3. Costos de sabotaje por adelantado: no se devuelven aunque falle (§5.4).
  --    El espionaje ya pagó en su propia RPC.
  select exists (select 1 from round_actions
                  where game_id = p_game_id and round = v_round
                    and sabotage_type is not null and sabotage_type <> 'spy')
    into v_any_sabotage;

  for a in
    select * from round_actions
     where game_id = p_game_id and round = v_round
       and sabotage_type is not null and sabotage_type <> 'spy'
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

  -- 4. Efectos, en orden aleatorio entre sí (§5.4)
  for a in
    select * from round_actions
     where game_id = p_game_id and round = v_round
       and sabotage_type in ('steal','block','damage')
     order by random()
  loop
    select * into gp  from game_players where game_id = p_game_id and user_id = a.user_id for update;
    select * into tgt from game_players where game_id = p_game_id and user_id = a.sabotage_target for update;
    v_blocked := null;

    ------------------------------------------------------------ defensas
    -- Primero las inmunidades permanentes: gastar el escudo único de La
    -- Guardiana en algo que la Fortaleza iba a frenar igual sería tirarlo.
    if a.sabotage_type = 'block' and tgt.character_key = 'nomada' then
      v_blocked := 'nomada';                                   -- pasiva del Nómada (§7)
    elsif a.sabotage_type = 'damage' and exists (
      select 1 from game_buildings gb join buildings_catalog bc on bc.key = gb.building_key
       where gb.game_id = p_game_id and gb.user_id = tgt.user_id and bc.effect_key = 'fortaleza'
         and coalesce(gb.paused_until_round, 0) < v_round
    ) then
      v_blocked := 'fortaleza';
    elsif tgt.character_key = 'guardiana' and not tgt.guardian_shield_used then
      update game_players set guardian_shield_used = true
       where game_id = p_game_id and user_id = tgt.user_id;
      v_blocked := 'guardiana';                                -- primer sabotaje de la partida
    elsif a.sabotage_type = 'steal' then
      select gb.id into v_wall
        from game_buildings gb join buildings_catalog bc on bc.key = gb.building_key
       where gb.game_id = p_game_id and gb.user_id = tgt.user_id
         and bc.effect_key = 'muralla' and gb.shield_charges > 0
         -- una Muralla dañada no protege: el Daño pausa su efecto (§5.2)
         and coalesce(gb.paused_until_round, 0) < v_round
       limit 1;
      if v_wall is not null then
        update game_buildings set shield_charges = shield_charges - 1 where id = v_wall;
        v_blocked := 'muralla';
      end if;
    end if;

    if v_blocked is not null then
      perform _ev(p_game_id, v_round, a.sabotage_type, a.user_id, tgt.user_id,
                  jsonb_build_object('success', false, 'blocked_by', v_blocked));
      continue;
    end if;

    ------------------------------------------------------------ efectos
    if a.sabotage_type = 'steal' then
      v_res := a.sabotage_params->>'resource';
      v_amount := case when gp.character_key = 'saqueador' then 4 else 2 end;
      execute format('select %I from game_players where game_id=$1 and user_id=$2', v_res)
        into v_avail using p_game_id, tgt.user_id;
      v_taken := least(v_amount, v_avail);

      if v_taken < 1 then
        perform _ev(p_game_id, v_round, 'steal', a.user_id, tgt.user_id,
                    jsonb_build_object('resource', v_res, 'success', false, 'reason', 'empty'));
        continue;
      end if;

      v_lim := _storage_limit(gp.character_key);
      execute format('update game_players set %1$I = %1$I - $3 where game_id=$1 and user_id=$2', v_res)
        using p_game_id, tgt.user_id, v_taken;
      execute format('update game_players set %1$I = least($4, %1$I + $3) where game_id=$1 and user_id=$2', v_res)
        using p_game_id, gp.user_id, v_taken, v_lim;

      perform _ev(p_game_id, v_round, 'steal', a.user_id, tgt.user_id,
                  jsonb_build_object('resource', v_res, 'amount', v_taken, 'success', true));

    elsif a.sabotage_type = 'block' then
      update game_players set blocked_next_round = true
       where game_id = p_game_id and user_id = tgt.user_id;
      perform _ev(p_game_id, v_round, 'block', a.user_id, tgt.user_id,
                  jsonb_build_object('success', true));

    elsif a.sabotage_type = 'damage' then
      v_bid := (a.sabotage_params->>'building_id')::uuid;
      -- Pausa el efecto durante la ronda siguiente (§5.2)
      update game_buildings set paused_until_round = v_round + 1
       where id = v_bid and game_id = p_game_id and user_id = tgt.user_id;
      if not found then
        perform _ev(p_game_id, v_round, 'damage', a.user_id, tgt.user_id,
                    jsonb_build_object('success', false, 'reason', 'no_building'));
        continue;
      end if;
      perform _ev(p_game_id, v_round, 'damage', a.user_id, tgt.user_id,
                  jsonb_build_object('success', true, 'building_id', v_bid,
                                     'building', (select building_key from game_buildings where id = v_bid)));
    end if;

    -- Camino del Saboteador: +1 por sabotaje exitoso (§4.3)
    update game_players
       set points = points + 1, pts_saboteur = pts_saboteur + 1
     where game_id = p_game_id and user_id = a.user_id;
  end loop;

  -- 5. Camino del Superviviente: solo si hubo intento de sabotaje visible (§4.3)
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

  -- 6. Condición de victoria (§9)
  if exists (select 1 from game_players
              where game_id = p_game_id and points >= v_room.target_points)
     or v_round >= v_room.max_rounds then
    v_finish := true;
  end if;

  if v_finish then
    perform finish_game(p_game_id);
  else
    update games
       set round_phase = 'reveal',
           round_deadline = now() + (_reveal_seconds() || ' seconds')::interval
     where id = p_game_id;
  end if;
end;
$$;

revoke execute on function public.resolve_round(uuid) from public, anon, authenticated;
grant execute on function public.submit_action(uuid,int,int,text,uuid,jsonb) to authenticated;
grant execute on function public.spy(uuid,uuid)          to authenticated;
grant execute on function public.am_i_targeted(uuid)     to authenticated;
