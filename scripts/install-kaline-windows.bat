@echo off
REM Duplo clique aqui instala/atualiza a Kaline Offline neste Windows.
REM Chama o PowerShell de forma segura (sem alterar a política de execução do sistema).
powershell -ExecutionPolicy Bypass -File "%~dp0install-kaline-windows.ps1"
pause
