$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$logFile = Join-Path $repoRoot "scripts\scrape-league-table.log"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

"[$timestamp] Starting league table scrape" | Out-File -FilePath $logFile -Append -Encoding utf8

try {
    $output = npm run scrape:league 2>&1 | Out-String
    $output | Out-File -FilePath $logFile -Append -Encoding utf8
    if ($LASTEXITCODE -ne 0) {
        throw "scrape:league exited with code $LASTEXITCODE"
    }
    "[$timestamp] Scrape finished successfully" | Out-File -FilePath $logFile -Append -Encoding utf8
} catch {
    "[$timestamp] ERROR: $_" | Out-File -FilePath $logFile -Append -Encoding utf8
}
