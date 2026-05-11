$ErrorActionPreference = 'Stop'

$repo       = 'betahuhn/mailpal'
$setupTsUrl = "https://raw.githubusercontent.com/$repo/main/scripts/setup.ts"

# ── Ensure Bun is available ───────────────────────────────────────────────────

if (Get-Command bun -ErrorAction SilentlyContinue) {
    $bunBin = 'bun'
} else {
    Write-Host "Bun not found, installing..."
    powershell -Command "irm bun.sh/install.ps1 | iex"
    $bunBin = Join-Path $env:USERPROFILE '.bun\bin\bun.exe'
}

# ── Download and run setup script ─────────────────────────────────────────────

$setupTs = Join-Path $env:TEMP ([System.IO.Path]::GetRandomFileName() + '.ts')
try {
    Invoke-WebRequest -Uri $setupTsUrl -OutFile $setupTs
    & $bunBin run $setupTs @args
} finally {
    Remove-Item $setupTs -ErrorAction SilentlyContinue
}
