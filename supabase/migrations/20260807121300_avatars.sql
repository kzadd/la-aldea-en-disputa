-- Avatar de perfil elegible por el jugador.
-- La lista de avatares válidos vive acá, no en el cliente: `profiles` no es
-- escribible directamente, así que la única vía es esta RPC y lo que no esté en
-- la lista se rechaza.

alter table public.profiles
  add column if not exists avatar text not null default 'aldeano';

create or replace function public.set_my_avatar(p_avatar text)
returns text
language plpgsql security definer set search_path = public as $$
declare v_avatar text := trim(p_avatar);
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if v_avatar not in ('aldeano', 'alien', 'oso', 'rana', 'zorro',
                      'pinguino', 'dragon', 'mapache', 'robot') then
    raise exception 'Ese avatar no existe';
  end if;

  update profiles set avatar = v_avatar where id = auth.uid();
  return v_avatar;
end;
$$;

revoke execute on function public.set_my_avatar(text) from public, anon;
grant  execute on function public.set_my_avatar(text) to authenticated;
