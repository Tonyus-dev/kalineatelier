// Portal Instalador da Kaline Offline — Worker público.
//
// Este Worker só entrega arquivos públicos: o HTML do portal (via Static
// Assets, em public/) e os bootstraps de instalação (importados como texto
// puro de install/*, sem duplicar o conteúdo em public/install/*).
//
// O Worker NUNCA instala nada, nunca executa nada no computador do usuário e
// nunca se comunica com a Kaline local (127.0.0.1:64113). Não recebe nem lê
// tokens, áudio, banco de dados ou chaves.
import linuxMintSh from "../install/kaline-installer-linux-mint.sh";
import linuxMintDesktop from "../install/kaline-installer-linux-mint.desktop";
import windowsBat from "../install/kaline-installer-windows.bat";
import windowsPs1 from "../install/kaline-installer-windows.ps1";

export interface Env {
  ASSETS: Fetcher;
}

interface BootstrapRoute {
  body: string;
  filename: string;
  contentType: string;
}

const BOOTSTRAP_ROUTES: Record<string, BootstrapRoute> = {
  "/install/linux-mint.sh": {
    body: linuxMintSh,
    filename: "kaline-installer-linux-mint.sh",
    contentType: "text/x-shellscript; charset=utf-8",
  },
  "/install/linux-mint.desktop": {
    body: linuxMintDesktop,
    filename: "kaline-installer-linux-mint.desktop",
    contentType: "application/x-desktop; charset=utf-8",
  },
  "/install/windows.bat": {
    body: windowsBat,
    filename: "kaline-installer-windows.bat",
    contentType: "text/plain; charset=utf-8",
  },
  "/install/windows.ps1": {
    body: windowsPs1,
    filename: "kaline-installer-windows.ps1",
    contentType: "text/plain; charset=utf-8",
  },
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        service: "kaline-installer-worker",
        mode: "public-installer-portal",
      });
    }

    const route = BOOTSTRAP_ROUTES[url.pathname];
    if (route) {
      return new Response(route.body, {
        headers: {
          "content-type": route.contentType,
          "content-disposition": `attachment; filename="${route.filename}"`,
          "cache-control": "public, max-age=60",
        },
      });
    }

    // Tudo o mais (incluindo "/" → public/index.html) é resolvido pelos
    // Static Assets do Worker.
    return env.ASSETS.fetch(request);
  },
};
