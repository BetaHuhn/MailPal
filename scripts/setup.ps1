$ErrorActionPreference = 'Stop'

$repo   = 'betahuhn/mailpal'
$binary = 'mailpal-setup-windows-x64.exe'
$url    = "https://github.com/$repo/releases/latest/download/$binary"

Write-Host "Downloading $binary..."

$dest = Join-Path $env:TEMP ([System.IO.Path]::GetRandomFileName() + '.exe')
Invoke-WebRequest -Uri $url -OutFile $dest

try {
    & $dest @args
} finally {
    Remove-Item $dest -ErrorAction SilentlyContinue
}
