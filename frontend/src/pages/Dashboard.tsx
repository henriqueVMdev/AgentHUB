import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAgents } from '../stores/agentStore'
import AgentCard from '../components/AgentCard'
import { listRuns } from '../api/agents'
import type { AgentRun } from '../types'

export default function Dashboard() {
  const { agents, loading, fetch, remove } = useAgents()
  const nav = useNavigate()
  const [latestRuns, setLatestRuns] = useState<Record<number, AgentRun>>({})

  useEffect(() => { fetch() }, [fetch])

  useEffect(() => {
    if (!agents.length) return
    let active = true
    const loadRuns = async () => {
      const entries = await Promise.all(agents.map(async (agent) => {
        const runs = await listRuns(agent.id!)
        return [agent.id!, runs[0]] as const
      }))
      if (active) setLatestRuns(Object.fromEntries(entries.filter(([, run]) => run)))
    }
    loadRuns()
    const timer = window.setInterval(loadRuns, 5000)
    return () => { active = false; window.clearInterval(timer) }
  }, [agents])

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-end mb-8">
        <div>
          <div className="text-xs text-term-muted tracking-[0.2em] uppercase">~/agents</div>
          <h1 className="text-2xl font-bold mt-1">
            <span className="text-term-green">$</span> ls --agents
          </h1>
        </div>
        <button onClick={() => nav('/agents/new')} className="btn btn-primary ml-auto">+ new_agent</button>
      </div>

      {loading && <p className="text-term-dim">loading<span className="animate-blink">_</span></p>}

      {!loading && agents.length === 0 && (
        <div className="win max-w-lg mx-auto mt-16 animate-fadeIn">
          <div className="win-bar">
            <span className="dot bg-term-red/60" /><span className="dot bg-term-amber/60" /><span className="dot bg-term-green/60" />
            <span className="win-title ml-1">no_agents</span>
          </div>
          <div className="p-6 text-center text-term-muted text-sm">
            <p className="mb-1"><span className="text-term-green">$</span> query returned 0 rows</p>
            <p className="text-term-dim">// crie seu primeiro agente para começar</p>
            <button onClick={() => nav('/agents/new')} className="btn btn-primary mt-5">initialize agent</button>
          </div>
        </div>
      )}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((a, i) => (
          <div key={a.id} style={{ animationDelay: `${i * 50}ms` }} className="animate-fadeIn">
            <AgentCard
              agent={a}
              runStatus={latestRuns[a.id!]?.status}
              onRun={() => nav(`/agents/${a.id}/run`)}
              onEdit={() => nav(`/agents/${a.id}/edit`)}
              onDelete={() => { if (confirm(`rm "${a.name}"?`)) remove(a.id!) }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
