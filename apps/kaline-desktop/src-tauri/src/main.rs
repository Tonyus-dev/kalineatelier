// Kaline Desktop — casca nativa fina sobre a Kaline Offline (PWA).
//
// Não tem frontend próprio: só abre janelas que carregam rotas da Kaline Offline já
// em execução (local-server + PWA), seguindo o contrato de dois lançadores definido
// no plano de PR 2:
//   - `kaline-desktop`             -> janela normal com o app completo.
//   - `kaline-desktop --janelinha` -> janela pequena, sem decoração, always-on-top,
//     carregando a rota `/janelinha` (já implementada e testável como rota web no PR 1).
//
// A URL base é configurável via env `KALINE_DESKTOP_APP_URL` (default
// `http://127.0.0.1:4173`, a porta padrão de `vite preview`). Nunca embute lógica de
// chat/voz/transcrição em Rust — tudo isso já existe na PWA e no local-server.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{WebviewUrl, WebviewWindowBuilder};

const DEFAULT_APP_URL: &str = "http://127.0.0.1:4173";

fn app_base_url() -> String {
    std::env::var("KALINE_DESKTOP_APP_URL").unwrap_or_else(|_| DEFAULT_APP_URL.to_string())
}

fn main() {
    let janelinha = std::env::args().any(|arg| arg == "--janelinha");

    tauri::Builder::default()
        .setup(move |app| {
            let base = app_base_url();
            let base = base.trim_end_matches('/');

            if janelinha {
                let url = format!("{base}/janelinha");
                WebviewWindowBuilder::new(
                    app,
                    "janelinha",
                    WebviewUrl::External(url.parse().expect("KALINE_DESKTOP_APP_URL inválida")),
                )
                .title("Kaline")
                .inner_size(320.0, 480.0)
                .resizable(false)
                .decorations(false)
                .always_on_top(true)
                .skip_taskbar(true)
                .build()?;
            } else {
                let url = format!("{base}/chat");
                WebviewWindowBuilder::new(
                    app,
                    "main",
                    WebviewUrl::External(url.parse().expect("KALINE_DESKTOP_APP_URL inválida")),
                )
                .title("K∧LINE")
                .inner_size(1200.0, 800.0)
                .build()?;
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Kaline Desktop");
}
