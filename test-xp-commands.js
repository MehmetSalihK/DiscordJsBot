// Test de chargement des commandes XP
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Test de chargement des commandes XP...\n');

// Test du chargement de la commande slash XP
async function testCommands() {
try {
    const slashXpPath = path.join(__dirname, 'commands', 'slashcommands', 'utilisateur', 'xp.js');
    console.log('📁 Chemin slash XP:', slashXpPath);
    console.log('📄 Fichier existe:', fs.existsSync(slashXpPath));
    
    if (fs.existsSync(slashXpPath)) {
        const slashXpModule = await import(`file://${slashXpPath}`);
        const slashXpCommand = slashXpModule.default;
        console.log('✅ Commande slash XP chargée');
        console.log('📊 Data:', !!slashXpCommand.data);
        console.log('⚡ Execute:', !!slashXpCommand.execute);
        console.log('🏷️  Nom:', slashXpCommand.data?.name);
        console.log('📝 Description:', slashXpCommand.data?.description);
    }
} catch (error) {
    console.error('❌ Erreur lors du chargement de la commande slash XP:', error.message);
}

console.log('\n' + '='.repeat(50) + '\n');

// Test du chargement de la commande prefix XP
try {
    const prefixXpPath = path.join(__dirname, 'commands', 'prefix', 'utilisateur', 'xp.js');
    console.log('📁 Chemin prefix XP:', prefixXpPath);
    console.log('📄 Fichier existe:', fs.existsSync(prefixXpPath));
    
    if (fs.existsSync(prefixXpPath)) {
        const prefixXpModule = await import(`file://${prefixXpPath}`);
        const prefixXpCommand = prefixXpModule.default;
        console.log('✅ Commande prefix XP chargée');
        console.log('🏷️  Nom:', prefixXpCommand.name);
        console.log('📝 Description:', prefixXpCommand.description);
        console.log('⚡ Execute:', !!prefixXpCommand.execute);
        console.log('🔧 Aliases:', prefixXpCommand.aliases);
    }
} catch (error) {
    console.error('❌ Erreur lors du chargement de la commande prefix XP:', error.message);
}

console.log('\n🎯 Test terminé !');
}

testCommands().catch(console.error);