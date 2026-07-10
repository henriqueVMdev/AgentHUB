package com.hrb.agentspool.config;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/settings/credentials")
public class CredentialController {
    private final CredentialService credentials;

    public CredentialController(CredentialService credentials) {
        this.credentials = credentials;
    }

    @GetMapping
    public Map<String, Boolean> status() {
        return credentials.status();
    }

    @PutMapping
    public ResponseEntity<Map<String, Boolean>> update(@RequestBody CredentialUpdate request) {
        if (request.openrouter() != null) credentials.set(CredentialService.OPENROUTER, request.openrouter());
        if (request.hermes() != null) credentials.set(CredentialService.HERMES, request.hermes());
        if (request.openclaw() != null) credentials.set(CredentialService.OPENCLAW, request.openclaw());
        if (request.external() != null) credentials.set(CredentialService.EXTERNAL, request.external());
        return ResponseEntity.ok(credentials.status());
    }

    public record CredentialUpdate(String openrouter, String hermes, String openclaw, String external) {}
}
