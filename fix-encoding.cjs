const fs = require('fs');

console.log('🔧 Correction des caractères d\'encodage corrompus...');

const filePath = 'music/queueManager.js';

try {
    // Lire le fichier
    if (!fs.existsSync(filePath)) {
        console.error('❌ Fichier non trouvé:', filePath);
        process.exit(1);
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let corrections = 0;
    
    console.log('📄 Fichier lu:', filePath);
    console.log('📊 Taille du fichier:', content.length, 'caractères');
    
    // Remplacements directs des patterns les plus courants
    const replacements = [
        // Checkmark corrompu
        { from: /âœ…/g, to: '✅', name: 'checkmark' },
        // Cross mark corrompu  
        { from: /âŒ/g, to: '❌', name: 'cross' },
        // Warning corrompu
        { from: /âš ï¸/g, to: '⚠️', name: 'warning' },
        // Rocket corrompu
        { from: /ðŸš€/g, to: '🚀', name: 'rocket' },
        // Wrench corrompu
        { from: /ðŸ"§/g, to: '🔧', name: 'wrench' },
        // Key corrompu
        { from: /ðŸ"'/g, to: '🔑', name: 'key' },
        // Play button corrompu
        { from: /â–¶ï¸/g, to: '▶️', name: 'play' },
        // Stop button corrompu
        { from: /â¹ï¸/g, to: '⏹️', name: 'stop' },
        // Music note corrompu
        { from: /ðŸŽµ/g, to: '🎵', name: 'music' },
        // User corrompu
        { from: /ðŸ'¤/g, to: '👤', name: 'user' },
        // House corrompu
        { from: /ðŸ /g, to: '🏠', name: 'house' },
        // Speaker corrompu
        { from: /ðŸ"Š/g, to: '🔊', name: 'speaker' },
        // Search corrompu
        { from: /ðŸ"/g, to: '🔍', name: 'search' },
        // Shuffle corrompu
        { from: /ðŸ"€/g, to: '🔀', name: 'shuffle' }
    ];
    
    let totalErrors = 0;
    
    // Compter les erreurs avant correction
    for (const replacement of replacements) {
        const matches = content.match(replacement.from);
        if (matches) {
            totalErrors += matches.length;
        }
    }
    
    console.log('🔍 Erreurs d\'encodage détectées:', totalErrors);
    
    if (totalErrors === 0) {
        console.log('✅ Aucune erreur d\'encodage trouvée dans le fichier');
        process.exit(0);
    }
    
    // Appliquer les corrections
    for (const replacement of replacements) {
        const matches = content.match(replacement.from);
        if (matches) {
            content = content.replace(replacement.from, replacement.to);
            corrections += matches.length;
            console.log(`🔄 Corrigé ${replacement.name}: ${matches.length} occurrences`);
        }
    }
    
    if (corrections > 0) {
        // Sauvegarder le fichier corrigé
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Fichier corrigé avec succès: ${corrections} corrections appliquées`);
        console.log('📁 Fichier sauvegardé:', filePath);
    } else {
        console.log('ℹ️ Aucune correction nécessaire');
    }
    
} catch (error) {
    console.error('❌ Erreur lors de la correction:', error.message);
    process.exit(1);
}