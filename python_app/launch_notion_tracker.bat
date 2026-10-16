@echo off
REM Starts the Notion job tracker (if not already running) and opens it in Chrome.
set PORT=8501
curl -s -o nul http://localhost:%PORT% && goto open

start "Notion Tracker server" /min cmd /c "call C:\Users\marvi\miniconda3\Scripts\activate.bat aijob && cd /d D:\JobApplication\python_app && streamlit run notion_tracker.py --server.port %PORT% --server.headless true"

:wait
timeout /t 1 /nobreak >nul
curl -s -o nul http://localhost:%PORT% || goto wait

:open
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" http://localhost:%PORT%
