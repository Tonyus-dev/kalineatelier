# Instalação — Kaline Offline v0.1

Guia para baixar e rodar a Kaline Offline localmente. Não precisa de servidor remoto,
não precisa de conta paga e por padrão não consome créditos de IA (provider `mock`).

## Requisitos

- [Node.js](https://nodejs.org) 20 ou superior (para o `local-server`).
- [bun](https://bun.sh) (para o frontend).
- Git (para baixar o repositório) — ou apenas baixar o `.zip` do repositório.
- ~200 MB livres para dependências (`node_modules` do frontend e do `local-server`).

Opcional, apenas se quiser IA real:

- [Ollama](https://ollama.com) com os modelos `qwen3.5:0.8b` e `qwen2.5:0.5b` para
  texto/resumo/visão, **e/ou**
- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) com o modelo `ggml-small.bin`
  para transcrição de áudio, **e/ou**
- uma chave de API da [OpenRouter](https://openrouter.ai).

Nenhum dos três é necessário para abrir e usar a Kaline Offline no modo padrão (mock).

## 1. Baixar o repositório

```bash
git clone <url-do-repositorio> kalineatelier
cd kalineatelier
```

(Ou baixe o `.zip` pelo GitHub e extraia.)

## 2. Copiar os arquivos de ambiente

```bash
cp .env.example .env
cp local-server/.env.example local-server/.env
```

Os valores padrão já são seguros para uso local: provider `mock`, túnel desativado,
servidor local em `127.0.0.1`. Não é necessário editar nada para o primeiro uso.

## 3. Instalar dependências

```bash
# frontend (raiz)
bun install

# local-server
cd local-server
npm install
cd ..
```

## 4. Rodar o `local-server`

```bash
cd local-server
npm run dev
```

Servidor esperado em `http://127.0.0.1:64113`. Deixe este terminal aberto.

## 5. Rodar o frontend

Em outro terminal, na raiz do projeto:

```bash
bun run dev
```

A URL exata aparece no terminal (normalmente `http://localhost:5173`). Abra:

```txt
http://localhost:5173/atelier
```

## 6. Parar os servidores

Pressione `Ctrl+C` em cada terminal aberto (frontend e `local-server`).

## Atalho com scripts

Em vez dos passos 3–5 manuais, você pode usar os scripts em `scripts/`:

- **Windows**: dê duplo clique ou execute `scripts\start-kaline-windows.bat`.
- **Linux/macOS**: `bash scripts/start-kaline-linux.sh`.

Antes de rodar, você também pode checar o ambiente:

```bash
node scripts/check-local-env.js
```

## Instruções por sistema

### Windows

1. Instale Node.js e bun (sites acima).
2. Abra um terminal (PowerShell ou cmd) na pasta do projeto.
3. Execute `scripts\start-kaline-windows.bat` — ele abre duas janelas (local-server e
   frontend) e mostra a URL final.
4. Se preferir manual, abra duas janelas de terminal e rode os comandos dos passos 4 e 5
   acima, uma em cada janela.

### Linux Mint / Ubuntu

1. Instale Node.js (`sudo apt install nodejs npm` ou via [nvm](https://github.com/nvm-sh/nvm))
   e bun (`curl -fsSL https://bun.sh/install | bash`).
2. Rode `bash scripts/start-kaline-linux.sh` na raiz do projeto, ou siga os passos manuais
   acima em dois terminais.

### macOS

Mesmos passos do Linux. `brew install node` e `curl -fsSL https://bun.sh/install | bash`
funcionam normalmente. O script `scripts/start-kaline-linux.sh` também funciona no macOS.

## Próximo passo

Depois de abrir `/atelier`, veja [`MODELS_LOCAL.md`](./MODELS_LOCAL.md) para entender as
opções de IA (mock, Ollama + Qwen3.5 4B, whisper.cpp + ggml-small, OpenRouter) e
[`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) caso algo não funcione. A aba Configurações
do Atelier mostra o status real de cada motor e permite testar texto, imagem e áudio.
