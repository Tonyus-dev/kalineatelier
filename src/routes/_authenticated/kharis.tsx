import { createFileRoute } from "@tanstack/react-router";
import { ensureThread } from "@/lib/ensure-thread";
import { ChatView } from "@/components/ChatView";
import { RouteErrorBoundary, RouteNotFoundBoundary } from "@/components/loading-states";

export const Route = createFileRoute("/_authenticated/kharis")({
  loader: async () => {
    const id = await ensureThread("kharis");
    return { threadId: id };
  },
  component: KharisChatPage,
  errorComponent: RouteErrorBoundary,
  notFoundComponent: () => <RouteNotFoundBoundary />,
});

function KharisChatPage() {
  const { threadId } = Route.useLoaderData();

  if (!threadId) {
    return (
      <div className="p-8 text-center text-[color:var(--ivory-dim)]">
        Iniciando conversa de cuidado...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <ChatView threadId={threadId} />
    </div>
  );
}
