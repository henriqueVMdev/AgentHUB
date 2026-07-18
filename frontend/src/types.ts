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

export interface Operation {
  id?: number
  name: string
  description: string
  briefing: string
  status: 'ACTIVE' | 'ARCHIVED'
  emoji: string
  color: string
  memberAgentIds: number[]
  skillIds: number[]
  createdAt?: string
  updatedAt?: string
}

export type MemoryCategory = 'FACT' | 'DECISION' | 'LEARNING'

export interface OperationMemory {
  id: number
  operationId: number
  content: string
  category: MemoryCategory
  status: 'ACTIVE' | 'PENDING'
  pinned: boolean
  createdByAgentId?: number
  createdByRunId?: number
  createdAt: string
  updatedAt: string
}

export interface MemoryDraft {
  content: string
  category: MemoryCategory
}

export interface ConsolidationPreview {
  before: OperationMemory[]
  after: MemoryDraft[]
}

export interface ScheduledRun {
  id?: number
  name: string
  agentId: number | null
  operationId?: number | null
  prompt: string
  cronExpression: string
  enabled: boolean
  lastRunAt?: string
  lastRunId?: number
  nextRunAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface AgentRun {
  id: number
  agentId: number
  operationId?: number
  status: 'RUNNING' | 'DONE' | 'ERROR' | 'CANCELLED'
  inputPrompt: string
  messagesJson?: string
  startedAt: string
  endedAt?: string
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  costUsd?: number
}

export interface Integration {
  id?: number
  name: string
  provider: string
  enabled: boolean
  endpointUrl: string
  account: string
  secret?: string
  agentIds: number[]
  createdAt?: string
  updatedAt?: string
}
export interface InboxConversation { id:number; integrationId:number; assignedAgentId?:number; externalContactId:string; contactName:string; status:'OPEN'|'WAITING'|'CLOSED'; priority:'LOW'|'NORMAL'|'HIGH'; summary?:string; updatedAt:string }
export interface InboxMessage { id:number; conversationId:number; direction:'INBOUND'|'OUTBOUND'; senderType:string; agentId?:number; status:string; content:string; errorMessage?:string; createdAt:string }

export type StreamEvent =
  | { type: 'assistant'; content: string }
  | { type: 'tool_call'; name: string; args: string }
  | { type: 'tool_result'; name: string; result: string }
  | { type: 'done' }
  | { type: 'error'; message: string }
