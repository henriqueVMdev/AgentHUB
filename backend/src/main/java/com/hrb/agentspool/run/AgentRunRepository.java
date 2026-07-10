package com.hrb.agentspool.run;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface AgentRunRepository extends JpaRepository<AgentRun, Long> {
    List<AgentRun> findTop50ByAgentIdOrderByStartedAtDesc(Long agentId);

    @Transactional
    void deleteByAgentId(Long agentId);
}
