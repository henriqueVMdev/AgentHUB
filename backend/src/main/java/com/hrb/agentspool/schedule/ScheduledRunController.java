package com.hrb.agentspool.schedule;

import com.hrb.agentspool.agent.AgentRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/schedules")
public class ScheduledRunController {
    private final ScheduledRunRepository schedules;
    private final AgentRepository agents;
    private final RunSchedulerService scheduler;

    public ScheduledRunController(ScheduledRunRepository schedules, AgentRepository agents,
                                  RunSchedulerService scheduler) {
        this.schedules = schedules;
        this.agents = agents;
        this.scheduler = scheduler;
    }

    @GetMapping
    public List<ScheduledRun> list() { return schedules.findAllByOrderByCreatedAtDesc(); }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody ScheduledRun input) {
        String error = validate(input);
        if (error != null) return ResponseEntity.badRequest().body(Map.of("message", error));
        input.setId(null);
        input.setLastRunAt(null);
        input.setLastRunId(null);
        return ResponseEntity.ok(schedules.save(input));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody ScheduledRun input) {
        String error = validate(input);
        if (error != null) return ResponseEntity.badRequest().body(Map.of("message", error));
        ScheduledRun schedule = schedules.findById(id).orElseThrow();
        schedule.setName(input.getName());
        schedule.setAgentId(input.getAgentId());
        schedule.setOperationId(input.getOperationId());
        schedule.setPrompt(input.getPrompt());
        schedule.setCronExpression(input.getCronExpression());
        schedule.setEnabled(input.getEnabled());
        return ResponseEntity.ok(schedules.save(schedule));
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) { schedules.deleteById(id); }

    @PostMapping("/{id}/run")
    public ScheduledRun runNow(@PathVariable Long id) {
        return scheduler.fire(schedules.findById(id).orElseThrow());
    }

    private String validate(ScheduledRun input) {
        if (input.getAgentId() == null || agents.findById(input.getAgentId()).isEmpty()) {
            return "Selecione um agente válido.";
        }
        if (input.getPrompt() == null || input.getPrompt().isBlank()) {
            return "O prompt da rotina não pode ficar vazio.";
        }
        try {
            CronExpression.parse(input.getCronExpression() == null ? "" : input.getCronExpression());
        } catch (IllegalArgumentException e) {
            return "Cron inválido (6 campos: seg min hora dia mês dia-da-semana). Ex: 0 0 9 * * MON-FRI";
        }
        return null;
    }
}
