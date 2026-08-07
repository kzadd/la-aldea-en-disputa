-- =============================================================================
-- Reloj del servidor (ARCHITECTURE §5)
-- "El deadline manda, no el cliente": quien cierra la ronda es el servidor.
-- pg_cron llama a tick_games() cada 5 segundos; ninguna partida depende de que
-- un cliente esté vivo para avanzar.
-- =============================================================================

create extension if not exists pg_cron with schema cron;

-- Idempotente: re-aplicar la migración no duplica el job
select cron.unschedule(jobid) from cron.job where jobname = 'aldea_tick_games';

select cron.schedule('aldea_tick_games', '5 seconds', $$ select public.tick_games(); $$);
