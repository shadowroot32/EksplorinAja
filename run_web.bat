@echo off
title Cendekia.ai - Open-Source AI Learning Workspace
cd /d "%~dp0"
echo ========================================================
echo    CENDEKIA.AI - OPEN-SOURCE AI LEARNING WORKSPACE
echo ========================================================
echo Membuka server di http://localhost:8000 ...
echo Tekan CTRL+C untuk menghentikan server.
echo.
start "" "http://localhost:8000"
python app.py
pause
