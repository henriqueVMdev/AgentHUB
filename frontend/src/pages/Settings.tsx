import { useEffect, useState } from 'react'
import { getCredentialStatus, updateCredentials, type CredentialStatus } from '../api/settings'
import { useTheme } from '../stores/themeStore'
import { themes, hexToTriplet, tripletToHex, type Theme, type Token } from '../themes'
import { TermInput, Win } from '../components/ui'

const SWATCH: Token[] = ['green', 'cyan', 'amber', 'red', 'muted']

const FIELDS: { key: Token; label: string }[] = [
  { key: 'bg', label: 'fundo' },
  { key: 'panel', label: 'painel' },
  { key: 'border', label: 'borda' },
  { key: 'green', label: 'destaque' },
  { key: 'dim', label: 'secundária' },
  { key: 'cyan', label: 'ciano' },
  { key: 'amber', label: 'âmbar' },
  { key: 'red', label: 'erro' },
  { key: 'text', label: 'texto' },
  { key: 'muted', label: 'apagado' },
]

export default function Settings() {
  const { themeId, customThemes, setTheme, addCustomTheme, removeCustomTheme } = useTheme()

  const [value, setValue] = useState('')
  const [hermesValue, setHermesValue] = useState('')
  const [openclawValue, setOpenclawValue] = useState('')
  const [externalValue, setExternalValue] = useState('')
  const [credentialStatus, setCredentialStatus] = useState<CredentialStatus | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    getCredentialStatus().then(setCredentialStatus).catch(() => setSaveError('não foi possível carregar as credenciais'))
  }, [])

  const all = [...themes, ...customThemes]
  const active = all.find((t) => t.id === themeId) ?? themes[0]

  // rascunho do tema custom, iniciado a partir do tema ativo (em hex para os color pickers)
  const [name, setName] = useState('')
  const [draft, setDraft] = useState<Record<Token, string>>(
    () => Object.fromEntries(FIELDS.map((f) => [f.key, tripletToHex(active.vars[f.key])])) as Record<Token, string>,
  )

  const saveKey = async () => {
    const changes = {
      ...(value ? { openrouter: value } : {}),
      ...(hermesValue ? { hermes: hermesValue } : {}),
      ...(openclawValue ? { openclaw: openclawValue } : {}),
      ...(externalValue ? { external: externalValue } : {}),
    }
    if (Object.keys(changes).length === 0) return
    setSaving(true)
    setSaveError('')
    try {
      setCredentialStatus(await updateCredentials(changes))
      setValue(''); setHermesValue(''); setOpenclawValue(''); setExternalValue('')
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch {
      setSaveError('não foi possível salvar as credenciais')
    } finally {
      setSaving(false)
    }
  }

  const createTheme = () => {
    if (!name.trim()) { alert('dê um nome ao tema'); return }
    const vars = Object.fromEntries(FIELDS.map((f) => [f.key, hexToTriplet(draft[f.key])])) as Record<Token, string>
    const theme: Theme = { id: `custom-${Date.now()}`, label: name.trim(), vars }
    addCustomTheme(theme)
    setTheme(theme.id)
    setName('')
  }

  const loadIntoDraft = (t: Theme) =>
    setDraft(Object.fromEntries(FIELDS.map((f) => [f.key, tripletToHex(t.vars[f.key])])) as Record<Token, string>)

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div>
        <div className="text-xs text-term-muted tracking-[0.2em] uppercase">~/settings</div>
        <h1 className="text-2xl font-bold mt-1"><span className="text-term-green">$</span> config --edit</h1>
      </div>

      <Win title="theme.rc" bodyClass="p-5 animate-fadeIn">
        <label className="label">color_scheme</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {all.map((t) => {
            const isActive = t.id === themeId
            const isCustom = t.id.startsWith('custom-')
            return (
              <div key={t.id} className="relative">
                <button
                  onClick={() => setTheme(t.id)}
                  className={`w-full text-left rounded border p-3 transition-all duration-150 ${
                    isActive ? 'border-term-green shadow-[0_0_18px_-6px_rgb(var(--term-green)/0.6)]'
                             : 'border-term-border hover:-translate-y-0.5'}`}
                  style={{ backgroundColor: `rgb(${t.vars.panel})` }}
                >
                  <div className="flex items-center gap-2 mb-2 pr-5">
                    <span className="text-sm font-semibold truncate" style={{ color: `rgb(${t.vars.green})` }}>{t.label}</span>
                    {isActive && <span className="ml-auto text-[10px] uppercase tracking-widest shrink-0" style={{ color: `rgb(${t.vars.green})` }}>[active]</span>}
                  </div>
                  <div className="text-xs" style={{ color: `rgb(${t.vars.text})` }}>
                    <span style={{ color: `rgb(${t.vars.green})` }}>agent:~$</span> run
                    <span className="animate-blink" style={{ color: `rgb(${t.vars.green})` }}>▋</span>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {SWATCH.map((k) => (
                      <span key={k} className="w-4 h-4 rounded-sm" style={{ backgroundColor: `rgb(${t.vars[k]})` }} />
                    ))}
                  </div>
                </button>
                {isCustom && (
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button onClick={() => loadIntoDraft(t)} title="editar cópia"
                      className="text-[10px] px-1 rounded bg-black/40 text-term-muted hover:text-term-text">ed</button>
                    <button onClick={() => removeCustomTheme(t.id)} title="excluir"
                      className="text-[10px] px-1 rounded bg-black/40 text-term-red/80 hover:text-term-red">×</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Win>

      <Win title="theme.new" bodyClass="p-5 space-y-4 animate-fadeIn">
        <div>
          <label className="label">theme_name</label>
          <TermInput prompt="›" value={name} onChange={(e) => setName(e.target.value)} placeholder="meu_tema" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {FIELDS.map((f) => (
            <label key={f.key} className="flex flex-col items-center gap-1 text-[10px] uppercase tracking-widest text-term-muted">
              <input type="color" value={draft[f.key]}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                className="h-9 w-full bg-transparent border border-term-border rounded cursor-pointer" />
              {f.label}
            </label>
          ))}
        </div>
        <button onClick={createTheme} className="btn btn-primary">+ criar tema</button>
      </Win>

      <Win title="credentials.env" bodyClass="p-5 space-y-3 animate-fadeIn">
        <label className="label">openrouter_api_key</label>
        <TermInput prompt="$" type="password" value={value}
          onChange={(e) => setValue(e.target.value)} placeholder={credentialStatus?.openrouter ? 'configurada ••••••••' : 'sk-or-...'} />
        <div className="border-t border-term-border pt-3 mt-3">
          <label className="label">hermes_gateway_key</label>
          <TermInput prompt="$" type="password" value={hermesValue}
            onChange={(e) => setHermesValue(e.target.value)} placeholder={credentialStatus?.hermes ? 'configurada ••••••••' : 'API_SERVER_KEY'} />
        </div>
        <div className="border-t border-term-border pt-3 mt-3">
          <label className="label">openclaw_gateway_token</label>
          <TermInput prompt="$" type="password" value={openclawValue}
            onChange={(e) => setOpenclawValue(e.target.value)} placeholder={credentialStatus?.openclaw ? 'configurado ••••••••' : 'gateway bearer token'} />
        </div>
        <div className="border-t border-term-border pt-3 mt-3">
          <label className="label">external_agent_key</label>
          <TermInput prompt="$" type="password" value={externalValue}
            onChange={(e) => setExternalValue(e.target.value)} placeholder={credentialStatus?.external ? 'configurada ••••••••' : 'opcional para outro gateway'} />
        </div>
        <p className="text-xs text-term-muted leading-relaxed">
          <span className="text-term-dim">// </span>
          credenciais salvas no backend e usadas imediatamente nas próximas execuções. os valores existentes
          nunca são enviados de volta ao navegador; deixe um campo vazio para manter a credencial atual.
        </p>
        {saveError && <p className="text-xs text-term-red">{saveError}</p>}
        <button onClick={saveKey} disabled={saving} className="btn btn-primary mt-1">
          {saving ? 'saving...' : saved ? 'saved ✓' : 'save'}
        </button>
      </Win>
    </div>
  )
}
