# PharmaConnect Database Setup Script (PowerShell)
# Run from PowerShell as Administrator or enter postgres password when prompted

$PGBIN = "C:\Program Files\PostgreSQL\18\bin"
$PGPORT = "5433"
$PGPASSWORD_ENV = Read-Host "Enter postgres superuser password" -AsSecureString
$PGPASSWORD_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($PGPASSWORD_ENV)
)

$env:PGPASSWORD = $PGPASSWORD_PLAIN

Write-Host "=== PharmaConnect Database Setup ===" -ForegroundColor Green

# Create user
Write-Host "`nCreating user 'pharmaconnect'..." -ForegroundColor Yellow
& "$PGBIN\psql.exe" -U postgres -p $PGPORT -w -c "CREATE USER pharmaconnect WITH PASSWORD 'password';" 2>&1

# Create database
Write-Host "Creating database 'pharmaconnect'..." -ForegroundColor Yellow
& "$PGBIN\psql.exe" -U postgres -p $PGPORT -w -c "CREATE DATABASE pharmaconnect OWNER pharmaconnect;" 2>&1

# Grant privileges
Write-Host "Granting privileges..." -ForegroundColor Yellow
& "$PGBIN\psql.exe" -U postgres -p $PGPORT -w -c "GRANT ALL PRIVILEGES ON DATABASE pharmaconnect TO pharmaconnect;" 2>&1

$env:PGPASSWORD = ""

Write-Host "`nDatabase setup complete!" -ForegroundColor Green
Write-Host "`nNext steps:"
Write-Host "  cd pharmaconnect\backend"
Write-Host "  npx prisma migrate dev --name init"
Write-Host "  npm run db:seed"
Write-Host "  npm run dev"
Write-Host "`n  (in another terminal)"
Write-Host "  cd pharmaconnect\frontend"
Write-Host "  npm run dev"
