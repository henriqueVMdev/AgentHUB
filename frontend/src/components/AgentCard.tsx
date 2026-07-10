import { useNavigate } from 'react-router-dom'
import type { Agent } from '../types'

interface Props {
  agent: Agent
  running?: boolean
  onRun: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function AgentCard({ agent, running, onRun, onEdit, onDelete }: Props) {
  const nav = useNavigate()
  const mono = (agent.name.trim().slice(0, 2) || 'ag').toUpperCase()

  return (
    <div
      className={`panel p-4 flex flex-col gap-3 animate-fadeIn transition-all duration-200
                  hover:-translate-y-0.5 hover:border-term-dim ${running ? 'animate-glowPulse' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded border flex items-center justify-center text-sm font-bold tracking-wider"
          style={{ color: agent.color, borderColor: `${agent.color}55`, backgroundColor: `${agent.color}14` }}
        >
          {mono}
        </div>
        <div className="min-w-0">
          <div className="font-semibold truncate text-term-text">{agent.name}</div>
          <div className="text-xs text-term-muted truncate">{agent.modelId}</div>
        </div>
        <span
          className={`ml-auto badge ${running ? 'border-term-amber/40 text-term-amber' : 'border-term-border text-term-muted'}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${running ? 'bg-term-amber animate-pulse' : 'bg-term-muted'}`} />
          {running ? 'running' : 'idle'}
        </span>
      </div>

      <p className="text-sm text-term-muted line-clamp-2 min-h-[2.5rem]">{agent.description || '// sem descrição'}</p>

      <div className="flex flex-wrap gap-1">
        {agent.enabledTools.length === 0 && <span className="text-[10px] text-term-muted/60">no tools</span>}
        {agent.enabledTools.map((t) => (
          <span key={t} className="badge border-term-border text-term-dim">{t}</span>
        ))}
      </div>

      <div className="flex gap-2 mt-1">
        <button onClick={onRun} className="btn btn-primary flex-1">run</button>
        <button onClick={() => nav(`/agents/${agent.id}/runs`)} className="btn btn-ghost px-3" title="histórico">log</button>
        <button onClick={onEdit} className="btn btn-ghost px-3" title="editar">edit</button>
        <button onClick={onDelete} className="btn btn-danger px-3" title="excluir">rm</button>
      </div>
    </div>
  )
}
