import { useEffect, useMemo, useState } from 'react'
import { useAgents } from '../stores/agentStore'
import { startRun, streamRun } from '../api/runs'
import { listRuns } from '../api/agents'
import LoadingComponent from '../components/LoadingComponent'
import ThinkingAnimation from '../components/ThinkingAnimation'
import type { Agent, AgentRun } from '../types'

type Message = { id: string; role: 'user' | 'agent' | 'system'; text: string; agentName?: string }
type Chat = { id: string; agentId: number; memberIds?: number[]; title: string; messages: Message[]; continuationRunId?: number; continuationRunIds?: Record<number, number>; sourceRunId?: number }
const STORAGE_KEY = 'agents-pool-agent-chats-v2'
const DELETED_RUNS_KEY = 'agents-pool-deleted-chat-runs-v1'

function loadChats(): Chat[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

function loadDeletedRunIds(): number[] {
  try { return JSON.parse(localStorage.getItem(DELETED_RUNS_KEY) || '[]') } catch { return [] }
}

function execute(agentId: number, prompt: string, continuationRunId?: number, onText?: (text: string) => void) {
  return new Promise<{ text: string; runId: number }>(async (resolve, reject) => {
    try {
      const runId = await startRun(agentId, prompt, continuationRunId)
      let text = ''
      streamRun(runId, event => {
        if (event.type === 'assistant') { text += `${text ? '\n' : ''}${event.content}`; onText?.(text) }
        if (event.type === 'done') resolve({ text: text || '(tarefa concluída sem resposta textual)', runId })
        if (event.type === 'error') reject(new Error(event.message))
      })
    } catch (error) { reject(error) }
  })
}

// Nome normalizado para menção: "Agente Um" → "agenteum" (sem espaços/acentos, minúsculo)
const mentionKey = (name: string) => name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '').toLowerCase()

// "/agente1 tarefa x /agente2 tarefa y" → [{ member, task }] na ordem digitada; null se não houver menção válida
function parseDirectedTasks(command: string, members: Agent[]): { member: Agent; task: string }[] | null {
  const byKey = new Map(members.map(member => [mentionKey(member.name), member]))
  const mentions = [...command.matchAll(/(^|\s)\/(\S+)/g)]
    .map(match => ({ start: match.index! + match[1].length, end: match.index! + match[0].length, member: byKey.get(mentionKey(match[2])) }))
    .filter((mention): mention is { start: number; end: number; member: Agent } => !!mention.member)
  if (!mentions.length) return null
  const preamble = command.slice(0, mentions[0].start).trim()
  return mentions.map((mention, index) => {
    const segment = command.slice(mention.end, mentions[index + 1]?.start ?? command.length).trim()
    return { member: mention.member, task: preamble ? `${preamble}\n\n${segment}` : segment }
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
  const [busyChats, setBusyChats] = useState<Record<string, boolean>>({})
  const [activeRuns, setActiveRuns] = useState<Record<number, AgentRun>>({})
  const [creatingTeam, setCreatingTeam] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [teamMembers, setTeamMembers] = useState<number[]>([])

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
  const agentChats = useMemo(() => chats.filter(chat => chat.agentId === agentId || chat.memberIds?.includes(agentId!)), [chats, agentId])
  const activeChat = chats.find(chat => chat.id === chatId)
  const selectedActiveRun = agentId ? activeRuns[agentId] : undefined
  const selectedAgentRunning = !!agentId && (runningAgentId === agentId || !!selectedActiveRun)
  const selectedCommand = runningAgentId === agentId ? runningCommand : selectedActiveRun?.inputPrompt || ''
  // Bloqueia o envio apenas no chat que já tem uma rodada em andamento — agente ocupado em outro chat/run continua disponível
  const chatBusy = !!activeChat && !!busyChats[activeChat.id]

  const openAgent = async (id: number) => {
    setAgentId(id)
    try {
      const runs = await listRuns(id)
      const deletedRunIds = new Set(loadDeletedRunIds())
      const usableRuns = runs.filter(item => !deletedRunIds.has(item.id) && (item.status === 'RUNNING' || (item.status === 'DONE' && item.messagesJson)))
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

  const deleteChat = () => {
    if (!activeChat || chatBusy) return
    if (!window.confirm(`Excluir o chat "${activeChat.title}"? Esta ação não pode ser desfeita.`)) return

    const runIds = [
      activeChat.sourceRunId,
      activeChat.continuationRunId,
      ...Object.values(activeChat.continuationRunIds || {}),
    ].filter((id): id is number => id !== undefined)
    if (runIds.length) {
      const deletedRunIds = new Set([...loadDeletedRunIds(), ...runIds])
      localStorage.setItem(DELETED_RUNS_KEY, JSON.stringify([...deletedRunIds]))
    }

    const remainingChats = chats.filter(chat => chat.id !== activeChat.id)
    const nextChat = remainingChats.find(chat => chat.agentId === agentId || chat.memberIds?.includes(agentId!))
    setChats(remainingChats)
    setPrompt('')
    if (nextChat) setChatId(nextChat.id)
    else { setChatId(undefined); setAgentId(undefined) }
  }

  const createTeamChat = () => {
    if (teamMembers.length < 2) return
    const chat: Chat = { id: crypto.randomUUID(), agentId: teamMembers[0], memberIds: teamMembers, title: teamName.trim() || 'Equipe', messages: [], continuationRunIds: {} }
    setChats(previous => [...previous, chat]); setAgentId(teamMembers[0]); setChatId(chat.id)
    setCreatingTeam(false); setTeamName(''); setTeamMembers([])
  }

  const send = async () => {
    if (!activeChat || !prompt.trim() || busyChats[activeChat.id]) return
    const chatIdSending = activeChat.id
    const command = prompt.trim()
    setPrompt(''); setRunningAgentId(activeChat.agentId); setRunningCommand(command)
    setBusyChats(previous => ({ ...previous, [chatIdSending]: true }))
    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', text: command }
    const chatsWithCommand = chats.map(chat => chat.id === chatIdSending
      ? { ...chat, title: chat.messages.length ? chat.title : command.slice(0, 36), messages: [...chat.messages, userMessage] }
      : chat)
    setChats(chatsWithCommand)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chatsWithCommand))
    const memberIds = activeChat.memberIds?.length ? activeChat.memberIds : [activeChat.agentId]
    const members = memberIds.map(id => agents.find(agent => agent.id === id)).filter((member): member is Agent => !!member)
    const directed = parseDirectedTasks(command, members)
    const steps = directed ?? members.map(member => ({ member, task: command }))
    const contributions: string[] = []
    try {
      for (const { member, task } of steps) {
        const memberId = member.id!
        setRunningAgentId(memberId)
        const collaborativePrompt = contributions.length
          ? `${task}\n\nContribuições dos colegas nesta rodada:\n${contributions.join('\n\n')}${directed ? '' : '\n\nRevise e complemente o trabalho da equipe.'}`
          : task
        // Mensagem placeholder do agente, preenchida em tempo real conforme o SSE emite texto
        const messageId = crypto.randomUUID()
        const patchMessage = (patch: Partial<Message>, extra?: (chat: Chat) => Partial<Chat>) =>
          setChats(previous => previous.map(chat => chat.id === chatIdSending
            ? { ...chat, ...extra?.(chat), messages: chat.messages.map(message => message.id === messageId ? { ...message, ...patch } : message) }
            : chat))
        setChats(previous => previous.map(chat => chat.id === chatIdSending
          ? { ...chat, messages: [...chat.messages, { id: messageId, role: 'agent' as const, agentName: member.name, text: '…' }] }
          : chat))
        try {
          const continuation = activeChat.memberIds ? activeChat.continuationRunIds?.[memberId] : activeChat.continuationRunId
          const result = await execute(memberId, collaborativePrompt, continuation, text => patchMessage({ text }))
          contributions.push(`${member.name}: ${result.text}`)
          patchMessage({ text: result.text }, chat => ({
            continuationRunId: chat.memberIds ? chat.continuationRunId : result.runId,
            continuationRunIds: chat.memberIds ? { ...chat.continuationRunIds, [memberId]: result.runId } : chat.continuationRunIds,
          }))
        } catch (error: any) {
          patchMessage({ role: 'system', text: `Erro em ${member.name}: ${error.message}` })
        }
      }
    } finally {
      setBusyChats(previous => ({ ...previous, [chatIdSending]: false }))
      setRunningAgentId(undefined); setRunningCommand('')
    }
  }

  if (!selectedAgent) return <div className="p-8 w-full">
    <div className="mb-6 flex items-end"><div><h1 className="text-2xl font-bold"><span className="text-term-green">#</span> chats</h1><p className="text-sm text-term-muted mt-1">Selecione um agente ou monte uma equipe.</p></div><button className="btn btn-primary ml-auto" onClick={() => setCreatingTeam(value => !value)}>+ chat em equipe</button></div>
    {creatingTeam && <div className="panel p-5 mb-5 animate-fadeIn"><input className="field max-w-sm mb-3" value={teamName} onChange={event => setTeamName(event.target.value)} placeholder="Nome da equipe" /><div className="flex flex-wrap gap-2 mb-4">{agents.map(agent => <button key={agent.id} onClick={() => setTeamMembers(ids => ids.includes(agent.id!) ? ids.filter(id => id !== agent.id) : [...ids, agent.id!])} className={`badge ${teamMembers.includes(agent.id!) ? 'border-term-green text-term-green bg-term-green/10' : 'border-term-border text-term-muted'}`}>{agent.name}</button>)}</div><button className="btn btn-primary" disabled={teamMembers.length < 2} onClick={createTeamChat}>criar com {teamMembers.length} agentes</button></div>}
    <div className="space-y-3">
      {chats.filter(chat => chat.memberIds && chat.memberIds.length > 1).map(chat => <button key={chat.id} onClick={() => { setAgentId(chat.agentId); setChatId(chat.id) }} className="panel w-full h-24 px-5 text-left flex items-center gap-5 hover:border-term-cyan/60"><div className="w-12 h-12 rounded-full border border-term-cyan/50 bg-term-cyan/10 grid place-items-center text-term-cyan font-bold">{chat.memberIds!.length}</div><div className="flex-1"><div className="font-semibold text-lg">{chat.title}</div><div className="text-xs text-term-muted mt-1">{chat.memberIds!.map(id => agents.find(agent => agent.id === id)?.name).join(' · ')}</div></div><span className="badge border-term-cyan/40 text-term-cyan">equipe</span></button>)}
      {agents.map(agent => {
        const backendRun = activeRuns[agent.id!]
        const running = runningAgentId === agent.id || !!backendRun
        const currentCommand = runningAgentId === agent.id ? runningCommand : backendRun?.inputPrompt || ''
        return <button key={agent.id} onClick={() => openAgent(agent.id!)} className="panel w-full h-28 px-5 text-left flex items-center gap-5 transition-all hover:border-term-green/60 hover:bg-term-panel/95">
          <div className="w-14 h-14 rounded-full border flex items-center justify-center font-bold shrink-0" style={{ color: agent.color, borderColor: `${agent.color}66`, backgroundColor: `${agent.color}16` }}>{agent.emoji || agent.name.slice(0, 2).toUpperCase()}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 min-w-0">
              <div className="font-semibold text-lg truncate">{agent.name}</div>
              <div className="flex gap-1 shrink-0">
                {agent.enabledTools.map(tool => <span key={tool} className="badge border-term-border text-term-dim">{tool}</span>)}
              </div>
            </div>
            {running && <div className="truncate mt-1"><ThinkingAnimation label={currentCommand} /></div>}
          </div>
          <div className="w-20 h-full shrink-0 flex items-center justify-center border-l border-term-border pl-5"><LoadingComponent size={0.54} color={agent.color} active={running} /></div>
        </button>
      })}
      {!agents.length && <div className="panel p-10 text-center text-term-muted">Nenhum agente criado.</div>}
    </div>
  </div>

  return <div className="h-full min-h-0 flex flex-col">
    <header className="shrink-0 px-6 py-4 border-b border-term-border bg-black/20 flex items-center gap-3">
      <button className="btn btn-ghost" onClick={() => { setAgentId(undefined); setChatId(undefined) }}>← agentes</button>
      <div className="w-10 h-10 rounded-full border flex items-center justify-center font-bold" style={{ color: selectedAgent.color, borderColor: `${selectedAgent.color}66` }}>{selectedAgent.emoji || selectedAgent.name.slice(0, 2).toUpperCase()}</div>
      <div><h1 className="font-bold">{activeChat?.memberIds ? activeChat.title : selectedAgent.name}</h1><p className="text-[10px] text-term-muted uppercase tracking-widest">{activeChat?.memberIds ? activeChat.memberIds.map(id => agents.find(agent => agent.id === id)?.name).join(' · ') : 'chat com agente'}</p></div>
      <select className="field max-w-72 ml-auto" value={chatId} onChange={event => setChatId(event.target.value)}>{agentChats.map(chat => <option key={chat.id} value={chat.id}>{chat.title}</option>)}</select>
      <button className="btn btn-ghost text-term-red" onClick={deleteChat} disabled={!activeChat || chatBusy} title={chatBusy ? 'Aguarde a rodada terminar' : 'Excluir chat'}>excluir</button>
      <button className="btn btn-primary" onClick={newChat}>+ novo chat</button>
    </header>
    <main className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
      {!activeChat?.messages.length && <div className="h-full grid place-items-center text-term-muted"><p>Envie um comando para {selectedAgent.name}.</p></div>}
      {activeChat?.messages.map(message => <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[75%] rounded-lg border px-4 py-3 ${message.role === 'user' ? 'border-term-green/30 bg-term-green/10' : message.role === 'system' ? 'border-term-red/30 bg-term-red/10' : 'border-term-border bg-term-panel/90'}`}><div className="text-[10px] uppercase tracking-widest text-term-muted mb-1">{message.role === 'user' ? 'você' : message.role === 'agent' ? message.agentName || selectedAgent.name : 'sistema'}</div><div className="text-sm whitespace-pre-wrap leading-relaxed">{message.text}</div></div></div>)}
      {selectedAgentRunning && <div className="animate-fadeIn border-l-2 border-term-green/40 pl-4"><ThinkingAnimation label="processing" /><p className="text-xs text-term-muted truncate pb-2">{selectedCommand}</p></div>}
    </main>
    <footer className="shrink-0 p-4 border-t border-term-border bg-black/20 flex gap-2"><textarea className="field min-h-12 max-h-32 resize-y" value={prompt} onChange={event => setPrompt(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send() } }} placeholder={chatBusy ? 'Rodada em andamento neste chat...' : activeChat?.memberIds ? 'Digite um comando... (/nome tarefa direciona para um agente)' : 'Digite um comando...'} disabled={chatBusy} /><button className="btn btn-primary px-6" onClick={send} disabled={!prompt.trim() || chatBusy}>enviar</button></footer>
  </div>
}
