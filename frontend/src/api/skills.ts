import { api } from './client'
import type { AgentSkill, SkillProposal } from '../types'

export const listSkills = () => api.get<AgentSkill[]>('/skills').then((r) => r.data)
export const listSkillProposals = () => api.get<SkillProposal[]>('/skills/proposals').then((r) => r.data)
export const createSkill = (skill: Pick<AgentSkill, 'name' | 'description' | 'content'>) =>
  api.post<AgentSkill>('/skills', skill).then((r) => r.data)
export const approveSkillProposal = (id: number) =>
  api.post<AgentSkill>(`/skills/proposals/${id}/approve`).then((r) => r.data)
export const rejectSkillProposal = (id: number) =>
  api.post<SkillProposal>(`/skills/proposals/${id}/reject`).then((r) => r.data)
