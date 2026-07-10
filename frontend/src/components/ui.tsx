import type { InputHTMLAttributes, ReactNode } from 'react'

/** Input com visual de linha de comando: prompt glyph + caret fosforado. */
export function TermInput({
  prompt = '›',
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { prompt?: string }) {
  return (
    <label className={`input-wrap ${className}`}>
      <span className="input-prompt">{prompt}</span>
      <input className="input-bare" spellCheck={false} autoComplete="off" {...props} />
    </label>
  )
}

/** Janela de terminal com barra de título e três pontos. */
export function Win({
  title,
  children,
  className = '',
  bodyClass = 'p-4',
}: {
  title: string
  children: ReactNode
  className?: string
  bodyClass?: string
}) {
  return (
    <div className={`win ${className}`}>
      <div className="win-bar">
        <span className="dot bg-term-red/60" />
        <span className="dot bg-term-amber/60" />
        <span className="dot bg-term-green/60" />
        <span className="win-title ml-1">{title}</span>
      </div>
      <div className={bodyClass}>{children}</div>
    </div>
  )
}

/** Bloco piscante estilo cursor de terminal. */
export function Caret() {
  return <span className="text-term-green animate-blink">▋</span>
}
