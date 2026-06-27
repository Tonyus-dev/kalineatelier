// Garante que exista exatamente uma thread por faceta (Kaline Offline,
// sem multiusuário — não há mais `user_id`/Supabase).
import { listLocalThreads, createLocalThread } from "@/lib/local/local-api-client";

export type ChatFacet = "kaline" | "kharis" | "kuanyin";

const TITLES: Record<ChatFacet, string> = {
  kaline: "Kaline",
  kharis: "Kháris",
  kuanyin: "Kuan-Yin · comercial",
};

export async function ensureThread(facet: ChatFacet): Promise<string | null> {
  const { threads } = await listLocalThreads();
  const existing = threads
    .filter((t) => t.facet === facet && !t.archived_at)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  if (existing) return existing.id;
  const { thread } = await createLocalThread({ facet, title: TITLES[facet] });
  return thread?.id ?? null;
}
