import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listLocalThreads,
  createLocalThread,
  listLocalMessages,
  sendLocalChatMessage,
} from "@/lib/local/local-api-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AtelierMessage, AtelierThread } from "./types";

const FACET = "kaline" as const;

export function AtelierChat({ disabled }: { disabled: boolean }) {
  const queryClient = useQueryClient();
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const threadsQuery = useQuery({
    queryKey: ["atelier", "threads"],
    queryFn: async () => (await listLocalThreads()).threads as AtelierThread[],
    enabled: !disabled,
  });

  const messagesQuery = useQuery({
    queryKey: ["atelier", "messages", activeThreadId],
    queryFn: async () => (await listLocalMessages(activeThreadId!)).messages as AtelierMessage[],
    enabled: !disabled && !!activeThreadId,
  });

  const createThread = useMutation({
    mutationFn: () => createLocalThread({ facet: FACET }),
    onSuccess: (res) => {
      const thread = res.thread as AtelierThread;
      setActiveThreadId(thread.id);
      queryClient.invalidateQueries({ queryKey: ["atelier", "threads"] });
    },
  });

  const sendMessage = useMutation({
    mutationFn: () =>
      sendLocalChatMessage({ threadId: activeThreadId ?? undefined, message: draft, facet: FACET }),
    onSuccess: (res) => {
      const thread = res.thread as AtelierThread;
      setActiveThreadId(thread.id);
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["atelier", "threads"] });
      queryClient.invalidateQueries({ queryKey: ["atelier", "messages", thread.id] });
    },
  });

  const threads = threadsQuery.data ?? [];
  const messages = messagesQuery.data ?? [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="text-sm">Conversas — Chat Kaline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            size="sm"
            className="w-full"
            disabled={disabled || createThread.isPending}
            onClick={() => createThread.mutate()}
          >
            Nova thread
          </Button>
          <div className="space-y-1 max-h-72 overflow-auto">
            {threads.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveThreadId(t.id)}
                className={`w-full text-left text-sm rounded px-2 py-1 hover:bg-muted ${
                  activeThreadId === t.id ? "bg-muted" : ""
                }`}
              >
                {t.title}
              </button>
            ))}
            {threads.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhuma thread ainda.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm">Conversa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 max-h-72 overflow-auto">
            {messages.map((m) => (
              <div key={m.id} className="text-sm">
                <span className="font-medium">{m.role}:</span> {m.content}
              </div>
            ))}
            {activeThreadId && messages.length === 0 && (
              <p className="text-xs text-muted-foreground">Sem mensagens ainda.</p>
            )}
          </div>
          <Textarea
            placeholder="Escreva uma mensagem…"
            value={draft}
            disabled={disabled}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button
            disabled={disabled || !draft.trim() || sendMessage.isPending}
            onClick={() => sendMessage.mutate()}
          >
            Enviar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
