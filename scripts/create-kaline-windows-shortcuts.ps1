# Cria os atalhos da Kaline Offline na Área de Trabalho e no Menu Iniciar (Windows).
# Não exige administrador. Não remove atalhos de terceiros — só cria/atualiza os 5
# atalhos da Kaline.
#
# Uso: powershell -File create-kaline-windows-shortcuts.ps1

function Ok($msg)   { Write-Host "[OK] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "[Atenção] $msg" -ForegroundColor Yellow }

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

function Find-Icon {
    $preferred = Join-Path $RootDir "public\ka-apple.png"
    if (Test-Path $preferred) { return $preferred }
    $dirs = @("public", "src\assets", "assets", "docs") | ForEach-Object { Join-Path $RootDir $_ }
    $terms = @("kaline", "apple", "maca", "maçã", "logo", "icon", "wordmark")
    $exts = @("png", "ico", "webp", "svg")
    foreach ($d in $dirs) {
        if (-not (Test-Path $d)) { continue }
        foreach ($term in $terms) {
            foreach ($ext in $exts) {
                $match = Get-ChildItem -Path $d -Recurse -Depth 2 -Filter "*$term*.$ext" -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($match) { return $match.FullName }
            }
        }
    }
    return $null
}

$IconPath = Find-Icon
if (-not $IconPath) {
    Warn "Ícone da maçã não encontrado; atalhos usarão o ícone padrão do PowerShell."
}

$DesktopDir = Join-Path $env:USERPROFILE "Desktop"
$StartMenuDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Kaline"
New-Item -ItemType Directory -Force -Path $StartMenuDir | Out-Null

$WshShell = New-Object -ComObject WScript.Shell

function New-KalineShortcut($name, $targetScript, $args) {
    foreach ($dir in @($DesktopDir, $StartMenuDir)) {
        $path = Join-Path $dir "$name.lnk"
        $shortcut = $WshShell.CreateShortcut($path)
        $shortcut.TargetPath = "powershell.exe"
        $shortcut.Arguments = "-ExecutionPolicy Bypass -File `"$targetScript`" $args"
        $shortcut.WorkingDirectory = $RootDir
        if ($IconPath) { $shortcut.IconLocation = $IconPath }
        $shortcut.Save()
    }
    Ok "Atalho criado: $name"
}

New-KalineShortcut "Kaline Offline" (Join-Path $ScriptDir "start-kaline-windows.ps1") "-Open main"
New-KalineShortcut "Kaline Janelinha" (Join-Path $ScriptDir "start-kaline-windows.ps1") "-Open janelinha"
New-KalineShortcut "Instalar-Atualizar Kaline" (Join-Path $ScriptDir "install-kaline-windows.ps1") ""
New-KalineShortcut "Verificar Kaline" (Join-Path $ScriptDir "check-kaline-windows.ps1") ""
New-KalineShortcut "Parar Kaline" (Join-Path $ScriptDir "stop-kaline-windows.ps1") ""

Ok "Atalhos criados em: $DesktopDir e $StartMenuDir"
