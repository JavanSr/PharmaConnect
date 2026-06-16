Set-Location "E:\CODE\pharmaconnect\backend"
$output = npm run db:cleanup 2>&1
$output | Out-File -FilePath "E:\CODE\pharmaconnect\backend\cleanup-output.log" -Encoding utf8
Write-Host "Done. Exit code: $LASTEXITCODE"
