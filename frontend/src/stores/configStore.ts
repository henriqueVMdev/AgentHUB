import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ConfigState {
  apiKey: string
  setApiKey: (k: string) => void
}

/** Guarda a API key no localStorage. Nunca vai para o DB — só enviada no start do run. */
export const useConfig = create<ConfigState>()(
  persist(
    (set) => ({
      apiKey: '',
      setApiKey: (apiKey) => set({ apiKey }),
    }),
    { name: 'agents-pool-config' },
  ),
)
