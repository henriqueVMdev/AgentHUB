package com.hrb.agentspool.tools;

import com.hrb.agentspool.config.CredentialService;
import com.hrb.agentspool.integration.IntegrationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** IPs literais nos testes: não dependem de DNS, então rodam offline. */
class EgressGuardTest {
    private CredentialService credentials;
    private IntegrationRepository integrations;
    private EgressGuard guard;

    @BeforeEach
    void setup() {
        credentials = mock(CredentialService.class);
        integrations = mock(IntegrationRepository.class);
        guard = new EgressGuard(credentials, integrations);
    }

    @Test
    void blocksLoopbackAndPrivateRanges() {
        assertTrue(guard.isPrivateHost("127.0.0.1"));
        assertTrue(guard.isPrivateHost("10.0.0.8"));
        assertTrue(guard.isPrivateHost("192.168.1.1"));
        assertTrue(guard.isPrivateHost("169.254.169.254")); // metadados de nuvem
        assertNotNull(guard.check("http://127.0.0.1:8081/api", null));
    }

    @Test
    void blocksIpv6UniqueLocal() {
        assertTrue(guard.isPrivateHost("fd00::1"));
    }

    @Test
    void blocksNonHttpSchemes() {
        assertNotNull(guard.check("file:///etc/passwd", null));
        assertNotNull(guard.check("ftp://8.8.8.8/x", null));
    }

    @Test
    void allowsPublicAddressWithoutSecrets() {
        assertNull(guard.check("https://8.8.8.8/api", "payload comum"));
    }

    @Test
    void blocksPayloadContainingSystemCredential() {
        when(credentials.get(anyString())).thenReturn(null);
        when(credentials.get(CredentialService.OPENROUTER)).thenReturn("sk-or-supersecret123");
        assertNotNull(guard.check("https://8.8.8.8/collect", "key=sk-or-supersecret123"));
        // url-encoded também é barrado
        assertNotNull(guard.check("https://8.8.8.8/collect?k=sk-or-supersecret123", null));
    }
}
