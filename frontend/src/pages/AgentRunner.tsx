import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAgent } from '../api/agents'
import { startRun, streamRun } from '../api/runs'
import { useConfig } from '../stores/configStore'
import MessageStream, { type StreamItem } from '../components/MessageStream'
import { TermInput } from '../components/ui'
import type { Agent } from '../types'

export default function AgentRunner() {
  const { id } = useParams()
  const nav = useNavigate()
  const apiKey = useConfig((s) => s.apiKey)
  const [agent, setAgent] = useState<Agent | null>(null)
  const [prompt, setPrompt] = useState('')
  const [items, setItems] = useState<StreamItem[]>([])
  const [running, setRunning] = useState(false)

  useEffect(() => { getAgent(Number(id)).then(setAgent) }, [id])

  const run = async () => {
    if (!prompt.trim() || running) return
    setItems([]); setRunning(true)
    try {
      const runId = await startRun(Number(id), prompt, apiKey)
      streamRun(runId, (e) => {
        setItems((prev) => {
          const next = [...prev]
          switch (e.type) {
            case 'assistant':
              next.push({ kind: 'text', text: e.content }); break
            case 'tool_call':
              next.push({ kind: 'tool', call: { name: e.name, args: e.args } }); break
            case 'tool_result': {
              for (let i = next.length - 1; i >= 0; i--) {
                const it = next[i]
                if (it.kind === 'tool' && it.call.name === e.name && it.call.result === undefined) {
                  next[i] = { kind: 'tool', call: { ...it.call, result: e.result } }
                  break
                }
              }
              break
            }
            case 'error':
              next.push({ kind: 'text', text: `[error] ${e.message}` }); break
          }
          return next
        })
        if (e.type === 'done' || e.type === 'error') setRunning(false)
      })
    } catch (err: any) {
      setItems([{ kind: 'text', text: `[error] ${err.message}` }])
      setRunning(false)
    }
  }

  if (!agent) return <div className="p-8 text-term-dim">loading<span className="animate-blink">_</span></div>

  const mono = (agent.name.trim().slice(0, 2) || 'ag').toUpperCase()

  return (
    <div className="p-8 max-w-4xl">
      <button onClick={() => nav('/')} className="text-sm text-term-muted hover:text-term-text mb-5 transition-colors">← cd ..</button>

      <div className="flex items-center gap-3 mb-6">
        <div
          className={`w-12 h-12 rounded border flex items-center justify-center text-sm font-bold tracking-wider ${running ? 'animate-glowPulse' : ''}`}
          style={{ color: agent.color, borderColor: `${agent.color}55`, backgroundColor: `${agent.color}14` }}
        >
          {mono}
        </div>
        <div>
          <h1 className="text-xl font-bold">{agent.name}</h1>
          <div className="text-xs text-term-muted">
            {agent.modelId} · {running ? <span className="text-term-amber">executing</span> : <span className="text-term-dim">ready</span>}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <TermInput
          prompt="$"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
          disabled={running}
          placeholder="descreva a tarefa e pressione enter"
          className="flex-1"
        />
        <button onClick={run} disabled={running} className="btn btn-primary px-6">{running ? '...' : 'run'}</button>
      </div>

      <div className="win">
        <div className="win-bar">
          <span className="dot bg-term-red/60" /><span className="dot bg-term-amber/60" /><span className="dot bg-term-green/60" />
          <span className="win-title ml-1">output :: {agent.name}</span>
          {running && <span className="ml-auto text-[10px] text-term-amber tracking-widest uppercase animate-pulse">live</span>}
        </div>
        <div className="p-5 min-h-[18rem] text-sm">
          {items.length === 0 && !running && (
            <p className="text-term-muted/70">// aguardando comando<span className="animate-blink text-term-green">▋</span></p>
          )}
          <MessageStream items={items} running={running} />
        </div>
      </div>
    </div>
  )
}
