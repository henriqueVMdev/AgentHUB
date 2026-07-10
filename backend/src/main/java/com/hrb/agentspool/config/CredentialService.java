package com.hrb.agentspool.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
public class CredentialService {
    public static final String OPENROUTER = "OPENROUTER_API_KEY";
    public static final String HERMES = "HERMES_API_SERVER_KEY";
    public static final String OPENCLAW = "OPENCLAW_GATEWAY_TOKEN";
    public static final String EXTERNAL = "EXTERNAL_AGENT_API_KEY";

    private final RuntimeCredentialRepository repository;

    @Value("${OPENROUTER_API_KEY:}") private String envOpenRouter;
    @Value("${app.hermes-api-key:}") private String envHermes;
    @Value("${app.openclaw-api-key:}") private String envOpenClaw;
    @Value("${EXTERNAL_AGENT_API_KEY:}") private String envExternal;

    public CredentialService(RuntimeCredentialRepository repository) {
        this.repository = repository;
    }

    public String get(String name) {
        return repository.findById(name).map(RuntimeCredential::getSecretValue).orElseGet(() -> environmentValue(name));
    }

    public boolean isConfigured(String name) {
        String value = get(name);
        return value != null && !value.isBlank();
    }

    @Transactional
    public void set(String name, String value) {
        String normalized = value == null ? "" : value.trim();
        repository.save(repository.findById(name)
                .map(current -> { current.setSecretValue(normalized); return current; })
                .orElseGet(() -> new RuntimeCredential(name, normalized)));
    }

    public Map<String, Boolean> status() {
        return Map.of(
                "openrouter", isConfigured(OPENROUTER),
                "hermes", isConfigured(HERMES),
                "openclaw", isConfigured(OPENCLAW),
                "external", isConfigured(EXTERNAL));
    }

    private String environmentValue(String name) {
        return switch (name) {
            case OPENROUTER -> envOpenRouter;
            case HERMES -> envHermes;
            case OPENCLAW -> envOpenClaw;
            case EXTERNAL -> envExternal;
            default -> "";
        };
    }
}
