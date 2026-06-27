// Hook de chat offline: substitui `useChat`/`DefaultChatTransport` (que apontavam
// para `/api/chat`, streaming via OpenRouter + Supabase) por um fluxo simples
// contra o `local-server`, que não é streaming — a resposta chega de uma vez.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getLocalThread,
  listLocalMessages,
  sendLocalChatMessage,
  type LocalChatMessage,
} from "@/lib/local/local-api-client";
import { buildOfflineSystemPrompt, type ChatFacet } from "@/lib/chat-system-prompt";
import { readPresencaNota } from "@/lib/use-presenca-regime";

export type OfflineChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

export type OfflineChatStatus = "idle" | "loading" | "sending" | "error";

function toOfflineMessage(m: LocalChatMessage): OfflineChatMessage {
  return { id: m.id, role: m.role === "assistant" ? "assistant" : "user", text: m.content };
}

export function useOfflineChat(threadId: string, facet: ChatFacet) {
  const [messages, setMessages] = useState<OfflineChatMessage[] | null>(null);
  const [status, setStatus] = useState<OfflineChatStatus>("idle");
  const facetRef = useRef(facet);
  facetRef.current = facet;

  useEffect(() => {
    setMessages(null);
    setStatus("loading");
    let cancelled = false;
    void (async () => {
      try {
        await getLocalThread(threadId).catch(() => null);
        const { messages: rows } = await listLocalMessages(threadId);
        if (cancelled) return;
        setMessages(rows.filter((m) => m.role !== "system").map(toOfflineMessage));
        setStatus("idle");
      } catch {
        if (cancelled) return;
        setMessages([]);
        setStatus("idle");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setStatus("sending");
      const optimisticId = `local-${Date.now()}`;
      setMessages((prev) => [...(prev ?? []), { id: optimisticId, role: "user", text: trimmed }]);
      try {
        const nota = await readPresencaNota();
        const system = await buildOfflineSystemPrompt(facetRef.current, nota);
        const { userMessage, assistantMessage } = await sendLocalChatMessage({
          threadId,
          message: trimmed,
          facet: facetRef.current,
          system,
        });
        setMessages((prev) => [
          ...(prev ?? []).filter((m) => m.id !== optimisticId),
          toOfflineMessage(userMessage),
          toOfflineMessage(assistantMessage),
        ]);
        setStatus("idle");
      } catch (err) {
        setMessages((prev) => (prev ?? []).filter((m) => m.id !== optimisticId));
        setStatus("error");
        throw err;
      }
    },
    [threadId],
  );

  return { messages, status, sendMessage };
}
