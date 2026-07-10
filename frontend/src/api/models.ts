import { api } from './client'

export interface ORModel {
  id: string
  name: string
  description?: string
  context_length: number
  architecture?: { modality?: string; input_modalities?: string[]; output_modalities?: string[] }
  pricing: { prompt: string; completion: string; request?: string; image?: string; web_search?: string }
  top_provider?: { max_completion_tokens?: number | null; is_moderated?: boolean; context_length?: number }
  supported_parameters?: string[]
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

export const supportsTools = (m: ORModel) => (m.supported_parameters ?? []).includes('tools')

export const hasVision = (m: ORModel) =>
  (m.architecture?.input_modalities ?? []).includes('image')
