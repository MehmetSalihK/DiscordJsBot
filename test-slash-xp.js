import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testSlashXPCommand() {
    console.log('🔍 Test de la commande slash XP...');
    
    try {
        // Test de l'import de la commande slash XP
        const xpCommandPath = path.join(__dirname, 'commands', 'slashcommands', 'utilisateur', 'xp.js');
        console.log('📁 Chemin de la commande:', xpCommandPath);
        
        const xpCommandURL = pathToFileURL(xpCommandPath).href;
        console.log('🔗 URL de la commande:', xpCommandURL);
        
        const xpCommand = await import(xpCommandURL);
        console.log('✅ Import de la commande réussi');
        console.log('📋 Commande data:', xpCommand.default?.data?.name);
        console.log('🔧 Execute function:', typeof xpCommand.default?.execute);
        
        // Test des imports des utilitaires
        console.log('\n🔍 Test des imports des utilitaires...');
        
        const messageXPHandler = await import('./src/utils/messageXpHandler.js');
        console.log('✅ messageXPHandler importé:', typeof messageXPHandler.default);
        
        const voiceXPHandler = await import('./src/utils/voiceXpHandler.js');
        console.log('✅ voiceXPHandler importé:', typeof voiceXPHandler.default);
        
        const XPCalculator = await import('./src/utils/xpCalculator.js');
        console.log('✅ XPCalculator importé:', typeof XPCalculator.default);
        
        const xpDataManager = await import('./src/utils/xpDataManager.js');
        console.log('✅ xpDataManager importé:', typeof xpDataManager.default);
        
        console.log('\n🎉 Tous les imports sont fonctionnels !');
        
    } catch (error) {
        console.error('❌ Erreur lors du test:', error);
        console.error('📍 Stack trace:', error.stack);
    }
}

testSlashXPCommand();