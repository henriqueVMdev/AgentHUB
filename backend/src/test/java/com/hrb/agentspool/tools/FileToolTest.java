package com.hrb.agentspool.tools;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class FileToolTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @TempDir
    Path sandbox;

    private FileTool tool() throws Exception {
        return new FileTool(sandbox.toString());
    }

    private com.fasterxml.jackson.databind.JsonNode args(String json) throws Exception {
        return mapper.readTree(json);
    }

    @Test
    void writeAndReadInsideSandboxWorks() throws Exception {
        FileTool tool = tool();
        tool.execute("file_write", args("{\"path\":\"notas/a.txt\",\"content\":\"conteudo\"}"));
        assertEquals("conteudo", tool.execute("file_read", args("{\"path\":\"notas/a.txt\"}")));
    }

    @Test
    void rejectsParentTraversal() throws Exception {
        FileTool tool = tool();
        assertThrows(SecurityException.class,
                () -> tool.execute("file_read", args("{\"path\":\"../fora.txt\"}")));
    }

    @Test
    void rejectsNestedTraversal() throws Exception {
        FileTool tool = tool();
        assertThrows(SecurityException.class,
                () -> tool.execute("file_write", args("{\"path\":\"a/../../fora.txt\",\"content\":\"x\"}")));
    }

    @Test
    void rejectsAbsolutePathOutsideSandbox() throws Exception {
        FileTool tool = tool();
        assertThrows(SecurityException.class,
                () -> tool.execute("file_read", args("{\"path\":\"/etc/passwd\"}")));
    }
}
