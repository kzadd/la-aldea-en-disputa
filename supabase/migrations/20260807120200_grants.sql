-- =============================================================================
-- Migración 001 (parte 3): GRANTs de lectura
-- Los proyectos nuevos de Supabase ya no otorgan privilegios por defecto a
-- `anon` / `authenticated` sobre las tablas de `public`. RLS sin GRANT = 42501.
-- Aquí se otorga SELECT explícito y solo donde corresponde; la escritura sigue
-- siendo exclusiva de las RPCs SECURITY DEFINER (ARCHITECTURE §1, §3).
-- =============================================================================

grant usage on schema public to anon, authenticated;

-- Catálogos: lectura pública (el cliente los usa para renderizar)
grant select on public.characters_catalog        to anon, authenticated;
grant select on public.buildings_catalog         to anon, authenticated;
grant select on public.buildings_with_production to anon, authenticated;
grant select on public.missions_catalog          to anon, authenticated;
grant select on public.production_cards          to anon, authenticated;
grant select on public.production_scaling        to anon, authenticated;

-- Perfiles y ranking global: visibles en Home (GAME_DESIGN §10.2)
grant select on public.profiles   to anon, authenticated;
grant select on public.user_stats to anon, authenticated;

-- Estado de sala y partida: solo usuarios autenticados; el filtrado fino lo hace RLS
grant select on public.rooms              to authenticated;
grant select on public.room_players       to authenticated;
grant select on public.games              to authenticated;
grant select on public.game_players       to authenticated;
grant select on public.game_buildings     to authenticated;
grant select on public.game_market        to authenticated;
grant select on public.player_missions    to authenticated;
grant select on public.round_actions      to authenticated;
grant select on public.round_events       to authenticated;
grant select on public.sabotage_cooldowns to authenticated;

-- game_deck y game_production_deck: SIN grant y SIN política. Ver el mazo sería
-- ver el futuro del mercado. Solo las RPCs (SECURITY DEFINER) los tocan.

-- Futuras tablas de `public` no heredan permisos por accidente.
alter default privileges in schema public
  revoke all on tables from anon, authenticated;
