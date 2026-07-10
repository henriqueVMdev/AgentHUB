import { useState } from 'react'

const TAG: Record<string, string> = {
  http_request: 'NET',
  file_read: 'FS', file_write: 'FS', file_list: 'FS',
  run_code: 'EXEC',
  browser_navigate: 'WEB', browser_get_text: 'WEB', browser_click: 'WEB',
}

export interface ToolCall {
  name: string
  args: string
  result?: string // undefined enquanto executando
}

export default function ToolCallCard({ call }: { call: ToolCall }) {
  const [open, setOpen] = useState(false)
  const running = call.result === undefined
  const tag = TAG[call.name] ?? 'SYS'

  return (
    <div className="panel my-2 text-sm animate-fadeIn">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 px-3 py-2 text-left">
        <span className="badge border-term-border text-term-cyan">{tag}</span>
        <span className="font-mono text-term-text">{call.name}</span>
        {running ? (
          <span className="ml-auto flex items-center gap-2 text-term-amber text-xs uppercase tracking-widest">
            <span className="w-3 h-3 border-2 border-term-amber border-t-transparent rounded-full animate-spin" />
            exec
          </span>
        ) : (
          <span className="ml-auto text-term-green text-xs uppercase tracking-widest">ok</span>
        )}
        <span className="text-term-muted text-xs">{open ? '[-]' : '[+]'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2 border-t border-term-border pt-2">
          <div>
            <div className="label mb-1">args</div>
            <pre className="bg-black/50 border border-term-border rounded p-2 overflow-x-auto text-xs text-term-dim">{call.args}</pre>
          </div>
          {call.result !== undefined && (
            <div>
              <div className="label mb-1">stdout</div>
              <pre className="bg-black/50 border border-term-border rounded p-2 overflow-x-auto text-xs text-term-text max-h-64 whitespace-pre-wrap">{call.result}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
