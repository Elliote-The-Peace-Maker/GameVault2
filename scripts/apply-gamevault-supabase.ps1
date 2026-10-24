$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$projectRef = 'rbgbttghpfzhjfjzbzik'
$plainToken = $null
$plainDbPassword = $null

function Read-HiddenText([string]$prompt) {
    $secureValue = Read-Host $prompt -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
        $secureValue.Dispose()
    }
}

Push-Location $projectRoot
try {
    Write-Host 'The browser login flow is unavailable in this terminal. Use a project-scoped Supabase personal access token.' -ForegroundColor Cyan
    $plainToken = Read-HiddenText 'Supabase personal access token (input hidden)'
    if ([string]::IsNullOrWhiteSpace($plainToken)) { throw 'A Supabase personal access token is required.' }
    $env:SUPABASE_ACCESS_TOKEN = $plainToken

    $plainDbPassword = Read-HiddenText 'GameVault database password (input hidden)'
    if ([string]::IsNullOrWhiteSpace($plainDbPassword)) { throw 'The GameVault database password is required.' }
    $env:SUPABASE_DB_PASSWORD = $plainDbPassword

    Write-Host 'Linking GameVault with the project-scoped token.' -ForegroundColor Cyan
    & npx --yes supabase --agent no link --project-ref $projectRef
    if ($LASTEXITCODE -ne 0) { throw 'Supabase project linking did not complete.' }

    Write-Host 'Previewing pending migrations and the GTA catalog seed. This preview does not change the database.' -ForegroundColor Cyan
    & npx --yes supabase --agent no db push --dry-run --include-seed --linked
    if ($LASTEXITCODE -ne 0) { throw 'The migration preview failed. Review the error before proceeding.' }

    $approval = Read-Host 'Type PUSH to apply the migrations and GTA catalog seed to GameVault'
    if ($approval -cne 'PUSH') {
        Write-Host 'No database changes were applied.' -ForegroundColor Yellow
        return
    }

    & npx --yes supabase --agent no db push --include-seed --linked --yes
    if ($LASTEXITCODE -ne 0) { throw 'The database push failed. Review the CLI output before retrying.' }
    Write-Host 'GameVault migrations and GTA catalog seed were applied.' -ForegroundColor Green
}
finally {
    Remove-Item Env:SUPABASE_ACCESS_TOKEN -ErrorAction SilentlyContinue
    Remove-Item Env:SUPABASE_DB_PASSWORD -ErrorAction SilentlyContinue
    $plainToken = $null
    $plainDbPassword = $null
    Pop-Location
}
