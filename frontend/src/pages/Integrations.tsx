import { useEffect, useMemo, useState } from 'react'
import { useAgents } from '../stores/agentStore'
import { createIntegration, deleteIntegration, listIntegrations, registerTelegramWebhook, updateIntegration } from '../api/integrations'
import type { Integration } from '../types'
import { testIntegration } from '../api/inbox'

const providers = [
  { id: 'telegram', name: 'Telegram', icon: '✈', hint: 'Bot token', endpoint: 'https://api.telegram.org' },
  { id: 'email', name: 'E-mail (IMAP/SMTP)', icon: '@', hint: 'Senha ou app password', endpoint: 'smtp://smtp.seudominio.com:587' },
  { id: 'whatsapp', name: 'WhatsApp Business', icon: '◉', hint: 'Access token da Meta', endpoint: 'https://graph.facebook.com/v21.0' },
  { id: 'slack', name: 'Slack', icon: '#', hint: 'Bot user OAuth token', endpoint: 'https://slack.com/api' },
  { id: 'discord', name: 'Discord', icon: '◈', hint: 'Bot token', endpoint: 'https://discord.com/api/v10' },
  { id: 'teams', name: 'Microsoft Teams', icon: 'T', hint: 'Client secret / webhook', endpoint: '' },
  { id: 'webhook', name: 'Webhook', icon: '↗', hint: 'Segredo de assinatura (opcional)', endpoint: 'https://...' },
  { id: 'custom', name: 'API personalizada', icon: '{}', hint: 'API key ou bearer token', endpoint: 'https://api.exemplo.com' },
]

const empty = (provider = providers[0]): Integration => ({
  name: provider.name, provider: provider.id, enabled: true, endpointUrl: provider.endpoint,
  account: '', secret: '', agentIds: [],
})

export default function Integrations() {
  const { agents, fetch: fetchAgents } = useAgents()
  const [items, setItems] = useState<Integration[]>([])
  const [form, setForm] = useState<Integration>(() => empty())
  const [editingId, setEditingId] = useState<number>()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [testResult, setTestResult] = useState<Record<number, string>>({})

  const load = async () => { try { setItems(await listIntegrations()); setError('') } catch (e: any) { setError(e.message) } }
  useEffect(() => { fetchAgents(); load() }, [fetchAgents])
  const provider = useMemo(() => providers.find(p => p.id === form.provider) ?? providers[0], [form.provider])

  const chooseProvider = (id: string) => {
    const selected = providers.find(p => p.id === id)!
    setForm(current => ({ ...current, provider: id, name: editingId ? current.name : selected.name, endpointUrl: editingId ? current.endpointUrl : selected.endpoint }))
  }
  const toggleAgent = (id: number) => setForm(current => ({ ...current, agentIds: current.agentIds.includes(id) ? current.agentIds.filter(value => value !== id) : [...current.agentIds, id] }))
  const close = () => { setOpen(false); setEditingId(undefined); setForm(empty()); setError('') }
  const edit = (item: Integration) => { setEditingId(item.id); setForm({ ...item, secret: '' }); setOpen(true) }
  const save = async () => {
    if (!form.name.trim() || !form.agentIds.length) { setError('Informe um nome e selecione pelo menos um agente.'); return }
    setSaving(true)
    try {
      if (editingId) await updateIntegration(editingId, form)
      else await createIntegration(form)
      await load(); close()
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }
  const remove = async (item: Integration) => {
    if (!item.id || !window.confirm(`Excluir a integração "${item.name}"?`)) return
    await deleteIntegration(item.id); await load()
  }
  const test = async (item: Integration) => { if (!item.id) return; try { const result = await testIntegration(item.id); setTestResult(v => ({ ...v, [item.id!]: result.ok ? `conexão acessível${result.status ? ` (${result.status})` : ''}` : result.message || 'falha' })) } catch (e:any) { setTestResult(v => ({ ...v, [item.id!]: e.message })) } }
  const registerWebhook = async (item: Integration) => {
    if (!item.id) return
    const url = window.prompt('URL pública HTTPS do AgentHUB (ex.: https://meu-tunel.ngrok.app):')
    if (!url) return
    try { const result = await registerTelegramWebhook(item.id, url.trim()); setTestResult(v => ({ ...v, [item.id!]: result.ok ? 'webhook registrado no Telegram' : result.description || result.message || 'falha ao registrar' })) }
    catch (e: any) { setTestResult(v => ({ ...v, [item.id!]: e.message })) }
  }

  return <div className="p-8 max-w-7xl mx-auto w-full">
    <div className="flex items-end gap-4 mb-7">
      <div><div className="text-xs text-term-muted tracking-[0.2em] uppercase">~/connections</div><h1 className="text-2xl font-bold mt-1"><span className="text-term-green">$</span> integrações</h1><p className="text-sm text-term-muted mt-1">Conecte aplicativos externos e escolha quais agentes poderão atendê-los.</p></div>
      <button className="btn btn-primary ml-auto" onClick={() => { setForm(empty()); setOpen(true) }}>+ nova integração</button>
    </div>

    {error && !open && <div className="panel border-term-red/40 text-term-red p-4 mb-5">{error}</div>}
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
      {items.map(item => { const meta = providers.find(p => p.id === item.provider) ?? providers[providers.length - 1]; return <div className="panel p-5" key={item.id}>
        <div className="flex gap-3 items-start"><div className="w-11 h-11 rounded border border-term-green/30 bg-term-green/10 grid place-items-center text-term-green font-bold">{meta.icon}</div><div className="min-w-0 flex-1"><div className="font-semibold truncate">{item.name}</div><div className="text-xs text-term-muted">{meta.name}</div></div><span className={`badge ${item.enabled ? 'border-term-green/40 text-term-green' : 'border-term-border text-term-muted'}`}>{item.enabled ? 'ativa' : 'pausada'}</span></div>
        <div className="mt-4 pt-4 border-t border-term-border"><div className="text-[10px] text-term-muted uppercase tracking-widest mb-2">agentes vinculados</div><div className="flex flex-wrap gap-2">{item.agentIds.map(id => <span className="badge border-term-border" key={id}>{agents.find(a => a.id === id)?.name ?? `#${id}`}</span>)}</div></div>
        {item.id && testResult[item.id] && <div className="text-xs text-term-muted mt-3">{testResult[item.id]}</div>}<div className="flex gap-2 mt-5">{item.provider === 'telegram' ? <button className="btn btn-ghost" onClick={() => registerWebhook(item)}>webhook</button> : <button className="btn btn-ghost" onClick={() => test(item)}>testar</button>}<button className="btn btn-ghost flex-1" onClick={() => edit(item)}>configurar</button><button className="btn btn-danger" onClick={() => remove(item)}>excluir</button></div>
      </div> })}
      {!items.length && <div className="panel p-10 text-center text-term-muted sm:col-span-2 xl:col-span-3">Nenhuma integração configurada. Crie uma conexão e vincule seus agentes.</div>}
    </div>

    {open && <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm overflow-y-auto p-6" onMouseDown={e => { if (e.target === e.currentTarget) close() }}><div className="panel max-w-3xl mx-auto p-6 animate-fadeIn">
      <div className="flex items-center mb-5"><div><h2 className="text-xl font-bold">{editingId ? 'editar integração' : 'nova integração'}</h2><p className="text-xs text-term-muted mt-1">As credenciais não são devolvidas pela API após serem salvas.</p></div><button className="btn btn-ghost ml-auto" onClick={close}>fechar</button></div>
      <label className="label">aplicativo</label><div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">{providers.map(p => <button key={p.id} onClick={() => chooseProvider(p.id)} className={`p-3 rounded border text-left ${form.provider === p.id ? 'border-term-green bg-term-green/10 text-term-green' : 'border-term-border text-term-muted hover:border-term-dim'}`}><div className="font-bold mb-1">{p.icon}</div><div className="text-xs">{p.name}</div></button>)}</div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div><label className="label">nome da conexão</label><input className="field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="label">conta / canal / identificador</label><input className="field" value={form.account} onChange={e => setForm({ ...form, account: e.target.value })} placeholder="@bot, e-mail, canal ou phone ID" /></div>
        <div className="sm:col-span-2"><label className="label">endpoint</label><input className="field" value={form.endpointUrl} onChange={e => setForm({ ...form, endpointUrl: e.target.value })} placeholder={provider.endpoint || 'URL da API ou webhook'} /></div>
        <div className="sm:col-span-2"><label className="label">credencial secreta</label><input type="password" className="field" value={form.secret || ''} onChange={e => setForm({ ...form, secret: e.target.value })} placeholder={editingId ? 'Deixe vazio para manter a atual' : provider.hint} /></div>
      </div>
      <div className="mt-5"><label className="label">agentes vinculados</label><div className="grid sm:grid-cols-2 gap-2">{agents.map(agent => <button key={agent.id} onClick={() => toggleAgent(agent.id!)} className={`p-3 rounded border flex items-center gap-3 text-left ${form.agentIds.includes(agent.id!) ? 'border-term-green/50 bg-term-green/10' : 'border-term-border'}`}><span className="w-8 h-8 rounded-full border grid place-items-center" style={{ color: agent.color, borderColor: `${agent.color}66` }}>{agent.emoji || agent.name.slice(0, 2)}</span><span className="text-sm flex-1">{agent.name}</span><span className={form.agentIds.includes(agent.id!) ? 'text-term-green' : 'text-term-muted'}>{form.agentIds.includes(agent.id!) ? '✓' : '+'}</span></button>)}</div></div>
      <label className="mt-5 flex items-center gap-3 text-sm"><input type="checkbox" checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} /> conexão ativa</label>
      {error && <p className="text-sm text-term-red mt-4">{error}</p>}
      <div className="flex justify-end gap-2 mt-6"><button className="btn btn-ghost" onClick={close}>cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'salvando...' : 'salvar integração'}</button></div>
    </div></div>}
  </div>
}
