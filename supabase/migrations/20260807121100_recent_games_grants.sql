-- =============================================================================
-- Corrección de permisos: `my_recent_games` quedó ejecutable por `public`.
-- Las funciones de Postgres otorgan EXECUTE a PUBLIC por defecto, así que el
-- GRANT a `authenticated` de la migración anterior no restringía nada.
--
-- No había filtración —sin `auth.uid()` la función devuelve cero filas— pero el
-- proyecto trabaja con permisos explícitos: lo que no se otorga, no se puede.
-- =============================================================================

revoke execute on function public.my_recent_games(int) from public, anon;
grant  execute on function public.my_recent_games(int) to authenticated;
