import { useEffect, useState } from "react";
import { Market, effectiveCost } from "../components/game/Market.jsx";
import { MyBuildings } from "../components/game/MyBuildings.jsx";
import { PlayersStrip } from "../components/game/PlayersStrip.jsx";
import { ResourceBar } from "../components/game/ResourceBar.jsx";
import { RevealOverlay } from "../components/game/RevealOverlay.jsx";
import { RoundTimer } from "../components/game/RoundTimer.jsx";
import { SabotagePanel } from "../components/game/SabotagePanel.jsx";
import { SpyReport } from "../components/game/SpyReport.jsx";
import { PixelIcon } from "../components/PixelIcon.jsx";
import { Button } from "../components/ui.jsx";
import { RESOURCES, RES_ICON, RES_LABEL, SABOTAGES } from "../data/art.js";
import { useGame } from "../hooks/useGame.js";
import {
  amITargeted,
  cancelAction,
  cancelGame,
  enterGame,
  getMyMission,
  setComebackPreference,
  spy,
  submitAction,
} from "../lib/api.js";

export default function Game({ gameId, userId, catalogs, onFinished }) {
  const {
    game,
    room,
    players,
    market,
    buildings,
    events,
    confirmed,
    cooldowns,
    me,
    loading,
    reload,
  } = useGame(gameId, userId);
  const [slot, setSlot] = useState(null);
  const [sabotage, setSabotage] = useState(null);
  const [target, setTarget] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [spyReport, setSpyReport] = useState(null);
  const [spying, setSpying] = useState(false);
  const [targeted, setTargeted] = useState(false);
  const [mission, setMission] = useState(null);
  const [showMission, setShowMission] = useState(false);
  const [showPref, setShowPref] = useState(false);
  const [confirmarFin, setConfirmarFin] = useState(false);

  const round = game?.current_round;
  const phase = game?.round_phase;

  useEffect(() => {
    setSlot(null);
    setSabotage(null);
    setTarget(null);
    setError(null);
    setSpyReport(null);
    setTargeted(false);
  }, [round]);

  useEffect(() => {
    // 'cancelled' también termina la partida: el host la cortó
    if (game && game.status !== "playing" && game.status !== "assigning")
      onFinished();
  }, [game?.status, game, onFinished]);

  // Idempotente: cubre a quien recarga y se salta el sorteo. El reloj de la
  // ronda 1 no arranca de verdad hasta que entraron todos.
  useEffect(() => {
    if (gameId) enterGame(gameId).catch(() => {});
  }, [gameId]);

  // Tu misión secreta, a mano durante toda la partida (§8)
  useEffect(() => {
    if (gameId)
      getMyMission(gameId)
        .then((m) => setMission(m?.[0] ?? null))
        .catch(() => {});
  }, [gameId]);

  // Torre de Vigilancia: sondea durante la decisión (GAME_DESIGN §4.2).
  // Sin Torre el servidor siempre devuelve false, así que no filtra nada.
  useEffect(() => {
    if (!gameId || phase !== "decision") return;
    const check = () =>
      amITargeted(gameId)
        .then(setTargeted)
        .catch(() => {});
    check();
    const id = setInterval(check, 4000);
    return () => clearInterval(id);
  }, [gameId, phase, round]);

  if (loading) return <p className="p-4">Cargando partida…</p>;
  // Sin partida legible no hay nada que reintentar solo: antes se quedaba en
  // "Cargando partida…" para siempre y parecía que la app se había colgado.
  if (!game || !me)
    return (
      <p className="text-aldea-warm p-4 text-center text-[13px] leading-relaxed">
        No pudimos cargar esta partida. Volvé al inicio y entrá de nuevo.
      </p>
    );

  const isDecision = phase === "decision";
  const iConfirmed = confirmed.includes(userId);
  // Con la decisión enviada no se toca nada más: seguir eligiendo cartas o
  // sabotajes que ya no viajan a ningún lado solo genera clics perdidos. Se
  // vuelve a abrir con "Cambiar decisión".
  const editable = isDecision && !iConfirmed;
  const isHost = room?.host_id === userId;

  // Mientras alguien sigue en el sorteo el reloj todavía no cuenta de verdad:
  // el servidor lo reinicia entero cuando entra el último (RPC enter_game).
  const faltanEntrar = players.filter((p) => !p.entered_at).length;
  const esperandoEntradas = round === 1 && faltanEntrar > 0;
  const limit = catalogs.characters[me.character_key]?.storage_limit ?? 10;

  // La carta marcada: le da nombre al botón de confirmar ("Construir Cantera")
  const elegida =
    slot === null
      ? null
      : catalogs.buildings[market.find((m) => m.slot === slot)?.building_key];

  const spend = { wood: 0, stone: 0, gold: 0, food: 0 };
  if (slot !== null) {
    const b =
      catalogs.buildings[market.find((m) => m.slot === slot)?.building_key];
    if (b) {
      const c = effectiveCost(b, me.character_key);
      RESOURCES.forEach((r) => (spend[r.key] += c[r.key]));
    }
  }
  if (sabotage && sabotage.type !== "spy") {
    const cost = SABOTAGES.find((s) => s.type === sabotage.type).cost;
    Object.entries(cost).forEach(([k, v]) => (spend[k] += v));
  }

  // Viento a favor de esta ronda (§9.1): quién lo cobró, según el servidor
  const comebackEvents = events.filter((e) => e.type === "comeback");
  const comeback = comebackEvents.map((e) => e.target_id);
  const myComeback = comebackEvents.find((e) => e.target_id === userId);

  // Guardar la preferencia no dispara realtime (es una columna propia), así que
  // hay que releer: si no, el recurso marcado seguía siendo el viejo hasta
  // recargar la página.
  const savePref = async (r) => {
    try {
      await setComebackPreference(gameId, r);
      await reload();
    } catch (e) {
      setError(e.message);
    }
  };

  // Construir y sabotear en la misma ronda se pagan del mismo bolsillo. Cada
  // carta por separado puede estar a tu alcance y la suma no: sin este aviso el
  // botón se quedaba gris sin decir por qué.
  const faltantes = RESOURCES.filter((r) => me[r.key] < spend[r.key]);
  const canPay = faltantes.length === 0;
  const targetBuildings = buildings.filter((b) => b.user_id === target);
  const sabotageReady =
    !sabotage ||
    sabotage.type === "spy" ||
    (target && (sabotage.type !== "damage" || sabotage.params?.building_id));
  const blocked = me.blocked_next_round && me.character_key !== "nomada";

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await submitAction(gameId, {
        buildSlot: slot,
        sabotage:
          sabotage && sabotage.type !== "spy" ? { ...sabotage, target } : null,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const deshacer = async () => {
    setBusy(true);
    setError(null);
    try {
      await cancelAction(gameId);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const doSpy = async (t) => {
    setSpying(true);
    setError(null);
    try {
      setSpyReport({ report: await spy(gameId, t), target: t });
      setSabotage(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setSpying(false);
    }
  };

  const nameOf = (id) =>
    players.find((p) => p.user_id === id)?.profiles?.nickname;

  return (
    <div className="relative flex min-h-full flex-col gap-2.5">
      <ResourceBar
        me={me}
        limit={limit}
        round={round}
        maxRounds={room?.max_rounds ?? "?"}
        timer={
          esperandoEntradas ? (
            <span className="bg-aldea-panel border-aldea-line flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px]">
              <PixelIcon name="reloj" size={11} />
              esperando {faltanEntrar}
            </span>
          ) : (
            game.round_deadline && <RoundTimer deadline={game.round_deadline} />
          )
        }
      />

      <PlayersStrip
        players={players}
        buildings={buildings}
        confirmed={confirmed}
        userId={userId}
        targetId={target}
        characters={catalogs.characters}
        comeback={comeback}
        round={round}
      />

      {/* Misma mecánica que la misión secreta: toda la barra es el botón y lo
          que elige el recurso se despliega debajo. */}
      {myComeback && (
        <button
          type="button"
          onClick={() => setShowPref((v) => !v)}
          className="border-aldea-line hover:border-aldea-accent-dark animate-pop flex items-center gap-2.5 rounded-md border p-3 text-left text-[12px]"
          style={{ background: "#241a13" }}
        >
          <PixelIcon name="viento" size={15} />
          <span className="flex flex-1 items-center gap-1.5">
            Viento a favor: +1
            <PixelIcon
              name={RES_ICON[myComeback.payload.resource]}
              size={12}
              title={RES_LABEL[myComeback.payload.resource]}
            />
            por ir último
          </span>
          <PixelIcon
            name={showPref ? "flecha_arriba" : "flecha_abajo"}
            size={10}
          />
        </button>
      )}

      {showPref && (
        <div className="bg-aldea-panel border-aldea-line flex flex-col gap-2 rounded-lg border p-3">
          <p className="text-aldea-muted text-[12px]">
            Qué recurso preferís mientras vayas último
          </p>
          {/* Cada opción dice su nombre: el globo del navegador tarda un
              segundo, no existe en móvil y no se parece en nada al resto. */}
          <div className="grid grid-cols-5 gap-1">
            {RESOURCES.map((r) => {
              const on = me.comeback_preference === r.key
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => savePref(r.key)}
                  className={`flex flex-col items-center gap-1.5 rounded-md border py-2 text-[11px] leading-none transition ${
                    on
                      ? "border-aldea-accent text-aldea-accent"
                      : "border-aldea-line text-aldea-dim hover:border-aldea-accent-dark hover:text-aldea-ink"
                  }`}
                  style={{ background: on ? "rgba(232,163,61,.1)" : "#17110d" }}
                >
                  <PixelIcon name={r.icon} size={16} />
                  {r.label}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => savePref(null)}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-md border py-2 text-[11px] leading-none transition ${
                me.comeback_preference
                  ? "border-aldea-line text-aldea-dim hover:border-aldea-accent-dark hover:text-aldea-ink"
                  : "border-aldea-accent text-aldea-accent"
              }`}
              style={{
                background: me.comeback_preference ? "#17110d" : "rgba(232,163,61,.1)",
              }}
            >
              <PixelIcon name="interrogante" size={16} />
              auto
            </button>
          </div>
        </div>
      )}

      {/* La cabecera no se va al abrir: se despliega una tarjeta debajo, así
          siempre se ve de qué se trata lo que quedó abierto. */}
      {mission && (
        <>
          <button
            onClick={() => setShowMission((v) => !v)}
            className="border-aldea-line hover:border-aldea-accent-dark flex items-center gap-2.5 rounded-md border p-3 text-left"
            style={{ background: "#241a13" }}
          >
            <PixelIcon name="bloqueo" size={15} />
            <span className="font-title text-aldea-ink flex-1 text-[12px] font-bold">
              TU MISIÓN SECRETA
            </span>
            <PixelIcon
              name={showMission ? "flecha_arriba" : "flecha_abajo"}
              size={10}
            />
          </button>

          {showMission && (
            <div
              className="flex flex-col gap-[7px] rounded-md border p-[13px]"
              style={{ background: "#1d150f", borderColor: "#8a6224" }}
            >
              <p className="font-title text-aldea-accent-soft text-[13px] font-bold">
                {mission.name}
              </p>
              <p className="text-[12px] leading-[1.6]">{mission.description}</p>
              <p className="text-aldea-dim text-[11px]">
                +{mission.points} puntos · nadie más la ve
              </p>
            </div>
          )}
        </>
      )}

      <MyBuildings
        mias={buildings.filter((b) => b.user_id === userId)}
        catalogo={catalogs.buildings}
        round={round}
      />

      {/* Los avisos van a plena luz: son lo que explica por qué el mercado
          está apagado, así que atenuarlos era esconder el motivo. */}
      <div className="flex-1">
        {targeted && (
          <p
            className="border-aldea-accent-dark text-aldea-accent-soft mb-2 flex items-center justify-center gap-2 rounded-lg border p-2.5 text-center text-[12px] leading-relaxed"
            style={{ background: "rgba(232,163,61,.1)" }}
          >
            <PixelIcon name="torre" size={13} /> Alguien te está apuntando
          </p>
        )}
        {blocked && (
          <p
            className="border-aldea-danger text-aldea-warm mb-2 flex items-center justify-center gap-2 rounded-lg border p-2.5 text-center text-[12px]"
            style={{ background: "rgba(192,73,46,.12)" }}
          >
            <PixelIcon name="bloqueo" size={13} /> Bloqueado: esta ronda no
            podés construir
          </p>
        )}
        {/* Con la decisión enviada, o bloqueado, el mercado se atenúa: además
            de no responder, tiene que verse que no responde. */}
        <div className={`transition-opacity ${editable && !blocked ? '' : 'opacity-45'}`}>
          <Market
            market={market}
            buildings={catalogs.buildings}
            me={me}
            selected={slot}
            onSelect={setSlot}
            disabled={!editable || blocked}
          />
        </div>
      </div>

      <div
        className={`flex flex-col transition-opacity ${editable ? "" : "opacity-45"}`}
      >
        <SabotagePanel
          sabotage={sabotage}
          onChange={setSabotage}
          disabled={!editable}
          me={me}
          round={round}
          cooldowns={cooldowns}
          players={players}
          characters={catalogs.characters}
          userId={userId}
          target={target}
          onTarget={setTarget}
          targetName={nameOf(target)}
          targetBuildings={targetBuildings}
          buildings={catalogs.buildings}
          onSpy={doSpy}
          spying={spying}
        />
      </div>

      {error && (
        <p className="text-aldea-warm text-center text-[12px]">{error}</p>
      )}

      {editable && !canPay && (
        <p className="text-aldea-warm flex flex-wrap items-center justify-center gap-1.5 text-center text-[12px]">
          Con todo junto te faltan
          {faltantes.map((r) => (
            <span key={r.key} className="flex items-center gap-[4px]">
              {spend[r.key] - me[r.key]}
              <PixelIcon name={r.icon} size={13} title={r.label} />
            </span>
          ))}
        </p>
      )}

      {/* Confirmado no es definitivo: se puede deshacer mientras la ronda siga
          abierta. Antes el botón volvía a enviar lo mismo y parecía trabado. */}
      {iConfirmed ? (
        <div className="flex flex-col gap-2.5">
          <p
            className="flex items-center justify-center gap-2 text-[12px]"
            style={{ color: "#8fc178" }}
          >
            <PixelIcon name="check" size={12} />
            Decisión enviada · esperando a los demás
          </p>
          <Button
            full
            tone="ghost"
            disabled={!isDecision || busy}
            onClick={deshacer}
          >
            Cambiar decisión
          </Button>
        </div>
      ) : (
        <Button
          full
          disabled={!isDecision || busy || !canPay || !sabotageReady}
          onClick={confirm}
        >
          {!isDecision
            ? "Resolviendo…"
            : slot === null && !sabotage
              ? "Guardar recursos"
              : elegida
                ? `Construir ${elegida.name}`
                : "Confirmar decisión"}
        </Button>
      )}

      {/* Secundario a propósito: es una salida de emergencia, no una jugada */}
      {isHost && (
        <button
          type="button"
          disabled={busy}
          className={`self-center rounded-lg border px-4 py-2 text-[12px] ${
            confirmarFin
              ? "border-aldea-danger text-aldea-warm"
              : "border-aldea-line text-aldea-dim hover:border-aldea-danger hover:text-aldea-warm"
          }`}
          onClick={async () => {
            if (!confirmarFin) return setConfirmarFin(true);
            setBusy(true);
            try {
              await cancelGame(gameId);
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
              setConfirmarFin(false);
            }
          }}
        >
          {confirmarFin ? "Sí, cancelar (no puntúa)" : "Cancelar partida"}
        </button>
      )}

      {spyReport && (
        <SpyReport
          report={spyReport.report}
          name={nameOf(spyReport.target)}
          buildings={catalogs.buildings}
          onClose={() => setSpyReport(null)}
        />
      )}

      {phase === "reveal" && (
        <RevealOverlay
          events={events}
          players={players}
          buildings={catalogs.buildings}
          round={round}
          userId={userId}
          deadline={game.round_deadline}
        />
      )}
    </div>
  );
}
