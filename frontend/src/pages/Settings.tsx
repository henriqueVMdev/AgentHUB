import { useState } from 'react'
import { useConfig } from '../stores/configStore'
import { TermInput, Win } from '../components/ui'

export default function Settings() {
  const { apiKey, setApiKey } = useConfig()
  const [value, setValue] = useState(apiKey)
  const [saved, setSaved] = useState(false)

  const save = () => {
    setApiKey(value)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="p-8 max-w-xl">
      <div className="mb-6">
        <div className="text-xs text-term-muted tracking-[0.2em] uppercase">~/settings</div>
        <h1 className="text-2xl font-bold mt-1"><span className="text-term-green">$</span> config --edit</h1>
      </div>

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
