package com.hrb.agentspool.tools;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.microsoft.playwright.Browser;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import org.springframework.stereotype.Component;

/**
 * Navegação web via Playwright.
 * ponytail: singleton lazy com 1 browser/página compartilhados — suficiente para
 * uso sequencial. Um pool por run se rodar agentes em paralelo.
 */
@Component
public class BrowserTool implements ToolExecutor {
    private Playwright playwright;
    private Browser browser;
    private Page page;

    @Override public String group() { return "browser"; }

    @Override public JsonNode definitions() {
        ArrayNode arr = ToolDefs.M.createArrayNode();
        arr.add(ToolDefs.fn("browser_navigate",
                "Abre uma URL no navegador e retorna o título da página.",
                """
                {"type":"object","properties":{"url":{"type":"string"}},"required":["url"]}
                """));
        arr.add(ToolDefs.fn("browser_get_text",
                "Retorna o texto visível da página atual.",
                """
                {"type":"object","properties":{}}
                """));
        arr.add(ToolDefs.fn("browser_click",
                "Clica em um elemento pelo seletor CSS.",
                """
                {"type":"object","properties":{"selector":{"type":"string"}},"required":["selector"]}
                """));
        return arr;
    }

    @Override public boolean handles(String fn) {
        return fn.startsWith("browser_");
    }

    @Override public synchronized String execute(String fn, JsonNode args) {
        ensureBrowser();
        switch (fn) {
            case "browser_navigate" -> {
                page.navigate(args.path("url").asText());
                return "Navegou para: " + page.title();
            }
            case "browser_get_text" -> {
                String text = page.innerText("body");
                if (text.length() > 8000) text = text.substring(0, 8000) + "\n...[truncado]";
                return text;
            }
            case "browser_click" -> {
                page.click(args.path("selector").asText());
                return "Clicado: " + args.path("selector").asText();
            }
            default -> throw new IllegalArgumentException("função desconhecida: " + fn);
        }
    }

    private void ensureBrowser() {
        if (playwright == null) {
            playwright = Playwright.create();
            browser = playwright.chromium().launch(
                    new com.microsoft.playwright.BrowserType.LaunchOptions().setHeadless(true));
            page = browser.newPage();
        }
    }
}
