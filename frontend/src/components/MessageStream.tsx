import ToolCallCard, { type ToolCall } from './ToolCallCard'
import ThinkingAnimation from './ThinkingAnimation'

export type StreamItem =
  | { kind: 'text'; text: string }
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
        ) : (
          <ToolCallCard key={i} call={it.call} />
        ),
      )}
      {running && <ThinkingAnimation />}
    </div>
  )
}
