@echo off
REM ============================================================
REM  CSyD Parque - Arranque del molinete en modo kiosco
REM  1) levanta el server local (npm start)
REM  2) espera a que responda
REM  3) abre el navegador en pantalla completa en molinete.html
REM  Pensado para correr solo al iniciar Windows (ver docs/setup-kiosco.md)
REM ============================================================
title CSyD Parque - Molinete
cd /d "%~dp0"

echo Iniciando servidor del molinete...
start "CSyD Molinete Server" /min cmd /c "npm start"

echo Esperando a que el servidor responda en localhost:3000 ...
:wait
timeout /t 2 /nobreak >nul
curl -s -o nul http://localhost:3000/api/health
if errorlevel 1 goto wait

echo Servidor listo. Abriendo molinete en pantalla completa...

REM Buscar Chrome en las rutas habituales; si no esta, usar Edge
set "CHROME="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if defined CHROME (
  start "" "%CHROME%" --kiosk --incognito --noerrdialogs --disable-pinch --overscroll-history-navigation=0 "http://localhost:3000/molinete.html"
) else (
  start "" msedge --kiosk "http://localhost:3000/molinete.html" --edge-kiosk-type=fullscreen --no-first-run
)

exit
