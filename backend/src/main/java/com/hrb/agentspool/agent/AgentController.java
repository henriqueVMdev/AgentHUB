package com.hrb.agentspool.agent;

import com.hrb.agentspool.run.AgentRun;
import com.hrb.agentspool.run.AgentRunRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/agents")
public class AgentController {
    private final AgentRepository agents;
    private final AgentRunRepository runs;

    public AgentController(AgentRepository agents, AgentRunRepository runs) {
        this.agents = agents;
        this.runs = runs;
    }

    @GetMapping
    public List<AgentConfig> list() {
        return agents.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<AgentConfig> get(@PathVariable Long id) {
        return agents.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public AgentConfig create(@RequestBody AgentConfig agent) {
        agent.setId(null);
        return agents.save(agent);
    }

    @PutMapping("/{id}")
    public ResponseEntity<AgentConfig> update(@PathVariable Long id, @RequestBody AgentConfig agent) {
        if (!agents.existsById(id)) return ResponseEntity.notFound().build();
        agent.setId(id);
        return ResponseEntity.ok(agents.save(agent));
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        runs.deleteByAgentId(id);
        agents.deleteById(id);
    }

    @GetMapping("/{id}/runs")
    public List<AgentRun> runHistory(@PathVariable Long id) {
        return runs.findTop50ByAgentIdOrderByStartedAtDesc(id);
    }
}
