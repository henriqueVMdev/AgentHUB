import { api } from './client'
import type { Integration } from '../types'

export const listIntegrations = () => api.get<Integration[]>('/integrations').then(r => r.data)
export const createIntegration = (value: Integration) => api.post<Integration>('/integrations', value).then(r => r.data)
export const updateIntegration = (id: number, value: Integration) => api.put<Integration>(`/integrations/${id}`, value).then(r => r.data)
export const deleteIntegration = (id: number) => api.delete(`/integrations/${id}`)
