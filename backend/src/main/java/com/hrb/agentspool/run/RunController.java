package com.hrb.agentspool.run;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

@RestController
@RequestMapping("/api/runs")
public class RunController {
    private final RunService service;
    private final AgentRunRepository runs;

    public RunController(RunService service, AgentRunRepository runs) {
        this.service = service;
        this.runs = runs;
    }

    @PostMapping("/start")
    public Map<String, Long> start(@RequestBody StartRunRequest req) {
        return Map.of("runId", service.start(req));
    }

    @GetMapping("/{id}/stream")
    public SseEmitter stream(@PathVariable Long id) {
        SseEmitter emitter = new SseEmitter(0L); // sem timeout
        service.stream(id, emitter);
        return emitter;
    }

    @GetMapping("/{id}")
    public ResponseEntity<AgentRun> get(@PathVariable Long id) {
        return runs.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }
}
