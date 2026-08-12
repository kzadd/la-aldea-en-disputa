-- =============================================================================
-- Reset de estadísticas e historial: todo arranca en 0
--
-- Borra los datos de juego acumulados durante las pruebas, no las cuentas: los
-- perfiles, nicknames, avatares y códigos de invitación quedan intactos. Nadie
-- tiene que volver a registrarse.
--
-- Qué queda en 0 después de esto:
--   · Perfil (`user_stats`)     — partidas, victorias, winrate, personajes, camino
--   · Perfil (`my_recent_games`) — sin partidas terminadas, historial vacío
--   · Ranking (`leaderboard`)   — la vista filtra `games_played > 0`, así que vacía
--
-- Los catálogos (personajes, construcciones, misiones, cartas, escalado) no se
-- tocan: son semillas, no datos de jugadores.
-- =============================================================================

-- 1. Historial de partidas y salas.
--
-- Un solo delete alcanza: todo el árbol de la partida cuelga de `rooms` con
-- `on delete cascade` —games, game_players, player_missions, game_buildings,
-- game_market, game_deck, game_production_deck, round_actions,
-- round_confirmations, sabotage_cooldowns, round_events y room_players—.
-- Borrar tabla por tabla sería repetir a mano lo que la FK ya garantiza, y en
-- el orden equivocado fallaría.
delete from public.rooms;

-- Salvavidas: `games.room_id` es NOT NULL, así que no debería quedar ninguna
-- partida huérfana. Si el esquema cambiara, esto evita que sobreviva historial.
delete from public.games;

-- 2. Estadísticas a cero.
--
-- UPDATE y no DELETE: la fila de `user_stats` la crea el trigger de alta de
-- perfil, no el cierre de partida. Borrándola, el jugador se queda sin fila y
-- el perfil no tendría de dónde leer hasta su primera partida.
update public.user_stats
   set games_played       = 0,
       games_won          = 0,
       favorite_character = null,
       best_character     = null,
       most_used_path     = null,
       updated_at         = now();
