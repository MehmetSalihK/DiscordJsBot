import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script pour corriger le GUILD_ID dans .env
 */
function fixGuildId() {
    console.log('🔧 Correction du GUILD_ID...\n');

    const envPath = path.join(__dirname, '.env');
    
    try {
        let envContent = fs.readFileSync(envPath, 'utf8');
        
        // Vérifier si GUILD_ID contient la valeur placeholder
        if (envContent.includes('GUILD_ID=VOTRE_SERVER_ID_ICI')) {
            console.log('❌ GUILD_ID contient encore la valeur placeholder');
            console.log('\n🔄 Options de correction :');
            console.log('1. Commenter GUILD_ID pour utiliser l\'enregistrement global (lent)');
            console.log('2. Garder la ligne pour que vous puissiez la modifier manuellement');
            
            // Option 1: Commenter GUILD_ID pour éviter l'erreur
            envContent = envContent.replace(
                'GUILD_ID=VOTRE_SERVER_ID_ICI',
                '# GUILD_ID=VOTRE_SERVER_ID_ICI  # Décommentez et remplacez par l\'ID de votre serveur'
            );
            
            fs.writeFileSync(envPath, envContent);
            
            console.log('✅ GUILD_ID commenté dans .env');
            console.log('📝 Les commandes seront enregistrées globalement (propagation lente)');
            console.log('\n💡 Pour un enregistrement rapide :');
            console.log('1. Obtenez l\'ID de votre serveur Discord :');
            console.log('   - Mode développeur → Clic droit sur serveur → Copier l\'ID');
            console.log('2. Décommentez et modifiez la ligne dans .env :');
            console.log('   GUILD_ID=123456789012345678');
            console.log('3. Relancez l\'enregistrement');
            
        } else {
            console.log('✅ GUILD_ID semble correct ou déjà commenté');
        }
        
    } catch (error) {
        console.error('❌ Erreur :', error.message);
    }
}

fixGuildId();