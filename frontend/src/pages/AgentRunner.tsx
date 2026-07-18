import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAgent, listRuns } from '../api/agents'
import { listOperations } from '../api/operations'
import { startRun, stopRun, streamRun } from '../api/runs'
import MessageStream, { type StreamItem } from '../components/MessageStream'
import { TermInput } from '../components/ui'
import type { Agent, Operation } from '../types'

export default function AgentRunner() {
  const { id } = useParams()
  const nav = useNavigate()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [prompt, setPrompt] = useState('')
  const [items, setItems] = useState<StreamItem[]>([])
  const [running, setRunning] = useState(false)
  const [continuationRunId, setContinuationRunId] = useState<number | undefined>()
  const [operations, setOperations] = useState<Operation[]>([])
  const [operationId, setOperationId] = useState<number | undefined>()

  useEffect(() => {
    Promise.all([getAgent(Number(id)), listRuns(Number(id)), listOperations()]).then(([loadedAgent, runs, allOperations]) => {
      setAgent(loadedAgent)
      setOperations(allOperations.filter((operation) =>
        operation.status === 'ACTIVE' && operation.memberAgentIds.includes(Number(id))))
      const latest = runs.find((candidate) => candidate.status === 'DONE' && candidate.messagesJson)
      if (latest) {
        setContinuationRunId(latest.id)
        setItems(parseConversation(latest.messagesJson!))
        // continuar a conversa mantém a operação: preserva save_memory e o vínculo nas estatísticas
        if (latest.operationId) setOperationId(latest.operationId)
      }
    })
  }, [id])

  const parseConversation = (raw: string): StreamItem[] => {
    try {
      const messages = JSON.parse(raw) as Array<Record<string, any>>
      const result: StreamItem[] = []
      const calls = new Map<string, number>()
      messages.forEach((message) => {
        if (message.role === 'user') result.push({ kind: 'user', text: String(message.content ?? '') })
        if (message.role === 'assistant') {
          if (message.content) result.push({ kind: 'text', text: String(message.content) })
          if (Array.isArray(message.tool_calls)) message.tool_calls.forEach((call: any) => {
            const index = result.push({ kind: 'tool', call: {
              name: call.function?.name ?? 'tool', args: call.function?.arguments ?? '{}',
            } }) - 1
            if (call.id) calls.set(call.id, index)
          })
        }
        if (message.role === 'tool') {
          const index = calls.get(message.tool_call_id)
          const item = index === undefined ? undefined : result[index]
          if (item?.kind === 'tool') result[index!] = {
            kind: 'tool', call: { ...item.call, result: String(message.content ?? '') },
          }
        }
      })
      return result
    } catch {
      return []
    }
  }

  const run = async () => {
    if (!prompt.trim() || running) return
    const sentPrompt = prompt.trim()
    setItems((previous) => [...previous, { kind: 'user', text: sentPrompt }]); setRunning(true); setPrompt('')
    try {
      const runId = await startRun(Number(id), sentPrompt, continuationRunId, operationId)
      setContinuationRunId(runId)
      streamRun(runId, (e) => {
        setItems((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          switch (e.type) {
            case 'assistant_delta':
              // acumula tokens no item em streaming; cria um novo se o anterior já fechou
              if (last?.kind === 'text' && last.streaming) {
                next[next.length - 1] = { kind: 'text', text: last.text + e.content, streaming: true }
              } else {
                next.push({ kind: 'text', text: e.content, streaming: true })
              }
              break
            case 'assistant':
              // versão final do passo: substitui os deltas acumulados (dedupe)
              if (last?.kind === 'text' && last.streaming) {
                next[next.length - 1] = { kind: 'text', text: e.content }
              } else {
                next.push({ kind: 'text', text: e.content })
              }
              break
            case 'tool_call':
              // um tool call encerra o texto do passo — fecha o streaming se o final não veio
              if (last?.kind === 'text' && last.streaming) {
                next[next.length - 1] = { kind: 'text', text: last.text }
              }
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
              if (last?.kind === 'text' && last.streaming) {
                next[next.length - 1] = { kind: 'text', text: last.text }
              }
              next.push({ kind: 'text', text: `[error] ${e.message}` }); break
            case 'done':
              if (last?.kind === 'text' && last.streaming) {
                next[next.length - 1] = { kind: 'text', text: last.text }
              }
              break
          }
          return next
        })
        if (e.type === 'done' || e.type === 'error') setRunning(false)
      })
    } catch (err: any) {
      setItems((previous) => [...previous, { kind: 'text', text: `[error] ${err.message}` }])
      setRunning(false)
    }
  }

  const stop = async () => {
    if (!continuationRunId) return
    try { await stopRun(continuationRunId) } catch { /* run já terminou */ }
    setItems((previous) => [...previous, { kind: 'text', text: '[cancelado] parando no próximo passo...' }])
  }

  const newConversation = () => {
    if (running) return
    setItems([])
    setContinuationRunId(undefined)
    setPrompt('')
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
        <div className="ml-auto flex items-center gap-2">
          {operations.length > 0 && (
            <select
              className="field text-xs w-44"
              value={operationId ?? ''}
              disabled={running}
              title="operação: injeta briefing, skills e memórias no run (aplica na próxima conversa)"
              onChange={(e) => {
                setOperationId(e.target.value ? Number(e.target.value) : undefined)
                // trocar de operação muda o system prompt — só vale numa conversa nova
                setItems([])
                setContinuationRunId(undefined)
              }}
            >
              <option value="">sem operação</option>
              {operations.map((operation) => (
                <option key={operation.id} value={operation.id}>{operation.emoji} {operation.name}</option>
              ))}
            </select>
          )}
          <button onClick={newConversation} disabled={running} className="btn btn-ghost">+ nova conversa</button>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <TermInput
          prompt="$"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
          disabled={running}
          placeholder={items.length ? 'responda ao agente e pressione enter' : 'descreva a tarefa e pressione enter'}
          className="flex-1"
        />
        {running
          ? <button onClick={stop} className="btn btn-danger px-6">stop</button>
          : <button onClick={run} className="btn btn-primary px-6">run</button>}
      </div>

      <div className="win">
        <div className="win-bar">
          <span className="dot bg-term-red/60" /><span className="dot bg-term-amber/60" /><span className="dot bg-term-green/60" />
          <span className="win-title ml-1">output :: {agent.name}</span>
          {running && <span className="ml-auto text-[10px] text-term-amber tracking-widest uppercase animate-pulse">live</span>}
        </div>
        <div className="p-5 min-h-[18rem] text-sm">
          {items.length === 0 && !running && (
            <p className="text-term-muted/70">// inicie uma conversa<span className="animate-blink text-term-green">▋</span></p>
          )}
          <MessageStream items={items} running={running} />
        </div>
      </div>
    </div>
  )
}
