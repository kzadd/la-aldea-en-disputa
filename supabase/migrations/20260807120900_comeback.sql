-- =============================================================================
-- Paso 7 — Mecánica de comeback / "viento a favor" (GAME_DESIGN §9.1)
--
-- El último del puntaje recibe +1 recurso por ronda, además de la producción.
-- Si hay empate en el último lugar, lo reciben todos los empatados.
--
-- Dos decisiones de implementación:
--   · Sin fase extra de input (ARCHITECTURE §4): el jugador fija su preferencia
--     una vez y, si no la fijó, se le da el recurso que menos tenga.
--   · Solo aplica cuando existe un último lugar de verdad. Si todos están
--     empatados (la ronda 1, siempre), no hay "último" a quien compensar:
--     dárselo a todos sería subir la producción base, no un comeback.
-- =============================================================================

create or replace function public.set_comeback_preference(p_game_id uuid, p_resource text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_resource is not null and p_resource not in ('wood','stone','gold','food') then
    raise exception 'Recurso inválido';
  end if;
  update game_players set comeback_preference = p_resource
   where game_id = p_game_id and user_id = auth.uid();
  if not found then raise exception 'No participas en esta partida'; end if;
end;
$$;

grant execute on function public.set_comeback_preference(uuid,text) to authenticated;

-- -----------------------------------------------------------------------------
-- Producción + comeback
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
  v_min    int;
  v_max    int;
  v_pick   text;
begin
  select count(*) into v_n from game_players where game_id = p_game;
  select count(*) into v_size from game_production_deck where game_id = p_game;

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
           food  = least(v_lim, gp.food  + v_f + bonus.f
                          + case when r.character_key = 'granjero' then 1 else 0 end)
      from bonus
     where gp.game_id = p_game and gp.user_id = r.user_id;

    select jsonb_build_object('wood', gp.wood, 'stone', gp.stone, 'gold', gp.gold, 'food', gp.food)
      into v_gain from game_players gp where gp.game_id = p_game and gp.user_id = r.user_id;

    perform _ev(p_game, p_round, 'production', null, r.user_id,
                jsonb_build_object('card', v_card.key, 'card_name', v_card.name, 'totals', v_gain));
  end loop;

  -- ------------------------------------------------------------- comeback §9.1
  select min(points), max(points) into v_min, v_max from game_players where game_id = p_game;

  if v_min < v_max then
    for r in select * from game_players where game_id = p_game and points = v_min loop
      v_lim := _storage_limit(r.character_key);

      -- Preferencia declarada, o el recurso que menos tenga
      v_pick := coalesce(r.comeback_preference,
        case
          when r.wood  <= least(r.stone, r.gold, r.food) then 'wood'
          when r.food  <= least(r.stone, r.gold)         then 'food'
          when r.stone <= r.gold                         then 'stone'
          else 'gold'
        end);

      execute format(
        'update game_players set %1$I = least($3, %1$I + 1) where game_id=$1 and user_id=$2', v_pick)
        using p_game, r.user_id, v_lim;

      -- Visible y transparente: "nadie siente trampa oculta" (§9.1)
      perform _ev(p_game, p_round, 'comeback', null, r.user_id,
                  jsonb_build_object('resource', v_pick));
    end loop;
  end if;
end;
$$;

revoke execute on function public._apply_production(uuid,int) from public, anon, authenticated;
