import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listAgents } from '../api/agents'
import { listOperations } from '../api/operations'
import { createSchedule, deleteSchedule, listSchedules, runScheduleNow, updateSchedule } from '../api/schedules'
import { TermInput, Win } from '../components/ui'
import type { Agent, Operation, ScheduledRun } from '../types'

const emptyDraft: ScheduledRun = {
  name: '', agentId: null, operationId: null, prompt: '',
  cronExpression: '0 0 9 * * MON-FRI', enabled: true,
}

export default function Routines() {
  const [schedules, setSchedules] = useState<ScheduledRun[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [operations, setOperations] = useState<Operation[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<ScheduledRun>(emptyDraft)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    setSchedules(await listSchedules())
    setLoading(false)
  }

  useEffect(() => {
    Promise.all([listAgents(), listOperations()]).then(([loadedAgents, loadedOperations]) => {
      setAgents(loadedAgents)
      setOperations(loadedOperations.filter((operation) => operation.status === 'ACTIVE'))
    })
    refresh()
  }, [])

  const create = async () => {
    setError(null)
    try {
      await createSchedule(draft)
      setDraft(emptyDraft)
      await refresh()
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message)
    }
  }

  const toggle = async (schedule: ScheduledRun) => {
    await updateSchedule(schedule.id!, { ...schedule, enabled: !schedule.enabled })
    await refresh()
  }

  const runNow = async (schedule: ScheduledRun) => {
    await runScheduleNow(schedule.id!)
    await refresh()
  }

  const remove = async (schedule: ScheduledRun) => {
    if (!window.confirm(`Excluir a rotina "${schedule.name || 'sem nome'}"?`)) return
    await deleteSchedule(schedule.id!)
    await refresh()
  }

  const agentName = (agentId?: number | null) => agents.find((agent) => agent.id === agentId)?.name ?? `#${agentId}`
  const operationName = (operationId?: number | null) =>
    operations.find((operation) => operation.id === operationId)?.name

  const fmt = (value?: string | null) => (value ? new Date(value).toLocaleString() : '—')

  return (
    <div className="p-8 max-w-6xl space-y-5">
      <div>
        <div className="text-xs text-term-muted tracking-[0.2em] uppercase">~/routines</div>
        <h1 className="text-2xl font-bold mt-1"><span className="text-term-green">$</span> scheduled_runs</h1>
        <p className="text-xs text-term-muted mt-1">
          {schedules.filter((schedule) => schedule.enabled).length} ativas · varredura a cada 30s
        </p>
      </div>

      <Win title="nova_rotina" bodyClass="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><label className="label">name</label>
            <TermInput value={draft.name} placeholder="ex: resumo_diario"
              onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
          <div><label className="label">cron (seg min hora dia mês dia-da-semana)</label>
            <TermInput value={draft.cronExpression} placeholder="0 0 9 * * MON-FRI"
              onChange={(e) => setDraft({ ...draft, cronExpression: e.target.value })} /></div>
          <div><label className="label">agente</label>
            <select className="field w-full" value={draft.agentId ?? ''}
              onChange={(e) => setDraft({ ...draft, agentId: e.target.value ? Number(e.target.value) : null })}>
              <option value="">selecione…</option>
              {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.emoji} {agent.name}</option>)}
            </select></div>
          <div><label className="label">operação (opcional — briefing/skills/memórias)</label>
            <select className="field w-full" value={draft.operationId ?? ''}
              onChange={(e) => setDraft({ ...draft, operationId: e.target.value ? Number(e.target.value) : null })}>
              <option value="">nenhuma</option>
              {operations.map((operation) => (
                <option key={operation.id} value={operation.id}>{operation.emoji} {operation.name}</option>
              ))}
            </select></div>
        </div>
        <div><label className="label">prompt</label>
          <textarea className="field h-24 resize-y" value={draft.prompt}
            placeholder="a tarefa que o agente executa em cada disparo"
            onChange={(e) => setDraft({ ...draft, prompt: e.target.value })} /></div>
        {error && <p className="text-xs text-term-red">[erro] {error}</p>}
        <button className="btn btn-primary" onClick={create}>+ criar rotina</button>
      </Win>

      {loading && <p className="text-term-muted">carregando...</p>}
      <div className="space-y-3">
        {schedules.map((schedule) => (
          <div key={schedule.id} className={`panel p-4 ${schedule.enabled ? '' : 'opacity-50'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-sm">{schedule.name || 'sem nome'}</span>
              <span className="badge">{agentName(schedule.agentId)}</span>
              {schedule.operationId && operationName(schedule.operationId) && (
                <Link to={`/operations/${schedule.operationId}`} className="badge border-term-amber/50 text-term-amber hover:bg-term-amber/10">
                  {operationName(schedule.operationId)}
                </Link>
              )}
              <code className="text-[10px] text-term-muted bg-black/30 px-2 py-0.5 rounded">{schedule.cronExpression}</code>
              <div className="ml-auto flex gap-1">
                <button className="btn btn-ghost px-2 py-1 text-xs" onClick={() => runNow(schedule)}
                  title="dispara imediatamente, fora do cron">▶ rodar agora</button>
                <button className="btn btn-ghost px-2 py-1 text-xs" onClick={() => toggle(schedule)}>
                  {schedule.enabled ? '⏸ pausar' : '⏵ ativar'}
                </button>
                <button className="btn btn-ghost px-2 py-1 text-xs text-term-red" onClick={() => remove(schedule)}>✕</button>
              </div>
            </div>
            <p className="text-xs text-term-muted mt-2 whitespace-pre-wrap">{schedule.prompt}</p>
            <div className="text-[10px] text-term-muted mt-2 flex flex-wrap gap-4">
              <span>último: {fmt(schedule.lastRunAt)}{schedule.lastRunId && schedule.agentId
                ? <> (<Link className="underline hover:text-term-text" to={`/agents/${schedule.agentId}/runs`}>run #{schedule.lastRunId}</Link>)</>
                : null}</span>
              <span>próximo: {schedule.enabled ? fmt(schedule.nextRunAt) : 'pausada'}</span>
            </div>
          </div>
        ))}
      </div>
      {!loading && schedules.length === 0 && (
        <p className="text-xs text-term-muted">// nenhuma rotina — os runs disparam sozinhos no horário do cron</p>
      )}
    </div>
  )
}
