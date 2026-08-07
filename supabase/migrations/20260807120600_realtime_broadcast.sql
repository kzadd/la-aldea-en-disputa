-- =============================================================================
-- Realtime por Broadcast desde la base (ARCHITECTURE §5)
--
-- Por qué no Postgres Changes: este proyecto usa las API keys nuevas
-- (`sb_publishable_…`), que no son JWT. Con ellas el canal llega a SUBSCRIBED
-- pero Realtime nunca registra la suscripción (`realtime.subscription` queda
-- vacía) y no entrega ningún cambio. Broadcast sí funciona, y es además lo que
-- ARCHITECTURE §5 pedía para `room:{room_id}` y `game:{game_id}`.
--
-- El servidor emite; el cliente solo escucha y refetchea. El payload no lleva
-- datos de juego: quien escucha un topic igual tiene que pasar por RLS para
-- leer las tablas.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Quién puede escuchar qué topic
-- -----------------------------------------------------------------------------

create policy "aldea_read_own_topics" on realtime.messages for select to authenticated
using (
  case
    when realtime.topic() ~ '^room:[0-9a-f-]{36}$'
      then public.is_room_member(substring(realtime.topic() from 6)::uuid)
    when realtime.topic() ~ '^game:[0-9a-f-]{36}$'
      then public.is_game_participant(substring(realtime.topic() from 6)::uuid)
    else false
  end
);

-- -----------------------------------------------------------------------------
-- 2. Emisores
--    Un solo evento 'changed' por topic: el cliente refetchea el estado que le
--    permite su RLS. Nada sensible viaja en el payload.
-- -----------------------------------------------------------------------------

create or replace function public._rt_notify_room()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform realtime.send(
    jsonb_build_object('table', tg_table_name),
    'changed',
    'room:' || coalesce(new.room_id, old.room_id)::text,
    true);
  return null;
end;
$$;

create or replace function public._rt_notify_rooms()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform realtime.send(
    jsonb_build_object('table', 'rooms'),
    'changed',
    'room:' || coalesce(new.id, old.id)::text,
    true);
  return null;
end;
$$;

create or replace function public._rt_notify_game()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform realtime.send(
    jsonb_build_object('table', tg_table_name),
    'changed',
    'game:' || coalesce(new.game_id, old.game_id)::text,
    true);
  return null;
end;
$$;

-- `games` avisa por los dos canales: el lobby necesita enterarse de que arrancó
create or replace function public._rt_notify_games()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_game uuid := coalesce(new.id, old.id);
begin
  perform realtime.send(jsonb_build_object('table','games'), 'changed', 'game:' || v_game::text, true);
  perform realtime.send(jsonb_build_object('table','games','game_id',v_game),
                        'changed', 'room:' || coalesce(new.room_id, old.room_id)::text, true);
  return null;
end;
$$;

create trigger rt_rooms        after insert or update or delete on public.rooms
  for each row execute function public._rt_notify_rooms();
create trigger rt_room_players after insert or update or delete on public.room_players
  for each row execute function public._rt_notify_room();
create trigger rt_games        after insert or update or delete on public.games
  for each row execute function public._rt_notify_games();

create trigger rt_game_players  after insert or update or delete on public.game_players
  for each row execute function public._rt_notify_game();
create trigger rt_game_market   after insert or update or delete on public.game_market
  for each row execute function public._rt_notify_game();
create trigger rt_game_buildings after insert or update or delete on public.game_buildings
  for each row execute function public._rt_notify_game();
create trigger rt_round_events  after insert on public.round_events
  for each row execute function public._rt_notify_game();
create trigger rt_round_confirmations after insert on public.round_confirmations
  for each row execute function public._rt_notify_game();

revoke execute on function public._rt_notify_room()   from public, anon, authenticated;
revoke execute on function public._rt_notify_rooms()  from public, anon, authenticated;
revoke execute on function public._rt_notify_game()   from public, anon, authenticated;
revoke execute on function public._rt_notify_games()  from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. Postgres Changes queda fuera: sin suscriptores, publicar es WAL desperdiciado
-- -----------------------------------------------------------------------------

alter publication supabase_realtime drop table public.games;
alter publication supabase_realtime drop table public.game_players;
alter publication supabase_realtime drop table public.game_market;
alter publication supabase_realtime drop table public.game_buildings;
alter publication supabase_realtime drop table public.round_events;
alter publication supabase_realtime drop table public.room_players;
alter publication supabase_realtime drop table public.rooms;
alter publication supabase_realtime drop table public.round_confirmations;
