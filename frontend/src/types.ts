export type ToolGroup = 'http' | 'file' | 'code' | 'browser'
export type AgentType = 'native' | 'hermes' | 'openclaw' | 'external'

export interface Agent {
  id?: number
  name: string
  description: string
  systemPrompt: string
  agentType: AgentType
  provider: 'openrouter' | 'local'
  modelId: string
  baseUrl: string
  temperature: number
  emoji: string
  color: string
  enabledTools: ToolGroup[]
  enabledSkillIds: number[]
  collaboratorAgentIds: number[]
  autoLearnSkills: boolean
  createdAt?: string
  updatedAt?: string
}

export interface AgentSkill {
  id: number
  name: string
  description: string
  content: string
  version: number
  status: 'ACTIVE' | 'ARCHIVED'
  createdByAgentId?: number
  createdAt: string
  updatedAt: string
}

export interface SkillProposal {
  id: number
  action: 'CREATE' | 'UPDATE'
  targetSkillId?: number
  sourceAgentId?: number
  sourceRunId?: number
  name: string
  description: string
  content: string
  rationale: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  reviewedAt?: string
}

export interface AgentRun {
  id: number
  agentId: number
  status: 'RUNNING' | 'DONE' | 'ERROR'
  inputPrompt: string
  messagesJson?: string
  startedAt: string
  endedAt?: string
}

export type StreamEvent =
  | { type: 'assistant'; content: string }
  | { type: 'tool_call'; name: string; args: string }
  | { type: 'tool_result'; name: string; result: string }
  | { type: 'done' }
  | { type: 'error'; message: string }
