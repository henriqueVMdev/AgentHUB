import { useEffect, useMemo, useState } from 'react'
import { useAgents } from '../stores/agentStore'
import { startRun, streamRun } from '../api/runs'

type ChatMessage = { id: string; role: 'user' | 'agent' | 'system'; text: string; agentId?: number; agentName?: string }
type Room = { id: string; name: string; agentIds: number[]; messages: ChatMessage[]; continuations: Record<number, number> }
const KEY = 'agents-pool-chat-rooms'

const loadRooms = (): Room[] => {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

function runAgent(agentId: number, prompt: string, continuation?: number) {
  return new Promise<{ text: string; runId: number }>(async (resolve, reject) => {
    try {
      const runId = await startRun(agentId, prompt, continuation)
      let text = ''
      streamRun(runId, (event) => {
        if (event.type === 'assistant') text += `${text ? '\n' : ''}${event.content}`
        if (event.type === 'done') resolve({ text: text || '(tarefa concluída sem resposta textual)', runId })
        if (event.type === 'error') reject(new Error(event.message))
      })
    } catch (error) { reject(error) }
  })
}

export default function Chats() {
  const { agents, fetch } = useAgents()
  const [rooms, setRooms] = useState<Room[]>(loadRooms)
  const [activeId, setActiveId] = useState<string>()
  const [selected, setSelected] = useState<number[]>([])
  const [name, setName] = useState('')
  const [prompt, setPrompt] = useState('')
  const [running, setRunning] = useState(false)
  const active = rooms.find(room => room.id === activeId)
  const members = useMemo(() => active?.agentIds.map(id => agents.find(a => a.id === id)).filter(Boolean) ?? [], [active, agents])

  useEffect(() => { fetch() }, [fetch])
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(rooms)) }, [rooms])
  useEffect(() => { if (!activeId && rooms[0]) setActiveId(rooms[0].id) }, [rooms, activeId])

  const createRoom = () => {
    if (!selected.length) return
    const room: Room = { id: crypto.randomUUID(), name: name.trim() || (selected.length === 1 ? agents.find(a => a.id === selected[0])?.name || 'Chat' : 'Equipe'), agentIds: selected, messages: [], continuations: {} }
    setRooms(prev => [room, ...prev]); setActiveId(room.id); setName(''); setSelected([])
  }

  const send = async () => {
    if (!active || !prompt.trim() || running) return
    const task = prompt.trim(); setPrompt(''); setRunning(true)
    let room = { ...active, messages: [...active.messages, { id: crypto.randomUUID(), role: 'user' as const, text: task }] }
    setRooms(prev => prev.map(r => r.id === room.id ? room : r))
    const colleagueAnswers: string[] = []
    for (const member of members) {
      if (!member?.id) continue
      const context = colleagueAnswers.length
        ? `${task}\n\nRespostas dos outros agentes nesta rodada:\n${colleagueAnswers.join('\n\n')}\n\nRevise, complemente ou corrija essas contribuições e entregue sua parte.`
        : task
      try {
        const result = await runAgent(member.id, context, room.continuations[member.id])
        colleagueAnswers.push(`${member.name}: ${result.text}`)
        room = { ...room, continuations: { ...room.continuations, [member.id]: result.runId }, messages: [...room.messages, { id: crypto.randomUUID(), role: 'agent', agentId: member.id, agentName: member.name, text: result.text }] }
      } catch (error: any) {
        room = { ...room, messages: [...room.messages, { id: crypto.randomUUID(), role: 'system', agentName: member.name, text: `Erro: ${error.message}` }] }
      }
      setRooms(prev => prev.map(r => r.id === room.id ? room : r))
    }
    setRunning(false)
  }

  return <div className="flex h-full min-h-0">
    <section className="w-72 shrink-0 border-r border-term-border bg-black/20 p-4 overflow-y-auto">
      <h1 className="text-lg font-bold mb-1"><span className="text-term-green">#</span> chats</h1>
      <p className="text-[11px] text-term-muted mb-5">conversas individuais e equipes</p>
      <input className="field mb-2" value={name} onChange={e => setName(e.target.value)} placeholder="nome da conversa" />
      <div className="space-y-1 mb-3 max-h-44 overflow-y-auto">
        {agents.map(agent => <label key={agent.id} className="flex gap-2 items-center text-xs p-2 rounded hover:bg-white/5 cursor-pointer">
          <input type="checkbox" checked={selected.includes(agent.id!)} onChange={() => setSelected(s => s.includes(agent.id!) ? s.filter(id => id !== agent.id) : [...s, agent.id!])} />
          <span style={{ color: agent.color }}>●</span>{agent.name}
        </label>)}
      </div>
      <button className="btn btn-primary w-full mb-5" disabled={!selected.length} onClick={createRoom}>+ criar chat</button>
      <div className="space-y-1">{rooms.map(room => <button key={room.id} onClick={() => setActiveId(room.id)} className={`w-full text-left rounded p-3 border ${room.id === activeId ? 'border-term-green/50 bg-term-green/10' : 'border-transparent hover:bg-white/5'}`}>
        <div className="text-sm truncate">{room.name}</div><div className="text-[10px] text-term-muted">{room.agentIds.length} agente(s) · {room.messages.length} mensagens</div>
      </button>)}</div>
    </section>
    <section className="flex-1 min-w-0 flex flex-col">
      {!active ? <div className="m-auto text-center text-term-muted"><div className="text-3xl mb-3">⌁</div><p>Crie um chat e escolha um ou mais agentes.</p></div> : <>
        <header className="px-6 py-4 border-b border-term-border bg-black/10 flex items-center gap-3">
          <div><h2 className="font-bold">{active.name}</h2><p className="text-[11px] text-term-muted">{members.map(a => a?.name).join(' · ')}</p></div>
          <button className="btn btn-ghost ml-auto" disabled={running} onClick={() => setRooms(rs => rs.filter(r => r.id !== active.id))}>excluir</button>
        </header>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!active.messages.length && <p className="text-center text-term-muted mt-16">Envie uma tarefa. Os agentes responderão em turnos e considerarão as respostas da equipe.</p>}
          {active.messages.map(message => <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[78%] rounded-lg border px-4 py-3 ${message.role === 'user' ? 'border-term-green/30 bg-term-green/10' : message.role === 'system' ? 'border-term-red/30 bg-term-red/10' : 'border-term-border bg-term-panel/90'}`}>
              <div className="text-[10px] uppercase tracking-widest text-term-muted mb-1">{message.role === 'user' ? 'você' : message.agentName || 'sistema'}</div>
              <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.text}</div>
            </div>
          </div>)}
          {running && <div className="text-xs text-term-amber animate-pulse">agentes trabalhando em conjunto...</div>}
        </div>
        <div className="p-4 border-t border-term-border flex gap-2 bg-black/20">
          <textarea className="field min-h-12 max-h-36 resize-y" value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} placeholder="Envie uma mensagem ou comando..." disabled={running} />
          <button className="btn btn-primary px-6" onClick={send} disabled={running || !prompt.trim()}>enviar</button>
        </div>
      </>}
    </section>
  </div>
}
