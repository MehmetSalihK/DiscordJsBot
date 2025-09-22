# Script pour corriger les erreurs de syntaxe dans les fichiers de musique
Write-Host "Correction des erreurs de syntaxe dans les fichiers de musique..." -ForegroundColor Yellow

$files = @(
    "C:\Users\Sketur60\Documents\github\DiscordJsBot\music\queueManager.js",
    "C:\Users\Sketur60\Documents\github\DiscordJsBot\music\buttonHandler.js"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Correction de $file..." -ForegroundColor Cyan
        
        # Lire le contenu du fichier
        $content = Get-Content $file -Raw
        
        # Corriger les commentaires mal placés - pattern spécifique
        $content = $content -replace 'flags: 64 // MessageFlags\.Ephemeral \)', 'flags: 64 }); // MessageFlags.Ephemeral'
        
        # Écrire le contenu corrigé
        Set-Content $file $content -Encoding UTF8
        
        Write-Host "✅ $file corrigé" -ForegroundColor Green
    } else {
        Write-Host "❌ Fichier non trouvé: $file" -ForegroundColor Red
    }
}

Write-Host "Correction terminée !" -ForegroundColor Green