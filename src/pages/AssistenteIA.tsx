import { useState, useRef, useEffect, useCallback, type DragEvent } from "react";
import { Send, Loader2, Upload } from "lucide-react";
import chatLogo from "@/assets/chat-logo.png";
import { streamChat, fileToDataURI, buildUserContent, type FileAttachment } from "@/lib/streamChat";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import posthog from "posthog-js";
import { useRecentes } from "@/hooks/useRecentes";
import { useChatConversations } from "@/hooks/useChatConversations";
import ChatSidebar from "@/components/assistente-ia/ChatSidebar";
import AttachmentMenu from "@/components/assistente-ia/AttachmentMenu";
import AttachmentChips, { type ChatFile } from "@/components/assistente-ia/AttachmentChips";

type Msg = { role: "user" | "assistant"; content: string };

const MAX_FILES_PER_CONVERSATION = 2;

export default function AssistenteIA() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<ChatFile[]>([]);
  const [convFileCount, setConvFileCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { registrarAcesso } = useRecentes();

  const {
    conversations,
    createConversation,
    deleteConversation,
    clearAll,
    loadMessages,
    saveMessage,
    updateTitle,
  } = useChatConversations();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSelectConversation = async (id: string) => {
    setActiveConvId(id);
    setPendingFiles([]);
    try {
      const msgs = await loadMessages(id);
      setMessages(msgs.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })));
      // Count files already sent in this conversation (stored as [Arquivo: ...] markers)
      const fileCount = msgs.filter(
        (m) => m.role === "user" && m.content.includes("[Arquivo anexado:")
      ).length;
      setConvFileCount(Math.min(fileCount, MAX_FILES_PER_CONVERSATION));
      const conv = conversations.find((c) => c.id === id);
      if (conv) {
        registrarAcesso.mutate({
          tipo: "conversa_ia",
          item_id: id,
          item_nome: conv.title,
          item_path: "/assistente",
        });
      }
    } catch {
      toast.error("Erro ao carregar conversa.");
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setActiveConvId(null);
    setInput("");
    setPendingFiles([]);
    setConvFileCount(0);
  };

  const handleDelete = (id: string) => {
    deleteConversation.mutate(id);
    if (activeConvId === id) handleNewChat();
  };

  const handleClearAll = () => {
    clearAll.mutate();
    handleNewChat();
  };

  const handleFilesSelected = (files: File[]) => {
    const totalCurrent = convFileCount + pendingFiles.length;
    const remaining = MAX_FILES_PER_CONVERSATION - totalCurrent;

    if (remaining <= 0) {
      toast.warning("Limite de 2 arquivos por conversa atingido.");
      return;
    }

    const toAdd = files.slice(0, remaining);
    if (toAdd.length < files.length) {
      toast.warning("Limite de 2 arquivos por conversa atingido.");
    }

    const newFiles: ChatFile[] = toAdd.map((f) => ({
      file: f,
      preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined,
    }));

    setPendingFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setPendingFiles((prev) => {
      const removed = prev[index];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSend = async (text?: string) => {
    const content = text || input.trim();
    if ((!content && pendingFiles.length === 0) || isLoading) return;
    setInput("");

    // Convert files to base64
    const attachments: FileAttachment[] = [];
    for (const cf of pendingFiles) {
      try {
        const dataUri = await fileToDataURI(cf.file);
        attachments.push({
          name: cf.file.name,
          mimeType: cf.file.type,
          base64: dataUri,
        });
      } catch {
        toast.error(`Erro ao ler arquivo: ${cf.file.name}`);
      }
    }

    // Build display message (text only for UI)
    const displayContent = [
      ...attachments.map((a) => `[${a.name}]`),
      content,
    ]
      .filter(Boolean)
      .join("\n");

    const userMsg: Msg = { role: "user", content: displayContent };
    const allDisplayMessages = [...messages, userMsg];
    setMessages(allDisplayMessages);
    setIsLoading(true);

    // Update file count
    setConvFileCount((prev) => prev + attachments.length);

    // Clean up previews
    pendingFiles.forEach((cf) => {
      if (cf.preview) URL.revokeObjectURL(cf.preview);
    });
    setPendingFiles([]);

    let convId = activeConvId;

    // Create conversation on first message
    if (!convId) {
      try {
        const title = content.length > 40 ? content.slice(0, 40) + "…" : content || "Análise de arquivo";
        const conv = await createConversation.mutateAsync(title);
        convId = conv.id;
        setActiveConvId(convId);
        posthog.capture("ai_conversation_created", { has_attachment: attachments.length > 0 });
        registrarAcesso.mutate({
          tipo: "conversa_ia",
          item_id: conv.id,
          item_nome: title,
          item_path: "/assistente",
        });
      } catch {
        toast.error("Erro ao criar conversa.");
        setIsLoading(false);
        return;
      }
    }

    posthog.capture("ai_message_sent", {
      has_attachment: attachments.length > 0,
      attachment_count: attachments.length,
      message_length: content.length,
    });

    // Save user message (text only for DB)
    try {
      await saveMessage(convId, "user", displayContent);
    } catch { /* DB save failures are non-critical — chat still works */ }

    // Build API messages: use multimodal content for the current message
    const apiMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    const userApiContent = buildUserContent(content, attachments);
    apiMessages.push({ role: "user" as const, content: userApiContent as string });

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    const finalConvId = convId;

    try {
      await streamChat({
        messages: apiMessages,
        onDelta: (chunk) => upsertAssistant(chunk),
        onDone: async () => {
          setIsLoading(false);
          if (assistantSoFar) {
            try {
              await saveMessage(finalConvId, "assistant", assistantSoFar);
            } catch { /* DB save failures are non-critical — chat still works */ }
          }
          // Update title after the first exchange using the full user text (no truncation artifact)
          if (!activeConvId && content) {
            const cleanTitle = content.length > 60 ? content.slice(0, 60) + "…" : content;
            updateTitle(finalConvId, cleanTitle).catch(() => {});
          }
        },
        onError: (error) => {
          setIsLoading(false);
          toast.error(error);
        },
      });
    } catch (err) {
      posthog.captureException(err, { flow: "ai_chat_stream" });
      setIsLoading(false);
      toast.error("Erro ao conectar com a IA.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedPrompts = [
    "Analise este contrato",
    "Resuma esta petição",
    "Identifique riscos legais",
    "Cite jurisprudência do STJ",
  ];

  const attachmentLimitReached =
    convFileCount + pendingFiles.length >= MAX_FILES_PER_CONVERSATION;

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer?.types?.includes("Files")) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length > 0) handleFilesSelected(files);
  };

  return (
    <div className="animate-fade-in flex h-[calc(100vh-3.5rem)] -m-6 lg:-m-8">
      <ChatSidebar
        conversations={conversations}
        activeId={activeConvId}
        onSelect={handleSelectConversation}
        onNew={handleNewChat}
        onDelete={handleDelete}
        onClearAll={handleClearAll}
      />

      {/* Chat Area */}
      <div
        className="flex-1 flex flex-col relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drop Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary rounded-lg m-2 animate-in fade-in-0 duration-200">
            <div className="flex flex-col items-center gap-2 text-primary">
              <Upload className="h-10 w-10" />
              <span className="text-sm font-medium">Solte o arquivo aqui</span>
              {attachmentLimitReached && (
                <span className="text-xs text-destructive">Limite de 2 arquivos atingido</span>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 overflow-hidden">
                <img src={chatLogo} alt="Assistente IA" className="h-10 w-10 object-contain" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Assistente Jurídico IA</h2>
              <p className="text-sm text-muted-foreground max-w-md">
                Faça perguntas sobre legislação brasileira, analise contratos,
                pesquise jurisprudência do STJ/STF e muito mais.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`flex gap-3 max-w-2xl ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                {msg.role === "assistant" && (
                  <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                    <img src={chatLogo} alt="IA" className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={`rounded-lg px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary border border-border"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none prose-headings:font-serif prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-a:text-primary">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="flex gap-3">
                <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                  <img src={chatLogo} alt="IA" className="h-4 w-4" />
                </div>
                <div className="rounded-lg px-4 py-3 bg-secondary border border-border">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts */}
        {messages.length === 0 && (
          <div className="px-6 pb-2 flex flex-wrap gap-2 justify-center">
            {suggestedPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSend(prompt)}
                className="px-3 py-1.5 rounded-full border border-border bg-card text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Attachment Chips */}
        <AttachmentChips files={pendingFiles} onRemove={handleRemoveFile} />

        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex items-end gap-2 max-w-3xl mx-auto">
            <AttachmentMenu
              disabled={attachmentLimitReached || isLoading}
              onFilesSelected={handleFilesSelected}
            />
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Faça uma pergunta jurídica..."
                rows={1}
                disabled={isLoading}
                className="w-full px-4 py-2.5 bg-secondary border-0 rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none disabled:opacity-50"
              />
            </div>
            <button
              onClick={() => handleSend()}
              disabled={isLoading || (!input.trim() && pendingFiles.length === 0)}
              className="p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
