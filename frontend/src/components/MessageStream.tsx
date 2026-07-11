import ToolCallCard, { type ToolCall } from './ToolCallCard'
import ThinkingAnimation from './ThinkingAnimation'

export type StreamItem =
  | { kind: 'text'; text: string }
  | { kind: 'user'; text: string }
  | { kind: 'tool'; call: ToolCall }

export default function MessageStream({ items, running }: { items: StreamItem[]; running: boolean }) {
  return (
    <div className="space-y-3">
      {items.map((it, i) =>
        it.kind === 'text' ? (
          <div key={i} className="animate-fadeIn border-l-2 border-term-green/40 pl-3 py-0.5">
            <span className="text-term-green/60 select-none">agent:~$ </span>
            <span className="whitespace-pre-wrap leading-relaxed text-term-text">{it.text}</span>
          </div>
        ) : it.kind === 'user' ? (
          <div key={i} className="animate-fadeIn flex justify-end">
            <div className="max-w-[80%] rounded border border-term-cyan/30 bg-term-cyan/5 px-4 py-2">
              <div className="text-[10px] uppercase tracking-widest text-term-cyan/70 mb-1">você</div>
              <div className="whitespace-pre-wrap leading-relaxed text-term-text">{it.text}</div>
            </div>
          </div>
        ) : (
          <ToolCallCard key={i} call={it.call} />
        ),
      )}
      {running && <ThinkingAnimation />}
    </div>
  )
}
