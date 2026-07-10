import { api } from './client'
import type { Agent, AgentRun } from '../types'

export const listAgents = () => api.get<Agent[]>('/agents').then(r => r.data)
export const getAgent = (id: number) => api.get<Agent>(`/agents/${id}`).then(r => r.data)
export const createAgent = (a: Agent) => api.post<Agent>('/agents', a).then(r => r.data)
export const updateAgent = (id: number, a: Agent) => api.put<Agent>(`/agents/${id}`, a).then(r => r.data)
export const deleteAgent = (id: number) => api.delete(`/agents/${id}`)
export const listRuns = (id: number) => api.get<AgentRun[]>(`/agents/${id}/runs`).then(r => r.data)
