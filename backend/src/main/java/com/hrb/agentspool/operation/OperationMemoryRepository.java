package com.hrb.agentspool.operation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface OperationMemoryRepository extends JpaRepository<OperationMemory, Long> {
    List<OperationMemory> findAllByOperationIdOrderByCreatedAtDesc(Long operationId);

    @Transactional
    void deleteByOperationId(Long operationId);
}
