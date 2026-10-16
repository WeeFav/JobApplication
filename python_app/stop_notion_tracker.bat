@echo off
REM Stops the Notion job tracker server (whatever is listening on port 8501).
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8501 " ^| findstr LISTENING') do taskkill /PID %%p /F /T
