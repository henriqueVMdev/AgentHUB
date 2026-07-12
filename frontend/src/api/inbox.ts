import { api } from './client'
import type { InboxConversation, InboxMessage } from '../types'
export const listConversations=()=>api.get<InboxConversation[]>('/inbox').then(r=>r.data)
export const listMessages=(id:number)=>api.get<InboxMessage[]>(`/inbox/${id}/messages`).then(r=>r.data)
export const patchConversation=(id:number,value:Partial<InboxConversation>)=>api.patch<InboxConversation>(`/inbox/${id}`,value).then(r=>r.data)
export const createReply=(id:number,content:string)=>api.post<InboxMessage>(`/inbox/${id}/messages`,{content}).then(r=>r.data)
export const reviewMessage=(id:number,approve:boolean)=>api.post<InboxMessage>(`/inbox/messages/${id}/${approve?'approve':'reject'}`).then(r=>r.data)
export const testIntegration=(id:number)=>api.post<{ok:boolean;status?:number;message?:string}>(`/inbox/integrations/${id}/test`).then(r=>r.data)
