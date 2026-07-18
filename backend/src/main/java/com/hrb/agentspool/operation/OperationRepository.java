package com.hrb.agentspool.operation;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OperationRepository extends JpaRepository<Operation, Long> {
    List<Operation> findAllByOrderByUpdatedAtDesc();
}
