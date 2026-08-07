# Supabase — La Aldea en Disputa

Proyecto Supabase nuevo e independiente de VETA / La Torre del Dragón (ARCHITECTURE §9).

## Migraciones

| Archivo | Contenido |
| --- | --- |
| `migrations/20260807120000_init_schema.sql` | Tablas, índices, helpers de autorización, RLS, trigger de alta de perfil, publicación realtime |
| `migrations/20260807120100_seed_catalogs.sql` | Seeds: 8 personajes, 18 construcciones (34 ejemplares), 16 misiones, 10 cartas de producción (17 ejemplares), escalado por nº de jugadores |
| `migrations/20260807120200_grants.sql` | GRANTs de lectura explícitos (este proyecto no da privilegios por defecto a `anon`/`authenticated`) |
| `migrations/20260807120300_rpcs_core.sql` | RPCs core del paso 2 + tabla `round_confirmations` + desglose de puntos por camino |
| `migrations/20260807120400_cron.sql` | `pg_cron` llamando a `tick_games()` cada 5 s |
| `migrations/20260807120500_draw_time.sql` | Tiempo extra en la ronda 1 para el sorteo de personajes |
| `migrations/20260807120600_realtime_broadcast.sql` | Realtime por Broadcast desde la base + RLS de topics |

## Realtime: Broadcast, no Postgres Changes

Este proyecto usa las API keys nuevas (`sb_publishable_…`), que **no son JWT**.
Con ellas el canal de Postgres Changes llega a `SUBSCRIBED` pero Realtime nunca
registra la suscripción (`realtime.subscription` queda vacía) y no entrega nada.
Comprobado: Broadcast sí funciona por el mismo socket.

Así que los cambios los emiten triggers de la base vía `realtime.send()` sobre
dos topics privados, que es lo que ARCHITECTURE §5 pedía de entrada:

- `room:{room_id}` — altas/bajas en el lobby y arranque de partida
- `game:{game_id}` — fases, mercado, edificios, eventos y confirmaciones

El payload solo dice qué tabla cambió; el cliente refetchea lo que su RLS le
permita ver. Quién puede escuchar cada topic se decide en la política
`aldea_read_own_topics` sobre `realtime.messages`.

## API para el cliente (paso 2)

Solo estas seis son ejecutables por `authenticated`; el resto está revocado.

```text
create_room(max_players, target_points, max_rounds, decision_timer_seconds) -> rooms
join_room(code) -> rooms
leave_room(room_id)
start_game(room_id) -> game_id
submit_action(game_id, build_slot, build_slot_2, sabotage_type, sabotage_target, sabotage_params)
get_my_mission(game_id) -> mission
```

`resolve_round`, `_open_decision`, `finish_game` y `tick_games` son del servidor.
El cliente nunca las llama.

### Máquina de fases

`start_game` deja la ronda 1 en `decision` con producción ya aplicada. Después:

```text
decision --(deadline vencido | todos confirmaron)--> resolve_round
       --> reveal (7 s, ARCHITECTURE §7 paso 7) --> _open_decision --> decision (ronda+1)
```

Ambas transiciones las dispara `tick_games()` desde pg_cron cada 5 s. `submit_action`
adelanta el cierre cuando confirma el último jugador.

## Aplicar

El proyecto no tiene host directo (`db.<ref>.supabase.co` no existe), así que se conecta
por el pooler en modo sesión:

```bash
npx supabase db push --db-url \
  "postgresql://postgres.<ref>:<DB_PASSWORD>@aws-1-eu-west-3.pooler.supabase.com:5432/postgres"
```

Región del proyecto: **eu-west-3**. O bien pegar ambos archivos, en orden, en el SQL Editor.

Estado: aplicadas y verificadas (19 tablas, RLS en todas, 0 políticas de escritura).

## Notas de implementación (paso 1)

- **`player_missions` en tabla separada** (ARCHITECTURE §3, Opción A): RLS no oculta
  columnas, así que la misión secreta no vive en `game_players`. `completed` también
  vive ahí para no filtrar señales de la misión.
- **`game_deck` y `game_production_deck` no tienen política de SELECT.** RLS habilitada
  sin políticas = nadie lee. Ver el mazo sería ver el futuro del mercado.
- **Ninguna tabla de juego tiene políticas de escritura.** Todo pasará por RPCs
  `SECURITY DEFINER` (paso 2). Lo único escribible directamente es `profiles.nickname`.
- **`production_scaling.total_delta`** se aplica al recurso más abundante de la carta
  revelada; en empate, prioridad madera > comida > piedra > oro. Lo aplica `resolve_round`.
- **Los GRANTs son explícitos, no heredados.** Cualquier tabla nueva nace sin permisos
  (`alter default privileges ... revoke all`): hay que otorgarle SELECT a mano si el
  cliente debe leerla. Es deliberado — el default seguro es "invisible".

## Verificado contra el proyecto

Lecturas con la publishable key: catálogos `200`; `games`, `round_actions`,
`player_missions` y `game_deck` → `401 permission denied` para anónimos.
