package com.hrb.agentspool.integration;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/integrations")
public class IntegrationController {
    private final IntegrationRepository integrations;
    public IntegrationController(IntegrationRepository integrations) { this.integrations = integrations; }

    @GetMapping public List<IntegrationConfig> list() { return integrations.findAll(); }
    @PostMapping public IntegrationConfig create(@RequestBody IntegrationConfig config) { return integrations.save(config); }
    @PutMapping("/{id}") public ResponseEntity<IntegrationConfig> update(@PathVariable Long id, @RequestBody IntegrationConfig input) {
        return integrations.findById(id).map(current -> {
            current.setName(input.getName()); current.setProvider(input.getProvider()); current.setEnabled(input.getEnabled());
            current.setEndpointUrl(input.getEndpointUrl()); current.setAccount(input.getAccount()); current.setAgentIds(input.getAgentIds());
            if (input.getSecret() != null && !input.getSecret().isBlank()) current.setSecret(input.getSecret());
            return ResponseEntity.ok(integrations.save(current));
        }).orElse(ResponseEntity.notFound().build());
    }
    @DeleteMapping("/{id}") public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!integrations.existsById(id)) return ResponseEntity.notFound().build();
        integrations.deleteById(id); return ResponseEntity.noContent().build();
    }
}
