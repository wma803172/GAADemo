@echo off
chcp 65001 >nul
title Intel 18A - Silicon Atlas
cd /d "%~dp0"
echo.
echo   Intel 18A . 从一颗开关到一台电脑
echo   ---------------------------------
echo   本地预览地址: http://127.0.0.1:8123
echo   关掉这个窗口即停止服务。
echo.
set NODE_EXE=node
where node >nul 2>nul
if errorlevel 1 (
  if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
    set NODE_EXE=%LOCALAPPDATA%\Programs\nodejs\node.exe
  ) else (
    echo [x] 没有找到 Node.js。请先安装 https://nodejs.org 后再双击本文件。
    pause
    exit /b 1
  )
)
start "" cmd /c "timeout /t 2 >nul & start \"\" http://127.0.0.1:8123"
%NODE_EXE% tools\serve.mjs . 8123
pause