-- =============================================================================
-- Cancelar no es terminar. Cuando el host corta una partida a medias, el
-- resultado no representa nada: puntuarla ensuciaba el ranking y el historial
-- de todos. Ahora la partida queda en 'cancelled', sin ganador y sin tocar
-- `user_stats`, y no aparece en `my_recent_games` (que filtra por 'finished').
-- =============================================================================

alter table public.games drop constraint if exists games_status_check;
alter table public.games
  add constraint games_status_check
  check (status in ('assigning', 'playing', 'finished', 'cancelled'));

-- Las misiones se destapan también en la cancelada: ya no hay nada que proteger
create or replace function public.game_is_finished(p_game_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from games
                  where id = p_game_id and status in ('finished', 'cancelled'));
$$;

create or replace function public.cancel_game(p_game_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_game games; v_room rooms;
begin
  select * into v_game from games where id = p_game_id;
  if not found then raise exception 'Partida no encontrada'; end if;
  select * into v_room from rooms where id = v_game.room_id;
  if v_room.host_id <> auth.uid() then
    raise exception 'Solo el host puede cancelar la partida';
  end if;
  if v_game.status not in ('assigning', 'playing') then return; end if;

  update games
     set status = 'cancelled', winner_id = null, finished_at = now(),
         round_phase = null, round_deadline = null
   where id = p_game_id;
  update rooms set status = 'finished' where id = v_game.room_id;

  perform _ev(p_game_id, v_game.current_round, 'game_end', null, null,
              jsonb_build_object('cancelled', true));
end;
$$;

-- El cierre con puntuación deja de estar disponible: la única salida anticipada
-- es cancelar. Si algún día hace falta "terminar y puntuar", se agrega aparte.
drop function if exists public.end_game_now(uuid);

revoke execute on function public.cancel_game(uuid) from public, anon;
grant  execute on function public.cancel_game(uuid) to authenticated;
