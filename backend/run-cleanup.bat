@echo off
cd /d "E:\CODE\pharmaconnect\backend"
echo Running APOTEKH cleanup script... > cleanup-output.log 2>&1
npm run db:cleanup >> cleanup-output.log 2>&1
echo. >> cleanup-output.log
echo Exit code: %ERRORLEVEL% >> cleanup-output.log
echo Done >> cleanup-output.log
