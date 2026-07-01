param(
  [Parameter(Mandatory = $true)]
  [string]$FrontendApiUrl,

  [string]$BackendReadyUrl = "",

  [switch]$SkipPrismaGenerate,

  [switch]$SkipWebsite
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][scriptblock]$Body
  )

  Write-Host ""
  Write-Host "== $Name ==" -ForegroundColor Cyan
  & $Body
}

function Invoke-Npm {
  param(
    [Parameter(Mandatory = $true)][string]$WorkingDirectory,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )

  Push-Location $WorkingDirectory
  try {
    & npm.cmd @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "npm $($Arguments -join ' ') failed in $WorkingDirectory"
    }
  } finally {
    Pop-Location
  }
}

if (-not $SkipPrismaGenerate) {
  Invoke-Step "Backend Prisma generate" {
    Invoke-Npm (Join-Path $root "backend") @("run", "db:generate")
  }
}

Invoke-Step "Dependency security audit" {
  Invoke-Npm (Join-Path $root "backend") @("audit", "--audit-level=high")
  Invoke-Npm (Join-Path $root "frontend") @("audit", "--audit-level=high")
}

Invoke-Step "Backend build" {
  Invoke-Npm (Join-Path $root "backend") @("run", "build")
}

Invoke-Step "Backend pre-deployment tests" {
  Invoke-Npm (Join-Path $root "backend") @("exec", "vitest", "run", "tests/predeployment-hardening.test.ts", "tests/cors.test.ts", "--coverage=false")
}

Invoke-Step "Frontend typecheck" {
  Invoke-Npm (Join-Path $root "frontend") @("run", "typecheck")
}

Invoke-Step "Frontend production build" {
  $previous = $env:VITE_API_URL
  $env:VITE_API_URL = $FrontendApiUrl
  try {
    Invoke-Npm (Join-Path $root "frontend") @("run", "build")
  } finally {
    if ($null -eq $previous) {
      Remove-Item Env:\VITE_API_URL -ErrorAction SilentlyContinue
    } else {
      $env:VITE_API_URL = $previous
    }
  }
}

if (-not $SkipWebsite) {
  Invoke-Step "Website build" {
    Invoke-Npm (Join-Path $root "website") @("run", "build")
  }
}

if ($BackendReadyUrl.Trim().Length -gt 0) {
  Invoke-Step "Backend readiness probe" {
    $response = Invoke-RestMethod -Uri $BackendReadyUrl -Method Get -TimeoutSec 10
    if ($response.status -ne "ready" -or $response.checks.database -ne "ok") {
      throw "Backend is not ready: $($response | ConvertTo-Json -Compress)"
    }
    Write-Host "Backend ready: $($response | ConvertTo-Json -Compress)" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "Pre-deployment checks passed." -ForegroundColor Green
