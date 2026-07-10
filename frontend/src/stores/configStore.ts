import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ConfigState {
  apiKey: string
  hermesApiKey: string
  openclawApiKey: string
  externalAgentApiKey: string
  setApiKey: (k: string) => void
  setHermesApiKey: (k: string) => void
  setOpenclawApiKey: (k: string) => void
  setExternalAgentApiKey: (k: string) => void
}

/** Guarda a API key no localStorage. Nunca vai para o DB — só enviada no start do run. */
export const useConfig = create<ConfigState>()(
  persist(
    (set) => ({
      apiKey: '',
      hermesApiKey: '',
      openclawApiKey: '',
      externalAgentApiKey: '',
      setApiKey: (apiKey) => set({ apiKey }),
      setHermesApiKey: (hermesApiKey) => set({ hermesApiKey }),
      setOpenclawApiKey: (openclawApiKey) => set({ openclawApiKey }),
      setExternalAgentApiKey: (externalAgentApiKey) => set({ externalAgentApiKey }),
    }),
    { name: 'agents-pool-config' },
  ),
)
