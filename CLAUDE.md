# Instrucciones para el agente

Este proyecto es "La Aldea en Disputa", un juego multijugador de salas para 2-8 jugadores (PWA mobile).

Antes de escribir cualquier código:

1. Lee docs/GAME_DESIGN.md — contiene TODAS las reglas del juego. Es la fuente de verdad de mecánicas.
2. Lee docs/ARCHITECTURE.md — contiene el stack, modelo de datos, RPCs y orden de implementación. Es la fuente de verdad técnica.

Reglas de trabajo:

- Sigue el orden de implementación de docs/ARCHITECTURE.md sección 8, paso por paso.
- No re-decidas nada de la sección 9 de docs/ARCHITECTURE.md ("Decisiones ya tomadas").
- Toda lógica de juego es server-side (RPCs de Postgres). El cliente nunca calcula resultados.
- Ante ambigüedad de reglas, manda docs/GAME_DESIGN.md. Ante ambigüedad técnica, manda docs/ARCHITECTURE.md. Si sigue ambiguo, pregúntame antes de asumir.
