import { create } from 'zustand'
import type { Agent } from '../types'
import * as api from '../api/agents'

interface AgentState {
  agents: Agent[]
  loading: boolean
  fetch: () => Promise<void>
  create: (a: Agent) => Promise<Agent>
  update: (id: number, a: Agent) => Promise<Agent>
  remove: (id: number) => Promise<void>
}

export const useAgents = create<AgentState>((set, get) => ({
  agents: [],
  loading: false,
  fetch: async () => {
    set({ loading: true })
    try {
      set({ agents: await api.listAgents() })
    } finally {
      set({ loading: false })
    }
  },
  create: async (a) => {
    const created = await api.createAgent(a)
    set({ agents: [...get().agents, created] })
    return created
  },
  update: async (id, a) => {
    const updated = await api.updateAgent(id, a)
    set({ agents: get().agents.map((x) => (x.id === id ? updated : x)) })
    return updated
  },
  remove: async (id) => {
    await api.deleteAgent(id)
    set({ agents: get().agents.filter((x) => x.id !== id) })
  },
}))
