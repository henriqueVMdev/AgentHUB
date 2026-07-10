import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  fmtPrice,
  fmtTokens,
  isFree,
  perMillion,
  type ORModel,
} from '../api/models'
import ModelBadges from '../components/ModelBadges'
import { Win } from '../components/ui'
import { useModels } from '../stores/modelStore'

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-term-border/70 py-2.5 last:border-0">
      <div className="text-[10px] uppercase tracking-[0.16em] text-term-muted">{label}</div>
      <div className="mt-1 text-sm text-term-text break-words">{value}</div>
    </div>
  )
}

function PriceRow({ label, value, unit }: { label: string; value?: string; unit: string }) {
  if (value == null) return null
  const amount = Number(value)
  const displayed = unit === '1M tokens'
    ? fmtPrice(value)
    : amount === 0 ? 'grátis' : `$${amount.toLocaleString('en-US', { maximumFractionDigits: 8 })}`
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-term-border/70 py-2.5 last:border-0">
      <span className="text-xs text-term-muted">{label}</span>
      <span className="text-right text-sm text-term-text">
        {displayed} <span className="text-[10px] text-term-muted">/ {unit}</span>
      </span>
    </div>
  )
}

function Parameters({ model }: { model: ORModel }) {
  const parameters = model.supported_parameters ?? []
  return parameters.length ? (
    <div className="flex flex-wrap gap-2">
      {parameters.map((parameter) => (
        <span key={parameter} className="badge border-term-cyan/30 text-term-cyan normal-case tracking-normal">
          {parameter}
        </span>
      ))}
    </div>
  ) : <p className="text-xs text-term-muted">Nenhum parâmetro informado pelo OpenRouter.</p>
}

export default function ModelDetails() {
  const { author, slug } = useParams()
  const { models, loading, loaded, error, fetch } = useModels()

  useEffect(() => { fetch() }, [fetch])

  const modelId = `${author ?? ''}/${slug ?? ''}`
  const model = useMemo(() => models.find((item) => item.id === modelId), [models, modelId])

  if (loading && !loaded) {
    return <div className="p-8 text-term-dim">carregando modelo<span className="animate-blink">_</span></div>
  }

  if (error) {
    return <div className="p-8"><p className="text-term-red/80">// falha ao carregar: {error}</p></div>
  }

  if (!model) {
    return (
      <div className="p-8">
        <p className="text-term-muted">modelo não encontrado</p>
        <Link className="btn btn-ghost mt-4" to="/models">← voltar aos modelos</Link>
      </div>
    )
  }

  const free = isFree(model)
  const outputLimit = model.top_provider?.max_completion_tokens
  const architecture = model.architecture
  const defaultParams = model.default_parameters ? Object.entries(model.default_parameters) : []
  const requestLimits = model.per_request_limits
    ? Object.entries(model.per_request_limits).filter(([, value]) => value != null)
    : []

  return (
    <div className="p-8 max-w-6xl">
      <Link to="/models" className="inline-flex items-center gap-2 text-xs text-term-muted hover:text-term-green mb-5">
        ← todos os modelos
      </Link>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <div className="text-xs text-term-muted tracking-[0.2em] uppercase">~/models/{author}</div>
          <h1 className="text-2xl font-bold mt-1">{model.name}</h1>
          <div className="text-xs text-term-muted mt-1 break-all">{model.id}</div>
        </div>
        <ModelBadges m={model} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Win title="limites_de_tokens" className="lg:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="panel p-4 border-term-green/30">
              <div className="text-[10px] uppercase tracking-[0.18em] text-term-muted">janela de contexto</div>
              <div className="text-2xl font-bold text-term-green mt-2">{fmtTokens(model.context_length)}</div>
              <div className="text-[11px] text-term-muted mt-1">tokens de entrada + saída</div>
            </div>
            <div className="panel p-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-term-muted">máximo de saída</div>
              <div className="text-2xl font-bold text-term-text mt-2">{fmtTokens(outputLimit)}</div>
              <div className="text-[11px] text-term-muted mt-1">
                {outputLimit ? 'tokens por resposta' : 'não informado pelo provedor'}
              </div>
            </div>
          </div>
          {model.top_provider?.context_length && model.top_provider.context_length !== model.context_length && (
            <p className="text-[11px] text-term-muted mt-3">
              O provedor principal informa contexto de {fmtTokens(model.top_provider.context_length)} tokens.
            </p>
          )}
          {requestLimits.length > 0 && (
            <div className="mt-4 border-t border-term-border pt-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-term-muted mb-2">limites adicionais por requisição</div>
              <div className="flex flex-wrap gap-2">
                {requestLimits.map(([key, value]) => (
                  <span key={key} className="badge border-term-amber/35 text-term-amber normal-case tracking-normal">
                    {key.replace(/_/g, ' ')}: {typeof value === 'number' ? fmtTokens(value) : value}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Win>

        <Win title="preços_usd">
          <PriceRow label="Entrada" value={model.pricing.prompt} unit="1M tokens" />
          <PriceRow label="Saída" value={model.pricing.completion} unit="1M tokens" />
          <PriceRow label="Raciocínio interno" value={model.pricing.internal_reasoning} unit="1M tokens" />
          <PriceRow label="Leitura de cache" value={model.pricing.input_cache_read} unit="1M tokens" />
          <PriceRow label="Escrita de cache" value={model.pricing.input_cache_write} unit="1M tokens" />
          <PriceRow label="Requisição" value={model.pricing.request} unit="requisição" />
          <PriceRow label="Imagem" value={model.pricing.image} unit="imagem" />
          <PriceRow label="Busca web" value={model.pricing.web_search} unit="operação" />
          {!free && (
            <p className="text-[10px] text-term-muted mt-3">
              Exemplo: 1M tokens de entrada custam ${perMillion(model.pricing.prompt).toFixed(3)}.
            </p>
          )}
        </Win>
      </div>

      {free && (
        <div className="panel border-term-green/35 bg-term-green/5 p-4 mb-4">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-term-green">limites da faixa gratuita</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            <div><div className="text-xl font-bold">20</div><div className="text-[11px] text-term-muted">requisições por minuto</div></div>
            <div><div className="text-xl font-bold">50</div><div className="text-[11px] text-term-muted">requisições por dia sem US$10 em créditos</div></div>
            <div><div className="text-xl font-bold">1.000</div><div className="text-[11px] text-term-muted">requisições por dia após comprar US$10 em créditos</div></div>
          </div>
          <p className="text-[11px] text-term-muted mt-3">
            O OpenRouter limita a faixa gratuita por requisições. O limite de tokens de cada resposta é o exibido acima e pode não ser informado pelo provedor.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Win title="sobre_o_modelo">
          <p className="text-sm leading-6 text-term-muted whitespace-pre-line">
            {model.description || 'Sem descrição disponível.'}
          </p>
        </Win>
        <Win title="arquitetura">
          <Detail label="modalidade" value={architecture?.modality ?? '—'} />
          <Detail label="entradas" value={architecture?.input_modalities?.join(', ') ?? '—'} />
          <Detail label="saídas" value={architecture?.output_modalities?.join(', ') ?? '—'} />
          <Detail label="tokenizador" value={architecture?.tokenizer ?? '—'} />
          <Detail label="formato de instrução" value={architecture?.instruct_type ?? '—'} />
          <Detail label="moderação" value={model.top_provider?.is_moderated == null ? '—' : model.top_provider.is_moderated ? 'sim' : 'não'} />
        </Win>
      </div>

      <Win title="parâmetros_suportados" className="mb-4">
        <Parameters model={model} />
        {defaultParams.length > 0 && (
          <div className="mt-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-term-muted mb-2">valores padrão</div>
            <div className="flex flex-wrap gap-2">
              {defaultParams.map(([key, value]) => (
                <span key={key} className="badge border-term-border text-term-muted normal-case tracking-normal">
                  {key}: {JSON.stringify(value)}
                </span>
              ))}
            </div>
          </div>
        )}
      </Win>

      <Win title="metadados">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
          <Detail label="slug canônico" value={model.canonical_slug ?? model.id} />
          <Detail label="adicionado ao OpenRouter" value={model.created ? new Date(model.created * 1000).toLocaleDateString('pt-BR') : '—'} />
          <Detail label="corte de conhecimento" value={model.knowledge_cutoff ?? '—'} />
          <Detail label="expiração" value={model.expiration_date ?? '—'} />
        </div>
      </Win>
    </div>
  )
}
