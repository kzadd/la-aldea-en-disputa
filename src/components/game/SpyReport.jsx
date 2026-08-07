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
      className="bg-aldea-bg/95 absolute inset-0 z-20 flex flex-col gap-3 overflow-y-auto p-4"
    >
      <h2 className="text-aldea-accent flex items-center justify-center gap-2 py-2">
        <PixelIcon name="espionaje" size={16} />
        Informe sobre {name}
      </h2>

      <div className="bg-aldea-panel flex flex-col gap-2 rounded p-3">
        <p className="opacity-60">Recursos</p>
        <div className="grid grid-cols-4 gap-1">
          {RESOURCES.map((r) => (
            <div
              key={r.key}
              title={r.label}
              className="bg-aldea-bg flex items-center justify-center gap-1 rounded py-2"
            >
              <PixelIcon name={r.icon} size={12} /> {report.resources?.[r.key] ?? 0}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-aldea-panel flex flex-col gap-1 rounded p-3">
        <p className="opacity-60">Su decisión de esta ronda</p>
        {report.decision?.build || report.decision?.sabotage ? (
          <>
            {report.decision.build && (
              <p className="flex items-center gap-2">
                <PixelIcon name="casa" size={12} />
                Construye {buildings[report.decision.build]?.name ?? report.decision.build}
              </p>
            )}
            {report.decision.sabotage && (
              <p className="flex items-center gap-2">
                <PixelIcon name={SABOTAGE_ICON[report.decision.sabotage] ?? 'robo'} size={12} />
                {ACTION[report.decision.sabotage] ?? report.decision.sabotage}
              </p>
            )}
          </>
        ) : (
          <p className="opacity-60">Todavía no decidió nada.</p>
        )}
      </div>

      <div className="bg-aldea-panel flex flex-col gap-1 rounded p-3">
        <p className="opacity-60">Misión secreta</p>
        {report.mission ? (
          <>
            <p className="text-aldea-accent">{report.mission.name}</p>
            <p className="leading-relaxed opacity-80">{report.mission.description}</p>
          </>
        ) : (
          <p className="opacity-60">Sin datos.</p>
        )}
      </div>

      <Button full onClick={onClose}>
        Cerrar
      </Button>
    </motion.div>
  )
}
