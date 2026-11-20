@echo off
setlocal
chcp 65001 >nul
title Intel 18A - V4_Zhehao
set "NODE_EXE=node"
where node >nul 2>&1
if not errorlevel 1 goto preview
set "NODE_EXE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
if exist "%NODE_EXE%" goto preview

echo 正在打开 V4_Zhehao 离线演示。
start "" "%~dp0index.html"
exit /b

:preview
echo V4_Zhehao 本机预览。关闭窗口即可停止服务。
"%NODE_EXE%" "%~dp0tools\serve.mjs" "%~dp0." 8124 --open
if errorlevel 1 pause
