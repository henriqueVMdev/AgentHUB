import { api } from './client'

export interface CredentialStatus {
  openrouter: boolean
  hermes: boolean
  openclaw: boolean
  external: boolean
}

export interface CredentialUpdate {
  openrouter?: string
  hermes?: string
  openclaw?: string
  external?: string
}

export const getCredentialStatus = () =>
  api.get<CredentialStatus>('/settings/credentials').then((response) => response.data)

export const updateCredentials = (credentials: CredentialUpdate) =>
  api.put<CredentialStatus>('/settings/credentials', credentials).then((response) => response.data)
