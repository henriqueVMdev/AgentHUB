import { useEffect } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import AgentBuilder from './pages/AgentBuilder'
import AgentRunner from './pages/AgentRunner'
import RunHistory from './pages/RunHistory'
import Settings from './pages/Settings'
import { useTheme } from './stores/themeStore'
import { applyVars, themes } from './themes'

function NavItem({ to, children }: { to: string; children: string }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors duration-150 ${
          isActive ? 'text-term-green bg-term-green/10' : 'text-term-muted hover:text-term-text hover:bg-white/5'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className={isActive ? 'text-term-green' : 'text-term-border'}>{isActive ? '›' : ' '}</span>
          {children}
        </>
      )}
    </NavLink>
  )
}

export default function App() {
  const themeId = useTheme((s) => s.themeId)
  const customThemes = useTheme((s) => s.customThemes)
  useEffect(() => {
    const all = [...themes, ...customThemes]
    const theme = all.find((t) => t.id === themeId) ?? themes[0]
    applyVars(theme.vars)
  }, [themeId, customThemes])

  return (
    <div className="flex h-screen">
      <aside className="w-60 shrink-0 border-r border-term-border p-4 flex flex-col gap-1 bg-black/20">
        <div className="px-3 py-2 mb-3">
          <div className="text-lg font-bold tracking-tight">
            <span className="text-term-text">agents</span>
            <span className="text-term-green">_pool</span>
            <span className="animate-blink text-term-green">▋</span>
          </div>
          <div className="text-[10px] text-term-muted tracking-[0.2em] uppercase mt-0.5">ai agent console</div>
        </div>
        <NavItem to="/">dashboard</NavItem>
        <NavItem to="/agents/new">new_agent</NavItem>
        <NavItem to="/settings">settings</NavItem>
        <div className="mt-auto px-3 text-[10px] text-term-muted/60 tracking-widest">v0.1.0</div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/agents/new" element={<AgentBuilder />} />
          <Route path="/agents/:id/edit" element={<AgentBuilder />} />
          <Route path="/agents/:id/run" element={<AgentRunner />} />
          <Route path="/agents/:id/runs" element={<RunHistory />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}
