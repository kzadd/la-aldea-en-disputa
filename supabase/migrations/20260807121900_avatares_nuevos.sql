-- El diseño nuevo trae seis retratos más. La lista blanca vive acá, así que si
-- no se agregan también en la base, la RPC los rechaza.

create or replace function public.set_my_avatar(p_avatar text)
returns text
language plpgsql security definer set search_path = public as $$
declare v_avatar text := trim(p_avatar);
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if v_avatar not in ('aldeano', 'alien', 'oso', 'rana', 'zorro',
                      'pinguino', 'dragon', 'mapache', 'robot',
                      'buho', 'gato', 'jabali', 'bruja', 'esqueleto', 'fantasma') then
    raise exception 'Ese avatar no existe';
  end if;

  update profiles set avatar = v_avatar where id = auth.uid();
  return v_avatar;
end;
$$;

revoke execute on function public.set_my_avatar(text) from public, anon;
grant  execute on function public.set_my_avatar(text) to authenticated;
