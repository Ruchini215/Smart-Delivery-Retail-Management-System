@echo off
title Ceylex Project Setup
echo ======================================================
echo        Setting up the Ceylex Smart Retail System
echo ======================================================
echo.
echo Please wait while we install the required components...
echo (This will create a virtual environment and install Flask)
echo.

:: Check if Python is installed
python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python is not installed on this computer!
    echo Please install Python from https://www.python.org/downloads/
    echo Make sure to check the box "Add Python to PATH" during installation.
    echo.
    pause
    exit /b
)

:: Create virtual environment if it doesn't exist
IF NOT EXIST "venv\Scripts\python.exe" (
    echo Creating virtual environment...
    python -m venv venv
)

:: Install requirements
echo.
echo Installing dependencies (Flask, python-dotenv)...
"%~dp0venv\Scripts\pip.exe" install -r requirements.txt

echo.
echo ======================================================
echo Setup Complete! 
echo You can now double-click "Run_HarvestLanka.bat" to start the website!
echo ======================================================
echo.
pause
