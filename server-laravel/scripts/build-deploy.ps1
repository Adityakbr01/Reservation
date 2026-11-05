[CmdletBinding()]
param(
    [switch]$SkipTests,
    [switch]$SkipPint,
    [switch]$KeepBuild,
    [string]$OutputDirectory = ''
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $ProjectRoot

$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$BuildRoot = Join-Path $ProjectRoot '.build'
$Stage = Join-Path $BuildRoot "laravel-production-$Timestamp"
$TestRoot = Join-Path $BuildRoot "deployment-test-$Timestamp"
$DistDir = if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
    Join-Path $ProjectRoot 'dist'
}
else {
    [System.IO.Path]::GetFullPath($OutputDirectory)
}
$ZipName = "laravel-production-$Timestamp.zip"
$ZipPath = Join-Path $DistDir $ZipName
$ReportPath = Join-Path $DistDir "laravel-production-$Timestamp-report.txt"
$DeploymentDocPath = Join-Path $DistDir 'DEPLOYMENT.md'
$VendorCache = Join-Path $env:TEMP 'laravel-deploy-vendor-cache'
$SevenZip = 'C:\Program Files\7-Zip\7z.exe'

$script:Checks = New-Object 'System.Collections.Generic.List[object]'

function Write-Step {
    param([string]$Text)

    Write-Host ''
    Write-Host "==> $Text" -ForegroundColor Cyan
}

function Add-Check {
    param(
        [string]$Name,
        [string]$Status,
        [string]$Details
    )

    $script:Checks.Add([pscustomobject]@{
            Name    = $Name
            Status  = $Status
            Details = $Details
        }) | Out-Null

    $color = switch ($Status) {
        'PASS' { 'Green' }
        'WARN' { 'Yellow' }
        default { 'Red' }
    }
    Write-Host ("[{0}] {1}: {2}" -f $Status, $Name, $Details) -ForegroundColor $color
}

function Assert-True {
    param(
        [bool]$Condition,
        [string]$Message
    )

    if (-not $Condition) {
        throw $Message
    }
}

function Invoke-Native {
    param(
        [string]$FilePath,
        [string[]]$Arguments,
        [string]$LogPath
    )

    $previousErrorAction = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $output = & $FilePath @Arguments 2>&1
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousErrorAction
    }

    if ($LogPath) {
        $output | Set-Content -LiteralPath $LogPath -Encoding UTF8
    }
    return [pscustomobject]@{
        ExitCode = $exitCode
        Output   = $output
        Text     = ($output | Out-String).Trim()
    }
}

function Find-Composer {
    $candidates = @(
        (Join-Path $env:USERPROFILE '.config\herd-lite\bin\composer.phar'),
        (Join-Path $env:USERPROFILE 'AppData\Local\Microsoft\WinGet\Packages\PHP.PHP.8.4_Microsoft.Winget.Source_8wekyb3d8bbwe\composer.phar'),
        'C:\ProgramData\ComposerSetup\bin\composer.phar',
        (Join-Path $ProjectRoot 'composer.phar')
    )

    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate) {
            return [pscustomobject]@{
                Path = $candidate
                IsPhar = $true
            }
        }
    }

    $command = Get-Command composer -ErrorAction SilentlyContinue
    if ($command) {
        return [pscustomobject]@{
            Path = $command.Source
            IsPhar = $false
        }
    }

    return $null
}

function Read-DotEnv {
    param([string]$Path)

    $result = @{}
    if (-not (Test-Path -LiteralPath $Path)) {
        return $result
    }

    foreach ($line in Get-Content -LiteralPath $Path) {
        $trimmed = $line.Trim()
        if ($trimmed -eq '' -or $trimmed.StartsWith('#')) {
            continue
        }

        $separator = $trimmed.IndexOf('=')
        if ($separator -lt 1) {
            continue
        }

        $key = $trimmed.Substring(0, $separator).Trim()
        $value = $trimmed.Substring($separator + 1).Trim()
        if ($value.Length -ge 2) {
            if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
                $value = $value.Substring(1, $value.Length - 2)
            }
        }
        $result[$key] = $value
    }

    return $result
}

function Get-FreePort {
    foreach ($port in 8125..8160) {
        $listener = $null
        try {
            $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $port)
            $listener.Start()
            $listener.Stop()
            return $port
        }
        catch {
            if ($listener) {
                try { $listener.Stop() } catch { }
            }
        }
    }

    throw 'No free local port found for the deployment smoke test.'
}

function Invoke-HttpCheck {
    param(
        [string]$Method,
        [string]$Url,
        [string]$Body = $null
    )

    $client = New-Object System.Net.Http.HttpClient
    $client.Timeout = [TimeSpan]::FromSeconds(20)
    try {
        if ($Method -eq 'POST' -and $null -ne $Body) {
            $content = New-Object System.Net.Http.StringContent($Body, [System.Text.Encoding]::UTF8, 'application/json')
            $response = $client.PostAsync($Url, $content).Result
        }
        else {
            $response = $client.GetAsync($Url).Result
        }

        return [pscustomobject]@{
            Status = [int]$response.StatusCode
            Body   = $response.Content.ReadAsStringAsync().Result
        }
    }
    finally {
        $client.Dispose()
    }
}

function Convert-JsonSafe {
    param([string]$Text)

    try {
        return ($Text | ConvertFrom-Json)
    }
    catch {
        return $null
    }
}

$Composer = Find-Composer
$PHP = $null
$phpCommand = Get-Command php -ErrorAction SilentlyContinue
if ($phpCommand) {
    $PHP = $phpCommand.Source
}

$LocalEnv = Read-DotEnv (Join-Path $ProjectRoot '.env')
$ProductionEnv = Read-DotEnv (Join-Path $ProjectRoot '.env.production')
$LockHash = ''

try {
    Write-Host 'Laravel production build' -ForegroundColor White
    Write-Host "Project: $ProjectRoot" -ForegroundColor DarkGray
    Write-Host "Time:    $Timestamp" -ForegroundColor DarkGray

    Write-Step 'Preflight checks'

    if (Test-Path -LiteralPath $BuildRoot) {
        Remove-Item -LiteralPath $BuildRoot -Recurse -Force
    }
    New-Item -ItemType Directory -Path $BuildRoot -Force | Out-Null
    New-Item -ItemType Directory -Path $DistDir -Force | Out-Null

    Assert-True ($null -ne $PHP) 'PHP is not available on PATH.'
    Assert-True ($null -ne $Composer) 'Composer was not found.'
    Assert-True (Test-Path (Join-Path $ProjectRoot 'artisan')) 'artisan is missing.'
    Assert-True (Test-Path (Join-Path $ProjectRoot 'composer.lock')) 'composer.lock is missing.'
    Assert-True (Test-Path (Join-Path $ProjectRoot '.env.production.example')) '.env.production.example is missing.'
    Assert-True (Test-Path (Join-Path $ProjectRoot 'vendor\bin\phpunit')) 'PHPUnit is missing. Run composer install including require-dev.'
    Assert-True (Test-Path (Join-Path $ProjectRoot 'vendor\bin\pint')) 'Pint is missing. Run composer install including require-dev.'

    $phpVersionResult = Invoke-Native -FilePath $PHP -Arguments @('-r', 'echo PHP_VERSION;')
    Assert-True ($phpVersionResult.ExitCode -eq 0) 'Unable to determine the PHP version.'
    $phpVersion = $phpVersionResult.Text.Trim()
    Assert-True ([version]$phpVersion -ge [version]'8.2.0') "PHP $phpVersion is below Laravel's required PHP 8.2."
    Add-Check 'PHP' 'PASS' $phpVersion

    $extensions = @((Invoke-Native -FilePath $PHP -Arguments @('-m')).Output | ForEach-Object { $_.Trim().ToLowerInvariant() })
    $requiredExtensions = @('ctype', 'curl', 'dom', 'fileinfo', 'filter', 'hash', 'mbstring', 'openssl', 'pcre', 'pdo', 'pdo_mysql', 'session', 'tokenizer', 'xml')
    $missingExtensions = @($requiredExtensions | Where-Object { $extensions -notcontains $_ })
    Assert-True ($missingExtensions.Count -eq 0) ("Missing PHP extensions: " + ($missingExtensions -join ', '))
    Add-Check 'PHP extensions' 'PASS' ($requiredExtensions -join ', ')

    $composerVersionResult = if ($Composer.IsPhar) {
        Invoke-Native -FilePath $PHP -Arguments @($Composer.Path, '--version')
    }
    else {
        Invoke-Native -FilePath $Composer.Path -Arguments @('--version')
    }
    Assert-True ($composerVersionResult.ExitCode -eq 0) 'Composer is not executable.'
    Add-Check 'Composer' 'PASS' $composerVersionResult.Text

    $LockHash = (Get-FileHash -LiteralPath (Join-Path $ProjectRoot 'composer.lock') -Algorithm SHA256).Hash
    $template = Get-Content -LiteralPath (Join-Path $ProjectRoot '.env.production.example') -Raw
    foreach ($requiredSetting in @('APP_ENV=production', 'APP_DEBUG=false', 'QUEUE_CONNECTION=sync', 'MEDIA_DISK=public', 'JWT_SECRET=')) {
        Assert-True ($template.Contains($requiredSetting)) "Production env template is missing: $requiredSetting"
    }
    Add-Check 'Production env template' 'PASS' '.env.production.example validated'

    Write-Step 'Running PHPUnit test suite'
    if ($SkipTests) {
        Add-Check 'PHPUnit' 'WARN' 'Skipped by -SkipTests'
        Write-Host 'Skipped by -SkipTests' -ForegroundColor Yellow
    }
    else {
        $testLog = Join-Path $BuildRoot 'phpunit.log'
        $testResult = Invoke-Native -FilePath $PHP -Arguments @('vendor/bin/phpunit', '--colors=never') -LogPath $testLog
        $testResult.Output | ForEach-Object { Write-Host $_ }
        Assert-True ($testResult.ExitCode -eq 0) "PHPUnit failed with exit code $($testResult.ExitCode). See $testLog"
        $testSummary = ($testResult.Output | Select-String -Pattern 'OK \([0-9]+ tests?, [0-9]+ assertions?\)' | Select-Object -Last 1).Line
        if (-not $testSummary) {
            $testSummary = 'PHPUnit passed'
        }
        Add-Check 'PHPUnit' 'PASS' $testSummary
    }

    Write-Step 'Checking code style with Laravel Pint'
    if ($SkipPint) {
        Add-Check 'Pint' 'WARN' 'Skipped by -SkipPint'
        Write-Host 'Skipped by -SkipPint' -ForegroundColor Yellow
    }
    else {
        $pintLog = Join-Path $BuildRoot 'pint.log'
        $pintResult = Invoke-Native -FilePath $PHP -Arguments @('vendor/bin/pint', '--test') -LogPath $pintLog
        $pintResult.Output | ForEach-Object { Write-Host $_ }
        Assert-True ($pintResult.ExitCode -eq 0) "Pint found style violations. Run php vendor/bin/pint and rebuild."
        Add-Check 'Pint' 'PASS' 'Code style is clean'
    }

    Write-Step 'Checking Laravel routes'
    $routeLog = Join-Path $BuildRoot 'routes.log'
    $routeResult = Invoke-Native -FilePath $PHP -Arguments @('artisan', 'route:list', '--json') -LogPath $routeLog
    Assert-True ($routeResult.ExitCode -eq 0) 'php artisan route:list failed.'
    $routeData = Convert-JsonSafe $routeResult.Text
    Assert-True ($null -ne $routeData) 'Unable to parse route:list JSON.'
    $routeCount = @($routeData).Count
    Assert-True ($routeCount -gt 0) 'No application routes were discovered.'
    Add-Check 'Routes' 'PASS' "$routeCount routes"

    Write-Step 'Staging application files'
    New-Item -ItemType Directory -Path $Stage -Force | Out-Null

    $excludeDirs = @(
        (Join-Path $ProjectRoot '.git'),
        (Join-Path $ProjectRoot '.github'),
        (Join-Path $ProjectRoot '.idea'),
        (Join-Path $ProjectRoot '.vscode'),
        (Join-Path $ProjectRoot '.fleet'),
        (Join-Path $ProjectRoot '.nova'),
        (Join-Path $ProjectRoot '.zed'),
        (Join-Path $ProjectRoot '.build'),
        (Join-Path $ProjectRoot '.phpunit.cache'),
        (Join-Path $ProjectRoot 'dist'),
        (Join-Path $ProjectRoot 'node_modules'),
        (Join-Path $ProjectRoot 'tests'),
        (Join-Path $ProjectRoot 'docs'),
        (Join-Path $ProjectRoot 'scripts'),
        (Join-Path $ProjectRoot 'vendor'),
        (Join-Path $ProjectRoot 'public\build'),
        (Join-Path $ProjectRoot 'public\storage'),
        (Join-Path $ProjectRoot 'resources\js'),
        (Join-Path $ProjectRoot 'resources\css'),
        (Join-Path $ProjectRoot 'bootstrap\cache'),
        (Join-Path $ProjectRoot 'storage\logs'),
        (Join-Path $ProjectRoot 'storage\framework\cache'),
        (Join-Path $ProjectRoot 'storage\framework\sessions'),
        (Join-Path $ProjectRoot 'storage\framework\testing'),
        (Join-Path $ProjectRoot 'storage\framework\views'),
        (Join-Path $ProjectRoot 'storage\app\public'),
        (Join-Path $ProjectRoot 'storage\app\private')
    )

    $excludeFiles = @(
        (Join-Path $ProjectRoot '.env'),
        (Join-Path $ProjectRoot '.env.backup'),
        (Join-Path $ProjectRoot '.env.local'),
        (Join-Path $ProjectRoot '.env.production'),
        (Join-Path $ProjectRoot '.env.production.example'),
        (Join-Path $ProjectRoot '.env.testing'),
        (Join-Path $ProjectRoot '.phpunit.result.cache'),
        (Join-Path $ProjectRoot 'phpunit.xml'),
        (Join-Path $ProjectRoot 'hamptworthstays'),
        (Join-Path $ProjectRoot 'package.json'),
        (Join-Path $ProjectRoot 'package-lock.json'),
        (Join-Path $ProjectRoot 'bun.lock'),
        (Join-Path $ProjectRoot 'bun.lockb'),
        (Join-Path $ProjectRoot 'vite.config.js'),
        (Join-Path $ProjectRoot 'postcss.config.js'),
        (Join-Path $ProjectRoot 'tailwind.config.js'),
        (Join-Path $ProjectRoot 'public\hot'),
        (Join-Path $ProjectRoot 'server-laravel-deploy.zip'),
        '*.sqlite',
        '*.sqlite3',
        '*.log',
        'Thumbs.db',
        '.DS_Store'
    )

    $robocopyLog = Join-Path $BuildRoot 'robocopy.log'
    $robocopyArgs = @($ProjectRoot, $Stage, '/E', '/MT:16', '/R:1', '/W:1', '/NFL', '/NDL', '/NJH', '/NJS', '/NP') + @('/XD') + $excludeDirs + @('/XF') + $excludeFiles
    & robocopy @robocopyArgs | Out-Null
    $robocopyExit = $LASTEXITCODE
    Assert-True ($robocopyExit -lt 8) "Robocopy failed with exit code $robocopyExit. See $robocopyLog"
    Add-Check 'File staging' 'PASS' 'Application copied without .env, tests, docs, uploads, logs, or node_modules'

    $runtimeDirs = @(
        (Join-Path $Stage 'bootstrap\cache'),
        (Join-Path $Stage 'storage\logs'),
        (Join-Path $Stage 'storage\framework\cache\data'),
        (Join-Path $Stage 'storage\framework\sessions'),
        (Join-Path $Stage 'storage\framework\views'),
        (Join-Path $Stage 'storage\app\public'),
        (Join-Path $Stage 'storage\app\private')
    )
    foreach ($dir in $runtimeDirs) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Set-Content -LiteralPath (Join-Path $dir '.gitignore') -Value "*`n!.gitignore" -Encoding ascii
    }

    Copy-Item -LiteralPath (Join-Path $ProjectRoot '.env.production.example') -Destination (Join-Path $Stage '.env.example') -Force
    Assert-True (-not (Test-Path (Join-Path $Stage '.env'))) 'A real .env file was copied into the production stage.'
    Assert-True (-not (Test-Path (Join-Path $Stage '.env.production'))) 'A real .env.production file was copied into the production stage.'

    Write-Step 'Installing production Composer dependencies in isolation'
    $vendorCacheValid = (Test-Path (Join-Path $VendorCache 'autoload.php')) -and (Test-Path -LiteralPath (Join-Path $VendorCache '.lockhash')) -and ((Get-Content -LiteralPath (Join-Path $VendorCache '.lockhash') -Raw).Trim() -eq $LockHash)

    if ($vendorCacheValid) {
        Write-Host 'Using cached production vendor.'
        New-Item -ItemType Directory -Path (Join-Path $Stage 'vendor') -Force | Out-Null
        & robocopy $VendorCache (Join-Path $Stage 'vendor') /E /MT:16 /NFL /NDL /NJH /NJS /NP | Out-Null
        if ($LASTEXITCODE -ge 8) {
            $vendorCacheValid = $false
            Remove-Item -LiteralPath (Join-Path $Stage 'vendor') -Recurse -Force
        }
    }

    if ($vendorCacheValid -and (Test-Path (Join-Path $Stage 'vendor\phpunit'))) {
        $vendorCacheValid = $false
        Remove-Item -LiteralPath (Join-Path $Stage 'vendor') -Recurse -Force
    }

    if (-not $vendorCacheValid) {
        Remove-Item -LiteralPath (Join-Path $Stage 'vendor') -Recurse -Force -ErrorAction SilentlyContinue
        $composerLog = Join-Path $BuildRoot 'composer-install.log'
        $composerInstallArgs = @(
            'install',
            "--working-dir=$Stage",
            '--no-dev',
            '--prefer-dist',
            '--optimize-autoloader',
            '--no-interaction',
            '--no-scripts',
            '--no-progress'
        )
        $composerResult = if ($Composer.IsPhar) {
            Invoke-Native -FilePath $PHP -Arguments (@($Composer.Path) + $composerInstallArgs) -LogPath $composerLog
        }
        else {
            Invoke-Native -FilePath $Composer.Path -Arguments $composerInstallArgs -LogPath $composerLog
        }
        $composerResult.Output | ForEach-Object { Write-Host $_ }
        Assert-True ($composerResult.ExitCode -eq 0) "Production Composer install failed. See $composerLog"

        if (Test-Path -LiteralPath $VendorCache) {
            Remove-Item -LiteralPath $VendorCache -Recurse -Force
        }
        New-Item -ItemType Directory -Path $VendorCache -Force | Out-Null
        & robocopy (Join-Path $Stage 'vendor') $VendorCache /E /MT:16 /NFL /NDL /NJH /NJS /NP | Out-Null
        if ($LASTEXITCODE -lt 8) {
            Set-Content -LiteralPath (Join-Path $VendorCache '.lockhash') -Value $LockHash -Encoding ascii
        }
    }

    Assert-True (Test-Path (Join-Path $Stage 'vendor\autoload.php')) 'vendor/autoload.php is missing.'
    foreach ($devPath in @('phpunit', 'laravel\pint', 'fakerphp\faker', 'mockery\mockery')) {
        Assert-True (-not (Test-Path (Join-Path $Stage "vendor\$devPath"))) "Development dependency found in production vendor: $devPath"
    }

    $platformLog = Join-Path $BuildRoot 'platform-reqs.log'
    $platformArgs = @('check-platform-reqs', '--no-dev', "--working-dir=$Stage")
    $platformResult = if ($Composer.IsPhar) {
        Invoke-Native -FilePath $PHP -Arguments (@($Composer.Path) + $platformArgs) -LogPath $platformLog
    }
    else {
        Invoke-Native -FilePath $Composer.Path -Arguments $platformArgs -LogPath $platformLog
    }
    $platformResult.Output | ForEach-Object { Write-Host $_ }
    Assert-True ($platformResult.ExitCode -eq 0) 'Production platform requirements are not satisfied.'
    Add-Check 'Production dependencies' 'PASS' 'No dev packages; platform requirements satisfied'

    Write-Step 'Discovering Laravel packages in the production stage'
    Push-Location -LiteralPath $Stage
    try {
        $packageLog = Join-Path $BuildRoot 'package-discover.log'
        $packageResult = Invoke-Native -FilePath $PHP -Arguments @('artisan', 'package:discover', '--ansi') -LogPath $packageLog
        $packageResult.Output | ForEach-Object { Write-Host $_ }
        Assert-True ($packageResult.ExitCode -eq 0) "Package discovery failed. See $packageLog"
        $versionResult = Invoke-Native -FilePath $PHP -Arguments @('artisan', '--version')
        Assert-True ($versionResult.ExitCode -eq 0) 'The staged application cannot boot.'
        Write-Host $versionResult.Text
    }
    finally {
        Pop-Location
    }
    Assert-True (Test-Path (Join-Path $Stage 'bootstrap\cache\packages.php')) 'bootstrap/cache/packages.php is missing.'
    Assert-True (Test-Path (Join-Path $Stage 'bootstrap\cache\services.php')) 'bootstrap/cache/services.php is missing.'
    Add-Check 'Production boot' 'PASS' 'Package discovery and artisan boot succeeded'

    Write-Step 'Scanning the package for secrets'
    $secretKeys = @('APP_KEY', 'JWT_SECRET', 'DB_PASSWORD', 'GODADDY_FTP_PASSWORD', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'MAIL_PASSWORD')
    $secretValues = @()
    foreach ($sourceEnv in @($LocalEnv, $ProductionEnv)) {
        foreach ($key in $secretKeys) {
            if ($sourceEnv.ContainsKey($key)) {
                $value = [string]$sourceEnv[$key]
                if ($value.Length -ge 8 -and $value -notmatch '^(null|changeme|placeholder|your[-_]?.*)$') {
                    $secretValues += [pscustomobject]@{ Key = $key; Value = $value }
                }
            }
        }
    }

    $scanFiles = Get-ChildItem -LiteralPath $Stage -Recurse -File | Where-Object {
        $_.FullName -notlike (Join-Path $Stage 'vendor\*') -and
        $_.Length -lt 2097152 -and
        $_.Extension -notin @('.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.mp4', '.webm', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.zip')
    }
    $scanText = ($scanFiles | ForEach-Object {
            try { Get-Content -LiteralPath $_.FullName -Raw -ErrorAction Stop } catch { '' }
        }) -join "`n"

    $leakedKeys = @()
    foreach ($secret in $secretValues) {
        if ($scanText.Contains($secret.Value)) {
            $leakedKeys += $secret.Key
        }
    }
    Assert-True ($leakedKeys.Count -eq 0) ("Secret values found in the package: " + (($leakedKeys | Select-Object -Unique) -join ', '))

    $patternChecks = @(
        [pscustomobject]@{ Name = 'Stripe live key'; Pattern = 'sk_live_[A-Za-z0-9]{16,}' },
        [pscustomobject]@{ Name = 'Stripe webhook key'; Pattern = 'whsec_[A-Za-z0-9]{16,}' },
        [pscustomobject]@{ Name = 'Private key'; Pattern = '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----' },
        [pscustomobject]@{ Name = 'MongoDB URI'; Pattern = 'mongodb\+srv://[^\s]+' },
        [pscustomobject]@{ Name = 'AWS access key'; Pattern = 'AKIA[0-9A-Z]{16}' }
    )
    $patternLeaks = @()
    foreach ($patternCheck in $patternChecks) {
        if ($scanText -match $patternCheck.Pattern) {
            $patternLeaks += $patternCheck.Name
        }
    }
    Assert-True ($patternLeaks.Count -eq 0) ("Sensitive patterns found in the package: " + ($patternLeaks -join ', '))
    Add-Check 'Secret scan' 'PASS' 'No local secrets or sensitive key patterns found'

    Write-Step 'Creating the flat-root deployment ZIP'
    if (Test-Path -LiteralPath $ZipPath) {
        Remove-Item -LiteralPath $ZipPath -Force
    }

    if (Test-Path -LiteralPath $SevenZip) {
        Push-Location -LiteralPath $Stage
        try {
            $items = @(Get-ChildItem -Force | Select-Object -ExpandProperty Name)
            & $SevenZip a -tzip -mx=5 -y $ZipPath @items | Out-Null
            Assert-True ($LASTEXITCODE -eq 0) "7-Zip failed with exit code $LASTEXITCODE"
        }
        finally {
            Pop-Location
        }
    }
    else {
        Write-Host '7-Zip not found; using .NET ZIP fallback.' -ForegroundColor Yellow
        [System.IO.Compression.ZipFile]::CreateFromDirectory(
            $Stage,
            $ZipPath,
            [System.IO.Compression.CompressionLevel]::Optimal,
            $false
        )
    }

    Assert-True (Test-Path -LiteralPath $ZipPath) 'Deployment ZIP was not created.'

    $zip = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
    try {
        $entries = @($zip.Entries | ForEach-Object { $_.FullName -replace '\\', '/' })
        $uncompressedBytes = ($zip.Entries | Measure-Object -Property Length -Sum).Sum
    }
    finally {
        $zip.Dispose()
    }

    $requiredEntries = @('artisan', 'vendor/autoload.php', 'public/index.php', 'public/.htaccess', '.env.example')
    foreach ($entry in $requiredEntries) {
        Assert-True ($entries -contains $entry) "Missing ZIP entry: $entry"
    }

    $forbiddenEntries = @('.env', '.env.production', '.env.local', '.env.testing', 'phpunit.xml')
    foreach ($entry in $forbiddenEntries) {
        Assert-True (-not ($entries -contains $entry)) "Forbidden ZIP entry: $entry"
    }
    Assert-True (-not ($entries | Where-Object { $_ -like 'server-laravel/*' })) 'ZIP contains a top-level server-laravel wrapper directory.'
    Assert-True (-not ($entries | Where-Object { $_ -like 'tests/*' -or $_ -like 'docs/*' -or $_ -like 'node_modules/*' })) 'ZIP contains tests, docs, or node_modules.'
    Assert-True (-not ($entries | Where-Object { $_ -like 'vendor/phpunit/*' -or $_ -like 'vendor/laravel/pint/*' })) 'ZIP contains development dependencies.'
    Assert-True (-not ($entries | Where-Object { $_ -like 'storage/logs/*.log' -or $_ -like 'database/*.sqlite' })) 'ZIP contains runtime logs or SQLite files.'

    $zipSizeMb = [math]::Round((Get-Item -LiteralPath $ZipPath).Length / 1MB, 2)
    $uncompressedMb = [math]::Round($uncompressedBytes / 1MB, 2)
    Add-Check 'ZIP structure' 'PASS' ("flat root; {0} entries; {1} MB compressed; {2} MB uncompressed" -f $entries.Count, $zipSizeMb, $uncompressedMb)

    Write-Step 'Simulating a clean cPanel deployment'
    New-Item -ItemType Directory -Path $TestRoot -Force | Out-Null
    if (Test-Path -LiteralPath $SevenZip) {
        & $SevenZip x $ZipPath "-o$TestRoot" -y | Out-Null
        Assert-True ($LASTEXITCODE -eq 0) "Unable to extract the deployment ZIP with 7-Zip."
    }
    else {
        [System.IO.Compression.ZipFile]::ExtractToDirectory($ZipPath, $TestRoot)
    }

    Assert-True (Test-Path (Join-Path $TestRoot 'artisan')) 'Extracted deployment is missing artisan at its root.'
    Assert-True (Test-Path (Join-Path $TestRoot 'vendor\autoload.php')) 'Extracted deployment is missing vendor/autoload.php.'
    Assert-True (Test-Path (Join-Path $TestRoot 'public\index.php')) 'Extracted deployment is missing public/index.php.'

    $phpunitXml = Get-Content -LiteralPath (Join-Path $ProjectRoot 'phpunit.xml') -Raw
    $testDbName = [regex]::Match($phpunitXml, 'name="DB_DATABASE"\s+value="([^"]*)"').Groups[1].Value
    $phpunitDbUser = [regex]::Match($phpunitXml, 'name="DB_USERNAME"\s+value="([^"]*)"').Groups[1].Value
    $phpunitDbPassword = [regex]::Match($phpunitXml, 'name="DB_PASSWORD"\s+value="([^"]*)"').Groups[1].Value
    Assert-True (-not [string]::IsNullOrWhiteSpace($testDbName)) 'phpunit.xml does not define a safe DB_DATABASE for the deployment test.'
    $dbHost = if ($LocalEnv.ContainsKey('DB_HOST') -and $LocalEnv['DB_HOST']) { $LocalEnv['DB_HOST'] } else { '127.0.0.1' }
    $dbPort = if ($LocalEnv.ContainsKey('DB_PORT') -and $LocalEnv['DB_PORT']) { $LocalEnv['DB_PORT'] } else { '3306' }
    $testDbUser = if (-not [string]::IsNullOrWhiteSpace($phpunitDbUser)) { $phpunitDbUser } elseif ($LocalEnv.ContainsKey('DB_USERNAME') -and $LocalEnv['DB_USERNAME']) { $LocalEnv['DB_USERNAME'] } else { 'root' }
    $testDbPassword = if (-not [string]::IsNullOrWhiteSpace($phpunitDbPassword)) { $phpunitDbPassword } elseif ($LocalEnv.ContainsKey('DB_PASSWORD')) { $LocalEnv['DB_PASSWORD'] } else { '' }

    $port = Get-FreePort
    $appKeyResult = Invoke-Native -FilePath $PHP -Arguments @('-r', "echo 'base64:'.base64_encode(random_bytes(32));")
    $jwtResult = Invoke-Native -FilePath $PHP -Arguments @('-r', 'echo bin2hex(random_bytes(32));')
    $appKey = $appKeyResult.Text.Trim()
    $jwtSecret = $jwtResult.Text.Trim()
    Assert-True ($appKey.Length -gt 20) 'Unable to generate a temporary APP_KEY.'
    Assert-True ($jwtSecret.Length -ge 32) 'Unable to generate a temporary JWT_SECRET.'

    $testEnv = @"
APP_NAME="Reservation API deployment test"
APP_ENV=production
APP_KEY=$appKey
APP_DEBUG=false
APP_URL=http://127.0.0.1:$port

APP_TIMEZONE=UTC
APP_LOCALE=en
APP_FALLBACK_LOCALE=en
APP_MAINTENANCE_DRIVER=file
APP_MAINTENANCE_STORE=database
BCRYPT_ROUNDS=4
LOG_CHANNEL=stack
LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST=$dbHost
DB_PORT=$dbPort
DB_DATABASE=$testDbName
DB_USERNAME=$testDbUser
DB_PASSWORD="$testDbPassword"

SESSION_DRIVER=array
SESSION_LIFETIME=120
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=
SESSION_SAME_SITE=lax

CACHE_STORE=array
CACHE_PREFIX=deployment_test_
QUEUE_CONNECTION=sync

FILESYSTEM_DISK=local
MEDIA_DISK=public
STORAGE_PROVIDER=local
ASSETS_BASE_URL=

JWT_SECRET=$jwtSecret
JWT_TTL=60
JWT_REFRESH_TTL=20160

STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

MAIL_MAILER=array
MAIL_HOST=
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="no-reply@example.test"
MAIL_FROM_NAME="Reservation API deployment test"

EMAIL_FROM=no-reply@example.test
GODADDY_FTP_PREFIX=
"@
    $testEnvPath = Join-Path $TestRoot '.env'
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($testEnvPath, $testEnv, $utf8NoBom)

    Push-Location -LiteralPath $TestRoot
    try {
        $migrateLog = Join-Path $BuildRoot 'deployment-migrate.log'
        $migrateResult = Invoke-Native -FilePath $PHP -Arguments @('artisan', 'migrate', '--force') -LogPath $migrateLog
        $migrateResult.Output | ForEach-Object { Write-Host $_ }
        Assert-True ($migrateResult.ExitCode -eq 0) "Deployment migration test failed. See $migrateLog"

        $cacheLog = Join-Path $BuildRoot 'deployment-cache.log'
        $cacheResult = Invoke-Native -FilePath $PHP -Arguments @('artisan', 'optimize') -LogPath $cacheLog
        $cacheResult.Output | ForEach-Object { Write-Host $_ }
        Assert-True ($cacheResult.ExitCode -eq 0) "Laravel optimize failed in the deployment test. See $cacheLog"

        $testRouteLog = Join-Path $BuildRoot 'deployment-routes.log'
        $testRouteResult = Invoke-Native -FilePath $PHP -Arguments @('artisan', 'route:list', '--json') -LogPath $testRouteLog
        $testRouteData = Convert-JsonSafe $testRouteResult.Text
        Assert-True ($testRouteResult.ExitCode -eq 0 -and $null -ne $testRouteData) 'Deployment route cache could not be listed.'

        $serveOut = Join-Path $BuildRoot 'deployment-server.out.log'
        $serveErr = Join-Path $BuildRoot 'deployment-server.err.log'
        $server = Start-Process -FilePath $PHP -ArgumentList @('-S', "127.0.0.1:$port", '-t', 'public', 'public/index.php') -WorkingDirectory $TestRoot -RedirectStandardOutput $serveOut -RedirectStandardError $serveErr -PassThru
        try {
            $baseUrl = "http://127.0.0.1:$port"
            $healthy = $false
            for ($attempt = 0; $attempt -lt 60; $attempt++) {
                Start-Sleep -Milliseconds 500
                if ($server.HasExited) {
                    break
                }
                try {
                    $probe = Invoke-HttpCheck -Method GET -Url "$baseUrl/api/health"
                    if ($probe.Status -eq 200) {
                        $healthy = $true
                        break
                    }
                }
                catch {
                }
            }

            if (-not $healthy) {
                $serverOutput = @()
                if (Test-Path $serveOut) { $serverOutput += Get-Content -LiteralPath $serveOut }
                if (Test-Path $serveErr) { $serverOutput += Get-Content -LiteralPath $serveErr }
                $serverOutput | ForEach-Object { Write-Host $_ }
                throw 'The deployment test server did not become healthy.'
            }

            $httpChecks = @(
                [pscustomobject]@{ Name = 'GET /api'; Method = 'GET'; Path = '/api'; Expected = 200; Body = $null; Success = $true },
                [pscustomobject]@{ Name = 'GET /api/health'; Method = 'GET'; Path = '/api/health'; Expected = 200; Body = $null; Success = $true },
                [pscustomobject]@{ Name = 'GET /api/ready'; Method = 'GET'; Path = '/api/ready'; Expected = 200; Body = $null; Success = $true },
                [pscustomobject]@{ Name = 'GET /api/public/room-types'; Method = 'GET'; Path = '/api/public/room-types'; Expected = 200; Body = $null; Success = $true },
                [pscustomobject]@{ Name = 'POST /api/v1/auth/login (invalid)'; Method = 'POST'; Path = '/api/v1/auth/login'; Expected = 422; Body = '{}'; Success = $false },
                [pscustomobject]@{ Name = 'GET /api/v1/auth/me (no token)'; Method = 'GET'; Path = '/api/v1/auth/me'; Expected = 401; Body = $null; Success = $false }
            )

            $httpResults = @()
            foreach ($httpCheck in $httpChecks) {
                $response = Invoke-HttpCheck -Method $httpCheck.Method -Url ($baseUrl + $httpCheck.Path) -Body $httpCheck.Body
                $json = Convert-JsonSafe $response.Body
                $successMatches = if ($null -ne $json -and $null -ne $json.success) { [bool]$json.success -eq [bool]$httpCheck.Success } else { $false }
                $detail = "{0} -> {1} (expected {2})" -f $httpCheck.Name, $response.Status, $httpCheck.Expected
                $httpResults += [pscustomobject]@{ Name = $httpCheck.Name; Status = $response.Status; Expected = $httpCheck.Expected; SuccessMatches = $successMatches; Detail = $detail }
                Write-Host $detail
                Assert-True ($response.Status -eq $httpCheck.Expected) "Unexpected HTTP status for $($httpCheck.Name): $($response.Status)"
                Assert-True ($successMatches) "Unexpected JSON success value for $($httpCheck.Name)."
            }

            Add-Check 'Deployment simulation' 'PASS' 'Extracted ZIP, migrated test DB, optimized caches, booted app, and passed HTTP checks'
            Add-Check 'HTTP smoke tests' 'PASS' (@($httpResults | ForEach-Object { $_.Detail }) -join '; ')

            $appLog = Join-Path $TestRoot 'storage\logs\laravel.log'
            if (Test-Path $appLog) {
                $errors = @(Select-String -LiteralPath $appLog -Pattern '\.ERROR' -SimpleMatch)
                Assert-True ($errors.Count -eq 0) "The deployment test wrote application errors to storage/logs/laravel.log."
            }
        }
        finally {
            if ($server -and -not $server.HasExited) {
                Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
                $server.WaitForExit(5000)
            }
        }
    }
    finally {
        Pop-Location
    }

    Write-Step 'Writing DEPLOYMENT.md'
    $deploymentDoc = @'
# Laravel production deployment — GoDaddy cPanel

Artifact: {{ZIP_NAME}}
Target: https://laravel.hamptworthstays.com
cPanel user: ukqvtreb04u8
cPanel project path: /home/ukqvtreb04u8/server-laravel
Document root: /home/ukqvtreb04u8/server-laravel/public

The Node backend at https://api.hamptworthstays.com remains live until this deployment is verified. Do not change its DNS or files as part of this upload.

## 1. Upload the flat-root ZIP

1. In cPanel File Manager, create `/home/ukqvtreb04u8/server-laravel` if it does not exist.
2. Open that folder and upload `{{ZIP_NAME}}`.
3. Extract the ZIP inside `/home/ukqvtreb04u8/server-laravel`. The folder must contain `artisan`, `app/`, `public/`, and `vendor/` directly. It must not contain a nested `server-laravel/` folder.
4. In cPanel Domains, set the document root for `laravel.hamptworthstays.com` to `/home/ukqvtreb04u8/server-laravel/public`. Leave “Share document root” unchecked.
5. Do not upload the ZIP to the home directory and extract it there; that would put the application files in the wrong location.

## 2. Create the database

In cPanel MySQL Databases:

1. Create a database, for example `ukqvtreb04u8_hamptworth`.
2. Create a database user with a strong password.
3. Grant that user ALL PRIVILEGES on the new database.
4. Use the full cPanel-prefixed names in `.env`.

Do not import the local development database over the production database.

## 3. Configure `.env`

Copy `.env.example` to `.env`, then set at least:

- `APP_URL=https://laravel.hamptworthstays.com`
- `APP_ENV=production`
- `APP_DEBUG=false`
- `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`
- `APP_KEY`
- `JWT_SECRET`
- `QUEUE_CONNECTION=sync`
- `MEDIA_DISK=public`
- `STORAGE_PROVIDER=local`
- `MAIL_MAILER=log` until SMTP delivery is configured
- Stripe keys only when live payment processing is ready

Generate the application key and JWT secret on the server:

    cd ~/server-laravel
    php artisan key:generate --force
    php -r "echo bin2hex(random_bytes(32));"

Put the generated value into `JWT_SECRET`. Never commit or share the real `.env`.

## 4. Install and optimize

The ZIP already contains production Composer dependencies. Do not run `composer install` on the server unless you intentionally change dependencies.

    cd ~/server-laravel
    php artisan migrate --force
    php artisan storage:link
    php artisan optimize

If `storage:link` reports that the link already exists, leave it in place. Ensure `storage/` and `bootstrap/cache/` are writable by the web server; cPanel normally uses 755 or 775.

No queue worker and no scheduler are required for this build because `QUEUE_CONNECTION=sync` and no scheduled tasks are registered. Notification email delivery is not implemented yet; keep `MAIL_MAILER=log`.

## 5. SSL

Enable AutoSSL for `laravel.hamptworthstays.com` in cPanel and wait for the certificate to become active. Test HTTPS only after the document root contains the application.

## 6. Verify

    curl -i https://laravel.hamptworthstays.com/api
    curl -i https://laravel.hamptworthstays.com/api/health
    curl -i https://laravel.hamptworthstays.com/api/ready
    curl -i https://laravel.hamptworthstays.com/api/public/room-types
    curl -i https://laravel.hamptworthstays.com/api/v1/auth/me

Expected: `/api`, `/api/health`, `/api/ready`, and `/api/public/room-types` return success; `/api/v1/auth/me` returns 401 without a bearer token. A root 403 before upload is expected because the document root is empty.

## 7. After changing `.env`

    php artisan optimize:clear
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache

Do not run `migrate:fresh`, `db:wipe`, or `migrate:refresh` against production.

## 8. Rollback

Keep the previous release directory and database backup. To roll back, restore the previous application directory, restore the matching database backup, and run:

    php artisan optimize:clear
    php artisan config:cache

## Known limitations

- Live Stripe payment side effects and notification email delivery are not complete.
- Property/room/rate-plan seed data must be created or imported before full booking E2E testing.
- The Node backend remains the live API until this Laravel deployment is verified.
'@
    $deploymentDoc = $deploymentDoc.Replace('{{ZIP_NAME}}', $ZipName)
    $deploymentDoc | Set-Content -LiteralPath $DeploymentDocPath -Encoding UTF8
    Add-Check 'Deployment guide' 'PASS' $DeploymentDocPath

    Write-Step 'Writing build report'
    $reportLines = @()
    $reportLines += 'Laravel production build report'
    $reportLines += '=============================='
    $reportLines += "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss K')"
    $reportLines += "Project: $ProjectRoot"
    $reportLines += "Artifact: $ZipPath"
    $reportLines += "Artifact size: $zipSizeMb MB"
    $reportLines += "Uncompressed size: $uncompressedMb MB"
    $reportLines += "ZIP entries: $($entries.Count)"
    $reportLines += "Deployment guide: $DeploymentDocPath"
    $reportLines += "Target: https://laravel.hamptworthstays.com (not uploaded by this build)"
    $reportLines += ''
    foreach ($check in $script:Checks) {
        $reportLines += ("[{0}] {1}: {2}" -f $check.Status, $check.Name, $check.Details)
    }
    $reportLines += ''
    $reportLines += 'Known limitations:'
    $reportLines += '- Live Stripe payment side effects and notification email delivery are incomplete.'
    $reportLines += '- Property/room/rate-plan seed data is required before full booking E2E testing.'
    $reportLines += '- Node remains the live API until Laravel staging is verified.'
    $reportLines += ''
    $reportLines += 'Result: READY FOR GODADDY'
    $reportLines | Set-Content -LiteralPath $ReportPath -Encoding UTF8

    if (-not $KeepBuild) {
        Remove-Item -LiteralPath $BuildRoot -Recurse -Force -ErrorAction SilentlyContinue
    }

    Write-Host ''
    Write-Host '========================================' -ForegroundColor Green
    Write-Host 'BUILD PASSED - READY FOR GODADDY' -ForegroundColor Green
    Write-Host '========================================' -ForegroundColor Green
    Write-Host "ZIP:     $ZipPath" -ForegroundColor White
    Write-Host "Guide:   $DeploymentDocPath" -ForegroundColor White
    Write-Host "Report:  $ReportPath" -ForegroundColor White
    Write-Host ''
    Write-Host 'Upload the ZIP into /home/ukqvtreb04u8/server-laravel and extract it there.' -ForegroundColor White
}
catch {
    $failure = $_.Exception.Message
    Add-Check 'BUILD' 'FAIL' $failure
    Write-Host ''
    Write-Host '========================================' -ForegroundColor Red
    Write-Host 'BUILD FAILED' -ForegroundColor Red
    Write-Host '========================================' -ForegroundColor Red
    Write-Host $failure -ForegroundColor Red
    Write-Host "Build workspace retained for inspection: $BuildRoot" -ForegroundColor Yellow

    if (Test-Path -LiteralPath $DistDir) {
        $failureReport = @()
        $failureReport += 'Laravel production build report'
        $failureReport += '=============================='
        $failureReport += "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss K')"
        $failureReport += 'Result: BUILD FAILED'
        $failureReport += "Failure: $failure"
        $failureReport += ''
        foreach ($check in $script:Checks) {
            $failureReport += ("[{0}] {1}: {2}" -f $check.Status, $check.Name, $check.Details)
        }
        $failureReport | Set-Content -LiteralPath $ReportPath -Encoding UTF8
        Write-Host "Failure report: $ReportPath" -ForegroundColor Yellow
    }

    exit 1
}
