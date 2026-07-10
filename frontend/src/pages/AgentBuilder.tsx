import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAgents } from '../stores/agentStore'
import { useModels } from '../stores/modelStore'
import { TermInput, Win } from '../components/ui'
import ModelPicker from '../components/ModelPicker'
import { listSkills } from '../api/skills'
import type { Agent, AgentSkill, AgentType, ToolGroup } from '../types'

const TOOLS: { id: ToolGroup; tag: string; label: string; desc: string }[] = [
  { id: 'http', tag: 'NET', label: 'http', desc: 'requisições a APIs externas' },
  { id: 'file', tag: 'FS', label: 'file', desc: 'ler / escrever no sandbox' },
  { id: 'code', tag: 'EXEC', label: 'code', desc: 'executar python / shell' },
  { id: 'browser', tag: 'WEB', label: 'browser', desc: 'navegação web (playwright)' },
]

const AGENT_TYPES: { id: AgentType; label: string; desc: string }[] = [
  { id: 'native', label: 'Agents Pool Hybrid', desc: 'skills, aprendizado e colaboração multiagente' },
  { id: 'hermes', label: 'Hermes Agent', desc: 'memória, skills e ferramentas do Hermes' },
  { id: 'openclaw', label: 'OpenClaw', desc: 'agente administrado pelo OpenClaw Gateway' },
  { id: 'external', label: 'Outro gateway', desc: 'qualquer agente com API OpenAI-compatible' },
]

const blank: Agent = {
  name: '', description: '', systemPrompt: '',
  agentType: 'native',
  provider: 'openrouter', modelId: 'openai/gpt-4o-mini',
  baseUrl: '', temperature: 0.7, emoji: '', color: '#22ff9c',
  enabledTools: [],
  enabledSkillIds: [], collaboratorAgentIds: [], autoLearnSkills: false,
}

export default function AgentBuilder() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const nav = useNavigate()
  const { agents, fetch, create, update } = useAgents()
  const [availableSkills, setAvailableSkills] = useState<AgentSkill[]>([])
  const models = useModels((state) => state.models)
  const importedModelId = id ? null : searchParams.get('model')
  const importedConfigApplied = useRef(false)
  const [form, setForm] = useState<Agent>(() => importedModelId
    ? { ...blank, provider: 'openrouter', modelId: importedModelId }
    : blank)

  useEffect(() => {
    if (id) {
      const existing = agents.find((a) => a.id === Number(id))
      if (existing) setForm(existing)
      else fetch()
    }
  }, [id, agents, fetch])

  useEffect(() => {
    if (!id) fetch()
    listSkills().then(setAvailableSkills).catch(() => setAvailableSkills([]))
  }, [id, fetch])

  useEffect(() => {
    if (!importedModelId || importedConfigApplied.current) return
    const model = models.find((item) => item.id === importedModelId)
    if (!model) return

    const slug = model.id.split('/').pop()?.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'model'
    const defaultTemperature = model.default_parameters?.temperature
    importedConfigApplied.current = true
    setForm((current) => ({
      ...current,
      name: current.name || `${slug}_agent`,
      description: current.description || `Agente configurado com ${model.name} via OpenRouter.`,
      agentType: 'native',
      provider: 'openrouter',
      modelId: model.id,
      temperature: typeof defaultTemperature === 'number'
        ? Math.min(2, Math.max(0, defaultTemperature))
        : current.temperature,
    }))
  }, [importedModelId, models])

  const set = (patch: Partial<Agent>) => setForm((f) => ({ ...f, ...patch }))
  const toggleTool = (t: ToolGroup) =>
    set({ enabledTools: form.enabledTools.includes(t)
      ? form.enabledTools.filter((x) => x !== t)
      : [...form.enabledTools, t] })
  const toggleSkill = (skillId: number) => set({ enabledSkillIds: form.enabledSkillIds.includes(skillId)
    ? form.enabledSkillIds.filter((value) => value !== skillId)
    : [...form.enabledSkillIds, skillId] })
  const toggleCollaborator = (agentId: number) => set({ collaboratorAgentIds: form.collaboratorAgentIds.includes(agentId)
    ? form.collaboratorAgentIds.filter((value) => value !== agentId)
    : [...form.collaboratorAgentIds, agentId] })

  const setAgentType = (agentType: AgentType) => {
    if (agentType === 'hermes') {
      set({ agentType, provider: 'local', modelId: 'hermes-agent', baseUrl: 'http://127.0.0.1:8642/v1', enabledTools: [] })
    } else if (agentType === 'openclaw') {
      set({ agentType, provider: 'local', modelId: 'openclaw/default', baseUrl: 'http://127.0.0.1:18789/v1', enabledTools: [] })
    } else if (agentType === 'external') {
      set({ agentType, provider: 'local', modelId: 'agent/default', baseUrl: 'http://127.0.0.1:8000/v1', enabledTools: [] })
    } else {
      set({ agentType, provider: 'openrouter', modelId: 'openai/gpt-4o-mini', baseUrl: '' })
    }
  }

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
        {importedModelId && (
          <div className="rounded border border-term-green/35 bg-term-green/5 px-3 py-2 text-xs text-term-green">
            ✓ configuração importada do catálogo: <span className="font-bold break-all">{importedModelId}</span>
          </div>
        )}
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
          <label className="label">agent_type</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {AGENT_TYPES.map((type) => {
              const selected = form.agentType === type.id
              return (
                <button key={type.id} type="button" onClick={() => setAgentType(type.id)}
                  className={`text-left rounded border px-3 py-2 transition-all ${
                    selected ? 'border-term-green/60 bg-term-green/10' : 'border-term-border hover:border-term-dim'
                  }`}>
                  <div className={selected ? 'text-sm text-term-green' : 'text-sm text-term-text'}>{type.label}</div>
                  <div className="text-[10px] text-term-muted mt-1 leading-4">{type.desc}</div>
                </button>
              )
            })}
          </div>
        </div>

        {form.agentType === 'native' ? <>
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
        </> : <>
          <div className="rounded border border-term-cyan/30 bg-term-cyan/5 px-3 py-2 text-xs text-term-muted leading-5">
            <span className="text-term-cyan">// runtime externo</span><br />
            Inicie o gateway separadamente. O Agents Pool enviará as tarefas pela API compatível com OpenAI.
          </div>
          <div>
            <label className="label">runtime_model</label>
            <TermInput prompt="#" value={form.modelId} onChange={(e) => set({ modelId: e.target.value })}
              placeholder={form.agentType === 'hermes' ? 'hermes-agent' : form.agentType === 'openclaw' ? 'openclaw/default' : 'agent/default'} />
          </div>
          <div>
            <label className="label">gateway_base_url</label>
            <TermInput prompt="@" value={form.baseUrl} onChange={(e) => set({ baseUrl: e.target.value })} />
          </div>
        </>}

        <div>
          <label className="label">temperature :: {form.temperature.toFixed(1)}</label>
          <input type="range" min={0} max={2} step={0.1} value={form.temperature}
            onChange={(e) => set({ temperature: Number(e.target.value) })}
            className="w-full accent-term-green" />
        </div>

        {form.agentType === 'native' ? <div>
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
        </div> : (
          <div className="text-xs text-term-muted border-t border-term-border pt-4">
            As ferramentas, permissões, memória e skills são configuradas diretamente no runtime externo.
          </div>
        )}

        <div>
          <label className="label">skills</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {availableSkills.map((skill) => {
              const on = form.enabledSkillIds.includes(skill.id)
              return <button key={skill.id} type="button" onClick={() => toggleSkill(skill.id)}
                className={`text-left rounded border px-3 py-2 ${on ? 'border-term-cyan/60 bg-term-cyan/10' : 'border-term-border hover:border-term-dim'}`}>
                <div className="text-xs text-term-text">{skill.name} <span className="text-[9px] text-term-muted">v{skill.version}</span></div>
                <div className="text-[10px] text-term-muted mt-1 line-clamp-2">{skill.description}</div>
              </button>
            })}
            {availableSkills.length === 0 && <p className="text-xs text-term-muted">nenhuma skill ativa · crie em /skills</p>}
          </div>
        </div>

        {form.agentType === 'native' && <>
          <div>
            <label className="label">collaborators</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {agents.filter((agent) => agent.id && agent.id !== Number(id)).map((agent) => {
                const agentId = agent.id!
                const on = form.collaboratorAgentIds.includes(agentId)
                return <button key={agentId} type="button" onClick={() => toggleCollaborator(agentId)}
                  className={`text-left rounded border px-3 py-2 ${on ? 'border-term-green/60 bg-term-green/10' : 'border-term-border hover:border-term-dim'}`}>
                  <div className="text-xs text-term-text">{agent.name}</div>
                  <div className="text-[10px] text-term-muted mt-1">{agent.modelId}</div>
                </button>
              })}
              {agents.filter((agent) => agent.id && agent.id !== Number(id)).length === 0 &&
                <p className="text-xs text-term-muted">crie outros agentes para habilitar delegação</p>}
            </div>
          </div>

          <label className="panel p-3 flex items-start gap-3 cursor-pointer">
            <input type="checkbox" className="mt-0.5 accent-term-green" checked={form.autoLearnSkills}
              onChange={(event) => set({ autoLearnSkills: event.target.checked })} />
            <span>
              <span className="block text-xs text-term-text">aprender com tarefas concluídas</span>
              <span className="block text-[10px] text-term-muted mt-1">O agente pode propor criação ou edição de skills. Toda mudança exige aprovação em /skills.</span>
            </span>
          </label>
        </>}

        <div className="flex gap-3 pt-1">
          <button onClick={save} className="btn btn-primary">{id ? 'save' : 'create'}</button>
          <button onClick={() => nav('/')} className="btn btn-ghost">cancel</button>
        </div>
      </Win>
    </div>
  )
}
