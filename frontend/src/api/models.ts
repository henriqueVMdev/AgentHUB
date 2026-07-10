import { api } from './client'

export interface ORModel {
  id: string
  name: string
  description?: string
  context_length: number
  canonical_slug?: string
  created?: number
  architecture?: {
    modality?: string
    input_modalities?: string[]
    output_modalities?: string[]
    tokenizer?: string
    instruct_type?: string | null
  }
  pricing: {
    prompt: string
    completion: string
    request?: string
    image?: string
    web_search?: string
    internal_reasoning?: string
    input_cache_read?: string
    input_cache_write?: string
  }
  top_provider?: { max_completion_tokens?: number | null; is_moderated?: boolean; context_length?: number }
  supported_parameters?: string[]
  default_parameters?: Record<string, unknown> | null
  per_request_limits?: Record<string, number | string | null> | null
  expiration_date?: string | null
  knowledge_cutoff?: string | null
}

export const getModels = () => api.get<{ data: ORModel[] }>('/models').then((r) => r.data.data)

// --- helpers de formatação ---

export const isFree = (m: ORModel) =>
  Number(m.pricing.prompt) === 0 && Number(m.pricing.completion) === 0

/** preço por 1M tokens em USD */
export const perMillion = (perToken: string) => Number(perToken) * 1_000_000

export const fmtPrice = (perToken: string) => {
  const v = perMillion(perToken)
  if (v === 0) return 'grátis'
  return '$' + (v < 1 ? v.toFixed(3) : v.toFixed(2))
}

export const fmtCtx = (n?: number) => {
  if (!n) return '—'
  if (n >= 1000) return `${Math.round(n / 1000)}k`
  return String(n)
}

export const fmtTokens = (n?: number | null) =>
  n == null ? '—' : new Intl.NumberFormat('pt-BR').format(n)

export const supportsTools = (m: ORModel) => (m.supported_parameters ?? []).includes('tools')

export const hasVision = (m: ORModel) =>
  (m.architecture?.input_modalities ?? []).includes('image')

/** URL do formulário de agente com o modelo do catálogo pré-selecionado. */
export const newAgentWithModelUrl = (m: Pick<ORModel, 'id'>) =>
  `/agents/new?model=${encodeURIComponent(m.id)}`
