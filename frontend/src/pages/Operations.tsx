import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createOperation, listOperations, listOperationStats } from '../api/operations'
import { TermInput, Win } from '../components/ui'
import type { Operation, OperationStats } from '../types'

const emptyDraft = { name: '', description: '' }

export default function Operations() {
  const [operations, setOperations] = useState<Operation[]>([])
  const [stats, setStats] = useState<Record<number, OperationStats>>({})
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState(emptyDraft)

  const refresh = async () => {
    const [loadedOperations, loadedStats] = await Promise.all([listOperations(), listOperationStats()])
    setOperations(loadedOperations)
    setStats(loadedStats)
    setLoading(false)
  }
  useEffect(() => { refresh() }, [])

  const create = async () => {
    if (!draft.name.trim()) return
    await createOperation({
      name: draft.name.trim(),
      description: draft.description.trim(),
      briefing: '',
      status: 'ACTIVE',
      emoji: '🎯',
      color: '#f59e0b',
      memberAgentIds: [],
      skillIds: [],
    })
    setDraft(emptyDraft)
    await refresh()
  }

  const active = operations.filter((operation) => operation.status === 'ACTIVE')
  const archived = operations.filter((operation) => operation.status === 'ARCHIVED')

  return (
    <div className="p-8 max-w-6xl space-y-5">
      <div>
        <div className="text-xs text-term-muted tracking-[0.2em] uppercase">~/operations</div>
        <h1 className="text-2xl font-bold mt-1"><span className="text-term-green">$</span> operations</h1>
        <p className="text-xs text-term-muted mt-1">{active.length} ativas · {archived.length} arquivadas</p>
      </div>

      <Win title="nova_operacao" bodyClass="p-4 flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-48">
          <label className="label">name</label>
          <TermInput value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && create()} placeholder="ex: anuncios_ml_hrb" />
        </div>
        <div className="flex-[2] min-w-64">
          <label className="label">description</label>
          <TermInput value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && create()} placeholder="objetivo em uma linha" />
        </div>
        <button className="btn btn-primary" onClick={create}>+ criar</button>
      </Win>

      {loading && <p className="text-term-muted">carregando...</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {operations.map((operation) => (
          <Link key={operation.id} to={`/operations/${operation.id}`}
            className={`panel p-4 block hover:border-term-green/50 transition-colors ${operation.status === 'ARCHIVED' ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded border flex items-center justify-center text-lg"
                style={{ color: operation.color, borderColor: `${operation.color}55`, backgroundColor: `${operation.color}14` }}>
                {operation.emoji}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm truncate">{operation.name}</div>
                <div className="text-xs text-term-muted truncate">{operation.description || 'sem descrição'}</div>
              </div>
              <div className="ml-auto text-[10px] text-term-muted text-right shrink-0">
                <div>{operation.memberAgentIds.length} agentes · {operation.skillIds.length} skills</div>
                <div>
                  {stats[operation.id!]?.runs ?? 0} runs
                  {stats[operation.id!] && stats[operation.id!].costUsd > 0 && (
                    <span className="text-term-green"> · ${stats[operation.id!].costUsd.toFixed(stats[operation.id!].costUsd >= 1 ? 2 : 4)}</span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {!loading && operations.length === 0 && (
        <p className="text-xs text-term-muted">// nenhuma operação — crie a primeira acima</p>
      )}
    </div>
  )
}
