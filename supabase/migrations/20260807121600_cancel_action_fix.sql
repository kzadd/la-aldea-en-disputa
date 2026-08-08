-- `round_actions.confirmed_at` es NOT NULL: al deshacer se limpia la decisión
-- pero la marca de tiempo se queda. Da igual para la resolución —una fila con
-- todos los campos en null no hace nada— y evita romper la restricción.

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

revoke execute on function public.cancel_action(uuid) from public, anon;
grant  execute on function public.cancel_action(uuid) to authenticated;
