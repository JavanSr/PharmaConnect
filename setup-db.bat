@echo off
REM PharmaConnect Database Setup Script
REM Run this as Administrator or with your postgres password ready

SET PGBIN=C:\Program Files\PostgreSQL\18\bin
SET PGPORT=5433

echo === PharmaConnect Database Setup ===
echo.
echo This script will create the 'pharmaconnect' user and database.
echo You will be prompted for the postgres superuser password.
echo.

REM Create user
echo Creating user 'pharmaconnect'...
"%PGBIN%\psql.exe" -U postgres -p %PGPORT% -c "CREATE USER pharmaconnect WITH PASSWORD 'password';"

REM Create database
echo Creating database 'pharmaconnect'...
"%PGBIN%\psql.exe" -U postgres -p %PGPORT% -c "CREATE DATABASE pharmaconnect OWNER pharmaconnect;"

REM Grant privileges
echo Granting privileges...
"%PGBIN%\psql.exe" -U postgres -p %PGPORT% -c "GRANT ALL PRIVILEGES ON DATABASE pharmaconnect TO pharmaconnect;"

echo.
echo Database setup complete!
echo.
echo Next steps:
echo   cd backend
echo   npx prisma migrate dev --name init
echo   npm run db:seed
echo.
pause
