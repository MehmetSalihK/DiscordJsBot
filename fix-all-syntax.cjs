const fs = require('fs');
const path = require('path');

console.log('🔧 Correction de toutes les erreurs de parenthèses dans buttonHandler.js...');

const filePath = path.join(__dirname, 'music/buttonHandler.js');

if (!fs.existsSync(filePath)) {
    console.log('❌ Fichier buttonHandler.js non trouvé');
    process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');
const originalContent = content;

// Compter les occurrences avant correction
const beforeCount = (content.match(/flags:\s*64\s*\}\s*\/\/\s*MessageFlags\.Ephemeral\s*\)\s*;/g) || []).length;
console.log(`🔍 ${beforeCount} erreurs trouvées avec le pattern exact`);

// Remplacement simple et direct
let fixedCount = 0;

// Remplacer toutes les occurrences de "flags: 64 } // MessageFlags.Ephemeral);" 
// par "flags: 64 }); // MessageFlags.Ephemeral"
content = content.replace(/flags:\s*64\s*\}\s*\/\/\s*MessageFlags\.Ephemeral\s*\)\s*;/g, () => {
    fixedCount++;
    return 'flags: 64 }); // MessageFlags.Ephemeral';
});

if (fixedCount > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${fixedCount} erreur(s) corrigée(s) et fichier sauvegardé`);
} else {
    console.log('ℹ️ Aucune erreur trouvée à corriger');
    
    // Diagnostic: chercher des patterns similaires
    const lines = content.split('\n');
    let foundLines = [];
    lines.forEach((line, index) => {
        if (line.includes('flags: 64 }') && line.includes('MessageFlags')) {
            foundLines.push(`Ligne ${index + 1}: ${line.trim()}`);
        }
    });
    
    if (foundLines.length > 0) {
        console.log('\n🔍 Lignes contenant "flags: 64 }" et "MessageFlags":');
        foundLines.slice(0, 5).forEach(line => console.log(line));
        if (foundLines.length > 5) {
            console.log(`... et ${foundLines.length - 5} autres lignes`);
        }
    }
}

console.log('🎉 Script terminé !');