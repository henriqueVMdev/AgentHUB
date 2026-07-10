package com.hrb.agentspool.skill;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SkillProposalRepository extends JpaRepository<SkillProposal, Long> {
    List<SkillProposal> findAllByOrderByCreatedAtDesc();
}
