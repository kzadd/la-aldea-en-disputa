# Documento de Diseño de Juego

## "La Aldea en Disputa" (nombre de trabajo)

### Juego multijugador de recursos, construcción y sabotaje — PWA Mobile

---

## 1. Visión general

Juego de mesa digital para **2 a 8 jugadores**, jugado en salas privadas desde móvil (PWA). Cada partida es una sesión cerrada tipo mesa de juego: se crea o une a una sala, se configura, se reparten personajes al azar, y se compite por rondas simultáneas hasta que alguien llegue a la meta de puntos o se acabe el límite de rondas.

**Pilares de diseño:**

- Simultáneo, no por turnos (nadie espera aburrido en móvil)
- Múltiples caminos a la victoria (no hay una sola estrategia dominante)
- Sabotaje con costo y cooldown (estratégico, no frustrante)
- Personajes con identidad marcada (cada partida se siente distinta)
- Sesiones cortas: 20-40 minutos por partida

---

## 2. Estructura de sala

### 2.1 Crear sala

- Código de sala de 4-6 caracteres alfanuméricos (fácil de compartir por WhatsApp)
- Configuración al crear:
  - **Jugadores mínimos/máximos**: 2 a 8
  - **Condición de victoria**: puntos objetivo (ej. 20, 30, 40) Y/O límite de rondas (ej. 10, 15, 20) — lo que se cumpla primero
  - **Velocidad de ronda**: timer de decisión (30s / 45s / 60s)

> **Nota:** la cantidad de jugadores configurada afecta la dinámica de la partida — con menos jugadores (2-3) el sabotaje se siente más directo y personal, y el mercado de construcciones dura más disponible; con más jugadores (6-8) el mercado se vuelve más competido y el sabotaje se diluye entre más objetivos posibles. Por eso la producción de recursos escala según cantidad de jugadores (ver sección 3.2).

### 2.2 Lobby de espera

- Se ve en vivo quién se va uniendo (avatar genérico + nombre)
- El host puede iniciar la partida cuando estén listos (mínimo 2 jugadores)
- Se muestra el ranking global resumido mientras se espera (ver sección 10)

### 2.3 Reparto de personajes y misión secreta

- Al iniciar, animación tipo ruleta/tómbola: cada jugador ve un sorteo en vivo de su **personaje**
- Todos ven qué personaje le tocó a cada uno (transparencia total, sin secretos de identidad de personaje)
- Personajes nunca se repiten en una misma partida (si hay más de 8 jugadores en el futuro, se ampliaría el roster; por ahora 8 personajes cubre el máximo de jugadores)
- En el mismo momento, cada jugador recibe también su **misión secreta** (ver sección 8) — esta sí es privada, solo la ve el propio jugador en su pantalla

---

## 3. Sistema de recursos

### 3.1 Tipos de recursos (4)

| Recurso | Símbolo sugerido | Uso principal                                         |
| ------- | ---------------- | ----------------------------------------------------- |
| Madera  | 🪵               | Construcciones básicas, sabotajes de robo             |
| Piedra  | 🪨               | Construcciones intermedias, bloqueos                  |
| Oro     | 🪙               | Construcciones avanzadas, todos los sabotajes fuertes |
| Comida  | 🌾               | Mantenimiento de edificios, conversión                |

### 3.2 Producción por ronda

- Cada ronda se revela una **carta de producción** aleatoria (del mazo de producción)
- La carta indica cuánto recibe cada jugador de cada recurso, ajustado por:
  - Edificios que dan bonus de producción (ej. Granero = +1 comida siempre)
  - Habilidad pasiva del personaje
- Escalado por número de jugadores: con menos jugadores, producción base ligeramente menor por ronda para no saturar el mercado de construcciones demasiado rápido

### 3.3 Límites

- Máximo de almacenamiento: **10 unidades por recurso** (evita acumulación infinita y fuerza a gastar)
- Los personajes de afinidad Acumuladora (La Comerciante y El Granjero) tienen límite ampliado de **15 unidades por recurso** (ver sección 7)

---

## 4. Construcción

### 4.1 El mercado

- 6 cartas de construcción visibles simultáneamente, disponibles para todos
- Al comprarse una, se repone del mazo (como Splendor)
- 3 niveles de costo: básico, intermedio, avanzado (más caro = más puntos)

### 4.2 Ejemplos de construcciones

| Nombre              | Costo                       | Efecto                                                                                                                                                      |
| ------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Granero             | 2 madera                    | +1 comida/ronda, +1 punto                                                                                                                                   |
| Cantera             | 2 madera + 1 piedra         | +1 piedra/ronda, +2 puntos                                                                                                                                  |
| Muralla             | 3 piedra                    | Inmune a 1 sabotaje de robo, +2 puntos                                                                                                                      |
| Mercado             | 2 oro + 2 comida            | Conversión gratis 1 vez/ronda, +3 puntos                                                                                                                    |
| Torre de Vigilancia | 3 piedra + 2 oro            | Te notifica durante la fase de decisión si algún rival te está apuntando con un sabotaje (sin decir quién ni cuál), dándote tiempo de reaccionar, +3 puntos |
| Castillo            | 4 oro + 3 piedra + 2 madera | +5 puntos (la construcción de mayor valor del juego; cuenta como edificio de nivel avanzado para misiones secretas)                                         |

_(Lista ampliable; se recomienda 15-20 cartas de construcción total en el mazo para variedad entre partidas)_

### 4.3 Los 4 caminos a la victoria

No hay una única forma de sumar puntos. Cada camino puede combinarse:

1. **Camino del Constructor** — puntos directos por cada edificio completado (1-5 pts según nivel). Estrategia directa y visible.
2. **Camino del Acumulador** — **+1 punto por cada 3 recursos guardados** al final de la partida (recompensa el ahorro).
3. **Camino del Superviviente** — **+1 punto por ronda** en que **hubo al menos un intento de sabotaje en la mesa** y tú no fuiste saboteado exitosamente. _(Regla anti-pasividad: si nadie sabotea en una ronda, nadie gana puntos de superviviente — evita que en partidas de 2-3 jugadores se pacte no atacarse para farmear puntos gratis.)_
4. **Camino del Saboteador** — **+1 punto por cada sabotaje ejecutado con éxito** contra un rival.

> **Principio de balance:** los caminos alternativos (Acumulador, Superviviente, Saboteador) rinden puntos de a 1, mientras que construir rinde 1-5 por edificio. Esto es intencional: construir es la columna vertebral del puntaje, y los otros caminos lo **complementan** — no lo reemplazan. Si el sabotaje diera más puntos por golpe, la partida degeneraría en guerra total sin construcción.

Cada personaje tiene afinidad natural con 1-2 caminos (ver sección 6), pero cualquier jugador puede mezclar estrategias libremente.

---

## 5. Sistema de sabotaje

### 5.1 Reglas generales

- Todos los jugadores tienen acceso permanente a las 4 acciones de sabotaje (no depende de suerte de cartas)
- **Solo se puede ejecutar 1 acción de sabotaje por ronda** (aunque se tengan recursos para más)
- Cada acción tiene **cooldown de 2 rondas** tras usarla (no se puede repetir la misma acción en la ronda inmediata siguiente)
- El objetivo del sabotaje se elige entre los jugadores activos (no se puede auto-sabotear)

### 5.2 Las 4 acciones

| Acción                | Costo            | Efecto                                                                                                                         | Cooldown |
| --------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------- |
| **Robo de recursos**  | 2 madera         | Roba 2 unidades de un recurso a elección, de un rival                                                                          | 2 rondas |
| **Bloqueo temporal**  | 3 piedra + 1 oro | El rival no puede comprar construcciones la próxima ronda                                                                      | 2 rondas |
| **Daño a estructura** | 3 oro            | Pausa el efecto de 1 edificio rival por 1 ronda (no da su bonus)                                                               | 2 rondas |
| **Espionaje**         | 1 oro + 1 comida | Ves los recursos del rival, la decisión que está tomando esta ronda Y su misión secreta, antes de confirmar tu propia decisión | 1 ronda  |

### 5.3 Visibilidad del sabotaje

- **Todos los sabotajes son visibles en la fase de revelación**: se muestra quién atacó a quién y con qué acción. No hay sabotajes anónimos.
- Motivo de diseño: el drama del reveal ("¡¿me robaste TÚ?!") y las venganzas entre jugadores son parte central de la diversión. El secreto del juego vive en las misiones, no en la autoría de los ataques.
- Excepción: el **Espionaje exitoso no se anuncia** a la víctima ni al resto (es la única acción silenciosa) — espiar perdería todo sentido si el espiado se entera.

### 5.4 Resolución de sabotajes simultáneos

Como todos deciden a la vez, pueden darse conflictos. Reglas de resolución (en este orden):

1. **Primero se resuelven las construcciones** de todos los jugadores (los recursos gastados en construir ya no existen y no pueden ser robados esa ronda)
2. **Luego se resuelven los sabotajes**, en orden aleatorio entre sí:
   - Si un robo encuentra menos recursos de los que iba a robar, roba lo que haya disponible. Cuenta como **exitoso** si robó al menos 1 unidad; si no había nada que robar, cuenta como **fallido** (los recursos gastados en la acción no se devuelven — el riesgo es parte de la decisión)
   - Si dos jugadores roban al mismo rival, se resuelven uno tras otro (orden aleatorio); el segundo roba de lo que quede
   - Bloqueos y daños a estructura no entran en conflicto entre sí (pueden acumularse sobre el mismo rival)
3. **Al final se actualizan puntajes** (incluyendo puntos de Saboteador y de Superviviente de esa ronda)

### 5.5 Defensas

- Algunos edificios (ej. Muralla, Torre de Vigilancia) otorgan inmunidad o detección ante sabotajes
- Algunos personajes tienen inmunidades específicas (ver sección 6)

---

## 6. Estructura de ronda (flujo de juego)

Para que la partida fluya rápido en móvil con hasta 8 jugadores simultáneos:

1. **Fase de producción** (automática, ~3-5 seg): se revela la carta, animación de recursos entrando a cada base
2. **Fase de decisión** (simultánea y secreta, timer 30-60s configurable): cada jugador elige en paralelo:
   - Comprar 0-1 construcción del mercado
   - Ejecutar 0-1 acción de sabotaje (con objetivo)
   - O simplemente guardar recursos
3. **Fase de revelación** (~5-8 seg): se muestran las decisiones de todos a la vez, tipo "reveal" dramático con animación
4. **Fase de resolución** (automática): se aplican efectos en el orden definido en la sección 5.4 (construcciones → sabotajes → actualización de puntajes)
5. Se repite hasta cumplir condición de victoria

### 6.1 Jugadores inactivos o desconectados

- Si un jugador **no confirma su decisión antes de que acabe el timer**, su acción por defecto es **guardar recursos** (no construye ni sabotea). La partida nunca se detiene a esperar a nadie.
- Si un jugador se **desconecta**, la partida continúa: sus rondas se resuelven con la acción por defecto (guardar) mientras esté ausente.
- Si se **reconecta**, retoma el control desde la ronda en curso, con los recursos y construcciones que acumuló en su ausencia.
- Un jugador desconectado sigue siendo objetivo válido de sabotajes (desconectarse no te protege).

---

## 7. Personajes (8 iniciales)

| Personaje          | Habilidad pasiva                                                                                                              | Camino favorecido           |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **El Herrero**     | Construcciones cuestan -1 piedra siempre (mínimo 0)                                                                           | Constructor                 |
| **La Comerciante** | Conversión gratuita de 2 recursos iguales → 1 de otro tipo, 1 vez/ronda. Límite de almacenamiento ampliado a 15 por recurso   | Acumulador                  |
| **El Espía**       | Ve los recursos de un rival (a elección) al inicio de cada ronda, sin costo                                                   | Saboteador                  |
| **La Guardiana**   | Inmune automáticamente al primer sabotaje que reciba en toda la partida                                                       | Superviviente               |
| **El Granjero**    | +1 comida garantizado cada ronda, independiente de la carta de producción. Límite de almacenamiento ampliado a 15 por recurso | Acumulador                  |
| **El Saqueador**   | Los robos de recursos que ejecuta rinden el doble                                                                             | Saboteador                  |
| **La Arquitecta**  | Todas sus construcciones otorgan +1 punto adicional                                                                           | Constructor                 |
| **El Nómada**      | Inmune a bloqueos de construcción. Además, 1 vez por partida puede comprar 2 construcciones en una misma ronda                | Constructor / Superviviente |

> **Nota — El Espía vs la acción de Espionaje:** la pasiva del Espía solo muestra los **recursos** de un rival (gratis, cada ronda). La acción de Espionaje (que cualquiera puede pagar, incluido el Espía) es más profunda: muestra recursos, la **decisión en curso** y la **misión secreta** del rival. Son complementarias, no redundantes.

---

## 8. Misiones secretas individuales

A diferencia de un logro compartido y visible, cada jugador recibe **su propia misión secreta**, repartida al azar junto con el personaje al inicio de la partida (nadie más la ve, ni siquiera se sabe qué misión tienen los demás).

### 8.1 Reglas

- Se reparte **1 misión secreta por jugador**, oculta durante toda la partida
- No se puede cambiar ni descartar una vez asignada
- Se revela únicamente **al finalizar la partida**, junto con el resultado final — genera el momento de "ah, por eso hacías eso"
- Todas las misiones tienen el mismo valor en puntos (ver 8.2)

### 8.2 Valor de las misiones

- **Todas las misiones valen lo mismo: +5 puntos**
- No hay niveles de dificultad — todas las misiones del mazo se diseñan para tener una dificultad comparable entre sí
- Motivo: como la misión se asigna al azar, tener dificultades distintas sería injusto (a un jugador podría tocarle una fácil y a otro una difícil). Con un valor único, la suerte solo define _qué_ te toca hacer, no _cuánto_ vale tu esfuerzo
- Si en pruebas reales alguna misión resulta notablemente más fácil o difícil que el resto, se ajusta esa misión específica (no el sistema)

### 8.3 Ejemplos de misiones (todas +5 pts)

- Construye 2 edificios de nivel básico e intermedio (al menos 1 de cada uno)
- Termina la partida con 5+ unidades de comida guardadas
- Ejecuta 2 sabotajes exitosos de tipo distinto (no repetir la misma acción)
- Termina con 5+ unidades de oro guardadas
- Construye 2 edificios que otorguen bonus de producción (no solo puntos)
- Construye 2 edificios en rondas consecutivas (uno inmediatamente después del otro)
- Construye al menos 1 edificio de nivel avanzado
- Ejecuta un sabotaje exitoso contra 2 rivales distintos
- Termina la partida con al menos 3 unidades de cada recurso

_(Se recomienda un mazo de 15-20 misiones variadas para que no se repitan seguido entre partidas)_

### 8.4 Por qué ocultarlas

El factor secreto agrega una capa social: los demás no saben si estás construyendo por puntos directos o para cumplir tu misión, ni si tus sabotajes son estratégicos o parte de un objetivo oculto. Esto combina bien con la mecánica de sabotaje y hace que valga la pena "leer" al rival, no solo reaccionar a lo visible en el mercado.

---

## 9. Puntos y condición de victoria

- **Puntos por partida** = puntos de construcciones + puntos de la misión secreta individual (si se cumple) + puntos de camino favorecido acumulados en el transcurso
- La partida termina cuando:
  - Un jugador alcanza el puntaje objetivo configurado al crear la sala, **o**
  - Se alcanza el límite de rondas configurado
  - _(lo que ocurra primero)_
- Si se llega al límite de rondas sin que nadie alcance el objetivo, gana quien tenga más puntos en ese momento

### 9.1 Mecánica de comeback (viento a favor)

- El jugador en **último lugar** del puntaje recibe **+1 recurso a su elección por ronda** (adicional a la producción normal), mientras siga último
- Si hay empate en el último lugar, todos los empatados lo reciben
- Motivo de diseño: en juegos de puntos con sabotaje, todos tienden a atacar al líder y el último puede quedar mentalmente fuera de la partida. Este bonus es sutil (no regala la partida) pero mantiene a todos con opciones reales hasta el final — clave para que la mesa quiera la revancha
- El bonus se muestra visualmente (ícono de "viento a favor" junto al jugador), para que sea transparente y nadie sienta trampa oculta

---

## 10. Ranking global y perfil de usuario

### 10.1 Datos a guardar por usuario (Supabase)

- Total de partidas jugadas
- Total de victorias
- % de victorias (winrate)
- Personaje más usado
- Personaje con mejor winrate individual
- Camino de victoria más usado (constructor/acumulador/superviviente/saboteador)

### 10.2 Dónde se muestra

- **Pantalla de inicio / lobby**: leaderboard resumido (top 3 con medallas 🥇🥈🥉) mientras se espera que se llene la sala
- **Perfil personal**: estadísticas completas, historial de partidas recientes

---

## 11. Consideraciones de diseño para PWA Mobile

- Todo el flujo de decisión debe caber en una sola pantalla vertical sin scroll excesivo (recursos arriba, mercado en el centro, acciones de sabotaje abajo, tipo dashboard de un vistazo)
- Animaciones cortas (2-5 seg máx) para no alargar la duración total de la partida
- Notificaciones/vibración sutil cuando es el turno de decidir o cuando alguien te sabotea
- Diseño pixel art consistente con tu línea visual ya establecida (La Torre del Dragón / VETA)

---

## 12. Próximos pasos sugeridos

1. Definir el mazo completo de construcciones (15-20 cartas con costos y efectos finales)
2. Definir el mazo de producción (cuántas cartas, rango de valores por recurso; referencia inicial: ~3-4 recursos totales por jugador por ronda, para poder construir algo básico cada 1-2 rondas o algo avanzado cada 3)
3. Prototipo jugable simple (2-3 rondas) para probar el "reveal simultáneo" entre ustedes tres
4. Ajustar balance según lo que se sienta en el prototipo. **A validar específicamente en las pruebas:**
   - Si el **Espionaje** revelando la misión secreta completa se siente demasiado fuerte → cambiarlo a mostrar solo una pista del tipo de misión (ej. "es de construcción")
   - Si el **Robo** (2 madera) se spamea demasiado por ser el sabotaje más barato → subirlo a 2 madera + 1 comida
   - Si el bonus de **comeback** se siente insuficiente o excesivo → ajustar a +2 recursos o quitarlo
5. Diseño de arte de los 8 personajes en pixel art
