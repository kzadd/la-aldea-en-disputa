import { useEffect, useState } from 'react'
import { amITargeted, getMyMission, setComebackPreference, spy, submitAction } from '../lib/api.js'
import { useGame } from '../hooks/useGame.js'
import { ResourceBar } from '../components/game/ResourceBar.jsx'
import { RoundTimer } from '../components/game/RoundTimer.jsx'
import { Market, effectiveCost } from '../components/game/Market.jsx'
import { PlayersStrip } from '../components/game/PlayersStrip.jsx'
import { SabotagePanel } from '../components/game/SabotagePanel.jsx'
import { RevealOverlay } from '../components/game/RevealOverlay.jsx'
import { SpyReport } from '../components/game/SpyReport.jsx'
import { Button } from '../components/ui.jsx'
import { PixelIcon } from '../components/PixelIcon.jsx'
import { RESOURCES, RES_ICON, RES_LABEL, SABOTAGES } from '../data/art.js'

export default function Game({ gameId, userId, catalogs, onFinished }) {
  const { game, room, players, market, buildings, events, confirmed, cooldowns, me, loading } =
    useGame(gameId, userId)
  const [slot, setSlot] = useState(null)
  const [sabotage, setSabotage] = useState(null)
  const [target, setTarget] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [spyReport, setSpyReport] = useState(null)
  const [spying, setSpying] = useState(false)
  const [targeted, setTargeted] = useState(false)
  const [mission, setMission] = useState(null)
  const [showMission, setShowMission] = useState(false)
  const [showPref, setShowPref] = useState(false)

  const round = game?.current_round
  const phase = game?.round_phase

  useEffect(() => {
    setSlot(null)
    setSabotage(null)
    setTarget(null)
    setError(null)
    setSpyReport(null)
    setTargeted(false)
  }, [round])

  useEffect(() => {
    if (game?.status === 'finished') onFinished()
  }, [game?.status, onFinished])

  // Tu misión secreta, a mano durante toda la partida (§8)
  useEffect(() => {
    if (gameId) getMyMission(gameId).then((m) => setMission(m?.[0] ?? null)).catch(() => {})
  }, [gameId])

  // Torre de Vigilancia: sondea durante la decisión (GAME_DESIGN §4.2).
  // Sin Torre el servidor siempre devuelve false, así que no filtra nada.
  useEffect(() => {
    if (!gameId || phase !== 'decision') return
    const check = () => amITargeted(gameId).then(setTargeted).catch(() => {})
    check()
    const id = setInterval(check, 4000)
    return () => clearInterval(id)
  }, [gameId, phase, round])

  if (loading || !game || !me) return <p className="p-4">Cargando partida…</p>

  const isDecision = phase === 'decision'
  const iConfirmed = confirmed.includes(userId)
  const limit = catalogs.characters[me.character_key]?.storage_limit ?? 10

  const spend = { wood: 0, stone: 0, gold: 0, food: 0 }
  if (slot !== null) {
    const b = catalogs.buildings[market.find((m) => m.slot === slot)?.building_key]
    if (b) {
      const c = effectiveCost(b, me.character_key)
      RESOURCES.forEach((r) => (spend[r.key] += c[r.key]))
    }
  }
  if (sabotage && sabotage.type !== 'spy') {
    const cost = SABOTAGES.find((s) => s.type === sabotage.type).cost
    Object.entries(cost).forEach(([k, v]) => (spend[k] += v))
  }

  // Viento a favor de esta ronda (§9.1): quién lo cobró, según el servidor
  const comebackEvents = events.filter((e) => e.type === 'comeback')
  const comeback = comebackEvents.map((e) => e.target_id)
  const myComeback = comebackEvents.find((e) => e.target_id === userId)

  const savePref = async (r) => {
    setShowPref(false)
    try {
      await setComebackPreference(gameId, r)
    } catch (e) {
      setError(e.message)
    }
  }

  const canPay = RESOURCES.every((r) => me[r.key] >= spend[r.key])
  const targetBuildings = buildings.filter((b) => b.user_id === target)
  const sabotageReady =
    !sabotage ||
    sabotage.type === 'spy' ||
    (target &&
      (sabotage.type !== 'damage' || sabotage.params?.building_id))
  const blocked = me.blocked_next_round && me.character_key !== 'nomada'

  const confirm = async () => {
    setBusy(true)
    setError(null)
    try {
      await submitAction(gameId, {
        buildSlot: slot,
        sabotage:
          sabotage && sabotage.type !== 'spy' ? { ...sabotage, target } : null,
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const doSpy = async (t) => {
    setSpying(true)
    setError(null)
    try {
      setSpyReport({ report: await spy(gameId, t), target: t })
      setSabotage(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setSpying(false)
    }
  }

  const nameOf = (id) => players.find((p) => p.user_id === id)?.profiles?.nickname

  return (
    <div className="relative flex h-full flex-col gap-2">
      <ResourceBar
        me={me}
        limit={limit}
        round={round}
        maxRounds={room?.max_rounds ?? '?'}
        timer={game.round_deadline && <RoundTimer deadline={game.round_deadline} />}
      />

      <PlayersStrip
        players={players}
        buildings={buildings}
        confirmed={confirmed}
        userId={userId}
        targetId={target}
        onTarget={isDecision && sabotage ? setTarget : null}
        comeback={comeback}
      />

      {myComeback && (
        <div className="bg-aldea-panel animate-pop flex items-center gap-2 rounded p-2">
          <PixelIcon name="hoja" size={14} />
          <span className="flex flex-1 items-center gap-1 leading-relaxed">
            Viento a favor: +1
            <PixelIcon
              name={RES_ICON[myComeback.payload.resource]}
              size={12}
              title={RES_LABEL[myComeback.payload.resource]}
            />
            por ir último
          </span>
          <button
            type="button"
            onClick={() => setShowPref((v) => !v)}
            className="bg-aldea-bg rounded px-2 py-1"
          >
            {showPref ? '▲' : 'elegir'}
          </button>
        </div>
      )}

      {showPref && (
        <div className="bg-aldea-panel flex flex-col gap-2 rounded p-2">
          <p className="opacity-60">Qué recurso prefieres mientras vayas último</p>
          <div className="grid grid-cols-5 gap-1">
            {RESOURCES.map((r) => (
              <button
                key={r.key}
                type="button"
                title={r.label}
                onClick={() => savePref(r.key)}
                className={`flex items-center justify-center rounded py-2 ${
                  me.comeback_preference === r.key ? 'bg-aldea-accent text-aldea-bg' : 'bg-aldea-bg'
                }`}
              >
                <PixelIcon name={r.icon} size={14} />
              </button>
            ))}
            <button
              type="button"
              onClick={() => savePref(null)}
              className={`rounded py-2 text-[8px] ${
                me.comeback_preference ? 'bg-aldea-bg' : 'bg-aldea-accent text-aldea-bg'
              }`}
              title="El que menos tengas"
            >
              auto
            </button>
          </div>
        </div>
      )}

      {mission && (
        <button
          onClick={() => setShowMission((v) => !v)}
          className="bg-aldea-panel rounded p-2 text-left leading-relaxed"
        >
          <PixelIcon name="secreto" size={12} />{' '}
          {showMission ? mission.description : 'Tu misión secreta'}
          <span className="opacity-40"> {showMission ? '▲' : '▼'}</span>
        </button>
      )}

      <div className="flex-1 overflow-y-auto">
        {targeted && (
          <p className="mb-2 rounded bg-amber-900 p-2 text-center leading-relaxed">
            <PixelIcon name="torre" size={12} /> Tu Torre detecta que alguien te está apuntando
          </p>
        )}
        {blocked && (
          <p className="mb-2 rounded bg-red-900 p-2 text-center">
            <PixelIcon name="bloqueo" size={12} /> Bloqueado: esta ronda no puedes construir
          </p>
        )}
        <Market
          market={market}
          buildings={catalogs.buildings}
          me={me}
          selected={slot}
          onSelect={setSlot}
          disabled={!isDecision || blocked}
        />
      </div>

      <SabotagePanel
        sabotage={sabotage}
        onChange={setSabotage}
        disabled={!isDecision}
        me={me}
        round={round}
        cooldowns={cooldowns}
        target={target}
        targetName={nameOf(target)}
        targetBuildings={targetBuildings}
        buildings={catalogs.buildings}
        onSpy={doSpy}
        spying={spying}
      />

      {error && <p className="text-center text-red-400">{error}</p>}

      <Button
        full
        disabled={!isDecision || busy || !canPay || !sabotageReady}
        tone={iConfirmed ? 'ghost' : 'accent'}
        onClick={confirm}
      >
        {!isDecision
          ? 'Resolviendo…'
          : iConfirmed
            ? 'Cambiar decisión'
            : slot === null && !sabotage
              ? 'Guardar recursos'
              : 'Confirmar decisión'}
      </Button>

      {spyReport && (
        <SpyReport
          report={spyReport.report}
          name={nameOf(spyReport.target)}
          buildings={catalogs.buildings}
          onClose={() => setSpyReport(null)}
        />
      )}

      {phase === 'reveal' && (
        <RevealOverlay
          events={events}
          players={players}
          buildings={catalogs.buildings}
          round={round}
          userId={userId}
        />
      )}
    </div>
  )
}
