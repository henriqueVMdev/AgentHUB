package com.hrb.agentspool.run;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrb.agentspool.agent.AgentConfig;
import com.hrb.agentspool.agent.AgentRepository;
import com.hrb.agentspool.config.CredentialService;
import com.hrb.agentspool.llm.LlmClient;
import com.hrb.agentspool.operation.Operation;
import com.hrb.agentspool.operation.OperationMemory;
import com.hrb.agentspool.operation.OperationMemoryRepository;
import com.hrb.agentspool.operation.OperationMemoryService;
import com.hrb.agentspool.operation.OperationRepository;
import com.hrb.agentspool.skill.AgentSkillRepository;
import com.hrb.agentspool.skill.SkillProposalRepository;
import com.hrb.agentspool.tools.ToolRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Regra de aprovação do save_memory: conteúdo externo (inbox) ou agente com
 * tools de web grava PENDING; agente confiável grava ACTIVE e é indexado.
 */
class RunServiceMemoryTest {
    private final ObjectMapper mapper = new ObjectMapper();

    private AgentRepository agents;
    private LlmClient llm;
    private ToolRegistry tools;
    private OperationRepository operations;
    private OperationMemoryRepository operationMemories;
    private OperationMemoryService operationMemoryService;
    private RunService service;

    @BeforeEach
    void setup() {
        agents = mock(AgentRepository.class);
        llm = mock(LlmClient.class);
        tools = mock(ToolRegistry.class);
        operations = mock(OperationRepository.class);
        operationMemories = mock(OperationMemoryRepository.class);
        operationMemoryService = mock(OperationMemoryService.class);
        service = new RunService(agents, mock(AgentRunRepository.class), llm, tools,
                mock(AgentSkillRepository.class), mock(SkillProposalRepository.class),
                operations, operationMemories, operationMemoryService, mock(CredentialService.class));
        when(tools.definitionsFor(any())).thenAnswer(inv -> mapper.createArrayNode());
        when(operationMemories.save(any())).thenAnswer(inv -> {
            OperationMemory memory = inv.getArgument(0);
            memory.setId(99L);
            return memory;
        });
    }

    private void givenAgentAndOperation(List<String> enabledTools) throws Exception {
        AgentConfig agent = new AgentConfig();
        agent.setId(1L);
        agent.setName("bot");
        agent.setAgentType("native");
        agent.setEnabledTools(enabledTools);
        when(agents.findById(1L)).thenReturn(Optional.of(agent));

        Operation operation = new Operation();
        operation.setId(5L);
        operation.setName("op");
        operation.setStatus("ACTIVE");
        when(operations.findById(5L)).thenReturn(Optional.of(operation));

        JsonNode toolCallResponse = mapper.readTree("""
                {"choices":[{"message":{"role":"assistant","content":"","tool_calls":[
                  {"id":"c1","type":"function","function":{"name":"save_memory",
                   "arguments":"{\\"content\\":\\"fato durável\\",\\"category\\":\\"FACT\\"}"}}]}}]}
                """);
        JsonNode finalResponse = mapper.readTree(
                "{\"choices\":[{\"message\":{\"role\":\"assistant\",\"content\":\"ok\"}}]}");
        when(llm.chat(any(), any(), any(), any(), any(), any()))
                .thenReturn(toolCallResponse, finalResponse);
    }

    private OperationMemory savedMemory() {
        ArgumentCaptor<OperationMemory> captor = ArgumentCaptor.forClass(OperationMemory.class);
        verify(operationMemories).save(captor.capture());
        return captor.getValue();
    }

    @Test
    void externalContentAlwaysStagesPending() throws Exception {
        givenAgentAndOperation(List.of()); // sem tools de web — mesmo assim é inbox
        service.complete(1L, 5L, true, List.<String[]>of(new String[]{"user", "oi"}));
        assertEquals("PENDING", savedMemory().getStatus());
        verify(operationMemoryService, never()).tryEmbed(any());
    }

    @Test
    void webExposedAgentStagesPending() throws Exception {
        givenAgentAndOperation(List.of("http"));
        service.complete(1L, 5L, false, List.<String[]>of(new String[]{"user", "oi"}));
        assertEquals("PENDING", savedMemory().getStatus());
        verify(operationMemoryService, never()).tryEmbed(any());
    }

    @Test
    void trustedAgentSavesActiveAndIndexes() throws Exception {
        givenAgentAndOperation(List.of("file"));
        service.complete(1L, 5L, false, List.<String[]>of(new String[]{"user", "oi"}));
        OperationMemory memory = savedMemory();
        assertEquals("ACTIVE", memory.getStatus());
        assertEquals("fato durável", memory.getContent());
        verify(operationMemoryService).tryEmbed(memory);
    }
}
