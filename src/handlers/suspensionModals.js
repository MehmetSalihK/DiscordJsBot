import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { applySuspension, sendSuspensionNotification, sendSuspensionLog } from './suspensionInterface.js';
import { getGuildConfig } from './suspensionRoles.js';
import { addSuspensionTimer } from './suspensionTimers.js';

// Afficher le modal de suspension avec durée custom
async function showCustomSuspensionModal(interaction, level, userId = null) {
    const modal = new ModalBuilder()
        .setCustomId(`suspension_custom_modal_${level}_${userId || 'select'}`)
        .setTitle(`Suspension Niveau ${level} - Durée Custom`);

    const userInput = new TextInputBuilder()
        .setCustomId('target_user')
        .setLabel('Utilisateur à suspendre (ID ou mention)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('123456789012345678 ou @utilisateur')
        .setRequired(!userId)
        .setValue(userId ? `<@${userId}>` : '');

    const durationInput = new TextInputBuilder()
        .setCustomId('duration')
        .setLabel('Durée de la suspension')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex: 2h30m, 1d, 30m, 1w2d')
        .setRequired(true);

    const reasonInput = new TextInputBuilder()
        .setCustomId('reason')
        .setLabel('Raison de la suspension')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Décrivez la raison de cette suspension...')
        .setRequired(false)
        .setMaxLength(1000);

    const notifyInput = new TextInputBuilder()
        .setCustomId('notify_user')
        .setLabel('Notifier l\'utilisateur ? (oui/non)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('oui ou non')
        .setRequired(false)
        .setValue('oui');

    const row1 = new ActionRowBuilder().addComponents(userInput);
    const row2 = new ActionRowBuilder().addComponents(durationInput);
    const row3 = new ActionRowBuilder().addComponents(reasonInput);
    const row4 = new ActionRowBuilder().addComponents(notifyInput);

    modal.addComponents(row1, row2, row3, row4);

    await interaction.showModal(modal);
}

// Afficher le modal d'annulation de suspension
async function showCancelSuspensionModal(interaction, userId = null) {
    const modal = new ModalBuilder()
        .setCustomId(`suspension_cancel_modal_${userId || 'select'}`)
        .setTitle('Annuler une Suspension');

    const userInput = new TextInputBuilder()
        .setCustomId('target_user')
        .setLabel('Utilisateur à désuspendre (ID ou mention)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('123456789012345678 ou @utilisateur')
        .setRequired(!userId)
        .setValue(userId ? `<@${userId}>` : '');

    const reasonInput = new TextInputBuilder()
        .setCustomId('reason')
        .setLabel('Raison de l\'annulation')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Pourquoi annulez-vous cette suspension ?')
        .setRequired(false)
        .setMaxLength(500);

    const notifyInput = new TextInputBuilder()
        .setCustomId('notify_user')
        .setLabel('Notifier l\'utilisateur ? (oui/non)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('oui ou non')
        .setRequired(false)
        .setValue('oui');

    const row1 = new ActionRowBuilder().addComponents(userInput);
    const row2 = new ActionRowBuilder().addComponents(reasonInput);
    const row3 = new ActionRowBuilder().addComponents(notifyInput);

    modal.addComponents(row1, row2, row3);

    await interaction.showModal(modal);
}

// Traiter la soumission du modal de suspension custom
async function handleCustomSuspensionModalSubmit(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        const customId = interaction.customId;
        const level = parseInt(customId.split('_')[3]);
        
        const targetUserInput = interaction.fields.getTextInputValue('target_user');
        const duration = interaction.fields.getTextInputValue('duration');
        const reason = interaction.fields.getTextInputValue('reason') || `Suspension niveau ${level}`;
        const notifyUser = interaction.fields.getTextInputValue('notify_user')?.toLowerCase() === 'oui';

        // Extraire l'ID utilisateur
        let userId;
        const userIdMatch = targetUserInput.match(/(\d{17,19})/);
        if (userIdMatch) {
            userId = userIdMatch[1];
        } else {
            throw new Error('Format d\'utilisateur invalide. Utilisez un ID ou une mention.');
        }

        // Vérifier que l'utilisateur existe
        const targetUser = await interaction.client.users.fetch(userId).catch(() => null);
        if (!targetUser) {
            throw new Error('Utilisateur introuvable.');
        }

        const targetMember = await interaction.guild.members.fetch(userId).catch(() => null);
        if (!targetMember) {
            throw new Error('Cet utilisateur n\'est pas membre du serveur.');
        }

        // Vérifier les permissions
        if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
            throw new Error('Vous ne pouvez pas suspendre cet utilisateur (rôle supérieur ou égal).');
        }

        // Parser la durée
        const durationMs = parseDuration(duration);
        if (durationMs <= 0) {
            throw new Error('Durée invalide. Utilisez le format: 1h30m, 2d, 30m, etc.');
        }

        // Appliquer la suspension
        const result = await applySuspension(interaction.guild, targetUser, level, durationMs, reason, interaction.user);

        if (result.success) {
            // Ajouter le timer
            await addSuspensionTimer(interaction.guild.id, userId, level, Date.now() + durationMs);

            // Notifier l'utilisateur si demandé
            if (notifyUser) {
                await sendSuspensionNotification(targetUser, interaction.guild, level, durationMs, reason);
            }

            // Envoyer le log
            await sendSuspensionLog(interaction.guild, targetUser, level, durationMs, reason, interaction.user);

            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Suspension Appliquée')
                .setDescription(`${targetUser.tag} a été suspendu avec succès.`)
                .setColor('#27ae60')
                .addFields(
                    { name: 'Niveau', value: level.toString(), inline: true },
                    { name: 'Durée', value: formatDuration(durationMs), inline: true },
                    { name: 'Raison', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });
        } else {
            throw new Error(result.error || 'Erreur lors de l\'application de la suspension.');
        }

    } catch (error) {
        // console.error('Erreur lors du traitement du modal de suspension:', error);

        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors de l\'application de la suspension.')
            .setColor('#e74c3c')
            .addFields({
                name: 'Détails',
                value: error.message || 'Erreur inconnue',
                inline: false
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

// Traiter la soumission du modal d'annulation
async function handleCancelSuspensionModalSubmit(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        const targetUserInput = interaction.fields.getTextInputValue('target_user');
        const reason = interaction.fields.getTextInputValue('reason') || 'Annulation de suspension';
        const notifyUser = interaction.fields.getTextInputValue('notify_user')?.toLowerCase() === 'oui';

        // Extraire l'ID utilisateur
        let userId;
        const userIdMatch = targetUserInput.match(/(\d{17,19})/);
        if (userIdMatch) {
            userId = userIdMatch[1];
        } else {
            throw new Error('Format d\'utilisateur invalide. Utilisez un ID ou une mention.');
        }

        // Vérifier que l'utilisateur existe
        const targetUser = await interaction.client.users.fetch(userId).catch(() => null);
        if (!targetUser) {
            throw new Error('Utilisateur introuvable.');
        }

        const targetMember = await interaction.guild.members.fetch(userId).catch(() => null);
        if (!targetMember) {
            throw new Error('Cet utilisateur n\'est pas membre du serveur.');
        }

        // Récupérer la configuration
        const config = await getGuildConfig(interaction.guild.id);
        
        // Vérifier si l'utilisateur est suspendu
        const suspensionRoles = [
            config.roles?.suspension1,
            config.roles?.suspension2,
            config.roles?.suspension3
        ].filter(Boolean);

        const currentSuspensionRole = targetMember.roles.cache.find(role => 
            suspensionRoles.includes(role.id)
        );

        if (!currentSuspensionRole) {
            throw new Error('Cet utilisateur n\'est pas actuellement suspendu.');
        }

        // Retirer le rôle de suspension
        await targetMember.roles.remove(currentSuspensionRole, `Annulation par ${interaction.user.tag}: ${reason}`);

        // Notifier l'utilisateur si demandé
        if (notifyUser) {
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('🔓 Suspension Annulée')
                    .setDescription(`Votre suspension sur **${interaction.guild.name}** a été annulée.`)
                    .setColor('#27ae60')
                    .addFields(
                        { name: 'Raison', value: reason, inline: false },
                        { name: 'Annulée par', value: interaction.user.tag, inline: true }
                    )
                    .setTimestamp();

                await targetUser.send({ embeds: [dmEmbed] });
            } catch (dmError) {
                // console.log('Impossible d\'envoyer un MP à l\'utilisateur:', dmError.message);
            }
        }

        // Envoyer le log
        const config2 = await getGuildConfig(interaction.guild.id);
        if (config2.logsChannel) {
            const logChannel = interaction.guild.channels.cache.get(config2.logsChannel);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('🔓 Suspension Annulée')
                    .setDescription(`Une suspension a été annulée.`)
                    .setColor('#f39c12')
                    .addFields(
                        { name: 'Utilisateur', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                        { name: 'Rôle retiré', value: currentSuspensionRole.name, inline: true },
                        { name: 'Annulée par', value: interaction.user.tag, inline: true },
                        { name: 'Raison', value: reason, inline: false }
                    )
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] });
            }
        }

        const successEmbed = new EmbedBuilder()
            .setTitle('✅ Suspension Annulée')
            .setDescription(`La suspension de ${targetUser.tag} a été annulée avec succès.`)
            .setColor('#27ae60')
            .addFields(
                { name: 'Rôle retiré', value: currentSuspensionRole.name, inline: true },
                { name: 'Raison', value: reason, inline: false }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
        // console.error('Erreur lors de l\'annulation de suspension:', error);

        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors de l\'annulation de la suspension.')
            .setColor('#e74c3c')
            .addFields({
                name: 'Détails',
                value: error.message || 'Erreur inconnue',
                inline: false
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

// Utilitaires
function parseDuration(durationText) {
    if (!durationText) return 0;
    
    const regex = /(\d+)([smhd])/g;
    let totalMs = 0;
    let match;

    while ((match = regex.exec(durationText.toLowerCase())) !== null) {
        const value = parseInt(match[1]);
        const unit = match[2];

        switch (unit) {
            case 's':
                totalMs += value * 1000;
                break;
            case 'm':
                totalMs += value * 60 * 1000;
                break;
            case 'h':
                totalMs += value * 60 * 60 * 1000;
                break;
            case 'd':
                totalMs += value * 24 * 60 * 60 * 1000;
                break;
            case 'w':
                totalMs += value * 7 * 24 * 60 * 60 * 1000;
                break;
        }
    }

    return totalMs;
}

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days}j ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

export {
    showCustomSuspensionModal,
    showCancelSuspensionModal,
    handleCustomSuspensionModalSubmit,
    handleCancelSuspensionModalSubmit
};