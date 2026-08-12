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
| `migrations/20260807120700_sabotages.sql` | Espionaje, Torre de Vigilancia y orden de defensas en la resolución |
| `migrations/20260807120800_missions.sql` | Verificación de las 16 misiones al cierre de la partida |
| `migrations/20260807120900_comeback.sql` | Ayuda al último lugar + preferencia de recurso |
| `migrations/20260807121000_leaderboard.sql` | Vista `leaderboard` e historial personal |
| `migrations/20260807121100_recent_games_grants.sql` | Revoca `my_recent_games` a `anon` |
| `migrations/20260807121200_accounts.sql` | Códigos de invitación, nickname único y alta de cuenta |
| `migrations/20260807121300_avatars.sql` | Avatar de perfil + `set_my_avatar()` con lista blanca |
| `migrations/20260807121400_leaderboard_avatar.sql` | El avatar también en el ranking |
| `migrations/20260807121500_flujo_partida.sql` | Listos en el lobby, arranque sincronizado del reloj, deshacer decisión, reveal de 5 s, cierre del host |
| `migrations/20260807121600_cancel_action_fix.sql` | `cancel_action` no toca `confirmed_at` (es NOT NULL) |
| `migrations/20260807121700_tick_2s.sql` | `tick_games()` cada 2 s: el reveal se cierra a tiempo |
| `migrations/20260807121800_cancelar_partida.sql` | Estado `cancelled`: el host corta sin puntuar |
| `migrations/20260807121900_avatares_nuevos.sql` | Seis avatares más (búho, gato, jabalí, bruja, esqueleto, fantasma) |
| `migrations/20260812120000_reset_datos.sql` | Borra historial de partidas y pone `user_stats` en 0. No toca cuentas ni catálogos |

## Cuentas y código de invitación

El registro pide **código de invitación + nombre + correo + contraseña**. El código
se valida dos veces: `invite_code_valid()` antes de registrarse (para dar un error
legible) y el trigger `handle_new_user`, que aborta el alta si no sirve. Sin la
segunda, cualquiera se registraría llamando a la API de auth con la publishable key.

`invite_codes` no tiene GRANT ni políticas: los códigos no se listan desde el
cliente. `SOY-ALDEANO` viene cargado, sin límite de usos. Para agregar otro:

```sql
insert into invite_codes (code, max_uses, note) values ('AMIGOS-2026', 10, 'tanda 2');
update invite_codes set active = false where code = 'SOY-ALDEANO';  -- desactivar
```

El nickname es único (sin distinguir mayúsculas) y se cambia por `set_my_nickname()`,
no por UPDATE directo: el índice único devolvería un error crudo.

El avatar (`profiles.avatar`, por defecto `aldeano`) se cambia por `set_my_avatar()`,
que valida contra su propia lista blanca. Para agregar uno nuevo hay que tocar dos
lugares: el sprite y la lista de `src/data/icons.js`, y la lista de la función.

### Configuración necesaria en el dashboard

- **Confirm email: apagado.** Con la opción encendida el registro falla con
  `email rate limit exceeded`: el SMTP incorporado de Supabase permite ~2 correos
  por hora. El código de invitación ya cumple de portero. Si se quiere volver a
  activar, hace falta un SMTP propio en Project Settings → Auth → SMTP.
- **Allow anonymous sign-ins: apagado.** Ya no se usa.

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

Solo estas son ejecutables por `authenticated`; el resto está revocado.

```text
create_room(max_players, target_points, max_rounds, decision_timer_seconds) -> rooms
join_room(code) -> rooms
leave_room(room_id)
set_ready(room_id, ready)
start_game(room_id) -> game_id        -- exige a todos listos
enter_game(game_id)                   -- "ya salí del sorteo"
submit_action(game_id, build_slot, build_slot_2, sabotage_type, sabotage_target, sabotage_params)
cancel_action(game_id)                -- deshace la confirmación de esta ronda
cancel_game(game_id)                  -- solo el host; corta sin puntuar
get_my_mission(game_id) -> mission
```

### Cancelar no es terminar

`cancel_game` deja la partida en `cancelled`, sin ganador y sin tocar
`user_stats`. Una partida cortada a la mitad no es un resultado: puntuarla
ensuciaba el ranking y el historial de todos los que estaban jugando.
`my_recent_games` filtra por `finished`, así que tampoco aparece en el perfil.

### El reloj de la ronda 1

`start_game` deja un deadline holgado (`decision_timer + _draw_seconds()`), pero
ese no es el reloj real: cuando el último jugador llama a `enter_game` —al tocar
"A jugar" al final del sorteo— el deadline se reinicia al tiempo completo. Sin
esto, quien se quedaba leyendo su misión entraba con la ronda ya empezada. Los
45 s de `_draw_seconds()` son solo el tope por si alguien nunca entra.

`resolve_round`, `_open_decision`, `finish_game` y `tick_games` son del servidor.
El cliente nunca las llama.

### Máquina de fases

`start_game` deja la ronda 1 en `decision` con producción ya aplicada. Después:

```text
decision --(deadline vencido | todos confirmaron)--> resolve_round
       --> reveal (5 s) --> _open_decision --> decision (ronda+1)
```

Ambas transiciones las dispara `tick_games()` desde pg_cron cada 2 s. `submit_action`
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
