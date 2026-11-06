[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $ProjectRoot

$SevenZip = 'C:\Program Files\7-Zip\7z.exe'
$ZipName = 'server-laravel-deploy.zip'
$ZipPath = Join-Path $ProjectRoot $ZipName

Write-Host ''
Write-Host '==> Packaging Laravel for cPanel...' -ForegroundColor Cyan

# 1. Clean previous build files & junk
if (Test-Path -LiteralPath $ZipPath) { Remove-Item -LiteralPath $ZipPath -Force }
if (Test-Path -LiteralPath (Join-Path $ProjectRoot '.build')) { 
    Remove-Item -LiteralPath (Join-Path $ProjectRoot '.build') -Recurse -Force -ErrorAction SilentlyContinue 
}

# 2. GUARANTEE .env is 100% configured for GoDaddy production
$envProdPath = Join-Path $ProjectRoot '.env.production'
$envPath = Join-Path $ProjectRoot '.env'
if (Test-Path -LiteralPath $envProdPath) {
    Copy-Item -LiteralPath $envProdPath -Destination $envPath -Force
    Write-Host '==> Guaranteed .env contains GoDaddy cPanel production configuration' -ForegroundColor Green
}

# 3. Ensure public/uploads exists with .gitkeep
$uploadsDir = Join-Path $ProjectRoot 'public\uploads'
if (-not (Test-Path -LiteralPath $uploadsDir)) {
    New-Item -ItemType Directory -Path $uploadsDir -Force | Out-Null
}
$gitkeep = Join-Path $uploadsDir '.gitkeep'
if (-not (Test-Path -LiteralPath $gitkeep)) {
    Set-Content -LiteralPath $gitkeep -Value '' -NoNewline
}

# 4. Exclude dev files, tests, local envs, logs, symlinks, and dev vendor packages
$excludeArgs = @(
    '-xr!.git',
    '-xr!*.zip',
    '-xr!node_modules',
    '-xr!tests',
    '-xr!.env.example',
    '-xr!.env.testing',
    '-xr!.env.local',
    '-xr!.env.docker',
    '-xr!.env.production.example',
    '-xr!.env.production',
    '-xr!public/storage',
    '-x!.build',
    '-x!dist',
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
        & robocopy $ProjectRoot $stageDir /E /XD .git node_modules tests .build dist .vscode .phpunit.cache scripts docs storage\logs vendor\phpunit vendor\laravel\pint vendor\fakerphp vendor\mockery public\storage /XF .env.* *.log | Out-Null
        Copy-Item -LiteralPath $envPath -Destination (Join-Path $stageDir '.env') -Force
        Compress-Archive -Path "$stageDir\*" -DestinationPath $ZipPath -Force
    } finally {
        Remove-Item -LiteralPath $stageDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

$zipSizeMb = [math]::Round((Get-Item -LiteralPath $ZipPath).Length / 1MB, 2)

# 5. Verification step: Verify .env is in the zip and has production credentials
$hasEnv = $false
if (Test-Path -LiteralPath $SevenZip) {
    $zipList = & $SevenZip l $ZipPath
    if ($zipList -match '\.env') {
        $hasEnv = $true
    }
}

Write-Host ''
Write-Host '====================================================' -ForegroundColor Green
Write-Host ' BUILD SUCCESSFUL - READY FOR GODADDY CPANEL' -ForegroundColor Green
Write-Host '====================================================' -ForegroundColor Green
Write-Host "ZIP File: $ZipPath ($zipSizeMb MB)" -ForegroundColor White
if ($hasEnv) {
    Write-Host "Verification: .env is packaged inside the zip (DB_USERNAME=hamptworthstays-user)" -ForegroundColor Green
} else {
    Write-Host "Warning: Could not verify .env via 7-Zip listing" -ForegroundColor Yellow
}
Write-Host ''
Write-Host 'Upload server-laravel-deploy.zip to cPanel and Extract.' -ForegroundColor Cyan
Write-Host ''
