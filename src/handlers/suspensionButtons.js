import { EmbedBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { 
    applySuspension, 
    removeSuspension, 
    getUserData,
    logSuccess, 
    logError 
} from './progressiveSuspensions.js';

// Handler pour les boutons du panneau staff
export async function handleSuspensionButtons(interaction) {
    try {
        // Vérifier les permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Permissions insuffisantes')
                .setDescription('Vous n\'avez pas la permission de modérer les membres.')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        const [action, userId] = interaction.customId.split('_').slice(2); // Enlever le préfixe 'suspension_staff'
        
        // Récupérer l'utilisateur
        const targetUser = await interaction.client.users.fetch(userId).catch(() => null);
        if (!targetUser) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Utilisateur non trouvé')
                .setDescription('Impossible de trouver cet utilisateur.')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        // Vérifier que l'utilisateur est dans le serveur
        const targetMember = await interaction.guild.members.fetch(userId).catch(() => null);
        if (!targetMember) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Membre non trouvé')
                .setDescription('Cet utilisateur n\'est plus membre de ce serveur.')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        let resultEmbed;
        
        switch (action) {
            case 'cancel':
                await removeSuspension(interaction.guild, targetUser, interaction.user);
                resultEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('✅ Sanction annulée')
                    .setDescription(`La sanction de ${targetUser} a été annulée.`)
                    .addFields(
                        { name: '👮 Modérateur', value: `${interaction.user}`, inline: true },
                        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    )
                    .setThumbnail(targetUser.displayAvatarURL())
                    .setTimestamp()
                    .setFooter({ text: 'Système de Suspensions Progressives' });
                
                logSuccess(`Sanction annulée pour ${targetUser.username} par ${interaction.user.username}`);
                break;

            case 'level1':
                await applySuspension(interaction.guild, targetUser, 1, 'Suspension niveau 1 via panneau staff', interaction.user);
                resultEmbed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('🚫 Suspension Niveau 1 appliquée')
                    .setDescription(`${targetUser} a été suspendu niveau 1.`)
                    .addFields(
                        { name: '📋 Raison', value: 'Suspension niveau 1 via panneau staff', inline: false },
                        { name: '👮 Modérateur', value: `${interaction.user}`, inline: true },
                        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    )
                    .setThumbnail(targetUser.displayAvatarURL())
                    .setTimestamp()
                    .setFooter({ text: 'Système de Suspensions Progressives' });
                
                logSuccess(`Suspension niveau 1 appliquée à ${targetUser.username} par ${interaction.user.username} via panneau staff`);
                break;

            case 'level2':
                await applySuspension(interaction.guild, targetUser, 2, 'Suspension niveau 2 via panneau staff', interaction.user);
                resultEmbed = new EmbedBuilder()
                    .setColor('#FF6B6B')
                    .setTitle('⛔ Suspension Niveau 2 appliquée')
                    .setDescription(`${targetUser} a été suspendu niveau 2.`)
                    .addFields(
                        { name: '📋 Raison', value: 'Suspension niveau 2 via panneau staff', inline: false },
                        { name: '👮 Modérateur', value: `${interaction.user}`, inline: true },
                        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    )
                    .setThumbnail(targetUser.displayAvatarURL())
                    .setTimestamp()
                    .setFooter({ text: 'Système de Suspensions Progressives' });
                
                logSuccess(`Suspension niveau 2 appliquée à ${targetUser.username} par ${interaction.user.username} via panneau staff`);
                break;

            case 'level3':
                await applySuspension(interaction.guild, targetUser, 3, 'Suspension niveau 3 via panneau staff', interaction.user);
                resultEmbed = new EmbedBuilder()
                    .setColor('#8B0000')
                    .setTitle('🚷 Suspension Niveau 3 appliquée')
                    .setDescription(`${targetUser} a été suspendu niveau 3.`)
                    .addFields(
                        { name: '📋 Raison', value: 'Suspension niveau 3 via panneau staff', inline: false },
                        { name: '👮 Modérateur', value: `${interaction.user}`, inline: true },
                        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    )
                    .setThumbnail(targetUser.displayAvatarURL())
                    .setTimestamp()
                    .setFooter({ text: 'Système de Suspensions Progressives' });
                
                logSuccess(`Suspension niveau 3 appliquée à ${targetUser.username} par ${interaction.user.username} via panneau staff`);
                break;

            case 'ban':
                try {
                    await targetMember.ban({ reason: 'Ban permanent via panneau staff' });
                    resultEmbed = new EmbedBuilder()
                        .setColor('#000000')
                        .setTitle('🔨 Ban permanent appliqué')
                        .setDescription(`${targetUser} a été banni définitivement du serveur.`)
                        .addFields(
                            { name: '📋 Raison', value: 'Ban permanent via panneau staff', inline: false },
                            { name: '👮 Modérateur', value: `${interaction.user}`, inline: true },
                            { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                        )
                        .setThumbnail(targetUser.displayAvatarURL())
                        .setTimestamp()
                        .setFooter({ text: 'Système de Suspensions Progressives' });
                    
                    logSuccess(`Ban permanent appliqué à ${targetUser.username} par ${interaction.user.username} via panneau staff`);
                } catch (error) {
                    logError(`Erreur lors du ban de ${targetUser.username}: ${error.message}`);
                    resultEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Erreur lors du ban')
                        .setDescription('Impossible de bannir cet utilisateur. Vérifiez les permissions.')
                        .setTimestamp();
                }
                break;

            default:
                resultEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Action inconnue')
                    .setDescription('Cette action n\'est pas reconnue.')
                    .setTimestamp();
        }

        await interaction.reply({ embeds: [resultEmbed], flags: MessageFlags.Ephemeral });

        // Mettre à jour l'embed original pour indiquer que l'action a été effectuée
        if (action !== 'ban' || !resultEmbed.data.title.includes('Erreur')) {
            try {
                const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0]);
                originalEmbed.addFields({ 
                    name: '🔄 Action effectuée', 
                    value: `${getActionName(action)} par ${interaction.user} le <t:${Math.floor(Date.now() / 1000)}:F>`, 
                    inline: false 
                });
                originalEmbed.setColor('#808080'); // Gris pour indiquer que c'est traité
                
                await interaction.message.edit({ 
                    embeds: [originalEmbed], 
                    components: [] // Retirer les boutons
                });
            } catch (error) {
                logError(`Erreur lors de la mise à jour de l'embed original: ${error.message}`);
            }
        }

    } catch (error) {
        logError(`Erreur dans handleSuspensionButtons: ${error.message}`);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors du traitement de cette action.')
            .setTimestamp();
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }
    }
}

function getActionName(action) {
    const actionNames = {
        'cancel': '🟢 Sanction annulée',
        'level1': '⏸️ Suspension Niveau 1',
        'level2': '⛔ Suspension Niveau 2',
        'level3': '🚷 Suspension Niveau 3',
        'ban': '🔨 Ban permanent'
    };
    return actionNames[action] || 'Action inconnue';
}