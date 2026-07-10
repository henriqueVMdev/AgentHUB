import { useEffect, useMemo, useState } from 'react'
import { useModels } from '../stores/modelStore'
import { isFree, type ORModel } from '../api/models'
import ModelBadges from './ModelBadges'
import { TermInput } from './ui'

/** Seletor de modelo OpenRouter com busca e specs. Cai para input manual se o catálogo falhar. */
export default function ModelPicker({ value, onSelect }: { value: string; onSelect: (id: string) => void }) {
  const { models, loading, loaded, error, fetch } = useModels()
  const [query, setQuery] = useState('')
  const [freeOnly, setFreeOnly] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => { fetch() }, [fetch])

  const selected = useMemo(() => models.find((m) => m.id === value), [models, value])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list: ORModel[] = models
    if (freeOnly) list = list.filter(isFree)
    if (q) list = list.filter((m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q))
    // grátis primeiro, depois por preço de entrada
    return [...list].sort((a, b) => {
      const fa = isFree(a) ? 0 : 1, fb = isFree(b) ? 0 : 1
      if (fa !== fb) return fa - fb
      return Number(a.pricing.prompt) - Number(b.pricing.prompt)
    }).slice(0, 60)
  }, [models, query, freeOnly])

  if (error || (loaded && models.length === 0)) {
    return (
      <div>
        <TermInput prompt="#" value={value} onChange={(e) => onSelect(e.target.value)} placeholder="openai/gpt-4o-mini" />
        <p className="text-xs text-term-red/80 mt-1">// catálogo indisponível ({error ?? 'vazio'}) — digite o id manualmente</p>
      </div>
    )
  }

  return (
    <div>
      {/* modelo selecionado + specs */}
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-full text-left panel px-3 py-2 hover:border-term-dim transition-colors">
        {selected ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm text-term-text">{selected.name}</span>
              <span className="ml-auto text-term-muted text-xs">{open ? '[fechar]' : '[trocar]'}</span>
            </div>
            <div className="text-[11px] text-term-muted font-mono">{selected.id}</div>
            <ModelBadges m={selected} />
          </div>
        ) : (
          <div className="flex items-center">
            <span className="text-sm text-term-muted">{value || 'selecionar modelo...'}</span>
            <span className="ml-auto text-term-muted text-xs">{open ? '[fechar]' : '[escolher]'}</span>
          </div>
        )}
      </button>

      {open && (
        <div className="panel mt-2 p-3 space-y-3">
          <div className="flex gap-2 items-center">
            <TermInput prompt="/" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="buscar modelo..." className="flex-1" />
            <button type="button" onClick={() => setFreeOnly((f) => !f)}
              className={`badge ${freeOnly ? 'border-term-green/50 text-term-green' : 'border-term-border text-term-muted'}`}>
              só grátis
            </button>
          </div>

          {loading && <p className="text-term-dim text-sm">carregando catálogo<span className="animate-blink">_</span></p>}

          <div className="max-h-80 overflow-y-auto space-y-1.5">
            {filtered.map((m) => (
              <button type="button" key={m.id}
                onClick={() => { onSelect(m.id); setOpen(false) }}
                className={`w-full text-left rounded border px-3 py-2 transition-colors ${
                  m.id === value ? 'border-term-green/60 bg-term-green/10' : 'border-term-border hover:border-term-dim'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-term-text truncate">{m.name}</span>
                </div>
                <div className="text-[11px] text-term-muted font-mono mb-1.5 truncate">{m.id}</div>
                <ModelBadges m={m} />
              </button>
            ))}
            {!loading && filtered.length === 0 && <p className="text-term-muted text-sm">nenhum modelo encontrado</p>}
          </div>
          <p className="text-[10px] text-term-muted/70">mostrando até 60 · {models.length} modelos no catálogo</p>
        </div>
      )}
    </div>
  )
}
