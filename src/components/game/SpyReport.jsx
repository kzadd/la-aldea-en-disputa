import { motion } from 'framer-motion'
import { RESOURCES, SABOTAGE_ICON } from '../../data/art.js'
import { PixelIcon } from '../PixelIcon.jsx'
import { Button } from '../ui.jsx'

const ACTION = { steal: 'Robo', block: 'Bloqueo', damage: 'Daño', spy: 'Espionaje' }

// Resultado del espionaje. Solo lo ve el espía; la víctima nunca se entera
// (GAME_DESIGN §5.3).
export function SpyReport({ report, name, buildings, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-aldea-card absolute inset-0 z-20 flex flex-col gap-3 overflow-y-auto p-4"
    >
      <h2 className="font-title text-aldea-accent flex items-center justify-center gap-2 py-2 text-[13px] font-extrabold">
        <PixelIcon name="espionaje" size={16} />
        Informe sobre {name}
      </h2>

      <div className="bg-aldea-panel border-aldea-line flex flex-col gap-2.5 rounded-lg border p-4">
        <p className="font-title text-aldea-muted text-[11px] tracking-wide">RECURSOS</p>
        <div className="grid grid-cols-4 gap-1">
          {RESOURCES.map(r => (
            <div
              key={r.key}
              title={r.label}
              className="bg-aldea-card flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-[13px]"
            >
              <PixelIcon name={r.icon} size={12} /> {report.resources?.[r.key] ?? 0}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-aldea-panel border-aldea-line flex flex-col gap-2 rounded-lg border p-4">
        <p className="font-title text-aldea-muted text-[11px] tracking-wide">SU DECISIÓN</p>
        {report.decision?.build || report.decision?.sabotage ? (
          <>
            {report.decision.build && (
              <p className="flex items-center gap-2 text-[12px]">
                <PixelIcon name="casa" size={12} />
                Construye {buildings[report.decision.build]?.name ?? report.decision.build}
              </p>
            )}
            {report.decision.sabotage && (
              <p className="flex items-center gap-2 text-[12px]">
                <PixelIcon name={SABOTAGE_ICON[report.decision.sabotage] ?? 'robo'} size={12} />
                {ACTION[report.decision.sabotage] ?? report.decision.sabotage}
              </p>
            )}
          </>
        ) : (
          <p className="text-aldea-dim text-[12px]">Todavía no decidió nada.</p>
        )}
      </div>

      <div className="bg-aldea-panel border-aldea-line flex flex-col gap-2 rounded-lg border p-4">
        <p className="font-title text-aldea-muted text-[11px] tracking-wide">MISIÓN SECRETA</p>
        {report.mission ? (
          <>
            <p className="font-title text-aldea-accent-soft text-[13px]">{report.mission.name}</p>
            <p className="text-[12px] leading-relaxed">{report.mission.description}</p>
          </>
        ) : (
          <p className="text-aldea-dim text-[12px]">Sin datos.</p>
        )}
      </div>

      <Button full onClick={onClose}>
        CERRAR
      </Button>
    </motion.div>
  )
}
