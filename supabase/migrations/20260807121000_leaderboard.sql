-- =============================================================================
-- Paso 8 — Ranking global (GAME_DESIGN §10, ARCHITECTURE §8 paso 8)
--
-- `user_stats` ya se actualiza al cerrar cada partida. Falta exponerlo: el
-- winrate se calcula, no se guarda (ARCHITECTURE §2.1), y PostgREST no puede
-- ordenar por una columna que no existe — de ahí la vista.
--
-- Orden del ranking: victorias primero, winrate como desempate. Ordenar por
-- winrate puro pondría arriba a cualquiera con 1 partida y 1 victoria.
-- =============================================================================

create or replace view public.leaderboard
with (security_invoker = true) as
  select
    p.id                                                             as user_id,
    p.nickname,
    s.games_played,
    s.games_won,
    round(100.0 * s.games_won / nullif(s.games_played, 0))::int      as winrate,
    s.favorite_character,
    s.best_character,
    s.most_used_path
  from user_stats s
  join profiles p on p.id = s.user_id
  where s.games_played > 0
  order by s.games_won desc,
           (1.0 * s.games_won / nullif(s.games_played, 0)) desc nulls last,
           s.games_played asc,
           p.nickname;

grant select on public.leaderboard to anon, authenticated;

-- Historial reciente del jugador (§10.2, perfil personal).
-- Va como RPC y no como consulta directa: `games` solo es legible por sus
-- participantes, y una vista tendría que repetir esa lógica.
create or replace function public.my_recent_games(p_limit int default 10)
returns table (
  game_id       uuid,
  finished_at   timestamptz,
  character_key text,
  points        int,
  won           bool,
  dominant_path text,
  players       int
)
language sql stable security definer set search_path = public as $$
  select g.id, g.finished_at, gp.character_key, gp.points,
         g.winner_id = auth.uid(), gp.dominant_path,
         (select count(*)::int from game_players x where x.game_id = g.id)
    from game_players gp
    join games g on g.id = gp.game_id
   where gp.user_id = auth.uid() and g.status = 'finished'
   order by g.finished_at desc
   limit least(greatest(coalesce(p_limit, 10), 1), 50);
$$;

grant execute on function public.my_recent_games(int) to authenticated;
