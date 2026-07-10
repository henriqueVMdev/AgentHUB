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
  createdAt?: string
  updatedAt?: string
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
