// Service worker mínimo da Kaline Offline (PWA).
//
// Objetivo: habilitar instalabilidade e um shell offline básico, sem ser agressivo.
// - Só intercepta GET de mesma origem. NUNCA toca a API local (127.0.0.1:64113) nem
//   qualquer chamada cross-origin — essas seguem direto pela rede.
// - Estratégia network-first com fallback ao cache (nada de servir dados velhos da API).
const CACHE = "kaline-shell-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches
          .open(CACHE)
          .then((c) => c.put(req, copy))
          .catch(() => {});
        return res;
      })
      .catch(() => caches.match(req)),
  );
});
