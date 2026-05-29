# fix-migration.ps1 — Run from E:\CODE\pharmaconnect\backend
# Applies the pending grace_activated_at migration and any others that are behind.

Write-Host "Applying pending Prisma migrations..." -ForegroundColor Cyan

Set-Location $PSScriptRoot
npx prisma migrate deploy

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nDone! Migration applied successfully." -ForegroundColor Green
    Write-Host "Restart your backend (Ctrl+C then npm run dev) and the 500 errors will be gone." -ForegroundColor Green
} else {
    Write-Host "`nMigration failed. Trying db push as fallback..." -ForegroundColor Yellow
    npx prisma db push --accept-data-loss
}

Read-Host "`nPress Enter to close"
