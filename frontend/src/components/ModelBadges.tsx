import { fmtPrice, fmtCtx, isFree, supportsTools, hasVision, type ORModel } from '../api/models'

/** Linha de badges com preço, contexto, limites e capacidades de um modelo. */
export default function ModelBadges({ m }: { m: ORModel }) {
  const free = isFree(m)
  return (
    <div className="flex flex-wrap gap-1.5">
      {free ? (
        <span className="badge border-term-green/50 text-term-green">grátis</span>
      ) : (
        <>
          <span className="badge border-term-border text-term-text" title="preço de entrada por 1M tokens">
            in {fmtPrice(m.pricing.prompt)}
          </span>
          <span className="badge border-term-border text-term-text" title="preço de saída por 1M tokens">
            out {fmtPrice(m.pricing.completion)}
          </span>
        </>
      )}
      <span className="badge border-term-border text-term-muted" title="janela de contexto">
        ctx {fmtCtx(m.context_length)}
      </span>
      {m.top_provider?.max_completion_tokens ? (
        <span className="badge border-term-border text-term-muted" title="máx. tokens de saída">
          out≤{fmtCtx(m.top_provider.max_completion_tokens)}
        </span>
      ) : null}
      {supportsTools(m) && <span className="badge border-term-cyan/40 text-term-cyan" title="suporta tool calling">tools</span>}
      {hasVision(m) && <span className="badge border-term-amber/40 text-term-amber" title="aceita imagens">vision</span>}
    </div>
  )
}
