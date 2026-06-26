@echo off
REM Inicia a Kaline Offline localmente (Windows). Nao fecha imediatamente em
REM caso de erro, para que a pessoa consiga ler a mensagem.

setlocal
cd /d "%~dp0\.."

echo == Kaline Offline - inicializacao local ==

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado. Instale em https://nodejs.org e rode este script novamente.
  pause
  exit /b 1
)
echo [OK] Node encontrado.

where bun >nul 2>nul
if errorlevel 1 (
  echo [ERRO] bun nao encontrado. Instale em https://bun.sh e rode este script novamente.
  pause
  exit /b 1
)
echo [OK] bun encontrado.

if not exist "local-server\.env" (
  echo [INFO] local-server\.env nao existe. Copiando de local-server\.env.example...
  copy "local-server\.env.example" "local-server\.env" >nul
)

if not exist "local-server\node_modules" (
  echo [INFO] Instalando dependencias do local-server ^(npm install^)...
  pushd local-server
  call npm install
  popd
)

if not exist "node_modules" (
  echo [INFO] Instalando dependencias do frontend ^(bun install^)...
  call bun install
)

echo.
echo == Abrindo o local-server em uma nova janela ^(http://127.0.0.1:4517^) ==
start "Kaline Local Server" cmd /k "cd /d "%cd%\local-server" && npm run dev"

echo == Abrindo o frontend em uma nova janela ^(URL real aparece no terminal^) ==
start "Kaline Frontend" cmd /k "cd /d "%cd%" && bun run dev"

echo.
echo Duas janelas foram abertas: local-server e frontend.
echo Depois que o frontend terminar de iniciar, acesse algo como:
echo   http://localhost:5173/atelier
echo.
echo Para parar a Kaline, feche as duas janelas abertas.
echo.
pause
