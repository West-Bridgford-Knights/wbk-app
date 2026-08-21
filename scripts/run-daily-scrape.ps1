$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$logFile = Join-Path $repoRoot "scripts\scrape-league-table.log"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

"[$timestamp] Starting league table + fixtures scrape" | Out-File -FilePath $logFile -Append -Encoding utf8

try {
    $output = npm run scrape:league 2>&1 | Out-String
    $output | Out-File -FilePath $logFile -Append -Encoding utf8
    if ($LASTEXITCODE -ne 0) {
        throw "scrape:league exited with code $LASTEXITCODE"
    }
    "[$timestamp] League table scrape finished successfully" | Out-File -FilePath $logFile -Append -Encoding utf8
} catch {
    "[$timestamp] ERROR: $_" | Out-File -FilePath $logFile -Append -Encoding utf8
}

try {
    $output = npm run scrape:fixtures 2>&1 | Out-String
    $output | Out-File -FilePath $logFile -Append -Encoding utf8
    if ($LASTEXITCODE -ne 0) {
        throw "scrape:fixtures exited with code $LASTEXITCODE"
    }
    "[$timestamp] Fixtures scrape finished successfully" | Out-File -FilePath $logFile -Append -Encoding utf8
} catch {
    "[$timestamp] ERROR: $_" | Out-File -FilePath $logFile -Append -Encoding utf8
}

try {
    $output = npm run scrape:pitch-availability 2>&1 | Out-String
    $output | Out-File -FilePath $logFile -Append -Encoding utf8
    if ($LASTEXITCODE -ne 0) {
        throw "scrape:pitch-availability exited with code $LASTEXITCODE"
    }
    "[$timestamp] Pitch availability check finished successfully" | Out-File -FilePath $logFile -Append -Encoding utf8
} catch {
    "[$timestamp] ERROR: $_" | Out-File -FilePath $logFile -Append -Encoding utf8
}

try {
    $output = npm run generate:ics 2>&1 | Out-String
    $output | Out-File -FilePath $logFile -Append -Encoding utf8
    if ($LASTEXITCODE -ne 0) {
        throw "generate:ics exited with code $LASTEXITCODE"
    }
    "[$timestamp] Fixtures calendar (.ics) generated successfully" | Out-File -FilePath $logFile -Append -Encoding utf8

    git add public/fixtures.ics | Out-Null
    $hasChanges = git diff --cached --quiet; $changed = ($LASTEXITCODE -ne 0)
    if ($changed) {
        git commit -m "Update fixtures calendar" | Out-File -FilePath $logFile -Append -Encoding utf8
        git push | Out-File -FilePath $logFile -Append -Encoding utf8
        "[$timestamp] Pushed updated fixtures.ics (GitHub Pages will redeploy)" | Out-File -FilePath $logFile -Append -Encoding utf8
    } else {
        "[$timestamp] fixtures.ics unchanged, nothing to push" | Out-File -FilePath $logFile -Append -Encoding utf8
    }
} catch {
    "[$timestamp] ERROR: $_" | Out-File -FilePath $logFile -Append -Encoding utf8
}
