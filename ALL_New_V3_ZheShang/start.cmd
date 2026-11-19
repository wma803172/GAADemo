@echo off
setlocal
chcp 65001 >nul
title Intel 18A
cd /d "%~dp0"
set "PAGE=http://127.0.0.1:8132/v3.2.html"
curl.exe --noproxy "*" --fail --silent --max-time 1 "%PAGE%" >nul 2>nul && goto open
set "NODE_EXE=node"
where node >nul 2>nul
if errorlevel 1 set "NODE_EXE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
if not "%NODE_EXE%"=="node" if not exist "%NODE_EXE%" (
  echo 需要 Node.js 18 或更新版本。
  pause
  exit /b 1
)
start "" /b "%NODE_EXE%" tools\serve.mjs . 8132
set "STARTED_HERE=1"
for /l %%N in (1,1,12) do (
  curl.exe --noproxy "*" --fail --silent --max-time 1 "%PAGE%" >nul 2>nul && goto open
  timeout /t 1 /nobreak >nul
)
echo 无法在本机 8132 端口启动预览。
pause
exit /b 1

:open
start "" "%PAGE%"
if defined STARTED_HERE (
  echo 展示期间请保持此窗口打开。
  pause >nul
)
