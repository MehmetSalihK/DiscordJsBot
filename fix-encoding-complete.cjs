const fs = require('fs');

console.log('🔧 Correction complète des caractères d\'encodage corrompus...');

const filePath = process.argv[2] || 'music/queueManager.js';

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
    
    // Remplacements pour les caractères français corrompus
    const replacements = [
        // Caractères français corrompus
        { from: /Ã©/g, to: 'é', name: 'é accent aigu' },
        { from: /Ã¨/g, to: 'è', name: 'è accent grave' },
        { from: /Ã /g, to: 'à', name: 'à accent grave' },
        { from: /Ã§/g, to: 'ç', name: 'ç cédille' },
        { from: /Ã´/g, to: 'ô', name: 'ô circonflexe' },
        { from: /Ã¢/g, to: 'â', name: 'â circonflexe' },
        { from: /Ãª/g, to: 'ê', name: 'ê circonflexe' },
        { from: /Ã®/g, to: 'î', name: 'î circonflexe' },
        { from: /Ã»/g, to: 'û', name: 'û circonflexe' },
        { from: /Ã¯/g, to: 'ï', name: 'ï tréma' },
        { from: /Ã¼/g, to: 'ü', name: 'ü tréma' },
        { from: /Ã«/g, to: 'ë', name: 'ë tréma' },
        { from: /Ã¶/g, to: 'ö', name: 'ö tréma' },
        { from: /Ã¤/g, to: 'ä', name: 'ä tréma' },
        { from: /Ã¡/g, to: 'á', name: 'á accent aigu' },
        { from: /Ã­/g, to: 'í', name: 'í accent aigu' },
        { from: /Ã³/g, to: 'ó', name: 'ó accent aigu' },
        { from: /Ãº/g, to: 'ú', name: 'ú accent aigu' },
        { from: /Ã½/g, to: 'ý', name: 'ý accent aigu' },
        
        // Emojis corrompus restants
        { from: /âœ…/g, to: '✅', name: 'checkmark' },
        { from: /âŒ/g, to: '❌', name: 'cross' },
        { from: /âš ï¸/g, to: '⚠️', name: 'warning' },
        { from: /âš¡/g, to: '⚡', name: 'lightning' },
        { from: /ðŸš€/g, to: '🚀', name: 'rocket' },
        { from: /ðŸ"§/g, to: '🔧', name: 'wrench' },
        { from: /ðŸ"'/g, to: '🔑', name: 'key' },
        { from: /ðŸ"˜/g, to: '📘', name: 'blue book' },
        { from: /ðŸ†"/g, to: '🆔', name: 'id' },
        { from: /ðŸ"‹/g, to: '📋', name: 'clipboard' },
        { from: /ðŸ"„/g, to: '🔄', name: 'refresh' },
        { from: /ðŸ"—/g, to: '🔗', name: 'link' },
        { from: /ðŸ"­/g, to: '🔭', name: 'telescope' },
        { from: /ðŸ"‰/g, to: '🔉', name: 'volume down' },
        { from: /ðŸ""/g, to: '🔍', name: 'search' },
        { from: /ðŸ·ï¸/g, to: '🏷️', name: 'label' },
        { from: /ðŸŽ¤/g, to: '🎤', name: 'microphone' },
        { from: /ðŸŽ›ï¸/g, to: '🎛️', name: 'control knobs' },
        { from: /ðŸŒŠ/g, to: '🌊', name: 'wave' },
        { from: /ðŸš«/g, to: '🚫', name: 'prohibited' },
        { from: /ðŸ'‹/g, to: '👋', name: 'waving hand' },
        { from: /ðŸŽ¯/g, to: '🎯', name: 'target' },
        { from: /â–¶ï¸/g, to: '▶️', name: 'play' },
        { from: /â¹ï¸/g, to: '⏹️', name: 'stop' },
        { from: /â­ï¸/g, to: '⭐', name: 'star' },
        { from: /â¯ï¸/g, to: '⏯️', name: 'play pause' },
        { from: /ðŸŽµ/g, to: '🎵', name: 'music' },
        { from: /ðŸ'¤/g, to: '👤', name: 'user' },
        { from: /ðŸ /g, to: '🏠', name: 'house' },
        { from: /ðŸ"Š/g, to: '🔊', name: 'speaker' },
        { from: /ðŸ"/g, to: '🔍', name: 'search' },
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