$source = "C:\Users\salih\Documents\Github\Discord\DiscordJsBot\dashboard-frontend\src\App.temp.tsx"
$destination = "C:\Users\salih\Documents\Github\Discord\DiscordJsBot\dashboard-frontend\src\App.tsx"

if (Test-Path $source) {
    Get-Content $source | Set-Content $destination -Force
    Write-Host "File replaced successfully!"
} else {
    Write-Host "Source file not found!"
}
