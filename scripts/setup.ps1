$ErrorActionPreference = 'Stop'

$repo       = 'betahuhn/mailpal'
$latestRelease = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/latest"
if (-not $latestRelease.tag_name) {
    throw 'Failed to resolve latest MailPal release tag.'
}
$setupTsUrl = "https://raw.githubusercontent.com/$repo/$($latestRelease.tag_name)/scripts/setup.ts"

# ── Ensure Bun is available ───────────────────────────────────────────────────

if (Get-Command bun -ErrorAction SilentlyContinue) {
    $bunBin = (Get-Command bun -ErrorAction SilentlyContinue).Source
} else {
    Write-Host "Bun not found, installing..."
    powershell -Command "irm bun.sh/install.ps1 | iex"

    $bunCommand = Get-Command bun -ErrorAction SilentlyContinue
    if ($bunCommand) {
        $bunBin = $bunCommand.Source
    } else {
        $bunInstallRoot = if ($env:BUN_INSTALL) { $env:BUN_INSTALL } else { Join-Path $env:USERPROFILE '.bun' }
        $bunBin = Join-Path $bunInstallRoot 'bin\bun.exe'
    }
}

if (-not (Test-Path $bunBin)) {
    throw 'Bun installation was not detected. Please ensure Bun is installed and available in PATH or BUN_INSTALL.'
}

# ── Download and run setup script ─────────────────────────────────────────────

$setupTs = Join-Path $env:TEMP ([System.IO.Path]::GetRandomFileName() + '.ts')
try {
    Invoke-WebRequest -Uri $setupTsUrl -OutFile $setupTs
    & $bunBin run $setupTs @args
} finally {
    Remove-Item $setupTs -ErrorAction SilentlyContinue
}
