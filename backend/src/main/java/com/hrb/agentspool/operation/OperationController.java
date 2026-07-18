package com.hrb.agentspool.operation;

import com.hrb.agentspool.run.AgentRun;
import com.hrb.agentspool.run.AgentRunRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/operations")
public class OperationController {
    public static final int MAX_MEMORY_CHARS = 4000;

    private final OperationRepository operations;
    private final OperationMemoryRepository memories;
    private final AgentRunRepository runs;

    public OperationController(OperationRepository operations, OperationMemoryRepository memories,
                               AgentRunRepository runs) {
        this.operations = operations;
        this.memories = memories;
        this.runs = runs;
    }

    @GetMapping
    public List<Operation> list() { return operations.findAllByOrderByUpdatedAtDesc(); }

    @PostMapping
    public Operation create(@RequestBody Operation operation) {
        operation.setId(null);
        operation.setStatus("ACTIVE");
        return operations.save(operation);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Operation> get(@PathVariable Long id) {
        return operations.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public Operation update(@PathVariable Long id, @RequestBody Operation input) {
        Operation operation = operations.findById(id).orElseThrow();
        operation.setName(input.getName());
        operation.setDescription(input.getDescription());
        operation.setBriefing(input.getBriefing());
        operation.setStatus(input.getStatus());
        operation.setEmoji(input.getEmoji());
        operation.setColor(input.getColor());
        operation.setMemberAgentIds(input.getMemberAgentIds());
        operation.setSkillIds(input.getSkillIds());
        return operations.save(operation);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        memories.deleteByOperationId(id);
        operations.deleteById(id);
    }

    @GetMapping("/{id}/memories")
    public List<OperationMemory> listMemories(@PathVariable Long id) {
        return memories.findAllByOperationIdOrderByCreatedAtDesc(id);
    }

    @PostMapping("/{id}/memories")
    public ResponseEntity<OperationMemory> createMemory(@PathVariable Long id, @RequestBody OperationMemory input) {
        if (invalidContent(input.getContent())) return ResponseEntity.badRequest().build();
        operations.findById(id).orElseThrow();
        OperationMemory memory = new OperationMemory();
        memory.setOperationId(id);
        memory.setContent(input.getContent().trim());
        memory.setCategory(input.getCategory());
        memory.setPinned(input.getPinned());
        return ResponseEntity.ok(memories.save(memory));
    }

    @PutMapping("/{id}/memories/{memoryId}")
    public ResponseEntity<OperationMemory> updateMemory(@PathVariable Long id, @PathVariable Long memoryId,
                                                        @RequestBody OperationMemory input) {
        if (invalidContent(input.getContent())) return ResponseEntity.badRequest().build();
        OperationMemory memory = memories.findById(memoryId)
                .filter(existing -> existing.getOperationId().equals(id)).orElseThrow();
        memory.setContent(input.getContent().trim());
        memory.setCategory(input.getCategory());
        memory.setPinned(input.getPinned());
        return ResponseEntity.ok(memories.save(memory));
    }

    @DeleteMapping("/{id}/memories/{memoryId}")
    public void deleteMemory(@PathVariable Long id, @PathVariable Long memoryId) {
        memories.findById(memoryId)
                .filter(existing -> existing.getOperationId().equals(id))
                .ifPresent(memories::delete);
    }

    @GetMapping("/{id}/runs")
    public List<AgentRun> listRuns(@PathVariable Long id) {
        return runs.findTop50ByOperationIdOrderByStartedAtDesc(id);
    }

    private boolean invalidContent(String content) {
        return content == null || content.isBlank() || content.length() > MAX_MEMORY_CHARS;
    }
}
