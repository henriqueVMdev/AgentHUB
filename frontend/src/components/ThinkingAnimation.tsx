/** Barras verticais oscilando — equalizador estilo terminal indicando processamento. */
export default function ThinkingAnimation({ label = 'processing' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-2 text-term-dim" aria-label="agente trabalhando">
      <div className="flex items-end gap-1 h-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="w-1 h-full origin-bottom rounded-sm bg-term-green animate-thinking"
            style={{ animationDelay: `${i * 0.11}s` }}
          />
        ))}
      </div>
      <span className="text-xs tracking-widest uppercase">
        {label}
        <span className="animate-blink">_</span>
      </span>
    </div>
  )
}
