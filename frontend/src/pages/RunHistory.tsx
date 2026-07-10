import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { listRuns } from '../api/agents'
import type { AgentRun } from '../types'

const STATUS: Record<string, string> = {
  DONE: 'border-term-green/40 text-term-green',
  ERROR: 'border-term-red/40 text-term-red',
  RUNNING: 'border-term-amber/40 text-term-amber animate-pulse',
}

export default function RunHistory() {
  const { id } = useParams()
  const nav = useNavigate()
  const [runs, setRuns] = useState<AgentRun[]>([])

  useEffect(() => { listRuns(Number(id)).then(setRuns) }, [id])

  return (
    <div className="p-8 max-w-3xl">
      <button onClick={() => nav('/')} className="text-sm text-term-muted hover:text-term-text mb-5 transition-colors">← cd ..</button>
      <h1 className="text-2xl font-bold mb-6"><span className="text-term-green">$</span> cat run.log</h1>

      {runs.length === 0 && <p className="text-term-muted">// nenhuma execução registrada</p>}

      <div className="space-y-2">
        {runs.map((r, i) => (
          <div key={r.id} className="panel p-4 animate-fadeIn" style={{ animationDelay: `${i * 40}ms` }}>
            <div className="flex items-center gap-3">
              <span className={`badge ${STATUS[r.status] ?? 'border-term-border text-term-muted'}`}>{r.status}</span>
              <span className="text-xs text-term-muted">{new Date(r.startedAt).toLocaleString('pt-BR')}</span>
              <span className="ml-auto text-[10px] text-term-muted/60">#{r.id}</span>
            </div>
            <p className="text-sm text-term-text mt-2">
              <span className="text-term-green/60 select-none">›&nbsp;</span>{r.inputPrompt}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
