import { useState } from 'react'
import { useConfig } from '../stores/configStore'
import { useTheme } from '../stores/themeStore'
import { themes, type Token } from '../themes'
import { TermInput, Win } from '../components/ui'

const SWATCH: Token[] = ['green', 'cyan', 'amber', 'red', 'muted']

export default function Settings() {
  const { apiKey, setApiKey } = useConfig()
  const { themeId, setTheme } = useTheme()
  const [value, setValue] = useState(apiKey)
  const [saved, setSaved] = useState(false)

  const save = () => {
    setApiKey(value)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div>
        <div className="text-xs text-term-muted tracking-[0.2em] uppercase">~/settings</div>
        <h1 className="text-2xl font-bold mt-1"><span className="text-term-green">$</span> config --edit</h1>
      </div>

      <Win title="theme.rc" bodyClass="p-5 animate-fadeIn">
        <label className="label">color_scheme</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {themes.map((t) => {
            const active = t.id === themeId
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`text-left rounded border p-3 transition-all duration-150 ${
                  active ? 'border-term-green shadow-[0_0_18px_-6px_rgb(var(--term-green)/0.6)]'
                         : 'border-term-border hover:-translate-y-0.5'}`}
                style={{ backgroundColor: `rgb(${t.vars.panel})` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold" style={{ color: `rgb(${t.vars.green})` }}>{t.label}</span>
                  {active && <span className="ml-auto text-[10px] uppercase tracking-widest" style={{ color: `rgb(${t.vars.green})` }}>[active]</span>}
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
            )
          })}
        </div>
      </Win>

      <Win title="credentials.env" bodyClass="p-5 space-y-3 animate-fadeIn">
        <label className="label">openrouter_api_key</label>
        <TermInput
          prompt="$"
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="sk-or-..."
        />
        <p className="text-xs text-term-muted leading-relaxed">
          <span className="text-term-dim">// </span>
          armazenada apenas no navegador (localStorage). enviada ao backend só no momento da execução,
          nunca gravada no banco. para modelos locais (ollama / lm studio) a chave é ignorada — basta
          configurar a base_url no agente.
        </p>
        <button onClick={save} className="btn btn-primary mt-1">{saved ? 'saved ✓' : 'save'}</button>
      </Win>
    </div>
  )
}
