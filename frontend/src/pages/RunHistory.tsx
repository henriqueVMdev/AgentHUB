import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { listRuns } from '../api/agents'
import type { AgentRun } from '../types'
import MessageStream, { type StreamItem } from '../components/MessageStream'

const STATUS: Record<string, string> = {
  DONE: 'border-term-green/40 text-term-green',
  ERROR: 'border-term-red/40 text-term-red',
  RUNNING: 'border-term-amber/40 text-term-amber animate-pulse',
  CANCELLED: 'border-term-border text-term-muted',
}

export default function RunHistory() {
  const { id } = useParams()
  const nav = useNavigate()
  const [runs, setRuns] = useState<AgentRun[]>([])
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    const load = () => listRuns(Number(id)).then((data) => {
      if (!active) return
      setRuns(data)
      setExpanded((current) => current ?? data[0]?.id ?? null)
    })
    load()
    const timer = window.setInterval(load, 4000)
    return () => { active = false; window.clearInterval(timer) }
  }, [id])

  const transcript = (run: AgentRun): StreamItem[] => {
    if (!run.messagesJson) return []
    try {
      const messages = JSON.parse(run.messagesJson) as Array<Record<string, any>>
      const items: StreamItem[] = []
      const calls = new Map<string, number>()
      messages.forEach((message) => {
        if (message.role === 'assistant') {
          if (message.content) items.push({ kind: 'text', text: String(message.content) })
          if (Array.isArray(message.tool_calls)) message.tool_calls.forEach((call: any) => {
            const index = items.push({ kind: 'tool', call: {
              name: call.function?.name ?? 'tool', args: call.function?.arguments ?? '{}',
            } }) - 1
            if (call.id) calls.set(call.id, index)
          })
        } else if (message.role === 'tool') {
          const index = calls.get(message.tool_call_id)
          if (index !== undefined && items[index]?.kind === 'tool') {
            const item = items[index]
            items[index] = { kind: 'tool', call: { ...item.call, result: String(message.content ?? '') } }
          }
        }
      })
      return items
    } catch {
      return [{ kind: 'text', text: '[erro ao interpretar o resultado salvo]' }]
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <button onClick={() => nav('/')} className="text-sm text-term-muted hover:text-term-text mb-5 transition-colors">← cd ..</button>
      <h1 className="text-2xl font-bold mb-6"><span className="text-term-green">$</span> cat run.log</h1>

      {runs.length === 0 && <p className="text-term-muted">// nenhuma execução registrada</p>}

      <div className="space-y-2">
        {runs.map((r, i) => (
          <div key={r.id} className="panel animate-fadeIn overflow-hidden" style={{ animationDelay: `${i * 40}ms` }}>
            <button className="w-full p-4 text-left" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
            <div className="flex items-center gap-3">
              <span className={`badge ${STATUS[r.status] ?? 'border-term-border text-term-muted'}`}>{r.status}</span>
              <span className="text-xs text-term-muted">{new Date(r.startedAt).toLocaleString('pt-BR')}</span>
              {r.totalTokens != null && <span className="text-[10px] text-term-muted/80" title={`${r.promptTokens ?? 0} in / ${r.completionTokens ?? 0} out`}>
                {r.totalTokens.toLocaleString('pt-BR')} tok{r.costUsd != null ? ` · US$ ${r.costUsd.toFixed(4)}` : ''}
              </span>}
              <span className="ml-auto text-[10px] text-term-muted/60">#{r.id} {expanded === r.id ? '▲' : '▼'}</span>
            </div>
            <p className="text-sm text-term-text mt-2">
              <span className="text-term-green/60 select-none">›&nbsp;</span>{r.inputPrompt}
            </p>
            </button>
            {expanded === r.id && (
              <div className="border-t border-term-border p-4 bg-black/10">
                {r.status === 'RUNNING' && <p className="text-xs text-term-amber mb-3 animate-pulse">// execução em andamento; atualizando automaticamente</p>}
                {transcript(r).length > 0
                  ? <MessageStream items={transcript(r)} running={r.status === 'RUNNING'} />
                  : r.status === 'DONE'
                    ? <p className="text-sm text-term-muted">// esta execução terminou sem resposta textual salva</p>
                    : r.status === 'ERROR'
                      ? <p className="text-sm text-term-red">// a execução terminou com erro antes de salvar a resposta</p>
                      : <MessageStream items={[]} running />}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
