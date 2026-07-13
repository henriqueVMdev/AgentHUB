package com.hrb.agentspool.tools;

import com.hrb.agentspool.config.CredentialService;
import com.hrb.agentspool.integration.IntegrationRepository;
import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Barreira de saída para tráfego web gerado por agentes: bloqueia destinos
 * privados/locais (SSRF) e payloads que contenham credenciais conhecidas
 * (exfiltração via query string ou corpo, inclusive induzida por prompt injection).
 */
@Component
public class EgressGuard {
    private final CredentialService credentials;
    private final IntegrationRepository integrations;

    public EgressGuard(CredentialService credentials, IntegrationRepository integrations) {
        this.credentials = credentials;
        this.integrations = integrations;
    }

    /** Razão do bloqueio, ou null se a saída é segura. */
    public String check(String url, String payload) {
        URI uri;
        try {
            uri = URI.create(url);
        } catch (Exception e) {
            return "URL inválida";
        }
        if (!List.of("http", "https").contains(uri.getScheme())) {
            return "somente URLs http/https são permitidas";
        }
        if (uri.getHost() == null || isPrivateHost(uri.getHost())) {
            return "endereços privados, locais ou não resolvíveis são bloqueados";
        }
        String outgoing = url + "\n" + (payload == null ? "" : payload);
        if (containsSecret(outgoing)) {
            return "a requisição contém uma credencial do sistema; remova-a antes de enviar";
        }
        return null;
    }

    /**
     * Loopback, link-local (inclui metadados de nuvem 169.254.169.254), RFC 1918,
     * multicast e IPv6 ULA. Host não resolvível também conta como privado.
     * ponytail: resolve DNS uma vez por chamada (o JVM cacheia); rebinding/TOCTOU
     * fora do escopo single-user local.
     */
    public boolean isPrivateHost(String host) {
        try {
            for (InetAddress a : InetAddress.getAllByName(host)) {
                byte[] raw = a.getAddress();
                if (a.isAnyLocalAddress() || a.isLoopbackAddress() || a.isLinkLocalAddress()
                        || a.isSiteLocalAddress() || a.isMulticastAddress()
                        || (raw.length == 16 && (raw[0] & 0xfe) == 0xfc)) {
                    return true;
                }
            }
            return false;
        } catch (Exception e) {
            return true;
        }
    }

    // ponytail: varre raw + url-encoded; base64/fragmentação quando houver ameaça real
    private boolean containsSecret(String payload) {
        for (String secret : knownSecrets()) {
            if (secret.length() >= 8
                    && (payload.contains(secret) || payload.contains(URLEncoder.encode(secret, StandardCharsets.UTF_8)))) {
                return true;
            }
        }
        return false;
    }

    // ponytail: consulta credenciais e integrações a cada chamada; cachear se virar gargalo
    private List<String> knownSecrets() {
        List<String> values = new ArrayList<>();
        for (String name : List.of(CredentialService.OPENROUTER, CredentialService.HERMES,
                CredentialService.OPENCLAW, CredentialService.EXTERNAL)) {
            String value = credentials.get(name);
            if (value != null && !value.isBlank()) values.add(value);
        }
        integrations.findAll().forEach(i -> {
            if (i.getSecret() != null && !i.getSecret().isBlank()) values.add(i.getSecret());
        });
        return values;
    }
}
