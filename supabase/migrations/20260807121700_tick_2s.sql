-- El reveal dura 5 s, pero quien lo cierra es `tick_games()`: con el cron cada
-- 5 s la revelación podía quedarse hasta 10 s en pantalla. Cada 2 s el cierre
-- de ronda y el fin del reveal se sienten inmediatos.

select cron.unschedule('aldea_tick_games');
select cron.schedule('aldea_tick_games', '2 seconds', $$ select public.tick_games(); $$);
