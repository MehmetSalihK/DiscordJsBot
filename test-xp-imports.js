import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testImports() {
    console.log('🔍 Test des imports XP...\n');
    
    try {
        console.log('📦 Import de messageXpHandler...');
        const messageXPHandler = await import('./src/utils/messageXpHandler.js');
        console.log('✅ messageXpHandler importé:', typeof messageXPHandler.default);
        
        console.log('📦 Import de voiceXpHandler...');
        const voiceXPHandler = await import('./src/utils/voiceXpHandler.js');
        console.log('✅ voiceXpHandler importé:', typeof voiceXPHandler.default);
        
        console.log('📦 Import de XPCalculator...');
        const XPCalculator = await import('./src/utils/xpCalculator.js');
        console.log('✅ XPCalculator importé:', typeof XPCalculator.default);
        
        console.log('📦 Import de xpDataManager...');
        const xpDataManager = await import('./src/utils/xpDataManager.js');
        console.log('✅ xpDataManager importé:', typeof xpDataManager.default);
        
        console.log('\n🎯 Test des méthodes...');
        
        // Test d'une méthode simple
        if (xpDataManager.default && typeof xpDataManager.default.getLevelConfig === 'function') {
            console.log('✅ xpDataManager.getLevelConfig existe');
            const config = await xpDataManager.default.getLevelConfig();
            console.log('✅ Configuration chargée:', config ? 'OK' : 'ERREUR');
        } else {
            console.log('❌ xpDataManager.getLevelConfig n\'existe pas');
        }
        
        if (messageXPHandler.default && typeof messageXPHandler.default.getUserStats === 'function') {
            console.log('✅ messageXPHandler.getUserStats existe');
        } else {
            console.log('❌ messageXPHandler.getUserStats n\'existe pas');
        }
        
        console.log('\n✅ Tous les imports sont fonctionnels !');
        
    } catch (error) {
        console.error('❌ Erreur lors des imports:', error);
        console.error('Stack:', error.stack);
    }
}

testImports();