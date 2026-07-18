package com.hrb.agentspool.run;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

public interface AgentRunRepository extends JpaRepository<AgentRun, Long> {
    List<AgentRun> findTop50ByAgentIdOrderByStartedAtDesc(Long agentId);
    List<AgentRun> findTop50ByOperationIdOrderByStartedAtDesc(Long operationId);

    /** [runs, tokens, custo] de uma operação desde a data dada. */
    @Query("select count(r), coalesce(sum(r.totalTokens), 0L), coalesce(sum(r.costUsd), 0.0) "
            + "from AgentRun r where r.operationId = :operationId and r.startedAt >= :since")
    List<Object[]> aggregateByOperation(@Param("operationId") Long operationId, @Param("since") LocalDateTime since);

    /** [operationId, runs, tokens, custo] de todas as operações com runs. */
    @Query("select r.operationId, count(r), coalesce(sum(r.totalTokens), 0L), coalesce(sum(r.costUsd), 0.0) "
            + "from AgentRun r where r.operationId is not null group by r.operationId")
    List<Object[]> aggregateAllOperations();

    @Transactional
    void deleteByAgentId(Long agentId);
}
