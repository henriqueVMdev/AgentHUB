import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useModels } from '../stores/modelStore'
import { isFree, newAgentWithModelUrl, type ORModel } from '../api/models'
import ModelBadges from '../components/ModelBadges'
import { TermInput } from '../components/ui'

export default function Models() {
  const { models, loading, loaded, error, fetch } = useModels()
  const [query, setQuery] = useState('')
  const [freeOnly, setFreeOnly] = useState(false)

  useEffect(() => { fetch() }, [fetch])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list: ORModel[] = models
    if (freeOnly) list = list.filter(isFree)
    if (q) list = list.filter((m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q))
    return [...list].sort((a, b) => {
      const fa = isFree(a) ? 0 : 1, fb = isFree(b) ? 0 : 1
      if (fa !== fb) return fa - fb
      return Number(a.pricing.prompt) - Number(b.pricing.prompt)
    })
  }, [models, query, freeOnly])

  const freeCount = useMemo(() => models.filter(isFree).length, [models])

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <div className="text-xs text-term-muted tracking-[0.2em] uppercase">~/models</div>
        <h1 className="text-2xl font-bold mt-1"><span className="text-term-green">$</span> openrouter --list</h1>
        {loaded && (
          <p className="text-xs text-term-muted mt-1">{models.length} modelos · {freeCount} grátis</p>
        )}
      </div>

      <div className="flex gap-2 items-center mb-5">
        <TermInput prompt="/" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="buscar por nome ou id..." className="flex-1 max-w-md" />
        <button onClick={() => setFreeOnly((f) => !f)}
          className={`badge ${freeOnly ? 'border-term-green/50 text-term-green' : 'border-term-border text-term-muted'}`}>
          só grátis
        </button>
      </div>

      {loading && <p className="text-term-dim">carregando catálogo<span className="animate-blink">_</span></p>}
      {error && <p className="text-term-red/80">// falha ao carregar: {error}</p>}

      <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((m, i) => (
          <div key={m.id}
            className="panel p-4 animate-fadeIn flex flex-col gap-2 transition-all hover:border-term-green/50 hover:-translate-y-0.5 focus:outline-none focus:border-term-green"
            style={{ animationDelay: `${Math.min(i, 20) * 25}ms` }}>
            <Link to={`/models/${m.id}`} className="block group">
              <div className="text-sm text-term-text font-semibold leading-tight">{m.name}</div>
              <div className="text-[11px] text-term-muted font-mono truncate">{m.id}</div>
            </Link>
            <ModelBadges m={m} />
            {m.description && (
              <p className="text-xs text-term-muted line-clamp-3 mt-1">{m.description}</p>
            )}
            <div className="flex items-center gap-2 mt-auto pt-2">
              <Link to={`/models/${m.id}`} className="btn btn-ghost !px-2.5 !py-1.5 flex-1">
                detalhes
              </Link>
              <Link to={newAgentWithModelUrl(m)} className="btn btn-primary !px-2.5 !py-1.5 flex-1">
                + criar agente
              </Link>
            </div>
          </div>
        ))}
      </div>

      {loaded && filtered.length === 0 && <p className="text-term-muted mt-6">nenhum modelo encontrado</p>}
    </div>
  )
}
