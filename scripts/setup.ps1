$ErrorActionPreference = 'Stop'

$repo       = 'betahuhn/mailpal'
$setupAssetName = 'mailpal-setup.ts'
$checksumAssetName = 'mailpal-setup-checksums.txt'

if ($env:MAILPAL_RELEASE_TAG) {
    $releaseTag = $env:MAILPAL_RELEASE_TAG
} else {
    try {
        $latestRelease = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/latest"
    } catch {
        throw "Failed to fetch latest MailPal release metadata from GitHub: $($_.Exception.Message)"
    }

    if (-not $latestRelease.tag_name) {
        throw 'Failed to resolve latest MailPal release tag.'
    }

    $releaseTag = $latestRelease.tag_name
}
$setupTsUrl = "https://github.com/$repo/releases/download/$releaseTag/$setupAssetName"
$setupChecksumsUrl = "https://github.com/$repo/releases/download/$releaseTag/$checksumAssetName"

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
$null = & $bunBin --version

# ── Download and run setup script ─────────────────────────────────────────────

$setupTs = Join-Path $env:TEMP ([System.IO.Path]::GetRandomFileName() + '.ts')
$setupChecksums = Join-Path $env:TEMP ([System.IO.Path]::GetRandomFileName() + '.txt')
try {
    try {
        Invoke-WebRequest -Uri $setupTsUrl -OutFile $setupTs
        Invoke-WebRequest -Uri $setupChecksumsUrl -OutFile $setupChecksums
    } catch {
        throw "Failed to download setup release assets. If this release predates setup assets, set MAILPAL_RELEASE_TAG to a release that includes them. Original error: $($_.Exception.Message)"
    }

    $escapedSetupAssetName = [regex]::Escape($setupAssetName)
    $expectedHashLine = Select-String -Path $setupChecksums -Pattern "^[a-fA-F0-9]{64}\s+$escapedSetupAssetName$" | Select-Object -First 1
    if (-not $expectedHashLine) {
        throw "Failed to find checksum for $setupAssetName in $checksumAssetName."
    }

    $expectedHash = ($expectedHashLine.Line -split '\s+')[0].ToLowerInvariant()
    $actualHash = (Get-FileHash -Path $setupTs -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($expectedHash -ne $actualHash) {
        throw "Checksum verification failed for $setupAssetName."
    }

    & $bunBin run $setupTs @args
} finally {
    Remove-Item $setupTs -ErrorAction SilentlyContinue
    Remove-Item $setupChecksums -ErrorAction SilentlyContinue
}
