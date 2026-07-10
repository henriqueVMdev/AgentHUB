package com.hrb.agentspool.config;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;

@Entity
public class RuntimeCredential {
    @Id
    private String name;

    @Lob
    private String secretValue;

    protected RuntimeCredential() {}

    public RuntimeCredential(String name, String secretValue) {
        this.name = name;
        this.secretValue = secretValue;
    }

    public String getName() { return name; }
    public String getSecretValue() { return secretValue; }
    public void setSecretValue(String secretValue) { this.secretValue = secretValue; }
}
