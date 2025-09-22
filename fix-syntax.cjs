const fs = require('fs');
const path = require('path');

console.log('🔧 Correction COMPLÈTE des erreurs de syntaxe...');

const files = [
    './music/queueManager.js',
    './music/buttonHandler.js'
];

files.forEach(filePath => {
    if (fs.existsSync(filePath)) {
        console.log(`📝 Correction de ${filePath}...`);
        
        let content = fs.readFileSync(filePath, 'utf8');
        let originalContent = content;
        
        // Corriger TOUTES les occurrences de commentaires mal placés
        // Pattern 1: flags: 64 // MessageFlags.Ephemeral )
        content = content.replace(/flags:\s*64\s*\/\/\s*MessageFlags\.Ephemeral\s*\)/g, 'flags: 64 }); // MessageFlags.Ephemeral');
        
        // Pattern 2: , flags: 64 // MessageFlags.Ephemeral )
        content = content.replace(/,\s*flags:\s*64\s*\/\/\s*MessageFlags\.Ephemeral\s*\)/g, ', flags: 64 }); // MessageFlags.Ephemeral');
        
        // Pattern 3: { embeds: [embed], flags: 64 // MessageFlags.Ephemeral )
        content = content.replace(/\{\s*embeds:\s*\[embed\],\s*flags:\s*64\s*\/\/\s*MessageFlags\.Ephemeral\s*\)/g, '{ embeds: [embed], flags: 64 }); // MessageFlags.Ephemeral');
        
        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ ${filePath} corrigé`);
        } else {
            console.log(`ℹ️ ${filePath} - aucune correction nécessaire`);
        }
    } else {
        console.log(`❌ Fichier non trouvé: ${filePath}`);
    }
});

console.log('🎉 Correction terminée !');