import { useEffect, useState } from 'react'
import { approveSkillProposal, createSkill, listSkillProposals, listSkills, rejectSkillProposal } from '../api/skills'
import { TermInput, Win } from '../components/ui'
import type { AgentSkill, SkillProposal } from '../types'

export default function Skills() {
  const [skills, setSkills] = useState<AgentSkill[]>([])
  const [proposals, setProposals] = useState<SkillProposal[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState({ name: '', description: '', content: '' })

  const refresh = async () => {
    const [active, pending] = await Promise.all([listSkills(), listSkillProposals()])
    setSkills(active)
    setProposals(pending)
    setLoading(false)
  }
  useEffect(() => { refresh() }, [])

  const create = async () => {
    if (!draft.name.trim() || !draft.content.trim()) return
    await createSkill(draft)
    setDraft({ name: '', description: '', content: '' })
    await refresh()
  }

  const review = async (proposal: SkillProposal, approve: boolean) => {
    if (approve) await approveSkillProposal(proposal.id)
    else await rejectSkillProposal(proposal.id)
    await refresh()
  }

  const pending = proposals.filter((proposal) => proposal.status === 'PENDING')

  return (
    <div className="p-8 max-w-6xl space-y-5">
      <div>
        <div className="text-xs text-term-muted tracking-[0.2em] uppercase">~/skills</div>
        <h1 className="text-2xl font-bold mt-1"><span className="text-term-green">$</span> skill_workshop</h1>
        <p className="text-xs text-term-muted mt-1">{skills.length} ativas · {pending.length} aguardando revisão</p>
      </div>

      {pending.length > 0 && <Win title="propostas_pendentes" bodyClass="p-4 space-y-3">
        {pending.map((proposal) => (
          <div key={proposal.id} className="panel p-4 border-term-amber/35">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge border-term-amber/50 text-term-amber">{proposal.action}</span>
              <span className="font-bold text-sm">{proposal.name}</span>
              <span className="text-[10px] text-term-muted ml-auto">agente #{proposal.sourceAgentId ?? '—'} · run #{proposal.sourceRunId ?? '—'}</span>
            </div>
            {proposal.rationale && <p className="text-xs text-term-muted mt-2">{proposal.rationale}</p>}
            <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded bg-black/35 p-3 text-xs text-term-text">{proposal.content}</pre>
            <div className="flex gap-2 mt-3">
              <button className="btn btn-primary" onClick={() => review(proposal, true)}>aprovar</button>
              <button className="btn btn-danger" onClick={() => review(proposal, false)}>rejeitar</button>
            </div>
          </div>
        ))}
      </Win>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Win title="skills_ativas" bodyClass="p-4 space-y-3">
          {loading && <p className="text-term-muted">carregando...</p>}
          {skills.map((skill) => (
            <details key={skill.id} className="panel p-3">
              <summary className="cursor-pointer text-sm text-term-text">
                {skill.name} <span className="text-[10px] text-term-muted">v{skill.version}</span>
              </summary>
              <p className="text-xs text-term-muted mt-2">{skill.description}</p>
              <pre className="mt-3 whitespace-pre-wrap text-xs text-term-text border-t border-term-border pt-3">{skill.content}</pre>
            </details>
          ))}
          {!loading && skills.length === 0 && <p className="text-xs text-term-muted">nenhuma skill ativa</p>}
        </Win>

        <Win title="nova_skill_manual" bodyClass="p-4 space-y-3">
          <div><label className="label">name</label><TermInput value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
          <div><label className="label">description</label><TermInput value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
          <div><label className="label">SKILL.md</label><textarea className="field h-64 resize-y" value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} /></div>
          <button className="btn btn-primary" onClick={create}>+ criar skill</button>
        </Win>
      </div>
    </div>
  )
}
