@echo off
echo ============================================
echo   UBMS - Starting Server
echo ============================================
echo.

:: Start MySQL if not running
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe">NUL
if "%ERRORLEVEL%"=="1" (
    echo Starting MySQL Server...
    start "" /B "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe" --basedir="C:\Program Files\MySQL\MySQL Server 8.4" --datadir="C:\mysql-data" --port=3306
    timeout /t 5 /nobreak >NUL
    echo MySQL started.
) else (
    echo MySQL already running.
)

:: Start UBMS Node.js server
echo Starting UBMS Backend...
cd /d "c:\Users\Administrator\Desktop\DK-Unified-Business-System-Platform\Unified-Business-System-Platform\ubms-backend"
"C:\Program Files\nodejs\node.exe" app.js
