/**
 * Tipagem das variáveis de ambiente da Kaline Offline expostas ao frontend pelo Vite.
 *
 * O projeto não tinha um `vite-env.d.ts` próprio (usa apenas `types: ["vite/client"]`),
 * então esta augmentação acrescenta — sem sobrescrever — as envs do modo local.
 * Ambas são opcionais: a ausência cai nos defaults seguros (modo "online").
 */

interface ImportMetaEnv {
  readonly VITE_KALINE_RUNTIME_MODE?: "online" | "offline";
  readonly VITE_KALINE_LOCAL_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
