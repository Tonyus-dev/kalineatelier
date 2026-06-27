@echo off
REM Duplo clique aqui roda o bootstrap publico da Kaline Offline (localiza ou
REM clona o repositorio e chama o instalador real em scripts\install-kaline-windows.ps1).
REM Chama o PowerShell de forma segura, sem alterar a politica de execucao do sistema.
powershell -ExecutionPolicy Bypass -File "%~dp0kaline-installer-windows.ps1"
pause
