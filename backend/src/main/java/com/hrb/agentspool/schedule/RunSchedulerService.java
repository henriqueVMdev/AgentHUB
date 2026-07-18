package com.hrb.agentspool.schedule;

import com.hrb.agentspool.run.AgentRunRepository;
import com.hrb.agentspool.run.RunService;
import com.hrb.agentspool.run.StartRunRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * Dispara rotinas: a cada varredura, roda as habilitadas cujo próximo horário
 * (cron a partir do último disparo) já passou. Se o app esteve desligado no
 * horário, dispara uma única vez no boot seguinte (catch-up).
 */
@Service
public class RunSchedulerService {
    private final ScheduledRunRepository schedules;
    private final AgentRunRepository runs;
    private final RunService runService;

    public RunSchedulerService(ScheduledRunRepository schedules, AgentRunRepository runs, RunService runService) {
        this.schedules = schedules;
        this.runs = runs;
        this.runService = runService;
    }

    @Scheduled(fixedDelay = 30_000)
    public void tick() {
        LocalDateTime now = LocalDateTime.now();
        for (ScheduledRun schedule : schedules.findAllByEnabledTrue()) {
            if (due(schedule, now) && !previousStillRunning(schedule)) {
                fire(schedule);
            }
        }
    }

    /** Dispara imediatamente (botão "rodar agora" da UI), fora do cron. */
    public ScheduledRun fire(ScheduledRun schedule) {
        StartRunRequest req = new StartRunRequest();
        req.agentId = schedule.getAgentId();
        req.operationId = schedule.getOperationId();
        req.prompt = schedule.getPrompt();
        Long runId = runService.startDetached(req);
        schedule.setLastRunAt(LocalDateTime.now());
        schedule.setLastRunId(runId);
        return schedules.save(schedule);
    }

    private boolean due(ScheduledRun schedule, LocalDateTime now) {
        if (schedule.getCronExpression() == null || schedule.getCronExpression().isBlank()) return false;
        try {
            LocalDateTime base = schedule.getLastRunAt() == null ? schedule.getCreatedAt() : schedule.getLastRunAt();
            LocalDateTime next = CronExpression.parse(schedule.getCronExpression()).next(base);
            return next != null && !next.isAfter(now);
        } catch (IllegalArgumentException e) {
            return false; // cron inválido nunca dispara; a UI mostra próximo disparo nulo
        }
    }

    /** Evita empilhar execuções quando o run anterior ainda não terminou (LLM lento, cron curto). */
    private boolean previousStillRunning(ScheduledRun schedule) {
        return schedule.getLastRunId() != null && runs.findById(schedule.getLastRunId())
                .map(run -> "RUNNING".equals(run.getStatus())).orElse(false);
    }
}
