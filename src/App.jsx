import { useCallback, useEffect, useState } from 'react'
import { ensureSession, getProfile, loadCatalogs, recoverPlace } from './lib/api.js'
import { supabase } from './lib/supabase.js'
import Home from './screens/Home.jsx'
import Lobby from './screens/Lobby.jsx'
import CharacterDraw from './screens/CharacterDraw.jsx'
import Game from './screens/Game.jsx'
import Results from './screens/Results.jsx'
import Profile from './screens/Profile.jsx'

// Router por estado (ARCHITECTURE §6). El "dónde estoy" se recupera de Supabase,
// no de localStorage: el estado de juego vive en el servidor (§9).
export default function App() {
  const [boot, setBoot] = useState({ status: 'loading' })
  const [roomId, setRoomId] = useState(null)
  const [gameId, setGameId] = useState(null)
  const [drawnFor, setDrawnFor] = useState(null)
  const [finished, setFinished] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [players, setPlayers] = useState([])

  useEffect(() => {
    ;(async () => {
      try {
        const session = await ensureSession()
        const [profile, catalogs, place] = await Promise.all([
          getProfile(session.user.id),
          loadCatalogs(),
          recoverPlace(session.user.id),
        ])
        setRoomId(place.roomId)
        setGameId(place.gameId)
        if (place.gameId) setDrawnFor(place.gameId) // al reconectar no se re-sortea
        setBoot({ status: 'ready', userId: session.user.id, profile, catalogs })
      } catch (e) {
        setBoot({ status: 'error', message: e.message })
      }
    })()
  }, [])

  // El sorteo necesita saber qué le tocó a cada quien
  useEffect(() => {
    if (!gameId || drawnFor === gameId) return
    supabase
      .from('game_players')
      .select('user_id, character_key, profiles(nickname)')
      .eq('game_id', gameId)
      .then(({ data }) => setPlayers(data ?? []))
  }, [gameId, drawnFor])

  const goHome = useCallback(() => {
    setRoomId(null)
    setGameId(null)
    setFinished(false)
    setDrawnFor(null)
  }, [])

  const handleGame = useCallback((id) => setGameId(id), [])

  if (boot.status === 'loading') return <Shell>Entrando a la aldea…</Shell>
  if (boot.status === 'error') return <Shell>Error: {boot.message}</Shell>

  const { userId, profile, catalogs } = boot

  let screen
  if (showProfile) {
    screen = (
      <Profile
        userId={userId}
        profile={profile}
        characters={catalogs.characters}
        onBack={() => setShowProfile(false)}
      />
    )
  } else if (finished && gameId) {
    screen = (
      <Results
        gameId={gameId}
        userId={userId}
        characters={catalogs.characters}
        onHome={goHome}
      />
    )
  } else if (gameId && drawnFor !== gameId) {
    screen = (
      <CharacterDraw
        gameId={gameId}
        userId={userId}
        players={players}
        characters={catalogs.characters}
        onDone={() => setDrawnFor(gameId)}
      />
    )
  } else if (gameId) {
    screen = (
      <Game
        gameId={gameId}
        userId={userId}
        catalogs={catalogs}
        onFinished={() => setFinished(true)}
      />
    )
  } else if (roomId) {
    screen = <Lobby roomId={roomId} userId={userId} onGame={handleGame} onLeave={goHome} />
  } else {
    screen = (
      <Home
        profile={profile}
        onProfile={(p) => setBoot({ ...boot, profile: p })}
        onRoom={setRoomId}
        onOpenProfile={() => setShowProfile(true)}
      />
    )
  }

  return <Shell>{screen}</Shell>
}

function Shell({ children }) {
  return (
    // Press Start 2P es mucho más ancha que una tipografía normal: el ancho
    // manda, y nada puede desbordar horizontalmente en un móvil de 360px.
    <div className="mx-auto flex h-full w-full max-w-md flex-col overflow-x-hidden p-3 text-[10px] leading-relaxed">
      {children}
    </div>
  )
}
