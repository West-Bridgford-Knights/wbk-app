# One-off setup: registers a Windows Scheduled Task that runs the league table
# scraper daily at 7am from this PC (needed because GitHub Actions' runner IPs
# are blocked by Cloudflare on the FA's site). Run this once from an elevated
# or normal PowerShell prompt:
#
#   powershell -ExecutionPolicy Bypass -File scripts\register-scrape-task.ps1
#
# To remove it later: Unregister-ScheduledTask -TaskName "WBK League Table Scrape"

$repoRoot = Split-Path -Parent $PSScriptRoot
$runnerScript = Join-Path $repoRoot "scripts\run-daily-scrape.ps1"

$action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runnerScript`""
$trigger = New-ScheduledTaskTrigger -Daily -At 7:00am
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable

Register-ScheduledTask `
    -TaskName "WBK League Table Scrape" `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "Daily scrape of the WBK league table into Supabase." `
    -Force

Write-Host "Scheduled task 'WBK League Table Scrape' registered - runs daily at 7:00am."
Write-Host "Logs are written to scripts\scrape-league-table.log"
