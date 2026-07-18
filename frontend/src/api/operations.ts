import { api } from './client'
import type { AgentRun, Operation, OperationMemory } from '../types'

export const listOperations = () => api.get<Operation[]>('/operations').then((r) => r.data)
export const getOperation = (id: number) => api.get<Operation>(`/operations/${id}`).then((r) => r.data)
export const createOperation = (operation: Operation) =>
  api.post<Operation>('/operations', operation).then((r) => r.data)
export const updateOperation = (id: number, operation: Operation) =>
  api.put<Operation>(`/operations/${id}`, operation).then((r) => r.data)
export const deleteOperation = (id: number) => api.delete(`/operations/${id}`)

export const listOperationMemories = (operationId: number) =>
  api.get<OperationMemory[]>(`/operations/${operationId}/memories`).then((r) => r.data)
export const createOperationMemory = (
  operationId: number,
  memory: Pick<OperationMemory, 'content' | 'category' | 'pinned'>,
) => api.post<OperationMemory>(`/operations/${operationId}/memories`, memory).then((r) => r.data)
export const updateOperationMemory = (operationId: number, memory: OperationMemory) =>
  api.put<OperationMemory>(`/operations/${operationId}/memories/${memory.id}`, memory).then((r) => r.data)
export const deleteOperationMemory = (operationId: number, memoryId: number) =>
  api.delete(`/operations/${operationId}/memories/${memoryId}`)

export const listOperationRuns = (operationId: number) =>
  api.get<AgentRun[]>(`/operations/${operationId}/runs`).then((r) => r.data)
