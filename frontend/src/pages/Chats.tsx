import { useEffect, useMemo, useState } from 'react'
import { useAgents } from '../stores/agentStore'
import { startRun, streamRun } from '../api/runs'
import { listRuns } from '../api/agents'
import LoadingComponent from '../components/LoadingComponent'
import ThinkingAnimation from '../components/ThinkingAnimation'
import type { AgentRun } from '../types'

type Message = { id: string; role: 'user' | 'agent' | 'system'; text: string }
type Chat = { id: string; agentId: number; title: string; messages: Message[]; continuationRunId?: number; sourceRunId?: number }
const STORAGE_KEY = 'agents-pool-agent-chats-v2'

function loadChats(): Chat[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

function execute(agentId: number, prompt: string, continuationRunId?: number) {
  return new Promise<{ text: string; runId: number }>(async (resolve, reject) => {
    try {
      const runId = await startRun(agentId, prompt, continuationRunId)
      let text = ''
      streamRun(runId, event => {
        if (event.type === 'assistant') text += `${text ? '\n' : ''}${event.content}`
        if (event.type === 'done') resolve({ text: text || '(tarefa concluída sem resposta textual)', runId })
        if (event.type === 'error') reject(new Error(event.message))
      })
    } catch (error) { reject(error) }
  })
}

function messagesFromRun(run: AgentRun): Message[] {
  if (!run.messagesJson) return [{ id: `run-${run.id}-user`, role: 'user', text: run.inputPrompt }]
  try {
    return (JSON.parse(run.messagesJson) as Array<Record<string, unknown>>)
      .filter(message => message.role === 'user' || (message.role === 'assistant' && message.content))
      .map((message, index) => ({
        id: `run-${run.id}-${index}`,
        role: message.role === 'user' ? 'user' as const : 'agent' as const,
        text: String(message.content || ''),
      }))
  } catch {
    return [{ id: `run-${run.id}-user`, role: 'user', text: run.inputPrompt }]
  }
}

export default function Chats() {
  const { agents, fetch } = useAgents()
  const [chats, setChats] = useState<Chat[]>(loadChats)
  const [agentId, setAgentId] = useState<number>()
  const [chatId, setChatId] = useState<string>()
  const [prompt, setPrompt] = useState('')
  const [runningAgentId, setRunningAgentId] = useState<number>()
  const [runningCommand, setRunningCommand] = useState('')
  const [activeRuns, setActiveRuns] = useState<Record<number, AgentRun>>({})

  useEffect(() => { fetch() }, [fetch])
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(chats)) }, [chats])
  useEffect(() => {
    if (!agents.length) return
    let mounted = true
    const refresh = async () => {
      const entries = await Promise.all(agents.map(async agent => {
        try {
          const runs = await listRuns(agent.id!)
          return [agent.id!, runs.find(run => run.status === 'RUNNING')] as const
        } catch { return [agent.id!, undefined] as const }
      }))
      if (mounted) setActiveRuns(Object.fromEntries(entries.filter((entry): entry is readonly [number, AgentRun] => !!entry[1])))
    }
    refresh()
    const timer = window.setInterval(refresh, 2500)
    return () => { mounted = false; window.clearInterval(timer) }
  }, [agents])

  const selectedAgent = agents.find(agent => agent.id === agentId)
  const agentChats = useMemo(() => chats.filter(chat => chat.agentId === agentId), [chats, agentId])
  const activeChat = chats.find(chat => chat.id === chatId)
  const selectedActiveRun = agentId ? activeRuns[agentId] : undefined
  const selectedAgentRunning = !!agentId && (runningAgentId === agentId || !!selectedActiveRun)
  const selectedCommand = runningAgentId === agentId ? runningCommand : selectedActiveRun?.inputPrompt || ''

  const openAgent = async (id: number) => {
    setAgentId(id)
    try {
      const runs = await listRuns(id)
      const usableRuns = runs.filter(item => item.status === 'RUNNING' || (item.status === 'DONE' && item.messagesJson))
      const runById = new Map(usableRuns.map(run => [run.id, run]))
      // Runs são turnos técnicos, não conversas. Remove a importação antiga que criava um chat por turno.
      let nextChats = chats.filter(chat => chat.agentId !== id || !chat.sourceRunId)
      nextChats = nextChats.map(chat => {
        const run = chat.continuationRunId ? runById.get(chat.continuationRunId) : undefined
        return run?.messagesJson ? { ...chat, messages: messagesFromRun(run) } : chat
      })
      const latest = usableRuns[0]
      const latestBelongsToLocalChat = latest && nextChats.some(chat => chat.agentId === id && chat.continuationRunId === latest.id)
      if (latest && !latestBelongsToLocalChat) {
        const completedContext = latest.messagesJson ? latest : usableRuns.find(run => !!run.messagesJson)
        const importedMessages = completedContext ? messagesFromRun(completedContext) : []
        if (latest.status === 'RUNNING' && !importedMessages.some(message => message.role === 'user' && message.text === latest.inputPrompt)) {
          importedMessages.push({ id: `run-${latest.id}-user`, role: 'user', text: latest.inputPrompt })
        }
        nextChats.push({ id: `dashboard-agent-${id}`, agentId: id, sourceRunId: latest.id, continuationRunId: latest.id, title: 'Histórico do Dashboard', messages: importedMessages })
      }
      let existing = nextChats.find(chat => chat.agentId === id)
      if (!existing) {
        existing = { id: crypto.randomUUID(), agentId: id, title: 'Conversa 1', messages: [] }
        nextChats.push(existing)
      }
      setChats(nextChats); setChatId(existing.id)
    } catch {
      const existing = chats.find(chat => chat.agentId === id)
      if (existing) setChatId(existing.id)
      else {
        const chat: Chat = { id: crypto.randomUUID(), agentId: id, title: 'Conversa 1', messages: [] }
        setChats(previous => [...previous, chat]); setChatId(chat.id)
      }
    }
  }

  const newChat = () => {
    if (!agentId) return
    const chat: Chat = { id: crypto.randomUUID(), agentId, title: `Conversa ${agentChats.length + 1}`, messages: [] }
    setChats(previous => [...previous, chat]); setChatId(chat.id); setPrompt('')
  }

  const send = async () => {
    if (!activeChat || !prompt.trim() || runningAgentId) return
    const command = prompt.trim()
    setPrompt(''); setRunningAgentId(activeChat.agentId); setRunningCommand(command)
    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', text: command }
    const chatsWithCommand = chats.map(chat => chat.id === activeChat.id
      ? { ...chat, title: chat.messages.length ? chat.title : command.slice(0, 36), messages: [...chat.messages, userMessage] }
      : chat)
    setChats(chatsWithCommand)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chatsWithCommand))
    try {
      const result = await execute(activeChat.agentId, command, activeChat.continuationRunId)
      setChats(previous => previous.map(chat => chat.id === activeChat.id
        ? { ...chat, continuationRunId: result.runId, messages: [...chat.messages, { id: crypto.randomUUID(), role: 'agent', text: result.text }] }
        : chat))
    } catch (error: any) {
      setChats(previous => previous.map(chat => chat.id === activeChat.id
        ? { ...chat, messages: [...chat.messages, { id: crypto.randomUUID(), role: 'system', text: `Erro: ${error.message}` }] }
        : chat))
    } finally { setRunningAgentId(undefined); setRunningCommand('') }
  }

  if (!selectedAgent) return <div className="p-8 w-full">
    <div className="mb-6"><h1 className="text-2xl font-bold"><span className="text-term-green">#</span> chats</h1><p className="text-sm text-term-muted mt-1">Selecione um agente para abrir suas conversas.</p></div>
    <div className="space-y-3">
      {agents.map(agent => {
        const backendRun = activeRuns[agent.id!]
        const running = runningAgentId === agent.id || !!backendRun
        const currentCommand = runningAgentId === agent.id ? runningCommand : backendRun?.inputPrompt || ''
        return <button key={agent.id} onClick={() => openAgent(agent.id!)} className="panel w-full h-28 px-5 text-left flex items-center gap-5 transition-all hover:border-term-green/60 hover:bg-term-panel/95">
          <div className="w-14 h-14 rounded-full border flex items-center justify-center font-bold shrink-0" style={{ color: agent.color, borderColor: `${agent.color}66`, backgroundColor: `${agent.color}16` }}>{agent.emoji || agent.name.slice(0, 2).toUpperCase()}</div>
          <div className="min-w-0 flex-1"><div className="font-semibold text-lg truncate">{agent.name}</div>{running && <div className="truncate mt-1"><ThinkingAnimation label={currentCommand} /></div>}</div>
          <div className="w-20 h-full shrink-0 flex items-center justify-center border-l border-term-border pl-5">{running ? <LoadingComponent size={0.54} color={agent.color} /> : <span className="text-term-muted text-xl">›</span>}</div>
        </button>
      })}
      {!agents.length && <div className="panel p-10 text-center text-term-muted">Nenhum agente criado.</div>}
    </div>
  </div>

  return <div className="h-full min-h-0 flex flex-col">
    <header className="shrink-0 px-6 py-4 border-b border-term-border bg-black/20 flex items-center gap-3">
      <button className="btn btn-ghost" onClick={() => { setAgentId(undefined); setChatId(undefined) }}>← agentes</button>
      <div className="w-10 h-10 rounded-full border flex items-center justify-center font-bold" style={{ color: selectedAgent.color, borderColor: `${selectedAgent.color}66` }}>{selectedAgent.emoji || selectedAgent.name.slice(0, 2).toUpperCase()}</div>
      <div><h1 className="font-bold">{selectedAgent.name}</h1><p className="text-[10px] text-term-muted uppercase tracking-widest">chat com agente</p></div>
      <select className="field max-w-72 ml-auto" value={chatId} onChange={event => setChatId(event.target.value)}>{agentChats.map(chat => <option key={chat.id} value={chat.id}>{chat.title}</option>)}</select>
      <button className="btn btn-primary" onClick={newChat} disabled={!!runningAgentId}>+ novo chat</button>
    </header>
    <main className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
      {!activeChat?.messages.length && <div className="h-full grid place-items-center text-term-muted"><p>Envie um comando para {selectedAgent.name}.</p></div>}
      {activeChat?.messages.map(message => <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[75%] rounded-lg border px-4 py-3 ${message.role === 'user' ? 'border-term-green/30 bg-term-green/10' : message.role === 'system' ? 'border-term-red/30 bg-term-red/10' : 'border-term-border bg-term-panel/90'}`}><div className="text-[10px] uppercase tracking-widest text-term-muted mb-1">{message.role === 'user' ? 'você' : message.role === 'agent' ? selectedAgent.name : 'sistema'}</div><div className="text-sm whitespace-pre-wrap leading-relaxed">{message.text}</div></div></div>)}
      {selectedAgentRunning && <div className="animate-fadeIn border-l-2 border-term-green/40 pl-4"><ThinkingAnimation label="processing" /><p className="text-xs text-term-muted truncate pb-2">{selectedCommand}</p></div>}
    </main>
    <footer className="shrink-0 p-4 border-t border-term-border bg-black/20 flex gap-2"><textarea className="field min-h-12 max-h-32 resize-y" value={prompt} onChange={event => setPrompt(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send() } }} placeholder={selectedAgentRunning ? 'Aguarde o agente responder...' : 'Digite um comando...'} disabled={selectedAgentRunning} /><button className="btn btn-primary px-6" onClick={send} disabled={!prompt.trim() || selectedAgentRunning}>enviar</button></footer>
  </div>
}
