$ErrorActionPreference = 'Stop'

$repo   = 'betahuhn/mailpal'
$binary = 'mailpal-setup-windows-x64.exe'
$baseUrl = "https://github.com/$repo/releases/latest/download"
$url     = "$baseUrl/$binary"

Write-Host "Downloading $binary..."

$dest = Join-Path $env:TEMP ([System.IO.Path]::GetRandomFileName() + '.exe')
$checksums = Join-Path $env:TEMP ([System.IO.Path]::GetRandomFileName() + '.txt')
Invoke-WebRequest -Uri $url -OutFile $dest
Invoke-WebRequest -Uri "$baseUrl/mailpal-setup-checksums.txt" -OutFile $checksums

Write-Host "Verifying checksum..."

$expected = $null
foreach ($line in Get-Content -Path $checksums) {
    if ($line -match [regex]::Escape($binary)) {
        $parts = $line -split '\s+'
        if ($parts.Count -gt 0) {
            $expected = $parts[0].Trim()
            break
        }
    }
}

if (-not $expected) {
    throw "Checksum for $binary not found in checksums file."
}

$actual = (Get-FileHash -Path $dest -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actual -ne $expected.ToLowerInvariant()) {
    throw "Checksum mismatch for $binary! Expected: $expected Actual: $actual"
}

try {
    & $dest @args
} finally {
    Remove-Item $dest -ErrorAction SilentlyContinue
    Remove-Item $checksums -ErrorAction SilentlyContinue
}
