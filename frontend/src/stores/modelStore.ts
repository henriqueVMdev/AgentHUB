import { create } from 'zustand'
import { getModels, type ORModel } from '../api/models'

interface ModelState {
  models: ORModel[]
  loading: boolean
  loaded: boolean
  error: string | null
  fetch: () => Promise<void>
}

/** Catálogo do OpenRouter em cache na sessão (fetch uma vez). */
export const useModels = create<ModelState>((set, get) => ({
  models: [],
  loading: false,
  loaded: false,
  error: null,
  fetch: async () => {
    if (get().loaded || get().loading) return
    set({ loading: true, error: null })
    try {
      set({ models: await getModels(), loaded: true })
    } catch (e: any) {
      set({ error: e?.message ?? 'falha ao carregar modelos' })
    } finally {
      set({ loading: false })
    }
  },
}))
