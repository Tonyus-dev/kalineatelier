// Portal Instalador da Kaline Offline — Worker público.
//
// Este Worker só entrega arquivos públicos: o HTML do portal e os bootstraps
// de instalação, todos importados como texto puro (sem Static Assets — ver
// nota abaixo) de public/ e install/*.
//
// O Worker NUNCA instala nada, nunca executa nada no computador do usuário e
// nunca se comunica com a Kaline local (127.0.0.1:64113). Não recebe nem lê
// tokens, áudio, banco de dados ou chaves.
import portalHtml from "../public/index.html";
import linuxMintSh from "../install/kaline-installer-linux-mint.sh";
import linuxMintDesktop from "../install/kaline-installer-linux-mint.desktop";
import windowsBat from "../install/kaline-installer-windows.bat";
import windowsPs1 from "../install/kaline-installer-windows.ps1";

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
  async fetch(request: Request): Promise<Response> {
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

    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(portalHtml, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=60",
        },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};
