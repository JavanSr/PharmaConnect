param(
  [string]$FrontendApiUrl = "",
  [switch]$SkipWebsite,
  [switch]$SkipPrismaGenerate,
  [switch]$SkipPrismaStatus,
  [switch]$ClearBuildCaches
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

function Remove-CacheDirectory {
  param([Parameter(Mandatory = $true)][string]$RelativePath)

  $candidate = Join-Path $root $RelativePath
  if (-not (Test-Path $candidate)) {
    Write-Host "Cache not present: $RelativePath"
    return
  }

  $resolved = Resolve-Path $candidate
  $rootText = $root.Path.TrimEnd('\')
  if (-not $resolved.Path.StartsWith($rootText, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to remove path outside workspace: $($resolved.Path)"
  }

  Write-Host "Removing cache: $($resolved.Path)"
  Remove-Item -LiteralPath $resolved.Path -Recurse -Force
}

Invoke-Step "Git parity with origin" {
  Push-Location $root
  try {
    & git fetch origin
    if ($LASTEXITCODE -ne 0) { throw "git fetch origin failed" }

    $branch = (& git branch --show-current).Trim()
    $upstream = (& git rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2>$null).Trim()
    Write-Host "Branch: $branch"

    if ($upstream.Length -eq 0) {
      Write-Host "No upstream configured for this branch." -ForegroundColor Yellow
    } else {
      Write-Host "Upstream: $upstream"
      $counts = (& git rev-list --left-right --count "HEAD...$upstream").Trim() -split "\s+"
      $ahead = [int]$counts[0]
      $behind = [int]$counts[1]
      Write-Host "Ahead: $ahead commit(s), behind: $behind commit(s)"
      if ($behind -gt 0) {
        Write-Host "Local branch is behind upstream. Pull only after reviewing the working tree." -ForegroundColor Yellow
      }
    }

    $changes = (& git status --short)
    if ($changes.Count -gt 0) {
      Write-Host "Working tree has local changes. These are not deployed until committed and pushed:" -ForegroundColor Yellow
      $changes | ForEach-Object { Write-Host "  $_" }
    } else {
      Write-Host "Working tree is clean."
    }
  } finally {
    Pop-Location
  }
}

Invoke-Step "Running local node servers" {
  $workspace = $root.Path
  $processes = Get-CimInstance Win32_Process -Filter "name = 'node.exe'" |
    Where-Object {
      $commandLine = if ($null -eq $_.CommandLine) { "" } else { $_.CommandLine }
      $commandLine.Contains($workspace)
    } |
    Select-Object ProcessId, CommandLine

  if (-not $processes -or $processes.Count -eq 0) {
    Write-Host "No node servers from this workspace are running."
  } else {
    foreach ($process in $processes) {
      Write-Host "PID $($process.ProcessId): $($process.CommandLine)"
      $commandLine = if ($null -eq $process.CommandLine) { "" } else { $process.CommandLine }
      if ($commandLine -match "vite.*preview|run preview") {
        Write-Host "  Warning: Vite preview serves the last built dist. Rebuild before trusting it for local parity." -ForegroundColor Yellow
      }
    }
  }
}

Invoke-Step "Frontend parity environment" {
  $envFile = Join-Path $root "frontend\.env"
  if (-not (Test-Path $envFile)) {
    Write-Host "No frontend/.env file found."
  } else {
    $envText = Get-Content $envFile -Raw
    if ($envText -match "(?m)^\s*VITE_SHOW_DEMO_ACCOUNTS\s*=\s*true\s*$") {
      Write-Host "VITE_SHOW_DEMO_ACCOUNTS=true is enabled. Local login will not match production." -ForegroundColor Yellow
    } else {
      Write-Host "Demo accounts are disabled for local parity."
    }
  }
}

if ($ClearBuildCaches) {
  Invoke-Step "Clear local build caches" {
    Remove-CacheDirectory "frontend\node_modules\.vite"
    Remove-CacheDirectory "frontend\dist"
    Remove-CacheDirectory "website\.next"
  }
}

if (-not $SkipPrismaGenerate) {
  Invoke-Step "Backend Prisma generate" {
    try {
      Invoke-Npm (Join-Path $root "backend") @("run", "db:generate")
    } catch {
      Write-Host "Prisma generate failed. If this is EPERM on query_engine-windows.dll.node, stop running backend/node processes and rerun, or use -SkipPrismaGenerate after Prisma client is already current." -ForegroundColor Yellow
      throw
    }
  }
}

if (-not $SkipPrismaStatus) {
  Invoke-Step "Backend Prisma migration status" {
    Push-Location (Join-Path $root "backend")
    try {
      & npx.cmd prisma migrate status
      if ($LASTEXITCODE -ne 0) {
        throw "Prisma migration status failed. Check DATABASE_URL and local database state."
      }
    } finally {
      Pop-Location
    }
  }
}

Invoke-Step "Backend build" {
  Invoke-Npm (Join-Path $root "backend") @("run", "build")
}

Invoke-Step "Frontend typecheck" {
  Invoke-Npm (Join-Path $root "frontend") @("run", "typecheck")
}

if ($FrontendApiUrl.Trim().Length -gt 0) {
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
} else {
  Write-Host ""
  Write-Host "== Frontend production build ==" -ForegroundColor Cyan
  Write-Host "Skipped. Pass -FrontendApiUrl https://your-backend/api/v1 to verify the deployed-build configuration." -ForegroundColor Yellow
}

if (-not $SkipWebsite) {
  Invoke-Step "Website build" {
    Invoke-Npm (Join-Path $root "website") @("run", "build")
  }
}

Write-Host ""
Write-Host "Local parity check completed." -ForegroundColor Green
