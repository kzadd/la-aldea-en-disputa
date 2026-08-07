# Documento Técnico de Arquitectura

## "La Aldea en Disputa" — Juego multijugador de recursos, construcción y sabotaje

### Handoff para implementación (Antigravity + Claude)

> Este documento acompaña al **Documento de Diseño de Juego** (reglas completas). Aquí se define el CÓMO técnico. Ante cualquier ambigüedad de reglas, el documento de diseño manda.

---

## 1. Stack tecnológico

| Capa            | Tecnología                                             | Notas                                                                        |
| --------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Frontend        | Vite + React (SPA)                                     | Sin Phaser — es un juego de UI (cartas, botones, timers), no de mundo/física |
| Estilos         | Tailwind CSS + estética pixel art                      | Fuente tipo "Press Start 2P", `image-rendering: pixelated` para sprites      |
| Animaciones     | CSS transitions + Framer Motion                        | Para el reveal dramático y el sorteo de personajes                           |
| PWA             | vite-plugin-pwa                                        | Manifest + service worker, instalable en móvil, portrait-only                |
| Backend         | Supabase (Postgres + Realtime + Auth + Edge Functions) | Proyecto nuevo, separado de VETA y La Torre del Dragón                       |
| Lógica de juego | RPCs de Postgres (transaccionales)                     | **Server-authoritative**: el cliente nunca calcula resultados                |
| Timer de ronda  | Edge Function programada / pg_cron                     | El cierre de ronda NO depende de ningún cliente                              |
| Deploy          | Netlify (drag-and-drop del build)                      | Variables `VITE_*` baked at build time                                       |

**Principio rector: el cliente es solo una pantalla.** Toda decisión de juego se envía al servidor y toda resolución ocurre en Postgres dentro de transacciones. El cliente renderiza estado y envía intenciones. Nada más.

---

## 2. Modelo de datos (Postgres)

### 2.1 Tablas

```sql
-- Perfiles y estadísticas globales
profiles (
  id uuid PK -> auth.users,
  nickname text NOT NULL,
  created_at timestamptz
)

user_stats (
  user_id uuid PK -> profiles,
  games_played int DEFAULT 0,
  games_won int DEFAULT 0,
  -- winrate se calcula, no se guarda
  favorite_character text,          -- se recalcula al cerrar cada partida
  best_character text,              -- personaje con mejor winrate del usuario
  most_used_path text               -- constructor | acumulador | superviviente | saboteador
)

-- Salas
rooms (
  id uuid PK,
  code text UNIQUE NOT NULL,        -- 4-6 chars alfanuméricos, generado server-side
  host_id uuid -> profiles,
  status text NOT NULL,             -- 'lobby' | 'playing' | 'finished'
  -- Configuración
  max_players int CHECK (2..8),
  target_points int,                -- ej. 20/30/40
  max_rounds int,                   -- ej. 10/15/20
  decision_timer_seconds int,       -- 30 | 45 | 60
  created_at timestamptz
)

room_players (
  room_id uuid -> rooms,
  user_id uuid -> profiles,
  joined_at timestamptz,
  PRIMARY KEY (room_id, user_id)
)

-- Partidas
games (
  id uuid PK,
  room_id uuid -> rooms,
  status text NOT NULL,             -- 'assigning' | 'playing' | 'finished'
  current_round int DEFAULT 0,
  round_phase text,                 -- 'production' | 'decision' | 'reveal' | 'resolution'
  round_deadline timestamptz,       -- cuándo cierra la fase de decisión actual
  winner_id uuid NULL,
  started_at timestamptz,
  finished_at timestamptz
)

game_players (
  game_id uuid -> games,
  user_id uuid -> profiles,
  character_key text NOT NULL,      -- 'herrero' | 'comerciante' | 'espia' | ...
  mission_key text NOT NULL,        -- SECRETO: solo visible para el dueño (RLS)
  mission_completed bool DEFAULT false,
  -- Recursos (límite 10, o 15 si comerciante/granjero — se valida en RPC)
  wood int DEFAULT 0, stone int DEFAULT 0, gold int DEFAULT 0, food int DEFAULT 0,
  points int DEFAULT 0,
  connected bool DEFAULT true,
  -- Flags de estado por efectos
  blocked_next_round bool DEFAULT false,     -- por Bloqueo temporal
  guardian_shield_used bool DEFAULT false,   -- pasiva de La Guardiana
  nomad_double_used bool DEFAULT false,      -- habilidad única del Nómada
  PRIMARY KEY (game_id, user_id)
)

game_buildings (
  id uuid PK,
  game_id uuid -> games,
  user_id uuid -> profiles,
  building_key text NOT NULL,       -- 'granero', 'cantera', ...
  paused_until_round int NULL,      -- por Daño a estructura
  built_at_round int NOT NULL
)

-- El mercado visible (6 slots) y el mazo restante
game_market (
  game_id uuid -> games,
  slot int CHECK (0..5),
  building_key text NULL,           -- NULL = slot vacío (mazo agotado)
  PRIMARY KEY (game_id, slot)
)

game_deck (
  game_id uuid -> games,
  building_key text,
  position int,                     -- orden barajado
  PRIMARY KEY (game_id, position)
)

-- Decisiones por ronda (SECRETO hasta el reveal — RLS)
round_actions (
  game_id uuid -> games,
  round int,
  user_id uuid -> profiles,
  build_key text NULL,              -- construcción elegida (o NULL)
  build_slot int NULL,
  sabotage_type text NULL,          -- 'steal' | 'block' | 'damage' | 'spy' | NULL
  sabotage_target uuid NULL,
  sabotage_params jsonb NULL,       -- ej. {resource:'gold'} para robo, {building_id} para daño
  confirmed_at timestamptz,
  PRIMARY KEY (game_id, round, user_id)
)

-- Cooldowns de sabotaje
sabotage_cooldowns (
  game_id uuid, user_id uuid, sabotage_type text,
  available_from_round int,
  PRIMARY KEY (game_id, user_id, sabotage_type)
)

-- Log de eventos resueltos (para el reveal y el historial)
round_events (
  id bigserial PK,
  game_id uuid -> games,
  round int,
  type text,                        -- 'production' | 'build' | 'steal' | 'block' | 'damage' | 'spy_private' | 'points'
  actor_id uuid NULL,
  target_id uuid NULL,
  payload jsonb,                    -- detalle del evento
  visibility text NOT NULL          -- 'public' | 'private'  (spy_private solo lo ve el actor)
)
```

### 2.2 Datos estáticos (constantes en el código o tabla seed)

- `characters`: 8 personajes con sus pasivas (implementadas como condicionales en las RPCs, no como datos)
- `buildings_catalog`: ~15-20 construcciones con costo, puntos y efecto
- `missions_catalog`: ~15-20 misiones (todas +5 pts) con su función de verificación
- `production_deck`: definición del mazo de producción (ver documento de diseño §3.2; escalar por nº de jugadores)

Recomendación: catálogos como **tablas seed** en Postgres (no hardcodeados en el cliente), así las RPCs validan contra la misma fuente y el balance se ajusta sin redeploy del front.

---

## 3. Seguridad y RLS (crítico en este juego)

Hay **dos secretos** que la base de datos debe proteger a nivel de fila/columna, porque cualquier jugador puede inspeccionar el tráfico de red:

1. **`game_players.mission_key`** — la misión secreta. Nadie más que el dueño puede leerla hasta que `games.status = 'finished'`.
2. **`round_actions` de la ronda en curso** — las decisiones antes del reveal. Solo el dueño puede leer su propia fila mientras `round = current_round` y la fase no sea 'reveal'/'resolution'.

Implementación recomendada:

- RLS en `round_actions`: `user_id = auth.uid() OR (round < (SELECT current_round FROM games WHERE id = game_id))`
- Para `mission_key`: como RLS no oculta columnas, usar una de estas opciones:
  - **Opción A (recomendada):** tabla separada `player_missions (game_id, user_id, mission_key)` con RLS estricta por dueño + apertura total cuando la partida termina.
  - Opción B: vista pública de `game_players` sin la columna, y acceso a la columna solo vía RPC `get_my_mission()`.
- `round_events` con `visibility = 'private'` (espionaje): RLS `actor_id = auth.uid() OR visibility = 'public'`.
- **Excepción del Espionaje:** la RPC del espionaje devuelve la misión del objetivo al actor, pero registra el evento como `private` — la víctima nunca recibe notificación (regla §5.3 del diseño).
- Los recursos y puntos de todos son **públicos** por diseño (se ven en pantalla), no requieren protección.
- Escrituras: los clientes **nunca** escriben directamente en tablas de juego. Todo pasa por RPCs `SECURITY DEFINER` que validan. RLS de INSERT/UPDATE/DELETE: denegado para el rol `authenticated` en todas las tablas de juego.

---

## 4. RPCs (funciones Postgres, todas transaccionales)

```
create_room(config) -> room                 -- genera código único, crea sala, une al host
join_room(code) -> room                     -- valida cupo y estado 'lobby'
leave_room(room_id)
start_game(room_id) -> game_id              -- solo host; sortea personajes (sin repetir) y
                                            -- misiones (1 por jugador); baraja mazo; llena
                                            -- mercado (6 slots); crea ronda 1 en fase 'production'

submit_action(game_id, action) -> ok        -- valida TODO server-side:
                                            --   fase = 'decision' y deadline no vencido
                                            --   recursos suficientes (aplicando pasivas: Herrero -1 piedra, etc.)
                                            --   cooldown del sabotaje disponible
                                            --   máx 1 construcción + 1 sabotaje
                                            --   objetivo válido (no self, jugador de la partida)
                                            --   no bloqueado si intenta construir
                                            -- upsert en round_actions (puede cambiar hasta el deadline)

resolve_round(game_id) -> events            -- LA función central. Llamada por Edge Function al
                                            -- vencer el deadline (o antes si todos confirmaron):
                                            --   1. jugadores sin acción => default 'guardar'
                                            --   2. resolver construcciones (cobrar recursos, asignar
                                            --      edificios y puntos; pasivas Arquitecta/Herrero/Nómada)
                                            --   3. resolver sabotajes en orden aleatorio (reglas §5.4):
                                            --      escudo Guardiana, Muralla, Saqueador x2, robos
                                            --      sobre lo restante, etc.
                                            --   4. puntos de Saboteador y Superviviente de la ronda
                                            --   5. verificar misiones cumplidas (marcar, no puntuar aún
                                            --      si el diseño las revela al final; puntuar al cierre)
                                            --   6. verificar condición de victoria; si no:
                                            --      producción de la ronda siguiente (carta del mazo,
                                            --      bonus de edificios activos y pasivas, comeback +1
                                            --      al último — pedirlo vía elección diferida o default
                                            --      al recurso que menos tenga), fase -> 'decision',
                                            --      nuevo deadline
                                            --   7. escribir round_events y broadcast

get_my_mission(game_id) -> mission
spy_result(game_id, round) -> private_view  -- devuelve al espía los datos del objetivo

finish_game(game_id)                        -- puntúa misiones cumplidas (+5), Acumulador
                                            -- (recursos/3), declara ganador, actualiza user_stats
```

**Nota sobre el comeback (+1 recurso a elección):** para no agregar una fase extra de input, implementarlo como default automático (el recurso que menos tenga el jugador) con opción de preferencia configurable en su pantalla ("mi recurso de comeback preferido"). Evita bloquear la ronda esperando una elección.

---

## 5. Realtime (Supabase)

### Canales

| Canal            | Tipo                         | Uso                                             |
| ---------------- | ---------------------------- | ----------------------------------------------- |
| `room:{room_id}` | Presence + Broadcast         | Lobby: quién está, quién se une/va, host inicia |
| `game:{game_id}` | Broadcast + Postgres Changes | Fases de ronda, reveal, estado "X ya confirmó"  |

### Eventos clave por broadcast

- `player_joined` / `player_left` (lobby)
- `game_started` → todos navegan al sorteo de personajes
- `characters_assigned` → payload público con personaje de cada quien (la misión viaja solo por `get_my_mission`)
- `phase_changed` → `{phase, round, deadline}`
- `player_confirmed` → `{user_id}` (sin contenido de la decisión — solo el hecho)
- `round_resolved` → payload con los `round_events` públicos de la ronda, para animar el reveal
- `game_finished` → resultados finales + misiones reveladas de todos

**El deadline manda, no el cliente:** el cliente muestra el countdown con `round_deadline`, pero quien cierra la ronda es el servidor (Edge Function con cron cada ~5s revisando partidas con deadline vencido, o pg_cron). Si todos confirmaron antes, `submit_action` de la última persona puede disparar `resolve_round` inmediatamente (mejor ritmo de juego).

---

## 6. Estructura del cliente (React)

```
src/
  main.jsx / App.jsx            -- router simple por estado (sin react-router necesario)
  lib/supabase.js
  screens/
    Home.jsx                    -- nickname, crear/unirse, leaderboard resumido
    Lobby.jsx                   -- presence en vivo, config visible, botón iniciar (host)
    CharacterDraw.jsx           -- animación de sorteo + misión secreta propia
    Game.jsx                    -- pantalla principal de partida
    Results.jsx                 -- podio, misiones reveladas, botón revancha
  components/game/
    ResourceBar.jsx             -- recursos propios (arriba)
    Market.jsx                  -- 6 cartas de construcción (centro)
    SabotagePanel.jsx           -- 4 acciones + selector de objetivo (abajo)
    PlayersStrip.jsx            -- rivales: puntos, edificios, ícono comeback, "ya decidió"
    RoundTimer.jsx              -- countdown contra round_deadline
    RevealOverlay.jsx           -- animación del reveal (quién hizo qué a quién)
  hooks/
    useRoom.js / useGame.js     -- suscripciones realtime + estado
  data/
    characters.js buildings.js  -- SOLO para renderizar (nombres, arte, descripciones);
                                -- la verdad de costos/efectos vive en el servidor
```

### Layout móvil (portrait, una sola pantalla sin scroll)

```
┌─────────────────────────┐
│ Recursos propios + timer │
├─────────────────────────┤
│ Rivales (strip horizontal)│
├─────────────────────────┤
│ Mercado (6 cartas, grid) │
├─────────────────────────┤
│ Sabotajes (4 botones)    │
│ [Confirmar decisión]     │
└─────────────────────────┘
```

---

## 7. Flujo de una ronda (end-to-end)

1. Server: `resolve_round` de la ronda anterior dejó `phase='decision'`, `round_deadline=now()+timer` y broadcast `phase_changed`
2. Cliente: anima la producción recibida (viene en `round_events`), habilita la UI de decisión, arranca countdown
3. Jugador arma su jugada (0-1 construcción + 0-1 sabotaje) → `submit_action` (puede re-enviar hasta el deadline)
4. Server valida y hace upsert; broadcast `player_confirmed`
5. Al deadline (o cuando todos confirmaron): Edge Function → `resolve_round`
6. Server resuelve todo transaccionalmente, escribe `round_events`, broadcast `round_resolved` con eventos públicos
7. Cliente: fase 'reveal' → `RevealOverlay` anima secuencialmente (construcciones → sabotajes → puntos), ~5-8s
8. Vuelve al paso 1, o `finish_game` si se cumplió la condición de victoria

---

## 8. Orden de implementación sugerido (para Antigravity)

1. **Migración 001**: tablas + RLS + seeds de catálogos (construcciones, misiones, mazo de producción)
2. **RPCs core**: `create_room`, `join_room`, `start_game`, `submit_action`, `resolve_round` (versión mínima: solo construir y robar), `finish_game`
3. **Cliente mínimo**: Home → Lobby → CharacterDraw → Game con mercado reducido (~8 cartas) y solo Robo como sabotaje
4. **Playtest 1 (3 jugadores)**: validar el loop y el reveal simultáneo ← hito clave
5. Sabotajes restantes (bloqueo, daño, espionaje) + cooldowns + defensas (Muralla, Torre, pasivas)
6. Misiones secretas + verificación al cierre
7. Comeback, presets de duración, PWA, pulido visual pixel art
8. Ranking global (`user_stats` + leaderboard en Home)
9. Deploy Netlify + playtest completo con 8 jugadores

---

## 9. Decisiones ya tomadas (no re-decidir durante la implementación)

- Server-authoritative total: cliente no calcula nada de juego
- Decisión simultánea con deadline server-side; default = guardar
- Sabotajes visibles en reveal; espionaje silencioso
- Misiones secretas: 1 por jugador, al azar, fijas, +5 pts, reveladas solo al final
- Resolución: construcciones → sabotajes (orden aleatorio) → puntos
- Sin Phaser; sin localStorage para estado de juego (el estado vive en Supabase)
- Proyecto Supabase nuevo e independiente de VETA / La Torre del Dragón
