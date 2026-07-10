package com.hrb.agentspool.skill;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/skills")
public class SkillController {
    private final AgentSkillRepository skills;
    private final SkillProposalRepository proposals;

    public SkillController(AgentSkillRepository skills, SkillProposalRepository proposals) {
        this.skills = skills;
        this.proposals = proposals;
    }

    @GetMapping public List<AgentSkill> list() { return skills.findAllByStatusOrderByNameAsc("ACTIVE"); }
    @PostMapping public AgentSkill create(@RequestBody AgentSkill skill) {
        skill.setStatus("ACTIVE");
        skill.setVersion(1);
        return skills.save(skill);
    }
    @PutMapping("/{id}") public AgentSkill update(@PathVariable Long id, @RequestBody AgentSkill input) {
        AgentSkill skill = skills.findById(id).orElseThrow();
        skill.setName(input.getName());
        skill.setDescription(input.getDescription());
        skill.setContent(input.getContent());
        skill.setVersion(skill.getVersion() + 1);
        return skills.save(skill);
    }

    @GetMapping("/proposals") public List<SkillProposal> proposals() {
        return proposals.findAllByOrderByCreatedAtDesc();
    }

    @PostMapping("/proposals/{id}/approve")
    public ResponseEntity<AgentSkill> approve(@PathVariable Long id) {
        SkillProposal proposal = proposals.findById(id).orElseThrow();
        if (!"PENDING".equals(proposal.getStatus())) return ResponseEntity.badRequest().build();
        AgentSkill skill;
        if ("UPDATE".equals(proposal.getAction()) && proposal.getTargetSkillId() != null) {
            skill = skills.findById(proposal.getTargetSkillId()).orElseThrow();
            skill.setDescription(proposal.getDescription());
            skill.setContent(proposal.getContent());
            skill.setVersion(skill.getVersion() + 1);
        } else {
            if (skills.existsByNameIgnoreCase(proposal.getName())) return ResponseEntity.status(409).build();
            skill = new AgentSkill();
            skill.setName(proposal.getName());
            skill.setDescription(proposal.getDescription());
            skill.setContent(proposal.getContent());
            skill.setCreatedByAgentId(proposal.getSourceAgentId());
        }
        proposal.setStatus("APPROVED");
        proposal.setReviewedAt(LocalDateTime.now());
        proposals.save(proposal);
        return ResponseEntity.ok(skills.save(skill));
    }

    @PostMapping("/proposals/{id}/reject")
    public SkillProposal reject(@PathVariable Long id) {
        SkillProposal proposal = proposals.findById(id).orElseThrow();
        proposal.setStatus("REJECTED");
        proposal.setReviewedAt(LocalDateTime.now());
        return proposals.save(proposal);
    }
}
