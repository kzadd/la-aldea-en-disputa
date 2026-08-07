import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const EMPTY = {
  game: null,
  room: null,
  players: [],
  market: [],
  buildings: [],
  events: [],
  confirmed: [],
  cooldowns: [],
}

// Estado completo de partida. El cliente solo lee: nada de esto se calcula acá.
export function useGame(gameId, userId) {
  const [state, setState] = useState(EMPTY)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!gameId) return
    const { data: game } = await supabase.from('games').select('*').eq('id', gameId).maybeSingle()
    if (!game) return

    const [room, players, market, buildings, events, confirmed, cooldowns] = await Promise.all([
      supabase.from('rooms').select('*').eq('id', game.room_id).maybeSingle(),
      supabase
        .from('game_players')
        .select('*, profiles(nickname)')
        .eq('game_id', gameId),
      supabase.from('game_market').select('slot, building_key').eq('game_id', gameId).order('slot'),
      supabase.from('game_buildings').select('*').eq('game_id', gameId),
      supabase
        .from('round_events')
        .select('*')
        .eq('game_id', gameId)
        .eq('round', game.current_round)
        .order('id'),
      supabase
        .from('round_confirmations')
        .select('user_id')
        .eq('game_id', gameId)
        .eq('round', game.current_round),
      supabase
        .from('sabotage_cooldowns')
        .select('sabotage_type, available_from_round')
        .eq('game_id', gameId)
        .eq('user_id', userId),
    ])

    setState({
      game,
      room: room.data ?? null,
      players: (players.data ?? []).sort((a, b) =>
        a.user_id === userId ? -1 : b.user_id === userId ? 1 : b.points - a.points
      ),
      market: market.data ?? [],
      buildings: buildings.data ?? [],
      events: events.data ?? [],
      confirmed: (confirmed.data ?? []).map((c) => c.user_id),
      cooldowns: cooldowns.data ?? [],
    })
    setLoading(false)
  }, [gameId, userId])

  useEffect(() => {
    if (!gameId) return
    setLoading(true)
    load()
    // Canal privado alimentado por triggers de la base (ARCHITECTURE §5).
    const ch = supabase
      .channel(`game:${gameId}`, { config: { private: true } })
      .on('broadcast', { event: 'changed' }, load)
      .subscribe()

    // Red de seguridad: si un evento de realtime se pierde, el estado no queda viejo.
    const poll = setInterval(load, 5000)
    return () => {
      supabase.removeChannel(ch)
      clearInterval(poll)
    }
  }, [gameId, load])

  const me = state.players.find((p) => p.user_id === userId) ?? null
  return { ...state, me, loading, reload: load }
}
