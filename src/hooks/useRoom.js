import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

// Lobby en vivo: sala + jugadores. Cualquier cambio en las tablas relevantes
// dispara un refetch (ARCHITECTURE §5).
export function useRoom(roomId) {
  const [room, setRoom] = useState(null)
  const [players, setPlayers] = useState([])
  const [gameId, setGameId] = useState(null)

  const load = useCallback(async () => {
    if (!roomId) return
    const [{ data: r }, { data: p }, { data: g }] = await Promise.all([
      supabase.from('rooms').select('*').eq('id', roomId).maybeSingle(),
      supabase
        .from('room_players')
        .select('user_id, joined_at, ready, profiles(nickname, avatar)')
        .eq('room_id', roomId)
        .order('joined_at'),
      supabase.from('games').select('id, status').eq('room_id', roomId),
    ])
    setRoom(r ?? null)
    setPlayers(p ?? [])
    // 'cancelled' tampoco es una partida en curso. Sin excluirla, el lobby
    // reenviaba a la mesa que el host acababa de levantar, que abría los
    // resultados de una partida cancelada una y otra vez.
    const enCurso = g?.find((x) => x.status !== 'finished' && x.status !== 'cancelled')
    setGameId(enCurso?.id ?? null)
  }, [roomId])

  useEffect(() => {
    if (!roomId) return
    load()
    // Canal privado: los triggers de la base emiten 'changed' y el cliente
    // refetchea lo que su RLS le permita ver.
    const ch = supabase
      .channel(`room:${roomId}`, { config: { private: true } })
      .on('broadcast', { event: 'changed' }, load)
      .subscribe()
    const poll = setInterval(load, 5000)
    return () => {
      supabase.removeChannel(ch)
      clearInterval(poll)
    }
  }, [roomId, load])

  return { room, players, gameId, reload: load }
}
