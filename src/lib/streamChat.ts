import { supabase } from "@/integrations/supabase/client";

type TextContent = { type: "text"; text: string };
type ImageContent = { type: "image_url"; image_url: { url: string } };
type ContentPart = TextContent | ImageContent;

type Msg = { role: "user" | "assistant"; content: string | ContentPart[] };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export interface FileAttachment {
  name: string;
  mimeType: string;
  base64: string; // data URI
}

export function fileToDataURI(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function buildUserContent(
  text: string,
  attachments: FileAttachment[]
): string | ContentPart[] {
  if (attachments.length === 0) return text;

  const parts: ContentPart[] = [];

  for (const att of attachments) {
    if (att.mimeType.startsWith("image/")) {
      parts.push({ type: "image_url", image_url: { url: att.base64 } });
    } else {
      // Non-image files: send as text reference only — Gemini 2.0 Flash does not
      // process PDFs/DOCX via image_url base64; sending it would be silently ignored.
      parts.push({
        type: "text",
        text: `[Arquivo anexado: ${att.name}]\n(Tipo: ${att.mimeType})`,
      });
    }
  }

  if (text) {
    parts.push({ type: "text", text });
  }

  return parts;
}

export async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
}: {
  messages: Msg[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  // Client-side input validation
  if (messages.length > 50) {
    onError("Histórico muito longo (máx 50 mensagens).");
    return;
  }
  // Only validate length on string content
  if (
    messages.some(
      (m) => typeof m.content === "string" && m.content.length > 10000
    )
  ) {
    onError("Mensagem muito longa (máx 10.000 caracteres).");
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    onError("Você precisa estar logado para usar o assistente.");
    return;
  }

  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (!resp.ok) {
    if (resp.status === 402) {
      onError("Você atingiu o limite mensal do seu plano. Faça upgrade para continuar.");
      return;
    }
    let errorMsg = "Erro ao conectar com a IA.";
    try {
      const body = await resp.json();
      if (body.error) errorMsg = body.error;
    } catch { /* response body may not be parseable JSON */ }
    onError(errorMsg);
    return;
  }

  if (!resp.body) {
    onError("Resposta vazia do servidor.");
    return;
  }

  // Returns "done" if [DONE] marker, "incomplete" if JSON parse fails (needs more data), or void
  function parseLine(line: string): "done" | "incomplete" | void {
    if (line.endsWith("\r")) line = line.slice(0, -1);
    if (line.startsWith(":") || line.trim() === "") return;
    if (!line.startsWith("data: ")) return;

    const jsonStr = line.slice(6).trim();
    if (jsonStr === "[DONE]") return "done";

    try {
      const parsed = JSON.parse(jsonStr);
      const content = parsed.choices?.[0]?.delta?.content as string | undefined;
      if (content) onDelta(content);
    } catch {
      return "incomplete";
    }
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      const line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      const result = parseLine(line);
      if (result === "done") { streamDone = true; break; }
      if (result === "incomplete") { textBuffer = line + "\n" + textBuffer; break; }
    }
  }

  // Flush remaining
  if (textBuffer.trim()) {
    for (const raw of textBuffer.split("\n")) {
      if (!raw) continue;
      parseLine(raw);
    }
  }

  onDone();
}
