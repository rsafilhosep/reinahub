@echo off
setlocal

cd /d "%~dp0"

echo ========================================
echo ReinaHub - servidor local
echo ========================================
echo.
echo Abrindo em http://localhost:3000
echo Use Ctrl+F5 no navegador para atualizar sem cache.
echo.

echo Liberando porta 3000 se ja estiver em uso...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
  taskkill /PID %%a /F >nul 2>nul
)
echo.

if not exist "node_modules\.bin\next.cmd" (
  echo Dependencias nao encontradas.
  echo Rode primeiro: pnpm install
  pause
  exit /b 1
)

echo Limpando cache do Next...
if exist ".next" rmdir /s /q ".next"
echo.

echo Sincronizando Game Assets...
node scripts\sync-game-assets.mjs
echo.

start "" "http://localhost:3000/cotacao"
call "node_modules\.bin\next.cmd" dev -p 3000

pause
