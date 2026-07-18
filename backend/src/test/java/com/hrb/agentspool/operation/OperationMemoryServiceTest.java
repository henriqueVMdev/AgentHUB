package com.hrb.agentspool.operation;

import com.hrb.agentspool.agent.AgentRepository;
import com.hrb.agentspool.config.CredentialService;
import com.hrb.agentspool.llm.LlmClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Sem EMBEDDING_MODEL configurado o serviço degrada para pinned + recentes. */
class OperationMemoryServiceTest {
    private OperationMemoryRepository memories;
    private OperationMemoryService service;

    @BeforeEach
    void setup() {
        memories = mock(OperationMemoryRepository.class);
        service = new OperationMemoryService(mock(OperationRepository.class), memories,
                mock(AgentRepository.class), mock(LlmClient.class), mock(CredentialService.class));
    }

    private OperationMemory memory(long id, String status, boolean pinned) {
        OperationMemory memory = new OperationMemory();
        memory.setId(id);
        memory.setOperationId(7L);
        memory.setContent("m" + id);
        memory.setStatus(status);
        memory.setPinned(pinned);
        return memory;
    }

    @Test
    void selectsPinnedFirstThenRecentCappedAt30() {
        List<OperationMemory> all = new ArrayList<>();
        all.add(memory(1, "PENDING", false));           // pendente nunca entra no prompt
        all.add(memory(2, "ACTIVE", true));
        all.add(memory(3, "ACTIVE", true));
        for (long id = 10; id < 45; id++) all.add(memory(id, "ACTIVE", false)); // 35 não-pinned
        when(memories.findAllByOperationIdOrderByCreatedAtDesc(7L)).thenReturn(all);

        List<OperationMemory> selected = service.selectForPrompt(7L, "qualquer query");

        assertEquals(32, selected.size()); // 2 pinned + 30 recentes
        assertEquals(2L, selected.get(0).getId());
        assertEquals(3L, selected.get(1).getId());
        assertTrue(selected.stream().noneMatch(m -> "PENDING".equals(m.getStatus())));
    }

    @Test
    void pendingOnlyOperationYieldsNothing() {
        when(memories.findAllByOperationIdOrderByCreatedAtDesc(7L))
                .thenReturn(List.of(memory(1, "PENDING", false), memory(2, "PENDING", true)));
        assertTrue(service.selectForPrompt(7L, null).isEmpty());
    }
}
