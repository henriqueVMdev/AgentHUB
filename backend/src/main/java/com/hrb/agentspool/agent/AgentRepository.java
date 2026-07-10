package com.hrb.agentspool.agent;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AgentRepository extends JpaRepository<AgentConfig, Long> {
}
