@echo off
REM ===================================================================
REM  CafeOS ML Service - start script
REM
REM  Double-click this file (or run it from a terminal) BEFORE starting
REM  the Next.js app with `npm run dev`.
REM
REM  The service listens on http://127.0.0.1:8000
REM  Check it is alive at  http://127.0.0.1:8000/health
REM  Interactive API docs  http://127.0.0.1:8000/docs
REM ===================================================================

cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo [setup] Creating virtual environment...
    python -m venv .venv
    echo [setup] Installing dependencies...
    .venv\Scripts\python.exe -m pip install --upgrade pip
    .venv\Scripts\python.exe -m pip install -r requirements.txt
)

if not exist "models\demand_forecaster.joblib" (
    echo [setup] Trained models not found. Generating data and training...
    .venv\Scripts\python.exe generate_dataset.py
    .venv\Scripts\python.exe train_models.py
)

echo.
echo ===================================================================
echo  CafeOS ML Service starting on http://127.0.0.1:8000
echo  Leave this window OPEN while demonstrating the application.
echo ===================================================================
echo.

.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
