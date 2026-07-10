package com.hrb.agentspool.skill;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AgentSkillRepository extends JpaRepository<AgentSkill, Long> {
    List<AgentSkill> findAllByStatusOrderByNameAsc(String status);
    boolean existsByNameIgnoreCase(String name);
}
