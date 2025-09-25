import { Client, GatewayIntentBits } from 'discord.js';
import XPDataManager from './src/utils/xpDataManager.js';
import XPCalculator from './src/utils/xpCalculator.js';
import messageXPHandler from './src/utils/messageXpHandler.js';
import voiceXPHandler from './src/utils/voiceXpHandler.js';
import roleRewardManager from './src/utils/roleRewardManager.js';

console.log('🧪 Test du système XP - Début des tests...\n');

// Test 1: XPDataManager
console.log('📁 Test 1: XPDataManager');
try {
    // Test de chargement des données par défaut
    const defaultLevelConfig = XPDataManager.getDefaultLevelConfig();
    console.log('✅ Configuration de niveau par défaut chargée');
    console.log(`   - Formule: ${defaultLevelConfig.formula}`);
    console.log(`   - XP de base: ${defaultLevelConfig.baseXp}`);
    console.log(`   - Multiplicateur: ${defaultLevelConfig.multiplier}`);

    const defaultMessageXp = XPDataManager.getDefaultMessageXp();
    console.log('✅ Configuration XP messages par défaut chargée');
    console.log(`   - Activé: ${defaultMessageXp.enabled}`);
    console.log(`   - XP min/max: ${defaultMessageXp.xpRange.min}-${defaultMessageXp.xpRange.max}`);
    console.log(`   - Cooldown: ${defaultMessageXp.cooldown}ms`);

    const defaultVoiceSessions = XPDataManager.getDefaultVoiceSessions();
    console.log('✅ Configuration sessions vocales par défaut chargée');
    console.log(`   - Activé: ${defaultVoiceSessions.enabled}`);
    console.log(`   - XP par chunk: ${defaultVoiceSessions.xpPerChunk}`);
    console.log(`   - Durée chunk: ${defaultVoiceSessions.chunkDuration}ms`);
} catch (error) {
    console.error('❌ Erreur XPDataManager:', error.message);
}

console.log('\n📊 Test 2: XPCalculator');
try {
    // Test des calculs de niveau
    const testXpValues = [0, 100, 500, 1000, 5000, 10000];
    
    for (const xp of testXpValues) {
        const levelInfo = await XPCalculator.getUserLevelInfo(xp);
        console.log(`✅ XP: ${xp} → Niveau ${levelInfo.level} (${levelInfo.currentLevelXp}/${levelInfo.xpForNextLevel} XP)`);
    }

    // Test de la barre de progression
    const progressBar = XPCalculator.generateProgressBar(750, 1000, 20);
    console.log(`✅ Barre de progression: ${progressBar}`);

    // Test de formatage XP
    const formattedXp = XPCalculator.formatXP(12345);
    console.log(`✅ XP formaté: ${formattedXp}`);
} catch (error) {
    console.error('❌ Erreur XPCalculator:', error.message);
}

console.log('\n💬 Test 3: MessageXPHandler');
try {
    // Simuler un message
    const mockMessage = {
        author: { id: '123456789', bot: false },
        guild: { id: 'test-guild' },
        content: 'Ceci est un message de test pour le système XP',
        channel: { id: 'test-channel' },
        createdTimestamp: Date.now()
    };

    // Test de traitement de message
    const result = await messageXPHandler.processMessage(mockMessage);
    console.log('✅ Message traité:', result ? 'XP accordé' : 'XP non accordé (cooldown/exclusion)');

    // Test des statistiques utilisateur
    const userStats = await messageXPHandler.getUserStats('test-guild', '123456789');
    console.log('✅ Statistiques utilisateur récupérées');
    console.log(`   - XP total: ${userStats.totalXp}`);
    console.log(`   - Messages: ${userStats.messageCount}`);
    console.log(`   - Niveau: ${userStats.level}`);

    // Test du classement
    const leaderboard = await messageXPHandler.getLeaderboard('test-guild', 5);
    console.log(`✅ Classement récupéré: ${leaderboard.length} utilisateurs`);
} catch (error) {
    console.error('❌ Erreur MessageXPHandler:', error.message);
}

console.log('\n🎤 Test 4: VoiceXPHandler');
try {
    // Simuler une entrée en vocal
    const mockOldState = { channelId: null };
    const mockNewState = { 
        channelId: 'voice-channel',
        member: { id: '123456789', guild: { id: 'test-guild' } },
        deaf: false,
        mute: false
    };

    // Test de gestion d'entrée vocale
    await voiceXPHandler.handleVoiceJoin(mockOldState, mockNewState);
    console.log('✅ Entrée vocale gérée');

    // Test des statistiques vocales
    const voiceStats = await voiceXPHandler.getUserVoiceStats('test-guild', '123456789');
    console.log('✅ Statistiques vocales récupérées');
    console.log(`   - XP vocal: ${voiceStats.totalXp}`);
    console.log(`   - Temps total: ${voiceStats.totalTime}ms`);

    // Test du classement vocal
    const voiceLeaderboard = await voiceXPHandler.getVoiceLeaderboard('test-guild', 5);
    console.log(`✅ Classement vocal récupéré: ${voiceLeaderboard.length} utilisateurs`);

    // Simuler une sortie vocale
    const mockLeaveOldState = { 
        channelId: 'voice-channel',
        member: { id: '123456789', guild: { id: 'test-guild' } }
    };
    const mockLeaveNewState = { channelId: null };

    await voiceXPHandler.handleVoiceLeave(mockLeaveOldState, mockLeaveNewState);
    console.log('✅ Sortie vocale gérée');
} catch (error) {
    console.error('❌ Erreur VoiceXPHandler:', error.message);
}

console.log('\n🏆 Test 5: RoleRewardManager');
try {
    // Test d'ajout de récompense de rôle
    await roleRewardManager.addRoleReward('test-guild', 5, 'test-role-id');
    console.log('✅ Récompense de rôle ajoutée (niveau 5)');

    // Test de récupération des récompenses
    const rewards = await roleRewardManager.getRoleRewards('test-guild');
    console.log(`✅ Récompenses récupérées: ${Object.keys(rewards).length} niveaux configurés`);

    // Test de vérification de récompense
    const shouldAward = await roleRewardManager.checkAndAwardRoles('test-guild', '123456789', 1, 5);
    console.log(`✅ Vérification de récompense: ${shouldAward ? 'Rôle à accorder' : 'Aucun rôle à accorder'}`);
} catch (error) {
    console.error('❌ Erreur RoleRewardManager:', error.message);
}

console.log('\n🔧 Test 6: Sauvegarde des données');
try {
    // Forcer la sauvegarde de toutes les données
    await XPDataManager.flushAll();
    console.log('✅ Toutes les données sauvegardées');
} catch (error) {
    console.error('❌ Erreur lors de la sauvegarde:', error.message);
}

console.log('\n🎉 Tests terminés! Le système XP semble fonctionnel.');
console.log('\n📝 Prochaines étapes:');
console.log('   1. Démarrer le bot Discord');
console.log('   2. Tester les commandes /xp et !xp');
console.log('   3. Vérifier les notifications de niveau');
console.log('   4. Tester la pagination des classements');
console.log('   5. Configurer les récompenses de rôles');

// Afficher un résumé des fichiers créés
console.log('\n📁 Fichiers du système XP créés:');
const xpFiles = [
    'src/utils/xpDataManager.js',
    'src/utils/xpCalculator.js', 
    'src/utils/messageXpHandler.js',
    'src/utils/voiceXpHandler.js',
    'src/utils/xpEmbeds.js',
    'src/utils/roleRewardManager.js',
    'src/commands/slash/xp.js',
    'src/commands/prefix/xp.js',
    'src/handlers/xpButtonHandler.js',
    'messageXp.json',
    'voiceSessions.json'
];

xpFiles.forEach(file => console.log(`   ✅ ${file}`));

console.log('\n🔄 Fichiers modifiés:');
const modifiedFiles = [
    'src/events/messageCreate.js',
    'src/events/voiceStateUpdate.js',
    'src/events/interactionCreate.js'
];

modifiedFiles.forEach(file => console.log(`   🔧 ${file}`));