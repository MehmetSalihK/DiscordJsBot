// Test des imports du système XP
console.log('🔍 Test des imports XP...');

try {
    console.log('1. Test import messageXPHandler...');
    const messageXPHandler = await import('./src/utils/messageXpHandler.js');
    console.log('✅ messageXPHandler importé:', typeof messageXPHandler.default);
    
    console.log('2. Test import voiceXPHandler...');
    const voiceXPHandler = await import('./src/utils/voiceXpHandler.js');
    console.log('✅ voiceXPHandler importé:', typeof voiceXPHandler.default);
    
    console.log('3. Test import XPCalculator...');
    const XPCalculator = await import('./src/utils/xpCalculator.js');
    console.log('✅ XPCalculator importé:', typeof XPCalculator.default);
    
    console.log('4. Test import xpDataManager...');
    const xpDataManager = await import('./src/utils/xpDataManager.js');
    console.log('✅ xpDataManager importé:', typeof xpDataManager.default);
    
    console.log('🎉 Tous les imports fonctionnent !');
    
} catch (error) {
    console.error('❌ Erreur lors des imports:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
}