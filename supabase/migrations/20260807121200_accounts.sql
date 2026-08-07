-- =============================================================================
-- Cuentas con email + contraseña, nickname propio y código de invitación
--
-- El código se valida DOS veces:
--   1. `invite_code_valid()` antes de registrarse, para dar un error claro.
--   2. El trigger `handle_new_user`, que aborta la creación del usuario si el
--      código no sirve. Sin esto, cualquiera podría saltarse el paso 1 llamando
--      a la API de auth directamente con la publishable key.
-- =============================================================================

create table public.invite_codes (
  code       text primary key,
  active     bool not null default true,
  max_uses   int null,              -- NULL = sin límite
  uses       int not null default 0,
  note       text null,
  created_at timestamptz not null default now()
);

alter table public.invite_codes enable row level security;
-- Sin políticas ni GRANT: los códigos no se listan desde el cliente. Solo los
-- leen las funciones SECURITY DEFINER.

insert into public.invite_codes (code, note) values ('SOY-ALDEANO', 'Código inicial');

-- Un nickname por persona: es lo que se ve en el ranking y en la mesa.
create unique index profiles_nickname_lower_idx on public.profiles (lower(nickname));

-- -----------------------------------------------------------------------------
-- Validaciones previas al registro (dan mensajes útiles; no son la defensa)
-- -----------------------------------------------------------------------------

create or replace function public.invite_code_valid(p_code text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from invite_codes
     where code = upper(trim(p_code))
       and active
       and (max_uses is null or uses < max_uses)
  );
$$;

create or replace function public.nickname_available(p_nickname text)
returns boolean
language sql stable security definer set search_path = public as $$
  select char_length(trim(p_nickname)) between 2 and 16
     and not exists (select 1 from profiles where lower(nickname) = lower(trim(p_nickname)));
$$;

revoke execute on function public.invite_code_valid(text)   from public;
revoke execute on function public.nickname_available(text)  from public;
grant  execute on function public.invite_code_valid(text)   to anon, authenticated;
grant  execute on function public.nickname_available(text)  to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Alta de usuario: acá se decide si el registro procede
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_code text := upper(trim(coalesce(new.raw_user_meta_data->>'invite_code', '')));
  v_nick text := trim(coalesce(new.raw_user_meta_data->>'nickname', ''));
begin
  if coalesce(new.is_anonymous, false) then
    -- Invitado sin cuenta: nombre generado, sin código
    v_nick := 'Aldeano' || substr(replace(new.id::text, '-', ''), 1, 6);
  else
    if not exists (
      select 1 from invite_codes
       where code = v_code and active and (max_uses is null or uses < max_uses)
    ) then
      raise exception 'invite_code_invalido' using errcode = 'P0001';
    end if;

    if char_length(v_nick) not between 2 and 16 then
      raise exception 'nickname_invalido' using errcode = 'P0001';
    end if;

    if exists (select 1 from profiles where lower(nickname) = lower(v_nick)) then
      raise exception 'nickname_en_uso' using errcode = 'P0001';
    end if;

    update invite_codes set uses = uses + 1 where code = v_code;
  end if;

  insert into public.profiles (id, nickname) values (new.id, v_nick);
  insert into public.user_stats (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Cambio de nickname ya estando dentro
-- Vía RPC y no por UPDATE directo: el índice único devolvería un 23505 crudo.
-- -----------------------------------------------------------------------------

create or replace function public.set_my_nickname(p_nickname text)
returns text
language plpgsql security definer set search_path = public as $$
declare v_nick text := trim(p_nickname);
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if char_length(v_nick) not between 2 and 16 then
    raise exception 'El nombre debe tener entre 2 y 16 caracteres';
  end if;
  if exists (select 1 from profiles where lower(nickname) = lower(v_nick) and id <> auth.uid()) then
    raise exception 'Ese nombre ya está en uso';
  end if;

  update profiles set nickname = v_nick where id = auth.uid();
  return v_nick;
end;
$$;

revoke execute on function public.set_my_nickname(text) from public, anon;
grant  execute on function public.set_my_nickname(text) to authenticated;

-- El nickname ya no se escribe directo: pasa por la RPC, que valida.
revoke update (nickname) on public.profiles from authenticated;
