package com.hrb.agentspool.schedule;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ScheduledRunRepository extends JpaRepository<ScheduledRun, Long> {
    List<ScheduledRun> findAllByOrderByCreatedAtDesc();
    List<ScheduledRun> findAllByEnabledTrue();
}
