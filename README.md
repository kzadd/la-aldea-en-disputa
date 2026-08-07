# La Aldea en Disputa

Juego multijugador de recursos, construcción y sabotaje para 2-8 jugadores (PWA mobile).

- Reglas: [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md)
- Técnico: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Base de datos y RPCs: [supabase/README.md](supabase/README.md)

## Correr

```bash
npm install
cp .env.example .env   # completar con la URL y la publishable key del proyecto
npm run dev
```

## Deploy (Netlify)

```bash
npm run build      # genera dist/
```

Arrastrá la carpeta `dist/` a [app.netlify.com/drop](https://app.netlify.com/drop).
Las variables `VITE_*` quedan **horneadas en el build** (ARCHITECTURE §1), así que
lo que subís ya trae la URL y la publishable key: no hay que configurar nada en
Netlify. Si cambiás el `.env`, hay que volver a buildear y subir.

`dist/_redirects` manda todas las rutas al index (necesario al recargar), y
[netlify.toml](netlify.toml) agrega las cabeceras de caché — el `sw.js` sin caché
para que la app pueda actualizarse, y los assets con hash cacheados para siempre.
El `toml` solo aplica si conectás el repo a Netlify; con drag-and-drop manda el
`_redirects`.

## Estado de implementación

Orden de ARCHITECTURE §8:

| Paso | Estado |
| --- | --- |
| 1. Migración 001: tablas + RLS + seeds | ✅ aplicado y verificado |
| 2. RPCs core (construir + robar) | ✅ aplicado y verificado end-to-end |
| 3. Cliente mínimo: Home → Lobby → CharacterDraw → Game | ✅ |
| 4. Playtest con 3 jugadores | ⬜ siguiente |
| 5. Sabotajes restantes + cooldowns + defensas | ✅ aplicado y verificado |
| 6. Misiones secretas: verificación al cierre | ✅ aplicado y verificado |
| 7. Comeback, presets, PWA, pulido pixel art | ✅ aplicado y verificado |
| 8. Ranking global | ✅ aplicado y verificado |
| 9. Deploy Netlify | 🟡 build listo y verificado — falta subirlo |

Notas de implementación:

- **El comeback solo aplica cuando hay un último lugar de verdad.** Si todos están
  empatados —la ronda 1, siempre— no hay a quién compensar: dárselo a todos sería
  subir la producción base, no un comeback (§9.1).
- El ícono 🍃 se muestra a quien **realmente lo cobró** esa ronda, según el evento
  del servidor, no a quien el cliente calcule que va último.
- La fuente Press Start 2P va **autoalojada** (`src/assets`, SIL OFL 1.1): una PWA
  que depende de Google Fonts no arranca sin red.
- **El ranking ordena por victorias, con el winrate como desempate.** Ordenar por
  winrate puro pondría primero a cualquiera con 1 partida y 1 victoria. Quien no
  terminó ninguna partida no aparece.
- **El Espionaje no tiene efectos secundarios visibles.** §5.3 lo declara la única
  acción silenciosa, pero los puntos son públicos: si espiar repartiera puntos de
  Superviviente, diera punto de Saboteador o consumiera el escudo de La Guardiana,
  cualquiera deduciría que alguien espió. Por eso no hace ninguna de las tres.
- **Las misiones se verifican al cerrar la partida, no ronda a ronda.** Varias son
  del tipo "termina la partida con…" y solo tienen sentido al final; el resto son
  acumulativas y se reconstruyen desde `round_events`.
- **El Espionaje cuenta como sabotaje exitoso para las misiones**, aunque no dé
  punto de Saboteador. No delata a nadie: las misiones se revelan recién al final.
- **Un edificio dañado pierde su efecto, no solo su producción**: una Muralla
  dañada no frena robos y una Torre dañada no avisa. §5.2 dice "pausa el efecto".
- **Inmunidades permanentes antes que el escudo de La Guardiana**: si la Fortaleza
  iba a frenar el daño igual, gastar el escudo único de la partida sería tirarlo.
  §5.4 solo ordena Guardiana → Muralla, y eso se respeta.
- **Cooldown del Espionaje = reutilizable en la ronda siguiente.** §5.1 define el
  cooldown de 2 rondas como "no repetir en la ronda inmediata siguiente", así que
  el de 1 ronda del Espionaje no salta ninguna ronda. Si en el playtest se siente
  spammeable, se sube a 2 en `_sabotage_cooldown`.
- El catálogo de construcciones se sirve completo (18 cartas). ARCHITECTURE §8
  sugería reducirlo a ~8 para el playtest; no hizo falta, el mercado sigue siendo
  de 6 slots.
- El countdown del cliente es decorativo: quien cierra la ronda es pg_cron.
- Realtime va por **Broadcast desde la base**, no por Postgres Changes: las API
  keys nuevas no son JWT y Realtime no registra suscripciones de Postgres Changes
  con ellas. Ver [supabase/README.md](supabase/README.md).
