import { useCallback, useEffect, useState } from 'react'
import { currentSession, getProfile, loadCatalogs, recoverPlace, signOut } from './lib/api.js'
import { supabase } from './lib/supabase.js'
import Auth from './screens/Auth.jsx'
import CharacterDraw from './screens/CharacterDraw.jsx'
import Game from './screens/Game.jsx'
import Home from './screens/Home.jsx'
import Lobby from './screens/Lobby.jsx'
import Profile from './screens/Profile.jsx'
import Ranking from './screens/Ranking.jsx'
import Results from './screens/Results.jsx'

// Router por estado (ARCHITECTURE §6). El "dónde estoy" se recupera de Supabase,
// no de localStorage: el estado de juego vive en el servidor (§9).
export default function App() {
  const [boot, setBoot] = useState({ status: 'loading' })
  const [roomId, setRoomId] = useState(null)
  const [gameId, setGameId] = useState(null)
  const [drawnFor, setDrawnFor] = useState(null)
  const [finished, setFinished] = useState(false)
  const [overlay, setOverlay] = useState(null) // 'profile' | 'ranking' | null
  const [players, setPlayers] = useState([])

  const arrancar = useCallback(async session => {
    try {
      const [profile, catalogs, place] = await Promise.all([
        getProfile(session.user.id),
        loadCatalogs(),
        recoverPlace(session.user.id)
      ])

      // Sesión huérfana: el usuario ya no existe. Se cierra y se vuelve al login.
      if (!profile) {
        await signOut()
        setBoot({ status: 'anon' })
        return
      }

      setRoomId(place.roomId)
      setGameId(place.gameId)
      if (place.gameId) setDrawnFor(place.gameId) // al reconectar no se re-sortea
      setBoot({ status: 'ready', userId: session.user.id, profile, catalogs })
    } catch (e) {
      setBoot({ status: 'error', message: e.message })
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      const session = await currentSession()
      if (session) arrancar(session)
      else setBoot({ status: 'anon' })
    })()
  }, [arrancar])

  const salir = useCallback(async () => {
    await signOut()
    setRoomId(null)
    setGameId(null)
    setFinished(false)
    setDrawnFor(null)
    setOverlay(null)
    setBoot({ status: 'anon' })
  }, [])

  // El sorteo necesita saber qué le tocó a cada quien
  useEffect(() => {
    if (!gameId || drawnFor === gameId) return
    supabase
      .from('game_players')
      .select('user_id, character_key, profiles(nickname, avatar)')
      .eq('game_id', gameId)
      .then(({ data }) => setPlayers(data ?? []))
  }, [gameId, drawnFor])

  const goHome = useCallback(() => {
    setRoomId(null)
    setGameId(null)
    setFinished(false)
    setDrawnFor(null)
    setOverlay(null)
  }, [])

  const handleGame = useCallback(id => setGameId(id), [])

  if (boot.status === 'loading') return <Shell>Entrando a la aldea…</Shell>
  if (boot.status === 'error') return <Shell>Error: {boot.message}</Shell>
  if (boot.status === 'anon')
    return (
      <Shell>
        <Auth
          onSession={s => {
            setBoot({ status: 'loading' })
            arrancar(s)
          }}
        />
      </Shell>
    )

  const { userId, profile, catalogs } = boot

  let screen
  if (overlay === 'profile') {
    screen = (
      <Profile
        userId={userId}
        profile={profile}
        characters={catalogs.characters}
        onBack={() => setOverlay(null)}
      />
    )
  } else if (overlay === 'ranking') {
    screen = (
      <Ranking userId={userId} characters={catalogs.characters} onBack={() => setOverlay(null)} />
    )
  } else if (finished && gameId) {
    screen = (
      <Results gameId={gameId} userId={userId} characters={catalogs.characters} onHome={goHome} />
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
        onProfile={p => setBoot({ ...boot, profile: p })}
        onRoom={setRoomId}
        onOpenProfile={() => setOverlay('profile')}
        onOpenRanking={() => setOverlay('ranking')}
        onSignOut={salir}
      />
    )
  }

  return <Shell>{screen}</Shell>
}

// La app vive dentro de una tarjeta centrada, como en el prototipo: en móvil
// ocupa todo el ancho y en escritorio queda como una consola sobre el fondo.
function Shell({ children }) {
  return (
    <div className="bg-aldea-void flex min-h-full justify-center sm:p-7 p-4">
      <div className="bg-aldea-card border-aldea-line flex min-h-full w-full max-w-[390px] flex-col overflow-x-hidden p-4 text-[13px] leading-relaxed sm:min-h-0 sm:rounded-2xl sm:border-2 sm:shadow-2xl border-aldea-line rounded-2xl border">
        {children}
      </div>
    </div>
  )
}
