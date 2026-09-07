$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$logFile = Join-Path $repoRoot "scripts\scrape-league-table.log"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

"[$timestamp] Starting fixtures scrape" | Out-File -FilePath $logFile -Append -Encoding utf8

# scrape:league is deliberately not run here — the FA site put a Cloudflare browser
# challenge on /table.html that no automated request can pass (curl and headless Chromium
# both get an identical "Attention Required!" block), so it just fails daily for no benefit.
# Run `npm run scrape:league` by hand occasionally to check if that's changed.

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
