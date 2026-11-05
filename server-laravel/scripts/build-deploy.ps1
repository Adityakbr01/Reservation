[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $ProjectRoot

$SevenZip = 'C:\Program Files\7-Zip\7z.exe'
$ZipName = 'server-laravel-deploy.zip'
$ZipPath = Join-Path $ProjectRoot $ZipName
$RootZipPath = Join-Path (Split-Path -Parent $ProjectRoot) $ZipName
$DistDir = Join-Path $ProjectRoot 'dist'

Write-Host ''
Write-Host '==> Packaging Laravel for cPanel...' -ForegroundColor Cyan

# 1. Clean previous build files & junk
if (Test-Path -LiteralPath $ZipPath) { Remove-Item -LiteralPath $ZipPath -Force }
if (Test-Path -LiteralPath $RootZipPath) { Remove-Item -LiteralPath $RootZipPath -Force }
if (Test-Path -LiteralPath (Join-Path $ProjectRoot '.build')) { 
    Remove-Item -LiteralPath (Join-Path $ProjectRoot '.build') -Recurse -Force -ErrorAction SilentlyContinue 
}
if (-not (Test-Path -LiteralPath $DistDir)) { 
    New-Item -ItemType Directory -Path $DistDir -Force | Out-Null 
}

# 2. Exclude dev files, tests, env, logs, and dev vendor packages
$excludeArgs = @(
    '-xr!.git',
    '-xr!node_modules',
    '-xr!tests',
    '-xr!.env.example',
    '-xr!.env.testing',
    '-xr!.build',
    '-xr!dist',
    '-xr!.vscode',
    '-xr!.phpunit.cache',
    '-xr!storage/logs/*.log',
    '-xr!storage/framework/cache/data/*',
    '-xr!storage/framework/sessions/*',
    '-xr!storage/framework/views/*',
    '-xr!scripts',
    '-xr!docs',
    '-xr!vendor/phpunit',
    '-xr!vendor/laravel/pint',
    '-xr!vendor/fakerphp',
    '-xr!vendor/mockery',
    '-xr!vendor/laravel/sail',
    '-xr!vendor/nunomaduro/collision',
    '-xr!vendor/laravel/pail'
)

Write-Host "==> Creating $ZipName..." -ForegroundColor Yellow

if (Test-Path -LiteralPath $SevenZip) {
    & $SevenZip a -tzip -mx=3 -mmt=on -y $ZipPath . @excludeArgs | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "7-Zip failed with exit code $LASTEXITCODE"
    }
} else {
    Write-Host '7-Zip not found; using fallback Compress-Archive...' -ForegroundColor Yellow
    $stageDir = Join-Path $env:TEMP "laravel-stage-$(Get-Random)"
    New-Item -ItemType Directory -Path $stageDir -Force | Out-Null
    try {
        & robocopy $ProjectRoot $stageDir /E /XD .git node_modules tests .build dist .vscode .phpunit.cache scripts docs storage\logs vendor\phpunit vendor\laravel\pint vendor\fakerphp vendor\mockery /XF .env .env.* *.log | Out-Null
        Compress-Archive -Path "$stageDir\*" -DestinationPath $ZipPath -Force
    } finally {
        Remove-Item -LiteralPath $stageDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# Copy convenience copies
Copy-Item -LiteralPath $ZipPath -Destination $RootZipPath -Force
Copy-Item -LiteralPath $ZipPath -Destination (Join-Path $DistDir $ZipName) -Force

$zipSizeMb = [math]::Round((Get-Item -LiteralPath $ZipPath).Length / 1MB, 2)

Write-Host ''
Write-Host '====================================================' -ForegroundColor Green
Write-Host ' BUILD SUCCESSFUL - READY FOR GODADDY CPANEL' -ForegroundColor Green
Write-Host '====================================================' -ForegroundColor Green
Write-Host "ZIP File: $ZipPath ($zipSizeMb MB)" -ForegroundColor White
Write-Host "Root ZIP: $RootZipPath" -ForegroundColor White
Write-Host ''
Write-Host 'Upload server-laravel-deploy.zip to cPanel and Extract.' -ForegroundColor Cyan
Write-Host ''
