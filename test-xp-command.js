import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testXPCommand() {
    console.log('🔍 Test de la commande XP...\n');
    
    try {
        // Import de la commande XP slash
        console.log('📦 Import de la commande XP slash...');
        const slashXpCommand = await import('./commands/slashcommands/utilisateur/xp.js');
        console.log('✅ Commande XP slash importée');
        
        // Vérifier la structure
        const command = slashXpCommand.default;
        console.log('📋 Structure de la commande:');
        console.log('  - data:', command.data ? '✅' : '❌');
        console.log('  - execute:', typeof command.execute === 'function' ? '✅' : '❌');
        
        // Test des imports dans la commande
        console.log('\n🔧 Test des utilitaires...');
        
        const messageXPHandler = await import('./src/utils/messageXpHandler.js');
        const voiceXPHandler = await import('./src/utils/voiceXpHandler.js');
        const XPCalculator = await import('./src/utils/xpCalculator.js');
        const xpDataManager = await import('./src/utils/xpDataManager.js');
        
        console.log('✅ Tous les utilitaires importés');
        
        // Test d'une méthode critique
        console.log('\n🎯 Test des méthodes critiques...');
        
        try {
            const config = await xpDataManager.default.getLevelConfig();
            console.log('✅ Configuration XP chargée:', config.enabled ? 'Activée' : 'Désactivée');
        } catch (error) {
            console.error('❌ Erreur lors du chargement de la configuration:', error.message);
        }
        
        try {
            // Test avec des données fictives
            const fakeGuildId = '123456789';
            const fakeUserId = '987654321';
            
            const stats = await messageXPHandler.default.getUserStats(fakeGuildId, fakeUserId);
            console.log('✅ getUserStats fonctionne:', stats ? 'OK' : 'Données vides');
        } catch (error) {
            console.error('❌ Erreur getUserStats:', error.message);
        }
        
        console.log('\n✅ Test de la commande XP terminé !');
        
    } catch (error) {
        console.error('❌ Erreur lors du test:', error);
        console.error('Stack:', error.stack);
    }
}

testXPCommand();