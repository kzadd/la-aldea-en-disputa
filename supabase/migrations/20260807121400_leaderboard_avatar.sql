-- El ranking también muestra el avatar. La columna va al final: `create or
-- replace view` solo admite agregar columnas después de las que ya existen.

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
    s.most_used_path,
    p.avatar
  from user_stats s
  join profiles p on p.id = s.user_id
  where s.games_played > 0
  order by s.games_won desc,
           (1.0 * s.games_won / nullif(s.games_played, 0)) desc nulls last,
           s.games_played asc,
           p.nickname;

grant select on public.leaderboard to anon, authenticated;
