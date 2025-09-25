import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { addWarning, getUserData, logSuccess, logError } from '../../../src/handlers/progressiveSuspensions.js';

export default {
    name: 'warn',
    description: 'Donner un avertissement à un utilisateur',
    usage: '!warn @utilisateur [raison]',
    category: 'admin',
    permissions: [PermissionFlagsBits.ModerateMembers],
    
    async execute(message, args) {
        try {
            // Vérifier les permissions
            if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Permissions insuffisantes')
                    .setDescription('Vous n\'avez pas la permission de modérer les membres.')
                    .setTimestamp();
                
                return await message.reply({ embeds: [errorEmbed] });
            }
            
            // Vérifier les arguments
            if (args.length < 1) {
                const usageEmbed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('📋 Utilisation de la commande')
                    .setDescription('**Usage:** `!warn @utilisateur [raison]`')
                    .addFields(
                        { name: 'Exemples', value: '`!warn @user123 Spam dans le chat`\n`!warn @user123`', inline: false }
                    )
                    .setTimestamp();
                
                return await message.reply({ embeds: [usageEmbed] });
            }
            
            // Récupérer l'utilisateur mentionné
            const targetUser = message.mentions.users.first();
            if (!targetUser) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Utilisateur non trouvé')
                    .setDescription('Veuillez mentionner un utilisateur valide.')
                    .setTimestamp();
                
                return await message.reply({ embeds: [errorEmbed] });
            }
            
            // Vérifier que l'utilisateur est dans le serveur
            const targetMember = await message.guild.members.fetch(targetUser.id).catch(() => null);
            if (!targetMember) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Membre non trouvé')
                    .setDescription('Cet utilisateur n\'est pas membre de ce serveur.')
                    .setTimestamp();
                
                return await message.reply({ embeds: [errorEmbed] });
            }
            
            // Vérifier qu'on ne peut pas s'avertir soi-même
            if (targetUser.id === message.author.id) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Action impossible')
                    .setDescription('Vous ne pouvez pas vous donner un avertissement à vous-même.')
                    .setTimestamp();
                
                return await message.reply({ embeds: [errorEmbed] });
            }
            
            // Vérifier qu'on ne peut pas avertir le bot
            if (targetUser.bot) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Action impossible')
                    .setDescription('Vous ne pouvez pas donner un avertissement à un bot.')
                    .setTimestamp();
                
                return await message.reply({ embeds: [errorEmbed] });
            }
            
            // Récupérer la raison
            const reason = args.slice(1).join(' ') || 'Aucune raison spécifiée';
            
            // Ajouter l'avertissement
            const userData = await addWarning(message.guild, targetUser, message.author, reason);
            
            // Créer l'embed de confirmation
            const confirmEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('⚠️ Avertissement donné')
                .setDescription(`${targetUser} a reçu un avertissement **(${userData.warnings}/3)**.`)
                .addFields(
                    { name: '📋 Raison', value: reason, inline: false },
                    { name: '👮 Modérateur', value: `${message.author}`, inline: true },
                    { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                )
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp()
                .setFooter({ text: 'Système de Suspensions Progressives' });
            
            // Ajouter un champ si c'est le 3ème avertissement
            if (userData.warnings >= 3) {
                confirmEmbed.addFields(
                    { name: '🚫 Suspension automatique', value: 'L\'utilisateur a été automatiquement suspendu niveau 1.', inline: false }
                );
                confirmEmbed.setColor('#FF6B6B');
            }
            
            await message.reply({ embeds: [confirmEmbed] });
            
            logSuccess(`Avertissement donné à ${targetUser.username} par ${message.author.username} - Raison: ${reason}`);
            
        } catch (error) {
            logError(`Erreur dans la commande warn: ${error.message}`);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Erreur')
                .setDescription('Une erreur est survenue lors de l\'exécution de la commande.')
                .setTimestamp();
            
            await message.reply({ embeds: [errorEmbed] });
        }
    }
};