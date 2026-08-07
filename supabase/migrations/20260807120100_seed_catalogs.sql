-- =============================================================================
-- La Aldea en Disputa — Migración 001 (parte 2): seeds de catálogos
-- Ref: docs/GAME_DESIGN.md §3.2, §4.2, §7, §8.3 · docs/ARCHITECTURE.md §2.2
-- Los valores de balance viven aquí para poder ajustarlos sin redeploy del front.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Personajes (GAME_DESIGN §7) — 8, nunca se repiten en una partida
-- -----------------------------------------------------------------------------
insert into public.characters_catalog (key, name, passive_key, passive_text, path, storage_limit) values
  ('herrero',     'El Herrero',     'build_discount_stone',
   'Sus construcciones cuestan -1 piedra siempre (mínimo 0).',                                'constructor',   10),
  ('comerciante', 'La Comerciante', 'free_conversion',
   'Convierte gratis 2 recursos iguales en 1 de otro tipo, 1 vez por ronda. Almacena hasta 15.', 'acumulador', 15),
  ('espia',       'El Espía',       'peek_resources',
   'Ve los recursos de un rival a elección al inicio de cada ronda, sin costo.',               'saboteador',    10),
  ('guardiana',   'La Guardiana',   'first_sabotage_shield',
   'Inmune automáticamente al primer sabotaje que reciba en toda la partida.',                 'superviviente', 10),
  ('granjero',    'El Granjero',    'extra_food',
   '+1 comida garantizada cada ronda, además de la carta de producción. Almacena hasta 15.',   'acumulador',    15),
  ('saqueador',   'El Saqueador',   'double_steal',
   'Los robos de recursos que ejecuta rinden el doble.',                                       'saboteador',    10),
  ('arquitecta',  'La Arquitecta',  'building_bonus_point',
   'Todas sus construcciones otorgan +1 punto adicional.',                                     'constructor',   10),
  ('nomada',      'El Nómada',      'block_immune_double_build',
   'Inmune a bloqueos de construcción. Una vez por partida puede comprar 2 construcciones en la misma ronda.', 'constructor', 10);

-- -----------------------------------------------------------------------------
-- Construcciones (GAME_DESIGN §4.2) — 18 cartas, 34 ejemplares en el mazo
-- Los 6 ejemplos del documento de diseño se respetan al pie de la letra;
-- el resto completa el mazo de 15-20 cartas que pide §4.2.
-- -----------------------------------------------------------------------------
insert into public.buildings_catalog
  (key, name, tier, cost_wood, cost_stone, cost_gold, cost_food, points,
   prod_wood, prod_stone, prod_gold, prod_food, effect_key, copies, description) values
  -- Básicos
  ('granero',     'Granero',            'basico',     2,0,0,0, 1,  0,0,0,1, null, 3, '+1 comida por ronda.'),
  ('lenieria',    'Leñería',            'basico',     0,2,0,0, 1,  1,0,0,0, null, 3, '+1 madera por ronda.'),
  ('huerto',      'Huerto',             'basico',     1,1,0,0, 1,  0,0,0,1, null, 2, '+1 comida por ronda.'),
  ('pozo',        'Pozo',               'basico',     1,0,0,2, 1,  1,0,0,0, null, 2, '+1 madera por ronda.'),
  ('empalizada',  'Empalizada',         'basico',     3,0,0,0, 2,  0,0,0,0, null, 2, 'Defensa rudimentaria. Solo puntos.'),
  ('taller',      'Taller',             'basico',     1,1,0,1, 2,  0,0,0,0, null, 2, 'Solo puntos.'),
  -- Intermedios
  ('cantera',     'Cantera',            'intermedio', 2,1,0,0, 2,  0,1,0,0, null, 3, '+1 piedra por ronda.'),
  ('muralla',     'Muralla',            'intermedio', 0,3,0,0, 2,  0,0,0,0, 'muralla',          2, 'Inmune a 1 sabotaje de robo.'),
  ('molino',      'Molino',             'intermedio', 2,0,0,2, 2,  0,0,0,2, null, 2, '+2 comida por ronda.'),
  ('mina',        'Mina',               'intermedio', 0,2,1,0, 3,  0,0,1,0, null, 2, '+1 oro por ronda.'),
  ('almacen',     'Almacén',            'intermedio', 2,2,0,0, 3,  0,0,0,0, null, 2, 'Solo puntos.'),
  ('mercado',     'Mercado',            'intermedio', 0,0,2,2, 3,  0,0,0,0, 'mercado',          2, 'Conversión gratis 1 vez por ronda.'),
  ('torre',       'Torre de Vigilancia','intermedio', 0,3,2,0, 3,  0,0,0,0, 'torre_vigilancia', 2, 'Avisa durante la decisión si un rival te está apuntando (sin decir quién ni cuál).'),
  -- Avanzados
  ('castillo',    'Castillo',           'avanzado',   2,3,4,0, 5,  0,0,0,0, null, 1, 'La construcción de mayor valor del juego.'),
  ('catedral',    'Catedral',           'avanzado',   0,3,3,0, 4,  0,0,0,0, null, 1, 'Solo puntos.'),
  ('gremio',      'Gremio de Mercaderes','avanzado',  2,0,3,0, 4,  0,0,1,0, null, 1, '+1 oro por ronda.'),
  ('fortaleza',   'Fortaleza',          'avanzado',   0,4,2,0, 4,  0,0,0,0, 'fortaleza',        1, 'Inmune a daño a estructura.'),
  ('puerto',      'Puerto',             'avanzado',   2,0,2,2, 4,  1,0,0,1, null, 1, '+1 madera y +1 comida por ronda.');

-- -----------------------------------------------------------------------------
-- Misiones secretas (GAME_DESIGN §8.3) — 16 cartas, todas +5 pts
-- `check_key` es el identificador que la verificación server-side conmuta.
-- -----------------------------------------------------------------------------
insert into public.missions_catalog (key, name, description, check_key) values
  ('m_basico_e_intermedio', 'Cimientos',      'Construye 2 edificios: al menos 1 básico y 1 intermedio.',            'build_basic_and_mid'),
  ('m_comida_5',            'Despensa llena', 'Termina la partida con 5 o más unidades de comida.',                  'end_food_5'),
  ('m_oro_5',               'Arcas llenas',   'Termina la partida con 5 o más unidades de oro.',                     'end_gold_5'),
  ('m_dos_sabotajes_dist',  'Mano larga',     'Ejecuta 2 sabotajes exitosos de tipo distinto.',                      'two_distinct_sabotages'),
  ('m_dos_productivos',     'Buena tierra',   'Construye 2 edificios que otorguen bonus de producción.',             'two_production_buildings'),
  ('m_rondas_consecutivas', 'Sin descanso',   'Construye en 2 rondas consecutivas.',                                 'build_consecutive_rounds'),
  ('m_un_avanzado',         'Obra magna',     'Construye al menos 1 edificio de nivel avanzado.',                    'one_advanced_building'),
  ('m_dos_victimas',        'Enemigo público','Ejecuta un sabotaje exitoso contra 2 rivales distintos.',             'sabotage_two_targets'),
  ('m_tres_de_cada',        'Aldea próspera', 'Termina la partida con al menos 3 unidades de cada recurso.',         'end_three_of_each'),
  ('m_tres_edificios',      'Constructor',    'Construye 3 edificios en total.',                                     'three_buildings'),
  ('m_diez_pts_edificios',  'Legado',         'Acumula 10 o más puntos provenientes de construcciones.',             'ten_points_from_buildings'),
  ('m_tres_supervivencias', 'Intacto',        'Gana puntos de Superviviente en 3 rondas distintas.',                 'three_survivor_rounds'),
  ('m_madera_piedra_8',     'Reservas',       'Termina la partida con 8 o más unidades entre madera y piedra.',      'end_wood_stone_8'),
  ('m_nunca_robado',        'Inviolado',      'Termina la partida sin haber sufrido ningún robo exitoso.',           'never_robbed'),
  ('m_robar_5',             'Saqueo mayor',   'Roba 5 o más unidades de recursos en total durante la partida.',      'steal_five_units'),
  ('m_tres_basicos',        'Aldea humilde',  'Construye 3 edificios de nivel básico.',                              'three_basic_buildings');

-- -----------------------------------------------------------------------------
-- Mazo de producción (GAME_DESIGN §3.2 y §12.2)
-- Referencia de diseño: ~3-4 recursos totales por jugador por ronda.
-- 10 cartas, 17 ejemplares (alcanza para el máximo de 20 rondas con rebaraje).
-- -----------------------------------------------------------------------------
insert into public.production_cards (key, name, wood, stone, gold, food, copies) values
  ('bosque_generoso', 'Bosque generoso', 2,1,0,1, 2),
  ('cantera_activa',  'Cantera activa',  1,2,0,1, 2),
  ('veta_de_oro',     'Veta de oro',     1,1,1,0, 2),
  ('buena_cosecha',   'Buena cosecha',   1,0,0,3, 2),
  ('temporada_seca',  'Temporada seca',  1,1,0,1, 2),
  ('caravana',        'Caravana',        0,1,1,1, 2),
  ('lluvias',         'Lluvias',         2,0,0,2, 2),
  ('expedicion',      'Expedición',      1,1,1,1, 1),
  ('invierno',        'Invierno',        1,1,0,0, 1),
  ('feria',           'Feria',           0,0,2,1, 1);

-- Escalado por nº de jugadores (GAME_DESIGN §3.2).
-- `total_delta` se suma/resta al recurso más abundante de la carta revelada;
-- en empate, prioridad madera > comida > piedra > oro. Lo aplica resolve_round.
insert into public.production_scaling (min_players, max_players, total_delta, note) values
  (2, 2, -1, 'Pocos jugadores: menor producción para no agotar el mercado demasiado rápido.'),
  (3, 3, -1, 'Pocos jugadores: menor producción para no agotar el mercado demasiado rápido.'),
  (4, 4,  0, 'Producción base.'),
  (5, 5,  0, 'Producción base.'),
  (6, 6,  1, 'Mesa llena: mercado más competido, producción ligeramente mayor.'),
  (7, 7,  1, 'Mesa llena: mercado más competido, producción ligeramente mayor.'),
  (8, 8,  1, 'Mesa llena: mercado más competido, producción ligeramente mayor.');
