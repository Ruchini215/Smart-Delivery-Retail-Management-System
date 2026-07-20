@echo off
title HarvestLanka Server Launcher
echo ======================================================
echo          HARVESTLANKA - SMART RETAIL SYSTEM           
echo ======================================================
echo.
echo Starting the database and Flask web server...
echo.

:: Run the Flask server in the background using the local virtual environment
start "" "%~dp0venv\Scripts\python.exe" app.py

:: Wait 3 seconds for the server to load
timeout /t 3 /nobreak >nul

echo.
echo Opening HarvestLanka in your web browser...
echo.

:: Automatically open the default browser to the web address
start "" "http://127.0.0.1:5000"

echo ======================================================
echo Server is running! 
echo.
echo IMPORTANT: Keep this black window open while using
echo the website. Close this window when you want to stop.
echo ======================================================
echo.
pause
