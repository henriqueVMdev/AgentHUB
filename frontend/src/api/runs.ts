import { api } from './client'
import type { StreamEvent } from '../types'

export const startRun = (agentId: number, prompt: string, continuationRunId?: number, operationId?: number) =>
  api.post<{ runId: number }>('/runs/start', { agentId, prompt, continuationRunId, operationId }).then(r => r.data.runId)

export const stopRun = (runId: number) => api.post(`/runs/${runId}/stop`)

/**
 * Abre o SSE do run e chama onEvent para cada evento até 'done'/'error'.
 * Usa EventSource — o backend inicia a execução ao conectar no /stream.
 */
export function streamRun(runId: number, onEvent: (e: StreamEvent) => void): () => void {
  const es = new EventSource(`/api/runs/${runId}/stream`)

  const on = (name: string, map: (data: any) => StreamEvent) =>
    es.addEventListener(name, (ev: MessageEvent) => onEvent(map(JSON.parse(ev.data))))

  on('assistant', d => ({ type: 'assistant', content: d.content }))
  on('tool_call', d => ({ type: 'tool_call', name: d.name, args: d.args }))
  on('tool_result', d => ({ type: 'tool_result', name: d.name, result: d.result }))
  on('done', () => ({ type: 'done' }))

  es.addEventListener('done', () => es.close())
  // 'error' também é o evento nativo de falha de conexão (sem data) — sem tratá-lo a promise de quem consome nunca resolve
  es.addEventListener('error', (ev: MessageEvent) => {
    es.close()
    let message = 'conexão com o backend perdida'
    try { message = JSON.parse(ev.data).message || message } catch { /* evento nativo, sem data */ }
    onEvent({ type: 'error', message })
  })

  return () => es.close()
}
