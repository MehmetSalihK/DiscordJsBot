import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script pour configurer GUILD_ID dans le fichier .env
 */
function setupGuildId() {
    console.log('🔧 Configuration de GUILD_ID pour les slash commands\n');

    const envPath = path.join(__dirname, '.env');
    
    try {
        // Lire le fichier .env
        let envContent = fs.readFileSync(envPath, 'utf8');
        
        console.log('📋 Instructions pour obtenir l\'ID de votre serveur Discord :');
        console.log('1. Activez le mode développeur dans Discord :');
        console.log('   Paramètres utilisateur > Avancé > Mode développeur');
        console.log('2. Clic droit sur votre serveur → "Copier l\'ID"');
        console.log('3. Collez l\'ID ci-dessous\n');

        // Vérifier si GUILD_ID est déjà configuré
        const guildIdMatch = envContent.match(/^GUILD_ID=(.+)$/m);
        if (guildIdMatch && guildIdMatch[1] && guildIdMatch[1] !== '') {
            console.log(`✅ GUILD_ID déjà configuré : ${guildIdMatch[1]}`);
            console.log('\n💡 Pour changer l\'ID, modifiez directement le fichier .env');
            console.log('💡 Puis exécutez : node register-guild-commands.js');
            return;
        }

        // Exemple d'ID pour aider l'utilisateur
        console.log('📝 Exemple d\'ID de serveur : 123456789012345678');
        console.log('⚠️  Remplacez par l\'ID réel de votre serveur Discord\n');

        // Décommenter ou ajouter GUILD_ID
        if (envContent.includes('# GUILD_ID')) {
            // Décommenter la ligne existante
            envContent = envContent.replace(/# GUILD_ID.*$/m, 'GUILD_ID=VOTRE_SERVER_ID_ICI');
            console.log('🔄 Ligne GUILD_ID décommentée dans .env');
        } else if (!envContent.includes('GUILD_ID=')) {
            // Ajouter GUILD_ID après CLIENT_ID
            envContent = envContent.replace(
                /^CLIENT_ID=(.+)$/m,
                'CLIENT_ID=$1\nGUILD_ID=VOTRE_SERVER_ID_ICI'
            );
            console.log('➕ Ligne GUILD_ID ajoutée dans .env');
        }

        // Sauvegarder le fichier
        fs.writeFileSync(envPath, envContent);
        
        console.log('✅ Fichier .env mis à jour !');
        console.log('\n📝 Prochaines étapes :');
        console.log('1. Ouvrez le fichier .env');
        console.log('2. Remplacez "VOTRE_SERVER_ID_ICI" par l\'ID réel de votre serveur');
        console.log('3. Exécutez : node register-guild-commands.js');
        console.log('4. Les slash commands seront disponibles immédiatement !');

    } catch (error) {
        console.error('❌ Erreur lors de la configuration :', error.message);
        
        if (error.code === 'ENOENT') {
            console.log('\n💡 Le fichier .env n\'existe pas. Créez-le avec ce contenu :');
            console.log(`
DISCORD_TOKEN=VotreTokenIci
CLIENT_ID=VotreClientIdIci
GUILD_ID=VotreServerIdIci
PREFIX=!
`);
        }
    }
}

// Exécuter le script
setupGuildId();