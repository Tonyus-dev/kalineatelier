import { kalineAvatar } from "@/lib/brand-assets";
import { kharisAvatar } from "@/lib/brand-assets";
import { kuanyinAvatar } from "@/lib/brand-assets";
import { Link, useSearch } from "@tanstack/react-router";
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { LazyMarkdown } from "@/components/LazyMarkdown";
import { Button } from "@/components/ui/button";
import { Send, Mic, Loader2, Volume2, Square, Paperclip, X, GitBranch } from "lucide-react";
import { KittScanner, type KittState } from "@/components/KittScanner";
import { setKittPulse, useKittPulse } from "@/lib/kitt-pulse";
import { toast } from "sonner";
import { useProfile } from "@/lib/use-profile";
import { useOfflineChat } from "@/lib/use-offline-chat";
import { transcribeLocalFile, getLocalThread } from "@/lib/local/local-api-client";
import { useTTS } from "@/lib/use-tts";
import { extractActions, KuanyinActionCard } from "@/components/KuanyinActionCard";

// Faceta "kharis" = superfície de cuidado neurodivergente (antigo valor de enum 'klio',
// renomeado em 20260626010000).
type Facet = "kaline" | "kharis" | "kuanyin";

// Chat offline (local-server) é texto-only: sem pipeline de visão/documentos
// embutido no `/chat`. Imagem e PDF foram descartados; Word/.txt continuam
// aceitos porque já são extraídos para texto no próprio navegador.
type Attachment = {
  name: string;
  kind: "text";
  content: string;
};

type FacetTheme = {
  label: string;
  avatar: string;
  subtitle: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  chipActiveBg: string;
  chipActiveText: string;
  chipBorder: string;
  headerGlow: string;
  assistantBorder: string;
  assistantBg: string;
  userBorder: string;
  userBg: string;
  userAvatarBg: string;
  composerFocus: string;
  composerRing: string;
  sendClass: string;
  micReadyClass: string;
  micRecordingClass: string;
  thinkingLabel: string;
  emptyState: string;
};

const FACET_THEMES: Record<Facet, FacetTheme> = {
  kaline: {
    label: "Kaline",
    avatar: kalineAvatar.url,
    subtitle: "presença geral",
    accent: "var(--kaline)",
    accentSoft: "color-mix(in oklab, var(--kaline) 16%, transparent)",
    accentText: "var(--kaline)",
    chipActiveBg: "color-mix(in oklab, var(--kaline) 18%, transparent)",
    chipActiveText: "var(--ivory)",
    chipBorder: "color-mix(in oklab, var(--kaline) 28%, transparent)",
    headerGlow: "0 0 24px color-mix(in oklab, var(--kaline) 18%, transparent)",
    assistantBorder: "color-mix(in oklab, var(--kaline) 22%, transparent)",
    assistantBg:
      "linear-gradient(180deg, color-mix(in oklab, var(--kaline) 6%, transparent), transparent)",
    userBorder: "color-mix(in oklab, var(--kaline) 34%, transparent)",
    userBg: "color-mix(in oklab, var(--kaline) 12%, transparent)",
    userAvatarBg: "color-mix(in oklab, var(--kaline) 18%, transparent)",
    composerFocus: "var(--kaline)",
    composerRing: "0 0 0 1px color-mix(in oklab, var(--kaline) 40%, transparent)",
    sendClass:
      "border border-[color:var(--kaline)]/35 bg-[color:var(--kaline)] text-[color:var(--obsidian)] hover:bg-[color:var(--kaline)]/90",
    micReadyClass:
      "bg-[color:var(--kaline)] text-[color:var(--obsidian)] hover:bg-[color:var(--kaline)]/90",
    micRecordingClass:
      "bg-[color:var(--kaline)]/22 text-[color:var(--ivory)] border-[color:var(--kaline)]/35 animate-pulse",
    thinkingLabel: "Kaline está pensando...",
    emptyState: "Fala comigo. Aqui é conversa, não sala de aula.",
  },
  kharis: {
    label: "Kháris",
    avatar: kharisAvatar.url,
    subtitle: "cuidado neurodivergente",
    accent: "var(--kharis)",
    accentSoft: "color-mix(in oklab, var(--kharis) 16%, transparent)",
    accentText: "var(--ivory)",
    chipActiveBg: "color-mix(in oklab, var(--kharis) 56%, transparent)",
    chipActiveText: "var(--ivory)",
    chipBorder: "color-mix(in oklab, var(--kharis) 38%, transparent)",
    headerGlow: "0 0 24px color-mix(in oklab, var(--kharis) 22%, transparent)",
    assistantBorder: "color-mix(in oklab, var(--kharis) 26%, transparent)",
    assistantBg:
      "linear-gradient(180deg, color-mix(in oklab, var(--kharis) 12%, transparent), transparent)",
    userBorder: "color-mix(in oklab, var(--kharis) 42%, transparent)",
    userBg: "color-mix(in oklab, var(--kharis) 22%, transparent)",
    userAvatarBg: "color-mix(in oklab, var(--kharis) 28%, transparent)",
    composerFocus: "var(--kharis)",
    composerRing: "0 0 0 1px color-mix(in oklab, var(--kharis) 50%, transparent)",
    sendClass:
      "border border-[color:var(--kharis)]/40 bg-[color:var(--kharis)] text-[color:var(--ivory)] hover:bg-[color:var(--kharis)]/90",
    micReadyClass:
      "bg-[color:var(--kharis)] text-[color:var(--ivory)] hover:bg-[color:var(--kharis)]/90",
    micRecordingClass:
      "bg-[color:var(--kharis)]/28 text-[color:var(--ivory)] border-[color:var(--kharis)]/40 animate-pulse",
    thinkingLabel: "Kháris está pensando...",
    emptyState: "Conta pra mim o que você precisa. Vou com calma, passo a passo.",
  },
  kuanyin: {
    label: "Kuan-Yin",
    avatar: kuanyinAvatar.url,
    subtitle: "negócio, clientes e operação",
    accent: "var(--kuanyin)",
    accentSoft: "color-mix(in oklab, var(--kuanyin) 18%, transparent)",
    accentText: "color-mix(in oklab, var(--kuanyin) 35%, var(--ivory))",
    chipActiveBg: "color-mix(in oklab, var(--kuanyin) 22%, transparent)",
    chipActiveText: "var(--ivory)",
    chipBorder: "color-mix(in oklab, var(--kuanyin) 36%, transparent)",
    headerGlow: "0 0 24px color-mix(in oklab, var(--kuanyin) 22%, transparent)",
    assistantBorder: "color-mix(in oklab, var(--kuanyin) 28%, transparent)",
    assistantBg:
      "linear-gradient(180deg, color-mix(in oklab, var(--kuanyin) 10%, transparent), transparent)",
    userBorder: "color-mix(in oklab, var(--kuanyin) 42%, transparent)",
    userBg: "color-mix(in oklab, var(--kuanyin) 18%, transparent)",
    userAvatarBg: "color-mix(in oklab, var(--kuanyin) 22%, transparent)",
    composerFocus: "var(--kuanyin)",
    composerRing: "0 0 0 1px color-mix(in oklab, var(--kuanyin) 50%, transparent)",
    sendClass:
      "border border-[color:var(--kuanyin)]/40 bg-[color:var(--kuanyin)] text-[color:var(--ivory)] hover:bg-[color:var(--kuanyin)]/90",
    micReadyClass:
      "bg-[color:var(--kuanyin)] text-[color:var(--ivory)] hover:bg-[color:var(--kuanyin)]/90",
    micRecordingClass:
      "bg-[color:var(--kuanyin)]/24 text-[color:var(--ivory)] border-[color:var(--kuanyin)]/40 animate-pulse",
    thinkingLabel: "Kuan-Yin está pensando...",
    emptyState:
      "Estruture comigo o negócio, os serviços, a agenda, os clientes e os próximos passos.",
  },
};

const MessageBubble = memo(function MessageBubble({
  role,
  text,
  facetLabel,
  facetAvatarUrl,
  theme,
  userAvatarUrl,
  userInitial,
  userLabel,
  onSpeak,
  isSpeaking,
}: {
  role: "user" | "assistant";
  text: string;
  facetLabel: string;
  facetAvatarUrl: string;
  theme: FacetTheme;
  userAvatarUrl: string | null;
  userInitial: string;
  userLabel: string;
  onSpeak?: () => void;
  isSpeaking?: boolean;
}) {
  const mine = role === "user";

  if (mine) {
    return (
      <div className="flex justify-end items-start gap-2">
        <div className="flex flex-col items-end max-w-[85%] sm:max-w-[70%]">
          <div className="mb-1 flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-[color:var(--ivory-dim)]">
            <span>{userLabel}</span>
          </div>
          <div
            className="rounded-2xl px-4 py-3 text-[color:var(--ivory)]"
            style={{
              background: theme.userBg,
              border: `1px solid ${theme.userBorder}`,
              boxShadow: `inset 0 1px 0 ${theme.accentSoft}`,
            }}
          >
            <div className="prose prose-sm prose-invert max-w-none break-words">
              <LazyMarkdown>{text}</LazyMarkdown>
            </div>
          </div>
        </div>
        {userAvatarUrl ? (
          <img
            src={userAvatarUrl}
            alt=""
            className="mt-5 h-9 w-9 shrink-0 rounded-full border object-cover"
            style={{ borderColor: theme.userBorder }}
          />
        ) : (
          <div
            className="mt-5 grid h-9 w-9 shrink-0 place-items-center rounded-full border text-xs text-[color:var(--ivory)]"
            style={{
              background: theme.userAvatarBg,
              borderColor: theme.userBorder,
            }}
          >
            {userInitial}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex justify-start items-start gap-2">
      <img
        src={facetAvatarUrl}
        alt=""
        className="mt-5 h-9 w-9 shrink-0 rounded-full object-cover"
        style={{ border: `1px solid ${theme.chipBorder}` }}
      />
      <div className="flex max-w-[90%] flex-col items-start sm:max-w-[80%]">
        <div
          className="mb-1 flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase serif"
          style={{ color: theme.accentText }}
        >
          <span>{facetLabel}</span>
          {onSpeak && (
            <button
              type="button"
              onClick={onSpeak}
              className="transition"
              style={{ color: isSpeaking ? theme.accentText : "var(--ivory-dim)" }}
              aria-label={isSpeaking ? "Parar leitura" : "Ouvir mensagem"}
              title={isSpeaking ? "Parar leitura" : "Ouvir"}
            >
              {isSpeaking ? <Square className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
            </button>
          )}
        </div>
        <div
          className="rounded-2xl px-4 py-3"
          style={{
            background: theme.assistantBg,
            border: `1px solid ${theme.assistantBorder}`,
          }}
        >
          <div className="prose prose-sm prose-invert max-w-none break-words">
            <LazyMarkdown>{text}</LazyMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
});

function TypingDots({ label, color }: { label: string; color: string }) {
  return (
    <div
      className="flex items-center gap-2 text-xs"
      style={{ color: "var(--ivory-dim)" }}
      role="status"
      aria-live="polite"
    >
      <span className="inline-flex gap-1" aria-hidden>
        <span
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:-200ms]"
          style={{ color }}
        />
        <span
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:-100ms]"
          style={{ color }}
        />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" style={{ color }} />
      </span>
      <span className="italic">{label}</span>
    </div>
  );
}

function HistorySkeleton({ theme }: { theme: FacetTheme }) {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="flex justify-end">
        <div
          className="h-10 w-2/3 rounded-2xl"
          style={{ background: theme.userBg, border: `1px solid ${theme.userBorder}` }}
        />
      </div>
      <div className="flex justify-start">
        <div
          className="h-16 w-3/4 rounded-2xl"
          style={{ background: theme.assistantBg, border: `1px solid ${theme.assistantBorder}` }}
        />
      </div>
      <div className="flex justify-end">
        <div
          className="h-8 w-1/2 rounded-2xl"
          style={{ background: theme.userBg, border: `1px solid ${theme.userBorder}` }}
        />
      </div>
    </div>
  );
}

export interface ChatViewProps {
  threadId: string;
}

export function ChatView({ threadId }: ChatViewProps) {
  const search = useSearch({ strict: false });
  const seed = typeof search.seed === "string" ? search.seed : undefined;

  const [facet, setFacet] = useState<Facet>("kharis");
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const attachmentRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const seededRef = useRef(false);
  const tts = useTTS();

  useEffect(() => {
    seededRef.current = false;
    stickToBottomRef.current = true;
    void getLocalThread(threadId)
      .then(({ thread }) => setFacet((thread.facet as Facet) ?? "kharis"))
      .catch(() => setFacet("kharis"));
  }, [threadId]);

  const { messages, status, sendMessage } = useOfflineChat(threadId, facet);
  const initialMessages = messages;

  const isLoading = status === "loading" || status === "sending";
  const theme = FACET_THEMES[facet];

  // Propaga a cor da faceta ativa para o fundo ambiente da página (ver --facet-accent
  // em styles.css). Reseta ao desmontar para não "vazar" a cor ao navegar para fora do chat.
  useEffect(() => {
    document.body.style.setProperty("--facet-accent", theme.accent);
    return () => {
      document.body.style.removeProperty("--facet-accent");
    };
  }, [theme.accent]);

  useEffect(() => {
    if (!seed || seededRef.current || initialMessages === null) return;
    if (initialMessages.length > 0) {
      seededRef.current = true;
      return;
    }
    seededRef.current = true;
    void sendMessage(seed).catch((err) => {
      toast.error(err instanceof Error ? err.message : "Falha ao enviar mensagem.");
    });
  }, [initialMessages, seed, sendMessage]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distance < 80;
  }, []);

  useLayoutEffect(() => {
    if (!stickToBottomRef.current) return;
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [isLoading, messages]);

  useEffect(() => {
    composerRef.current?.focus();
  }, [initialMessages, threadId]);

  useLayoutEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  const { profile, avatarSignedUrl } = useProfile();
  const userLabel = profile?.display_name?.trim() || "Você";
  const userInitial = (userLabel[0] ?? "K").toUpperCase();
  function buildOutgoingText(baseText: string, list: Attachment[]) {
    const text = baseText.trim();
    const textBlocks = list.map((file) => `[Anexo de texto: ${file.name}]\n${file.content}`);
    return [text, ...textBlocks].filter(Boolean).join("\n\n");
  }

  // Envia texto + anexos numa tacada (usado pelo botão Enviar e pelo microfone).
  function enviar(baseText: string, list: Attachment[]) {
    const text = buildOutgoingText(baseText, list);
    if (!text || isLoading) return;
    stickToBottomRef.current = true;
    void sendMessage(text).catch((err) => {
      toast.error(err instanceof Error ? err.message : "Falha ao enviar mensagem.");
    });
    setInput("");
    setAttachments([]);
    requestAnimationFrame(() => composerRef.current?.focus());
  }

  function submitMessage() {
    enviar(input, attachments);
  }

  async function onPickAttachment(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const next: Attachment[] = [];
    for (const file of files.slice(0, 4)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} excede 10 MB.`);
        continue;
      }
      const isDocx = /\.docx$/i.test(file.name);
      try {
        if (isDocx) {
          const mammoth = await import("mammoth");
          const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
          next.push({ name: file.name, kind: "text", content: value });
        } else if (file.type === "text/plain" || /\.txt$/i.test(file.name)) {
          next.push({ name: file.name, kind: "text", content: await file.text() });
        } else {
          // Chat offline é texto-only (local-server `/chat` não tem pipeline de
          // visão/documentos). Imagem e PDF foram descartados; só Word/.txt,
          // já extraídos para texto no navegador.
          toast.error(`${file.name}: formato não aceito offline (use Word ou .txt).`);
        }
      } catch {
        toast.error(`Falha ao ler ${file.name}.`);
      }
    }
    setAttachments((prev) => [...prev, ...next].slice(0, 4));
    if (attachmentRef.current) attachmentRef.current.value = "";
  }

  useEffect(() => {
    if (status === "sending") setKittPulse("chat", "thinking");
    else setKittPulse("chat", null);
    return () => setKittPulse("chat", null);
  }, [status]);

  useEffect(() => {
    if (tts.error) toast.error(tts.error);
  }, [tts.error]);

  const kittState: KittState = useKittPulse("idle");

  const [micState, setMicState] = useState<"idle" | "recording" | "busy">("idle");
  // Espelha os anexos para leitura sempre atual dentro do callback do gravador.
  const attachmentsRef = useRef<Attachment[]>([]);
  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<Blob[]>([]);

  function quickReview(raw: string): string {
    let next = raw.trim().replace(/\s+/g, " ");
    if (!next) return next;
    next = next.charAt(0).toUpperCase() + next.slice(1);
    if (!/[.!?…]$/.test(next)) next += ".";
    return next;
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ["audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t));
      if (!mimeType) {
        stream.getTracks().forEach((track) => track.stop());
        toast.error("Navegador não suporta gravação em formato compatível.");
        return;
      }

      const rec = new MediaRecorder(stream, { mimeType });
      recChunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) recChunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(recChunksRef.current, { type: rec.mimeType });
        if (blob.size < 1024) {
          setMicState("idle");
          setKittPulse("voice", null);
          toast.error("Gravação muito curta — tente de novo.");
          return;
        }

        setMicState("busy");
        setKittPulse("voice", "transcribing");

        try {
          const ext =
            ({ "audio/webm": "webm", "audio/mp4": "mp4" } as Record<string, string>)[
              rec.mimeType.split(";")[0]
            ] ?? "webm";
          const file = new File([blob], `recording.${ext}`, { type: rec.mimeType });
          // Revisão por LLM era feita server-side (`revise=1`) no chat online;
          // o local-server só transcreve, então a revisão fica por conta de
          // `quickReview()` abaixo, client-side.
          const result = await transcribeLocalFile(file);
          if (!result.ok) throw new Error(result.message);
          const text = result.text.trim();
          setMicState("idle");
          if (text) {
            // Envia direto: combina o que já estava digitado com a transcrição.
            const digitado = (composerRef.current?.value ?? "").trim();
            const combinado = quickReview(digitado ? `${digitado} ${text}` : text);
            enviar(combinado, attachmentsRef.current);
          }
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Falha na transcrição.");
          setMicState("idle");
        } finally {
          setKittPulse("voice", null);
        }
      };

      recorderRef.current = rec;
      rec.start();
      setMicState("recording");
      setKittPulse("voice", "listening");
    } catch {
      toast.error("Acesso ao microfone negado.");
    }
  }

  function stopRecording() {
    const current = recorderRef.current;
    if (current && current.state !== "inactive") current.stop();
  }

  function micClick() {
    if (isLoading) return;
    if (micState === "idle") return void startRecording();
    if (micState === "recording") return stopRecording();
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scroll-smooth px-3 py-4 sm:px-4 sm:py-6"
      >
        <div className="mx-auto max-w-3xl space-y-4 sm:space-y-6">
          {initialMessages === null && <HistorySkeleton theme={theme} />}

          {initialMessages !== null && messages?.length === 0 && !isLoading && (
            <p className="mt-16 px-4 text-center text-sm text-[color:var(--ivory-dim)] sm:mt-20">
              {theme.emptyState}
            </p>
          )}

          {(messages ?? []).map((m) => {
            const isAssistant = m.role === "assistant";
            const { clean, actions } =
              isAssistant && facet === "kuanyin"
                ? extractActions(m.text)
                : { clean: m.text, actions: [] };

            return (
              <div key={m.id}>
                <MessageBubble
                  role={m.role as "user" | "assistant"}
                  text={clean}
                  facetLabel={theme.label}
                  facetAvatarUrl={theme.avatar}
                  theme={theme}
                  userAvatarUrl={avatarSignedUrl}
                  userInitial={userInitial}
                  userLabel={userLabel}
                  onSpeak={isAssistant && clean ? () => tts.speak(m.id, clean) : undefined}
                  isSpeaking={isAssistant && tts.speakingId === m.id}
                />
                {actions.map((action, index) => (
                  <KuanyinActionCard key={`${m.id}-action-${index}`} action={action} />
                ))}
              </div>
            );
          })}

          {status === "sending" && <TypingDots label={theme.thinkingLabel} color={theme.accent} />}
          <div ref={bottomRef} aria-hidden className="h-1" />
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitMessage();
        }}
        className="border-t bg-background/80 p-3 backdrop-blur sm:p-4"
        style={{
          borderColor: theme.chipBorder,
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="mx-auto max-w-3xl space-y-2">
          <div className="px-1">
            <KittScanner state={kittState} variant="ruby" height={18} />
          </div>
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 px-1">
              {attachments.map((file, index) => (
                <span
                  key={`${file.name}-${index}`}
                  className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border)] bg-card px-2 py-1 text-xs text-[color:var(--ivory-dim)]"
                >
                  Texto: {file.name}
                  <button
                    type="button"
                    onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== index))}
                    aria-label={`Remover ${file.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={attachmentRef}
              type="file"
              accept="text/plain,.txt,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              multiple
              hidden
              onChange={onPickAttachment}
            />
            <Button
              type="button"
              onClick={() => attachmentRef.current?.click()}
              disabled={isLoading}
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              aria-label="Anexar Word ou .txt"
              title="Anexar Word ou .txt"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              asChild
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              aria-label="Trilha de sedimentação"
              title="Trilha de sedimentação"
            >
              <Link to="/trilha/$threadId" params={{ threadId }}>
                <GitBranch className="h-4 w-4" />
              </Link>
            </Button>
            <textarea
              ref={composerRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submitMessage();
                }
              }}
              rows={1}
              placeholder={
                micState === "recording"
                  ? "Gravando… toque no microfone para enviar."
                  : micState === "busy"
                    ? "Transcrevendo…"
                    : "Digite sua mensagem... (Shift+Enter quebra linha)"
              }
              className="max-h-[200px] flex-1 resize-none rounded-xl bg-card px-4 py-3 text-base leading-snug outline-none"
              style={{
                border: `1px solid ${theme.chipBorder}`,
                boxShadow: theme.composerRing,
              }}
            />

            <Button
              type="button"
              onClick={micClick}
              disabled={isLoading || micState === "busy"}
              variant="outline"
              size="icon"
              className={`h-10 w-10 shrink-0 ${micState === "recording" ? theme.micRecordingClass : ""}`}
              aria-label={micState === "recording" ? "Parar e enviar (ditado)" : "Ditar mensagem"}
              title={micState === "recording" ? "Parar e enviar (ditado)" : "Ditar mensagem"}
            >
              {micState === "busy" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>

            <Button
              type="submit"
              disabled={isLoading || (!input.trim() && attachments.length === 0)}
              size="icon"
              className={`h-10 w-10 shrink-0 ${theme.sendClass}`}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
