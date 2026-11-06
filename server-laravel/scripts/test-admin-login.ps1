$h = @{
    "Content-Type" = "application/json"
    "Accept"       = "application/json"
}

function Test-Login($email, $pass) {
    Write-Host "Testing login for $email..." -ForegroundColor Cyan
    $b = (@{ email = $email; password = $pass } | ConvertTo-Json)
    try {
        $resp = Invoke-WebRequest -Uri "https://laravel.hamptworthstays.com/api/v1/auth/login" -Method Post -Headers $h -Body $b -UseBasicParsing
        Write-Host "SUCCESS: HTTP $($resp.StatusCode)" -ForegroundColor Green
        Write-Host $resp.Content
    } catch {
        Write-Host "FAILED: HTTP $([int]$_.Exception.Response.StatusCode)" -ForegroundColor Red
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host $reader.ReadToEnd()
    }
}

Test-Login "test-deploy@hamptworthstays.com" "SecurePassword123"
Test-Login "admin@gmail.com" "admin@gmail.com"
