import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { listAgents } from '../api/agents'
import {
  applyOperationConsolidation, approveOperationMemory, consolidateOperationMemories, createOperationMemory,
  deleteOperation, deleteOperationMemory, getOperation, getOperationStats, listOperationMemories,
  listOperationRuns, updateOperation, updateOperationMemory,
} from '../api/operations'
import { listSkills } from '../api/skills'
import { TermInput, Win } from '../components/ui'
import type {
  Agent, AgentRun, AgentSkill, ConsolidationPreview, MemoryCategory, Operation, OperationMemory, OperationStatsSummary,
} from '../types'

const formatCost = (value: number) => `$${value.toFixed(value >= 1 ? 2 : 4)}`

const categories: MemoryCategory[] = ['FACT', 'DECISION', 'LEARNING']

export default function OperationDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const operationId = Number(id)

  const [operation, setOperation] = useState<Operation | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [skills, setSkills] = useState<AgentSkill[]>([])
  const [memories, setMemories] = useState<OperationMemory[]>([])
  const [runs, setRuns] = useState<AgentRun[]>([])
  const [stats, setStats] = useState<OperationStatsSummary | null>(null)
  const [saved, setSaved] = useState(false)
  const [memoryDraft, setMemoryDraft] = useState({ content: '', category: 'FACT' as MemoryCategory })
  const [consolidating, setConsolidating] = useState(false)
  const [preview, setPreview] = useState<ConsolidationPreview | null>(null)
  const [consolidateError, setConsolidateError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      getOperation(operationId), listAgents(), listSkills(),
      listOperationMemories(operationId), listOperationRuns(operationId), getOperationStats(operationId),
    ]).then(([loadedOperation, loadedAgents, loadedSkills, loadedMemories, loadedRuns, loadedStats]) => {
      setOperation(loadedOperation)
      setAgents(loadedAgents)
      setSkills(loadedSkills)
      setMemories(loadedMemories)
      setRuns(loadedRuns)
      setStats(loadedStats)
    })
  }, [operationId])

  if (!operation) return <div className="p-8 text-term-dim">loading<span className="animate-blink">_</span></div>

  const save = async (next: Operation) => {
    setOperation(next)
    await updateOperation(operationId, next)
    setSaved(true)
    setTimeout(() => setSaved(false), 1200)
  }

  const toggle = (list: number[], value: number) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value]

  const addMemory = async () => {
    if (!memoryDraft.content.trim()) return
    await createOperationMemory(operationId, { ...memoryDraft, content: memoryDraft.content.trim(), pinned: false })
    setMemoryDraft({ content: '', category: 'FACT' })
    setMemories(await listOperationMemories(operationId))
  }

  const togglePin = async (memory: OperationMemory) => {
    await updateOperationMemory(operationId, { ...memory, pinned: !memory.pinned })
    setMemories(await listOperationMemories(operationId))
  }

  const removeMemory = async (memory: OperationMemory) => {
    await deleteOperationMemory(operationId, memory.id)
    setMemories(await listOperationMemories(operationId))
  }

  const approveMemory = async (memory: OperationMemory) => {
    await approveOperationMemory(operationId, memory.id)
    setMemories(await listOperationMemories(operationId))
  }

  const consolidate = async () => {
    setConsolidating(true)
    setConsolidateError(null)
    try {
      setPreview(await consolidateOperationMemories(operationId))
    } catch (err: any) {
      setConsolidateError(err.response?.data?.message ?? err.message)
    } finally {
      setConsolidating(false)
    }
  }

  const applyConsolidation = async () => {
    if (!preview) return
    setConsolidating(true)
    setConsolidateError(null)
    try {
      await applyOperationConsolidation(operationId, preview.after)
      setPreview(null)
      setMemories(await listOperationMemories(operationId))
    } catch (err: any) {
      setConsolidateError(err.response?.data?.message ?? err.message)
    } finally {
      setConsolidating(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(`Excluir a operação "${operation.name}" e todas as suas memórias?`)) return
    await deleteOperation(operationId)
    nav('/operations')
  }

  const agentName = (agentId?: number) =>
    agents.find((agent) => agent.id === agentId)?.name ?? (agentId ? `#${agentId}` : 'manual')

  return (
    <div className="p-8 max-w-6xl space-y-5">
      <button onClick={() => nav('/operations')} className="text-sm text-term-muted hover:text-term-text transition-colors">← cd ..</button>

      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded border flex items-center justify-center text-xl"
          style={{ color: operation.color, borderColor: `${operation.color}55`, backgroundColor: `${operation.color}14` }}>
          {operation.emoji}
        </div>
        <div>
          <h1 className="text-xl font-bold">{operation.name}</h1>
          <div className="text-xs text-term-muted">
            {operation.status === 'ACTIVE'
              ? <span className="text-term-green">active</span>
              : <span className="text-term-amber">archived</span>}
            {saved && <span className="text-term-green ml-2">· salvo ✓</span>}
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          <button className="btn btn-ghost"
            onClick={() => save({ ...operation, status: operation.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE' })}>
            {operation.status === 'ACTIVE' ? 'arquivar' : 'reativar'}
          </button>
          <button className="btn btn-danger" onClick={remove}>excluir</button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="panel p-3">
            <div className="text-[10px] text-term-muted tracking-widest uppercase">runs</div>
            <div className="text-lg font-bold mt-0.5">{stats.total.runs}</div>
            <div className="text-[10px] text-term-muted">{stats.month.runs} este mês</div>
          </div>
          <div className="panel p-3">
            <div className="text-[10px] text-term-muted tracking-widest uppercase">custo total</div>
            <div className="text-lg font-bold mt-0.5 text-term-green">{formatCost(stats.total.costUsd)}</div>
            <div className="text-[10px] text-term-muted">{formatCost(stats.month.costUsd)} este mês</div>
          </div>
          <div className="panel p-3">
            <div className="text-[10px] text-term-muted tracking-widest uppercase">média por run</div>
            <div className="text-lg font-bold mt-0.5">
              {stats.total.runs > 0 ? formatCost(stats.total.costUsd / stats.total.runs) : '—'}
            </div>
            <div className="text-[10px] text-term-muted">custo informado pelo provider</div>
          </div>
          <div className="panel p-3">
            <div className="text-[10px] text-term-muted tracking-widest uppercase">tokens</div>
            <div className="text-lg font-bold mt-0.5">{stats.total.tokens.toLocaleString()}</div>
            <div className="text-[10px] text-term-muted">{stats.month.tokens.toLocaleString()} este mês</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Win title="briefing" bodyClass="p-4 space-y-3">
          <div><label className="label">name</label>
            <TermInput value={operation.name} onChange={(e) => setOperation({ ...operation, name: e.target.value })}
              onBlur={() => save(operation)} /></div>
          <div><label className="label">description</label>
            <TermInput value={operation.description ?? ''} onChange={(e) => setOperation({ ...operation, description: e.target.value })}
              onBlur={() => save(operation)} /></div>
          <div><label className="label">briefing (entra no system prompt de todo run da operação)</label>
            <textarea className="field h-40 resize-y" value={operation.briefing ?? ''}
              onChange={(e) => setOperation({ ...operation, briefing: e.target.value })}
              onBlur={() => save(operation)} /></div>
        </Win>

        <div className="space-y-5">
          <Win title="agentes_membros" bodyClass="p-4 space-y-1">
            {agents.map((agent) => (
              <label key={agent.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white/5 rounded px-2 py-1">
                <input type="checkbox" checked={operation.memberAgentIds.includes(agent.id!)}
                  onChange={() => save({ ...operation, memberAgentIds: toggle(operation.memberAgentIds, agent.id!) })} />
                <span style={{ color: agent.color }}>{agent.emoji}</span> {agent.name}
              </label>
            ))}
            {agents.length === 0 && <p className="text-xs text-term-muted">nenhum agente criado</p>}
          </Win>

          <Win title="skills_da_operacao" bodyClass="p-4 space-y-1">
            {skills.map((skill) => (
              <label key={skill.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white/5 rounded px-2 py-1">
                <input type="checkbox" checked={operation.skillIds.includes(skill.id)}
                  onChange={() => save({ ...operation, skillIds: toggle(operation.skillIds, skill.id) })} />
                {skill.name}
              </label>
            ))}
            {skills.length === 0 && <p className="text-xs text-term-muted">nenhuma skill ativa</p>}
          </Win>
        </div>
      </div>

      <Win title={`memorias (${memories.length})`} bodyClass="p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-64">
            <label className="label">nova memória</label>
            <TermInput value={memoryDraft.content} placeholder="fato, decisão ou aprendizado durável"
              onChange={(e) => setMemoryDraft({ ...memoryDraft, content: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && addMemory()} />
          </div>
          <select className="field w-36" value={memoryDraft.category}
            onChange={(e) => setMemoryDraft({ ...memoryDraft, category: e.target.value as MemoryCategory })}>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
          <button className="btn btn-primary" onClick={addMemory}>+ salvar</button>
          <button className="btn btn-ghost" onClick={consolidate} disabled={consolidating || !!preview}
            title="usa o LLM para deduplicar e fundir as memórias não fixadas (com preview antes de aplicar)">
            {consolidating && !preview ? 'consolidando…' : '⚗ consolidar'}
          </button>
        </div>
        {consolidateError && <p className="text-xs text-term-red">[erro] {consolidateError}</p>}

        {preview && (
          <div className="panel p-4 border-term-amber/50 space-y-3">
            <div className="text-sm font-bold text-term-amber">
              preview da consolidação: {preview.before.length} memórias → {preview.after.length}
            </div>
            <p className="text-[10px] text-term-muted">as memórias fixadas (📌) e pendentes não são tocadas · nada é gravado até você aplicar</p>
            <div className="space-y-2 max-h-72 overflow-auto">
              {preview.after.map((draft, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="badge shrink-0">{draft.category}</span>
                  <p className="text-xs text-term-text whitespace-pre-wrap">{draft.content}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button className="btn btn-primary" onClick={applyConsolidation} disabled={consolidating}>
                {consolidating ? 'aplicando…' : 'aplicar'}
              </button>
              <button className="btn btn-ghost" onClick={() => setPreview(null)} disabled={consolidating}>cancelar</button>
            </div>
          </div>
        )}

        {memories.map((memory) => (
          <div key={memory.id}
            className={`panel p-3 ${memory.status === 'PENDING' ? 'border-term-amber/60' : memory.pinned ? 'border-term-amber/40' : ''}`}>
            <div className="flex items-start gap-2">
              <span className="badge shrink-0">{memory.category}</span>
              {memory.status === 'PENDING' && (
                <span className="badge shrink-0 border-term-amber/50 text-term-amber">pendente</span>
              )}
              <p className="text-xs text-term-text whitespace-pre-wrap flex-1">{memory.content}</p>
              <div className="flex gap-1 shrink-0">
                {memory.status === 'PENDING' && (
                  <button className="btn btn-primary px-2 py-1 text-xs" title="aprovar: passa a entrar no prompt dos runs"
                    onClick={() => approveMemory(memory)}>aprovar</button>
                )}
                <button className="btn btn-ghost px-2 py-1 text-xs" title={memory.pinned ? 'desafixar' : 'fixar (sempre no prompt)'}
                  onClick={() => togglePin(memory)}>{memory.pinned ? '📌' : '📍'}</button>
                <button className="btn btn-ghost px-2 py-1 text-xs text-term-red" onClick={() => removeMemory(memory)}>✕</button>
              </div>
            </div>
            <div className="text-[10px] text-term-muted mt-1">
              por {agentName(memory.createdByAgentId)}{memory.createdByRunId ? ` · run #${memory.createdByRunId}` : ''} · {new Date(memory.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
        {memories.length === 0 && <p className="text-xs text-term-muted">// os agentes gravam memórias via save_memory durante os runs</p>}
      </Win>

      <Win title={`runs_da_operacao (${runs.length})`} bodyClass="p-4 space-y-2">
        {runs.map((run) => (
          <Link key={run.id} to={`/agents/${run.agentId}/runs`}
            className="panel p-3 flex items-center gap-3 text-xs hover:border-term-green/50 transition-colors">
            <span className={run.status === 'DONE' ? 'text-term-green' : run.status === 'ERROR' ? 'text-term-red' : 'text-term-amber'}>
              {run.status.toLowerCase()}
            </span>
            <span className="text-term-muted">{agentName(run.agentId)}</span>
            <span className="truncate flex-1 text-term-text">{run.inputPrompt}</span>
            <span className="text-term-muted shrink-0">{new Date(run.startedAt).toLocaleString()}</span>
          </Link>
        ))}
        {runs.length === 0 && <p className="text-xs text-term-muted">// nenhum run vinculado ainda</p>}
      </Win>
    </div>
  )
}
