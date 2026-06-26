import { createFileRoute } from "@tanstack/react-router";
import { AcervoPage } from "./jurisprudencia";

import { RouteErrorBoundary, RouteNotFoundBoundary } from "@/components/loading-states";

export const Route = createFileRoute("/_authenticated/legislacao")({
  component: () => <AcervoPage modo="legislacao" />,
  errorComponent: RouteErrorBoundary,
  notFoundComponent: () => <RouteNotFoundBoundary />,
});
