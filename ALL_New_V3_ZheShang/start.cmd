@echo off
setlocal
chcp 65001 >nul
title Intel 18A
cd /d "%~dp0"
set "PAGE=http://localhost:8124/V4.html"
curl.exe --noproxy "*" --fail --silent --max-time 1 "%PAGE%" >nul 2>nul && goto open
set "NODE_EXE=node"
where node >nul 2>nul
if errorlevel 1 set "NODE_EXE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
if not "%NODE_EXE%"=="node" if not exist "%NODE_EXE%" (
  echo Install Node.js 18 or newer to launch the exhibit.
  pause
  exit /b 1
)
start "" /b "%NODE_EXE%" tools\serve.mjs . 8124
set "OWNS_SERVER=1"
for /l %%N in (1,1,12) do (
  curl.exe --noproxy "*" --fail --silent --max-time 1 "%PAGE%" >nul 2>nul && goto open
  timeout /t 1 /nobreak >nul
)
echo Cannot open the exhibit on port 8124.
pause
exit /b 1

:open
start "" "%PAGE%"
if defined OWNS_SERVER (
  echo Keep this window open while viewing the exhibit.
  pause >nul
)
