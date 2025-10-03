import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { loadAutoVoiceData, saveAutoVoiceData, updateChannelStats } from './autoVoiceHandlers.js';

// 🎨 Couleurs pour les embeds
const COLORS = {
    SUCCESS: '#00FF88',
    ERROR: '#FF4444',
    WARNING: '#FFB347',
    INFO: '#5865F2',
    DANGER: '#DC143C'
};

// Gestionnaire pour les sélections de menus
async function handleSelectMenuInteraction(interaction) {
    try {
        console.log(`[AUTO-VOICE] 📋 Menu sélectionné: ${interaction.customId} par ${interaction.user.displayName}`);
        
        const [prefix, action, type, channelId] = interaction.customId.split('_');
        const channel = interaction.guild.channels.cache.get(channelId);
        
        if (!channel) {
            return await sendErrorEmbed(interaction, 'Salon introuvable', 'Le salon vocal n\'existe plus ou a été supprimé.');
        }

        const autoVoiceData = loadAutoVoiceData();
        const guildId = interaction.guild.id;
        const selectedUserId = interaction.values[0];

        // Trouver les données du salon
        const channelData = Object.values(autoVoiceData[guildId].userChannels).find(
            data => data.channelId === channelId
        );

        if (!channelData) {
            return await sendErrorEmbed(interaction, 'Données du salon introuvables', 
                'Ce salon n\'est pas géré par le système de salons vocaux automatiques.');
        }

        // Vérifier les permissions
        const isOwner = channelData.ownerId === interaction.user.id;
        const isAuthorized = channelData.authorizedUsers && channelData.authorizedUsers.includes(interaction.user.id);
        const hasAdminPerms = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        
        if (!isOwner && !isAuthorized && !hasAdminPerms) {
            return await sendErrorEmbed(interaction, 'Accès refusé', 'Seul le propriétaire peut utiliser cette fonction.');
        }

        // Router vers la fonction appropriée
        switch (action) {
            case 'kick':
                await handleKickSelect(interaction, channel, channelData, selectedUserId);
                break;
            case 'ban':
                await handleBanSelect(interaction, channel, channelData, selectedUserId);
                break;
            case 'unban':
                await handleUnbanSelect(interaction, channel, channelData, selectedUserId);
                break;
            case 'claim':
                await handleClaimSelect(interaction, channel, channelData, selectedUserId);
                break;
            default:
                await sendErrorEmbed(interaction, 'Action inconnue', `Action de menu non reconnue: ${action}`);
        }

    } catch (error) {
        console.error('[AUTO-VOICE] ❌ Erreur dans le gestionnaire de sélection:', error);
        await sendSystemErrorEmbed(interaction, error);
    }
}

// 🦵 Gestionnaire pour les sélections de kick
async function handleKickSelect(interaction, channel, channelData, selectedUserId) {
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const member = await interaction.guild.members.fetch(selectedUserId);
        
        if (!member.voice.channel || member.voice.channel.id !== channel.id) {
            const embed = new EmbedBuilder()
                .setColor(COLORS.WARNING)
                .setTitle('⚠️ **Utilisateur non présent**')
                .setDescription(`**${member.displayName}** n'est plus dans le salon vocal.`)
                .addFields([
                    { name: '💡 Information', value: 'L\'utilisateur a peut-être quitté le salon entre temps.', inline: false }
                ])
                .setTimestamp();
            
            return await interaction.editReply({ embeds: [embed] });
        }

        // Expulser l'utilisateur
        await member.voice.disconnect('Expulsé par le propriétaire du salon');
        
        // Mettre à jour les statistiques
        updateChannelStats(channel.id, 'kick', selectedUserId);
        
        const embed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setTitle('🦵 **Membre expulsé avec succès**')
            .setDescription(`**${member.displayName}** a été expulsé du salon vocal.`)
            .addFields([
                { name: '👤 Utilisateur expulsé', value: `${member.user.tag}\n\`ID: ${member.user.id}\``, inline: true },
                { name: '🎵 Salon', value: `<#${channel.id}>\n\`${channel.name}\``, inline: true },
                { name: '⚠️ Note importante', value: 'L\'utilisateur peut rejoindre à nouveau sauf s\'il est banni.', inline: false },
                { name: '🔄 Actions disponibles', value: '• Bannir cet utilisateur pour l\'empêcher de revenir\n• Modifier les permissions du salon', inline: false }
            ])
            .setFooter({ text: `Expulsé par ${interaction.user.displayName}` })
            .setTimestamp();

        // Boutons d'actions supplémentaires
        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`autovoice_ban_user_${channel.id}_${selectedUserId}`)
                    .setLabel('Bannir cet utilisateur')
                    .setEmoji('🔨')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`autovoice_refresh_${channel.id}`)
                    .setLabel('Actualiser le panneau')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Secondary)
            );
            
        await interaction.editReply({ embeds: [embed], components: [actionButtons] });
        console.log(`[AUTO-VOICE] 🦵 ${member.user.tag} expulsé de ${channel.name} par ${interaction.user.tag}`);
        
    } catch (error) {
        console.error('[AUTO-VOICE] ❌ Erreur lors du kick:', error);
        await sendSystemErrorEmbed(interaction, error);
    }
}

// 🔨 Gestionnaire pour les sélections de ban
async function handleBanSelect(interaction, channel, channelData, selectedUserId) {
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const member = await interaction.guild.members.fetch(selectedUserId);
        const autoVoiceData = loadAutoVoiceData();
        const guildId = interaction.guild.id;
        
        // Ajouter à la liste noire
        if (!channelData.blacklistedUsers) {
            channelData.blacklistedUsers = [];
        }
        
        if (channelData.blacklistedUsers.includes(selectedUserId)) {
            const embed = new EmbedBuilder()
                .setColor(COLORS.WARNING)
                .setTitle('⚠️ **Utilisateur déjà banni**')
                .setDescription(`**${member.displayName}** est déjà banni de ce salon.`)
                .setTimestamp();
            
            return await interaction.editReply({ embeds: [embed] });
        }
        
        channelData.blacklistedUsers.push(selectedUserId);
        
        // Sauvegarder les données
        const userChannelKey = Object.keys(autoVoiceData[guildId].userChannels).find(
            key => autoVoiceData[guildId].userChannels[key].channelId === channel.id
        );
        if (userChannelKey) {
            autoVoiceData[guildId].userChannels[userChannelKey] = channelData;
            saveAutoVoiceData(autoVoiceData);
        }
        
        // Expulser l'utilisateur s'il est dans le salon
        if (member.voice.channel && member.voice.channel.id === channel.id) {
            await member.voice.disconnect('Banni par le propriétaire du salon');
        }
        
        // Retirer les permissions
        await channel.permissionOverwrites.edit(selectedUserId, {
            Connect: false,
            ViewChannel: false
        });
        
        // Mettre à jour les statistiques
        updateChannelStats(channel.id, 'ban', selectedUserId);
        
        const embed = new EmbedBuilder()
            .setColor(COLORS.DANGER)
            .setTitle('🔨 **Membre banni définitivement**')
            .setDescription(`**${member.displayName}** a été banni de façon permanente du salon vocal.`)
            .addFields([
                { name: '👤 Utilisateur banni', value: `${member.user.tag}\n\`ID: ${member.user.id}\``, inline: true },
                { name: '🎵 Salon', value: `<#${channel.id}>\n\`${channel.name}\``, inline: true },
                { name: '🚫 Restrictions appliquées', value: '• Ne peut plus voir le salon\n• Ne peut plus se connecter\n• Expulsé automatiquement', inline: false },
                { name: '🔄 Débannissement', value: 'Utilisez le bouton "Débannir" pour annuler cette action.', inline: false }
            ])
            .setFooter({ text: `Banni par ${interaction.user.displayName}` })
            .setTimestamp();

        // Boutons d'actions
        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`autovoice_unban_user_${channel.id}_${selectedUserId}`)
                    .setLabel('Débannir cet utilisateur')
                    .setEmoji('🔓')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`autovoice_refresh_${channel.id}`)
                    .setLabel('Actualiser le panneau')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Secondary)
            );
            
        await interaction.editReply({ embeds: [embed], components: [actionButtons] });
        console.log(`[AUTO-VOICE] 🔨 ${member.user.tag} banni de ${channel.name} par ${interaction.user.tag}`);
        
    } catch (error) {
        console.error('[AUTO-VOICE] ❌ Erreur lors du ban:', error);
        await sendSystemErrorEmbed(interaction, error);
    }
}

// 🔓 Gestionnaire pour les sélections d'unban
async function handleUnbanSelect(interaction, channel, channelData, selectedUserId) {
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const user = await interaction.client.users.fetch(selectedUserId);
        const autoVoiceData = loadAutoVoiceData();
        const guildId = interaction.guild.id;
        
        // Retirer de la liste noire
        if (channelData.blacklistedUsers) {
            channelData.blacklistedUsers = channelData.blacklistedUsers.filter(id => id !== selectedUserId);
            
            // Sauvegarder les données
            const userChannelKey = Object.keys(autoVoiceData[guildId].userChannels).find(
                key => autoVoiceData[guildId].userChannels[key].channelId === channel.id
            );
            if (userChannelKey) {
                autoVoiceData[guildId].userChannels[userChannelKey] = channelData;
                saveAutoVoiceData(autoVoiceData);
            }
        }
        
        // Restaurer les permissions
        await channel.permissionOverwrites.edit(selectedUserId, {
            Connect: true,
            ViewChannel: true
        });
        
        // Mettre à jour les statistiques
        updateChannelStats(channel.id, 'unban', selectedUserId);
        
        const embed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setTitle('🔓 **Membre débanni avec succès**')
            .setDescription(`**${user.displayName || user.username}** a été débanni du salon vocal.`)
            .addFields([
                { name: '👤 Utilisateur débanni', value: `${user.tag}\n\`ID: ${user.id}\``, inline: true },
                { name: '🎵 Salon', value: `<#${channel.id}>\n\`${channel.name}\``, inline: true },
                { name: '✅ Permissions restaurées', value: '• Peut voir le salon\n• Peut se connecter\n• Accès complet rétabli', inline: false },
                { name: '💡 Information', value: 'L\'utilisateur peut maintenant rejoindre le salon normalement.', inline: false }
            ])
            .setFooter({ text: `Débanni par ${interaction.user.displayName}` })
            .setTimestamp();

        // Bouton d'action
        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`autovoice_refresh_${channel.id}`)
                    .setLabel('Actualiser le panneau')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Secondary)
            );
            
        await interaction.editReply({ embeds: [embed], components: [actionButtons] });
        console.log(`[AUTO-VOICE] 🔓 ${user.tag} débanni de ${channel.name} par ${interaction.user.tag}`);
        
    } catch (error) {
        console.error('[AUTO-VOICE] ❌ Erreur lors de l\'unban:', error);
        await sendSystemErrorEmbed(interaction, error);
    }
}

// 👑 Gestionnaire pour les sélections de transfert de propriété
async function handleClaimSelect(interaction, channel, channelData, selectedUserId) {
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const newOwner = await interaction.guild.members.fetch(selectedUserId);
        const oldOwner = await interaction.guild.members.fetch(channelData.ownerId);
        const autoVoiceData = loadAutoVoiceData();
        const guildId = interaction.guild.id;
        
        // Confirmation avant transfert
        const confirmEmbed = new EmbedBuilder()
            .setColor(COLORS.WARNING)
            .setTitle('👑 **Confirmer le transfert de propriété**')
            .setDescription('⚠️ **Cette action est irréversible !**')
            .addFields([
                { name: '👤 Propriétaire actuel', value: `${oldOwner.displayName}\n\`${oldOwner.user.tag}\``, inline: true },
                { name: '👑 Nouveau propriétaire', value: `${newOwner.displayName}\n\`${newOwner.user.tag}\``, inline: true },
                { name: '🎵 Salon concerné', value: `<#${channel.id}>\n\`${channel.name}\``, inline: false },
                { name: '💥 Conséquences', value: '• Vous perdrez le contrôle total du salon\n• Le nouveau propriétaire aura tous les droits\n• Vos permissions seront réduites à celles d\'un membre normal\n• Cette action ne peut pas être annulée', inline: false }
            ])
            .setFooter({ text: 'Réfléchissez bien avant de confirmer' })
            .setTimestamp();

        const confirmButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`autovoice_claim_confirm_${channel.id}_${selectedUserId}`)
                    .setLabel('Oui, transférer la propriété')
                    .setEmoji('👑')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`autovoice_claim_cancel_${channel.id}`)
                    .setLabel('Annuler')
                    .setEmoji('❌')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.editReply({ embeds: [confirmEmbed], components: [confirmButtons] });
        
    } catch (error) {
        console.error('[AUTO-VOICE] ❌ Erreur lors du transfert:', error);
        await sendSystemErrorEmbed(interaction, error);
    }
}

// Fonctions utilitaires pour les embeds
async function sendErrorEmbed(interaction, title, description) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setTitle(`❌ ${title}`)
        .setDescription(description)
        .setTimestamp();
    
    if (interaction.deferred) {
        await interaction.editReply({ embeds: [embed] });
    } else {
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
}

async function sendSystemErrorEmbed(interaction, error) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setTitle('❌ **Erreur Système**')
        .setDescription('Une erreur inattendue s\'est produite.')
        .addFields([
            { name: '🔧 Détails', value: `\`\`\`\n${error.message || 'Erreur inconnue'}\n\`\`\``, inline: false }
        ])
        .setTimestamp();
    
    if (interaction.deferred) {
        await interaction.editReply({ embeds: [embed] });
    } else {
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
}

export {
    handleSelectMenuInteraction,
    handleKickSelect,
    handleBanSelect,
    handleUnbanSelect,
    handleClaimSelect
};