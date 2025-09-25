import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { applySuspension, removeSuspension, getUserData, logSuccess, logError } from '../../../src/handlers/progressiveSuspensions.js';

export default {
    name: 'suspension',
    description: 'Gérer les suspensions d\'un utilisateur',
    usage: '!suspension <niveau|remove> @utilisateur [durée] [raison]',
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
            if (args.length < 2) {
                const usageEmbed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('📋 Utilisation de la commande')
                    .setDescription('**Usage:** `!suspension <niveau|remove> @utilisateur [durée] [raison]`')
                    .addFields(
                        { name: 'Niveaux disponibles', value: '`1` - Suspension niveau 1\n`2` - Suspension niveau 2\n`3` - Suspension niveau 3\n`remove` - Retirer la suspension', inline: false },
                        { name: 'Exemples', value: '`!suspension 1 @user123 30m Spam`\n`!suspension 2 @user123 24h Comportement toxique`\n`!suspension remove @user123`', inline: false }
                    )
                    .setTimestamp();
                
                return await message.reply({ embeds: [usageEmbed] });
            }
            
            const action = args[0].toLowerCase();
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
            
            // Vérifications de sécurité
            if (targetUser.id === message.author.id) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Action impossible')
                    .setDescription('Vous ne pouvez pas vous suspendre vous-même.')
                    .setTimestamp();
                
                return await message.reply({ embeds: [errorEmbed] });
            }
            
            if (targetUser.bot) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Action impossible')
                    .setDescription('Vous ne pouvez pas suspendre un bot.')
                    .setTimestamp();
                
                return await message.reply({ embeds: [errorEmbed] });
            }
            
            // Traitement selon l'action
            if (action === 'remove') {
                await removeSuspension(message.guild, targetUser);
                
                const successEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('✅ Suspension retirée')
                    .setDescription(`La suspension de ${targetUser} a été retirée avec succès.`)
                    .addFields(
                        { name: '👮 Modérateur', value: `${message.author}`, inline: true },
                        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    )
                    .setThumbnail(targetUser.displayAvatarURL())
                    .setTimestamp()
                    .setFooter({ text: 'Système de Suspensions Progressives' });
                
                await message.reply({ embeds: [successEmbed] });
                logSuccess(`Suspension retirée pour ${targetUser.username} par ${message.author.username}`);
                
            } else if (['1', '2', '3'].includes(action)) {
                const level = parseInt(action);
                const duration = args[2] || null;
                const reason = args.slice(3).join(' ') || 'Aucune raison spécifiée';
                
                await applySuspension(message.guild, targetUser, level, message.author, reason, duration);
                
                const levelNames = { 1: 'Niveau 1', 2: 'Niveau 2', 3: 'Niveau 3' };
                const levelColors = { 1: '#FFA500', 2: '#FF6B6B', 3: '#8B0000' };
                
                const successEmbed = new EmbedBuilder()
                    .setColor(levelColors[level])
                    .setTitle(`🚫 Suspension ${levelNames[level]} appliquée`)
                    .setDescription(`${targetUser} a été suspendu ${levelNames[level].toLowerCase()}.`)
                    .addFields(
                        { name: '📋 Raison', value: reason, inline: false },
                        { name: '👮 Modérateur', value: `${message.author}`, inline: true },
                        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    )
                    .setThumbnail(targetUser.displayAvatarURL())
                    .setTimestamp()
                    .setFooter({ text: 'Système de Suspensions Progressives' });
                
                if (duration) {
                    successEmbed.addFields({ name: '⏰ Durée', value: duration, inline: true });
                }
                
                await message.reply({ embeds: [successEmbed] });
                logSuccess(`Suspension niveau ${level} appliquée à ${targetUser.username} par ${message.author.username} - Raison: ${reason}`);
                
            } else {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Action invalide')
                    .setDescription('Actions disponibles: `1`, `2`, `3`, `remove`')
                    .setTimestamp();
                
                return await message.reply({ embeds: [errorEmbed] });
            }
            
        } catch (error) {
            logError(`Erreur dans la commande suspension: ${error.message}`);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Erreur')
                .setDescription('Une erreur est survenue lors de l\'exécution de la commande.')
                .setTimestamp();
            
            await message.reply({ embeds: [errorEmbed] });
        }
    }
};