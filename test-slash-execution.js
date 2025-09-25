import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock interaction object pour tester
const mockInteraction = {
    options: {
        getSubcommand: () => 'profil',
        getUser: () => null
    },
    user: {
        id: '123456789',
        tag: 'TestUser#1234',
        displayAvatarURL: () => 'https://example.com/avatar.png'
    },
    guild: {
        id: '987654321',
        name: 'Test Guild',
        members: {
            fetch: async (userId) => ({
                id: userId,
                displayName: 'Test User',
                user: mockInteraction.user
            })
        },
        iconURL: () => 'https://example.com/guild.png'
    },
    reply: async (options) => {
        console.log('📤 Réponse de l\'interaction:', JSON.stringify(options, null, 2));
        return { id: 'mock-message-id' };
    },
    followUp: async (options) => {
        console.log('📤 Follow-up de l\'interaction:', JSON.stringify(options, null, 2));
        return { id: 'mock-followup-id' };
    },
    replied: false,
    deferred: false
};

async function testSlashExecution() {
    console.log('🔍 Test d\'exécution de la commande slash XP...');
    
    try {
        // Import de la commande
        const xpCommandPath = path.join(__dirname, 'commands', 'slashcommands', 'utilisateur', 'xp.js');
        const xpCommandURL = pathToFileURL(xpCommandPath).href;
        const xpCommand = await import(xpCommandURL);
        
        console.log('✅ Commande importée avec succès');
        
        // Test d'exécution
        console.log('\n🚀 Exécution de la commande...');
        await xpCommand.default.execute(mockInteraction);
        
        console.log('\n🎉 Commande exécutée avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'exécution:', error);
        console.error('📍 Stack trace:', error.stack);
        
        // Analyser l'erreur
        if (error.message.includes('Cannot find module')) {
            console.error('🔍 Problème d\'import détecté');
        } else if (error.message.includes('is not a function')) {
            console.error('🔍 Problème de fonction détecté');
        } else if (error.message.includes('Cannot read properties')) {
            console.error('🔍 Problème d\'accès aux propriétés détecté');
        }
    }
}

testSlashExecution();