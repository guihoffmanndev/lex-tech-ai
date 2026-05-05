import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildUserContent, streamChat } from "./streamChat";

// ─── buildUserContent ───────────────────────────────────────────────────────

describe("buildUserContent", () => {
  it("retorna string pura quando não há anexos", () => {
    expect(buildUserContent("olá", [])).toBe("olá");
  });

  it("inclui image_url para arquivos de imagem", () => {
    const result = buildUserContent("veja", [
      { name: "foto.png", mimeType: "image/png", base64: "data:image/png;base64,abc" },
    ]);
    expect(Array.isArray(result)).toBe(true);
    const parts = result as { type: string }[];
    expect(parts.some((p) => p.type === "image_url")).toBe(true);
  });

  it("não envia image_url para PDF — apenas referência de texto", () => {
    const result = buildUserContent("analise", [
      { name: "contrato.pdf", mimeType: "application/pdf", base64: "data:application/pdf;base64,JVB" },
    ]);
    expect(Array.isArray(result)).toBe(true);
    const parts = result as { type: string }[];
    expect(parts.some((p) => p.type === "image_url")).toBe(false);
    expect(parts.some((p) => p.type === "text")).toBe(true);
  });

  it("não envia image_url para DOCX — apenas referência de texto", () => {
    const result = buildUserContent("", [
      { name: "peticao.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", base64: "data:application/...;base64,abc" },
    ]);
    const parts = result as { type: string }[];
    expect(parts.some((p) => p.type === "image_url")).toBe(false);
  });

  it("referência de texto do documento contém o nome do arquivo", () => {
    const result = buildUserContent("ok", [
      { name: "relatorio.pdf", mimeType: "application/pdf", base64: "data:application/pdf;base64,abc" },
    ]) as { type: string; text?: string }[];
    const textPart = result.find((p) => p.type === "text" && p.text?.includes("relatorio.pdf"));
    expect(textPart).toBeDefined();
  });
});

// ─── streamChat — erro 402 ───────────────────────────────────────────────────

import * as supabaseClient from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "token-teste" } },
      }),
    },
  },
}));

describe("streamChat — erro 402 (quota esgotada)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("chama onError com mensagem de upgrade quando API retorna 402", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 402,
        json: async () => ({}),
      })
    );

    const onError = vi.fn();
    await streamChat({
      messages: [{ role: "user", content: "oi" }],
      onDelta: vi.fn(),
      onDone: vi.fn(),
      onError,
    });

    expect(onError).toHaveBeenCalledOnce();
    const msg: string = onError.mock.calls[0][0];
    expect(msg.toLowerCase()).toMatch(/limite|plano|upgrade/);
  });
});
