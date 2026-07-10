import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAgents } from '../stores/agentStore'
import { TermInput, Win } from '../components/ui'
import ModelPicker from '../components/ModelPicker'
import type { Agent, ToolGroup } from '../types'

const TOOLS: { id: ToolGroup; tag: string; label: string; desc: string }[] = [
  { id: 'http', tag: 'NET', label: 'http', desc: 'requisições a APIs externas' },
  { id: 'file', tag: 'FS', label: 'file', desc: 'ler / escrever no sandbox' },
  { id: 'code', tag: 'EXEC', label: 'code', desc: 'executar python / shell' },
  { id: 'browser', tag: 'WEB', label: 'browser', desc: 'navegação web (playwright)' },
]

const blank: Agent = {
  name: '', description: '', systemPrompt: '',
  provider: 'openrouter', modelId: 'openai/gpt-4o-mini',
  baseUrl: '', temperature: 0.7, emoji: '', color: '#22ff9c',
  enabledTools: [],
}

export default function AgentBuilder() {
  const { id } = useParams()
  const nav = useNavigate()
  const { agents, fetch, create, update } = useAgents()
  const [form, setForm] = useState<Agent>(blank)

  useEffect(() => {
    if (id) {
      const existing = agents.find((a) => a.id === Number(id))
      if (existing) setForm(existing)
      else fetch()
    }
  }, [id, agents, fetch])

  const set = (patch: Partial<Agent>) => setForm((f) => ({ ...f, ...patch }))
  const toggleTool = (t: ToolGroup) =>
    set({ enabledTools: form.enabledTools.includes(t)
      ? form.enabledTools.filter((x) => x !== t)
      : [...form.enabledTools, t] })

  const save = async () => {
    if (!form.name.trim()) { alert('defina um nome'); return }
    if (id) await update(Number(id), form)
    else await create(form)
    nav('/')
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <div className="text-xs text-term-muted tracking-[0.2em] uppercase">~/agents/{id ? 'edit' : 'new'}</div>
        <h1 className="text-2xl font-bold mt-1">
          <span className="text-term-green">$</span> {id ? 'edit_agent' : 'init_agent'}
        </h1>
      </div>

      <Win title="agent.config" bodyClass="p-5 space-y-5 animate-fadeIn">
        <div className="grid grid-cols-[1fr_auto] gap-4 items-start">
          <div>
            <label className="label">name</label>
            <TermInput value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="web_researcher" />
          </div>
          <div>
            <label className="label">accent</label>
            <input type="color" value={form.color} onChange={(e) => set({ color: e.target.value })}
              className="h-10 w-14 bg-transparent border border-term-border rounded cursor-pointer" />
          </div>
        </div>

        <div>
          <label className="label">description</label>
          <TermInput value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="o que este agente faz" />
        </div>

        <div>
          <label className="label">system_prompt</label>
          <textarea className="field h-28 resize-y" value={form.systemPrompt}
            onChange={(e) => set({ systemPrompt: e.target.value })} spellCheck={false}
            placeholder="você é um assistente que..." />
        </div>

        <div>
          <label className="label">provider</label>
          <select className="field" value={form.provider}
            onChange={(e) => set({ provider: e.target.value as Agent['provider'] })}>
            <option value="openrouter">openrouter</option>
            <option value="local">local (openai-compat)</option>
          </select>
        </div>

        <div>
          <label className="label">model</label>
          {form.provider === 'openrouter' ? (
            <ModelPicker value={form.modelId} onSelect={(id) => set({ modelId: id })} />
          ) : (
            <TermInput prompt="#" value={form.modelId} onChange={(e) => set({ modelId: e.target.value })}
              placeholder="llama3" />
          )}
        </div>

        {form.provider === 'local' && (
          <div>
            <label className="label">base_url</label>
            <TermInput prompt="@" value={form.baseUrl} onChange={(e) => set({ baseUrl: e.target.value })}
              placeholder="http://localhost:11434/v1" />
          </div>
        )}

        <div>
          <label className="label">temperature :: {form.temperature.toFixed(1)}</label>
          <input type="range" min={0} max={2} step={0.1} value={form.temperature}
            onChange={(e) => set({ temperature: Number(e.target.value) })}
            className="w-full accent-term-green" />
        </div>

        <div>
          <label className="label">tools</label>
          <div className="grid grid-cols-2 gap-2">
            {TOOLS.map((t) => {
              const on = form.enabledTools.includes(t.id)
              return (
                <button key={t.id} onClick={() => toggleTool(t.id)}
                  className={`text-left rounded border px-3 py-2 transition-all duration-150 ${
                    on ? 'border-term-green/60 bg-term-green/10 shadow-[0_0_18px_-6px_rgb(var(--term-green)/0.6)]'
                       : 'border-term-border hover:border-term-dim'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${on ? 'border-term-green/50 text-term-green' : 'border-term-border text-term-muted'}`}>{t.tag}</span>
                    <span className="text-sm text-term-text">{t.label}</span>
                    {on && <span className="ml-auto text-term-green text-xs">[x]</span>}
                  </div>
                  <div className="text-xs text-term-muted mt-1">{t.desc}</div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={save} className="btn btn-primary">{id ? 'save' : 'create'}</button>
          <button onClick={() => nav('/')} className="btn btn-ghost">cancel</button>
        </div>
      </Win>
    </div>
  )
}
