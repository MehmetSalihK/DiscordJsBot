import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { loadAutoVoiceData, saveAutoVoiceData, updateChannelStats, hashPassword, verifyPassword, removePasswordRestrictions } from './autoVoiceHandlers.js';
import bcrypt from 'bcrypt';

// 🎨 Couleurs pour les embeds
const COLORS = {
    SUCCESS: '#00FF88',
    ERROR: '#FF4444',
    WARNING: '#FFB347',
    INFO: '#5865F2'
};

// Gestionnaire pour les modals
async function handleModalSubmit(interaction) {
    try {
        console.log(`[AUTO-VOICE] 📝 Modal soumis: ${interaction.customId} par ${interaction.user.displayName}`);
        
        // Vérifier que l'interaction provient d'un serveur
        if (!interaction.guild) {
            return await sendErrorEmbed(interaction, 'Erreur de contexte', 'Cette commande ne peut être utilisée qu\'dans un serveur.');
        }
        
        const [prefix, action, type, channelId] = interaction.customId.split('_');
        const channel = interaction.guild.channels.cache.get(channelId);
        
        if (!channel) {
            return await sendErrorEmbed(interaction, 'Salon introuvable', 'Le salon vocal n\'existe plus ou a été supprimé.');
        }

        const autoVoiceData = loadAutoVoiceData();
        const guildId = interaction.guild.id;

        // Vérifier que les données du serveur existent
        if (!autoVoiceData[guildId] || !autoVoiceData[guildId].userChannels) {
            return await sendErrorEmbed(interaction, 'Données du serveur introuvables', 
                'Les données de configuration du serveur sont manquantes ou corrompues.');
        }

        // Trouver les données du salon
        const channelData = Object.values(autoVoiceData[guildId].userChannels).find(
            data => data.channelId === channelId
        );

        if (!channelData) {
            return await sendErrorEmbed(interaction, 'Données du salon introuvables', 
                'Ce salon n\'est pas géré par le système de salons vocaux automatiques.');
        }

        // Actions accessibles à tous (pas de vérification de permissions)
        const publicActions = ['unlock'];
        
        // Vérifier les permissions seulement pour les actions privées
        if (!publicActions.includes(action)) {
            const isOwner = channelData.ownerId === interaction.user.id;
            const isAuthorized = channelData.authorizedUsers && channelData.authorizedUsers.includes(interaction.user.id);
            const hasAdminPerms = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
            
            if (!isOwner && !isAuthorized && !hasAdminPerms) {
                return await sendErrorEmbed(interaction, 'Accès refusé', 'Seul le propriétaire peut modifier ces paramètres.');
            }
        }

        // Router vers la fonction appropriée
        switch (action) {
            case 'settings':
                await handleSettingsModal(interaction, channel, channelData);
                break;
            case 'blacklist':
                await handleBlacklistModal(interaction, channel, channelData);
                break;
            case 'permissions':
                await handlePermissionsModal(interaction, channel, channelData);
                break;
            case 'edit':
                await handleEditModal(interaction, channel, channelData);
                break;
            case 'password':
                await handlePasswordModal(interaction, channel, channelData);
                break;
            case 'unlock':
                await handleUnlockModal(interaction, channel, channelData);
                break;
            default:
                await sendErrorEmbed(interaction, 'Action inconnue', `Action de modal non reconnue: ${action}`);
        }

    } catch (error) {
        console.error('[AUTO-VOICE] ❌ Erreur dans le gestionnaire de modal:', error);
        await sendSystemErrorEmbed(interaction, error);
    }
}

// ⚙️ Gestionnaire pour le modal des paramètres avancés
async function handleSettingsModal(interaction, channel, channelData) {
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const channelName = interaction.fields.getTextInputValue('channel_name') || channel.name;
        const userLimit = parseInt(interaction.fields.getTextInputValue('user_limit')) || 0;
        const bitrate = parseInt(interaction.fields.getTextInputValue('bitrate')) * 1000 || channel.bitrate;
        const region = interaction.fields.getTextInputValue('region') || channel.rtcRegion || 'auto';
        const description = interaction.fields.getTextInputValue('description') || '';
        
        // Validation des valeurs
        const errors = [];
        if (channelName.length > 100) errors.push('Le nom du salon ne peut pas dépasser 100 caractères');
        if (userLimit < 0 || userLimit > 99) errors.push('La limite d\'utilisateurs doit être entre 0 et 99');
        if (bitrate < 8000 || bitrate > 384000) errors.push('Le débit audio doit être entre 8 et 384 kbps');
        
        if (errors.length > 0) {
            const errorEmbed = new EmbedBuilder()
                .setColor(COLORS.ERROR)
                .setTitle('❌ **Erreurs de validation**')
                .setDescription('Les valeurs saisies contiennent des erreurs :')
                .addFields([
                    { name: '🚫 Erreurs détectées', value: errors.map(error => `• ${error}`).join('\n'), inline: false }
                ])
                .setTimestamp();
            
            return await interaction.editReply({ embeds: [errorEmbed] });
        }
        
        // Sauvegarder les anciens paramètres pour comparaison
        const oldSettings = {
            name: channel.name,
            userLimit: channel.userLimit,
            bitrate: channel.bitrate,
            region: channel.rtcRegion
        };
        
        // Appliquer les modifications
        const changes = [];
        
        if (channelName !== channel.name) {
            await channel.setName(channelName);
            changes.push(`Nom: "${oldSettings.name}" → "${channelName}"`);
        }
        
        if (userLimit !== channel.userLimit) {
            await channel.setUserLimit(userLimit);
            changes.push(`Limite: ${oldSettings.userLimit || 'Illimitée'} → ${userLimit || 'Illimitée'}`);
        }
        
        if (bitrate !== channel.bitrate) {
            await channel.setBitrate(bitrate);
            changes.push(`Qualité: ${Math.round(oldSettings.bitrate / 1000)} kbps → ${Math.round(bitrate / 1000)} kbps`);
        }
        
        if (region !== (channel.rtcRegion || 'auto')) {
            await channel.setRTCRegion(region === 'auto' ? null : region);
            changes.push(`Région: ${oldSettings.region || 'auto'} → ${region}`);
        }
        
        // Sauvegarder la description dans les données
        if (description) {
            channelData.description = description;
            const autoVoiceData = loadAutoVoiceData();
            const guildId = interaction.guild.id;
            const userChannelKey = Object.keys(autoVoiceData[guildId].userChannels).find(
                key => autoVoiceData[guildId].userChannels[key].channelId === channel.id
            );
            if (userChannelKey) {
                autoVoiceData[guildId].userChannels[userChannelKey] = channelData;
                saveAutoVoiceData(autoVoiceData);
            }
            changes.push(`Description: ${description ? 'Ajoutée' : 'Supprimée'}`);
        }
        
        // Mettre à jour les statistiques
        updateChannelStats(channel.id, 'settings_update', interaction.user.id);
        
        const embed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setTitle('⚙️ **Paramètres mis à jour avec succès**')
            .setDescription('Vos modifications ont été appliquées au salon vocal.')
            .addFields([
                { 
                    name: '📊 **Nouveaux paramètres**', 
                    value: `\`\`\`yaml\nNom: ${channelName}\nLimite: ${userLimit || 'Illimitée'}\nQualité: ${Math.round(bitrate / 1000)} kbps\nRégion: ${region}\n\`\`\``, 
                    inline: false 
                },
                { 
                    name: '🔄 **Modifications appliquées**', 
                    value: changes.length > 0 ? changes.map(change => `• ${change}`).join('\n') : 'Aucune modification', 
                    inline: false 
                }
            ])
            .setFooter({ text: `Modifié par ${interaction.user.displayName}` })
            .setTimestamp();

        // Bouton pour actualiser le panneau
        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`autovoice_refresh_${channel.id}`)
                    .setLabel('Actualiser le panneau')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`autovoice_stats_${channel.id}`)
                    .setLabel('Voir les statistiques')
                    .setEmoji('📊')
                    .setStyle(ButtonStyle.Primary)
            );
        
        await interaction.editReply({ embeds: [embed], components: [actionButtons] });
        
        console.log(`[AUTO-VOICE] ⚙️ Paramètres mis à jour pour ${channel.name} par ${interaction.user.displayName}`);
        
    } catch (error) {
        console.error('[AUTO-VOICE] ❌ Erreur lors de la mise à jour des paramètres:', error);
        await sendSystemErrorEmbed(interaction, error);
    }
}

// 🚫 Gestionnaire pour le modal de blacklist
async function handleBlacklistModal(interaction, channel, channelData) {
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const userInput = interaction.fields.getTextInputValue('blacklist_user');
        let userId;
        
        // Extraire l'ID utilisateur de la mention ou de l'ID direct
        const mentionMatch = userInput.match(/^<@!?(\d+)>$/);
        if (mentionMatch) {
            userId = mentionMatch[1];
        } else if (/^\d+$/.test(userInput)) {
            userId = userInput;
        } else {
            return await sendErrorEmbed(interaction, 'Format invalide', 
                'Veuillez fournir un ID utilisateur valide ou une mention (@utilisateur).');
        }
        
        // Vérifier que l'utilisateur existe
        let user;
        try {
            user = await interaction.client.users.fetch(userId);
        } catch (error) {
            return await sendErrorEmbed(interaction, 'Utilisateur introuvable', 
                'Impossible de trouver un utilisateur avec cet ID.');
        }
        
        // Vérifier que ce n'est pas le propriétaire
        if (userId === channelData.ownerId) {
            return await sendErrorEmbed(interaction, 'Action impossible', 
                'Vous ne pouvez pas vous bannir vous-même de votre propre salon.');
        }
        
        const autoVoiceData = loadAutoVoiceData();
        const guildId = interaction.guild.id;
        
        // Ajouter à la liste noire
        if (!channelData.blacklistedUsers) {
            channelData.blacklistedUsers = [];
        }
        
        if (channelData.blacklistedUsers.includes(userId)) {
            return await sendErrorEmbed(interaction, 'Utilisateur déjà banni', 
                `${user.displayName} est déjà banni de ce salon.`);
        }
        
        channelData.blacklistedUsers.push(userId);
        
        // Sauvegarder les données
        const userChannelKey = Object.keys(autoVoiceData[guildId].userChannels).find(
            key => autoVoiceData[guildId].userChannels[key].channelId === channel.id
        );
        if (userChannelKey) {
            autoVoiceData[guildId].userChannels[userChannelKey] = channelData;
            saveAutoVoiceData(autoVoiceData);
        }
        
        // Expulser l'utilisateur s'il est dans le salon
        const member = interaction.guild.members.cache.get(userId);
        if (member && member.voice.channel && member.voice.channel.id === channel.id) {
            await member.voice.disconnect('Banni par le propriétaire du salon');
        }
        
        // Retirer les permissions
        await channel.permissionOverwrites.edit(userId, {
            Connect: false,
            ViewChannel: false
        });
        
        // Mettre à jour les statistiques
        updateChannelStats(channel.id, 'blacklist_add', userId);
        
        const embed = new EmbedBuilder()
            .setColor(COLORS.DANGER)
            .setTitle('🚫 **Utilisateur ajouté à la liste noire**')
            .setDescription(`**${user.displayName}** a été banni définitivement du salon.`)
            .addFields([
                { name: '👤 Utilisateur banni', value: `${user.tag}\n\`ID: ${user.id}\``, inline: true },
                { name: '🎵 Salon', value: `<#${channel.id}>\n\`${channel.name}\``, inline: true },
                { name: '🚫 Restrictions', value: '• Ne peut plus voir le salon\n• Ne peut plus se connecter\n• Expulsé automatiquement', inline: false }
            ])
            .setFooter({ text: `Banni par ${interaction.user.displayName}` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        
    } catch (error) {
        console.error('[AUTO-VOICE] ❌ Erreur lors du blacklist:', error);
        await sendSystemErrorEmbed(interaction, error);
    }
}

// 🔑 Gestionnaire pour le modal des permissions
async function handlePermissionsModal(interaction, channel, channelData) {
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const userInput = interaction.fields.getTextInputValue('permission_user');
        let userId;
        
        // Extraire l'ID utilisateur
        const mentionMatch = userInput.match(/^<@!?(\d+)>$/);
        if (mentionMatch) {
            userId = mentionMatch[1];
        } else if (/^\d+$/.test(userInput)) {
            userId = userInput;
        } else {
            return await sendErrorEmbed(interaction, 'Format invalide', 
                'Veuillez fournir un ID utilisateur valide ou une mention (@utilisateur).');
        }
        
        // Vérifier que l'utilisateur existe
        let user;
        try {
            user = await interaction.client.users.fetch(userId);
        } catch (error) {
            return await sendErrorEmbed(interaction, 'Utilisateur introuvable', 
                'Impossible de trouver un utilisateur avec cet ID.');
        }
        
        const autoVoiceData = loadAutoVoiceData();
        const guildId = interaction.guild.id;
        
        // Initialiser la liste des utilisateurs autorisés
        if (!channelData.authorizedUsers) {
            channelData.authorizedUsers = [];
        }
        
        let action, actionText, color;
        
        if (channelData.authorizedUsers.includes(userId)) {
            // Retirer les permissions
            channelData.authorizedUsers = channelData.authorizedUsers.filter(id => id !== userId);
            action = 'removed';
            actionText = 'Permissions retirées';
            color = COLORS.WARNING;
        } else {
            // Accorder les permissions
            channelData.authorizedUsers.push(userId);
            action = 'granted';
            actionText = 'Permissions accordées';
            color = COLORS.SUCCESS;
        }
        
        // Sauvegarder les données
        const userChannelKey = Object.keys(autoVoiceData[guildId].userChannels).find(
            key => autoVoiceData[guildId].userChannels[key].channelId === channel.id
        );
        if (userChannelKey) {
            autoVoiceData[guildId].userChannels[userChannelKey] = channelData;
            saveAutoVoiceData(autoVoiceData);
        }
        
        // Mettre à jour les statistiques
        updateChannelStats(channel.id, `permission_${action}`, userId);
        
        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`🔑 **${actionText}**`)
            .setDescription(`Les permissions de **${user.displayName}** ont été mises à jour.`)
            .addFields([
                { name: '👤 Utilisateur', value: `${user.tag}\n\`ID: ${user.id}\``, inline: true },
                { name: '🎵 Salon', value: `<#${channel.id}>\n\`${channel.name}\``, inline: true },
                { 
                    name: '🔑 Permissions actuelles', 
                    value: action === 'granted' 
                        ? '• Peut utiliser les contrôles du salon\n• Peut expulser/bannir des membres\n• Peut modifier les paramètres' 
                        : '• Permissions de base uniquement\n• Ne peut pas gérer le salon\n• Accès membre normal', 
                    inline: false 
                }
            ])
            .setFooter({ text: `Modifié par ${interaction.user.displayName}` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        
    } catch (error) {
        console.error('[AUTO-VOICE] ❌ Erreur lors de la gestion des permissions:', error);
        await sendSystemErrorEmbed(interaction, error);
    }
}

// ✏️ Gestionnaire pour le modal d'édition simple
async function handleEditModal(interaction, channel, channelData) {
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const channelName = interaction.fields.getTextInputValue('channel_name') || channel.name;
        const userLimit = parseInt(interaction.fields.getTextInputValue('user_limit')) || channel.userLimit;
        const bitrate = parseInt(interaction.fields.getTextInputValue('bitrate')) * 1000 || channel.bitrate;
        
        // Validation simple
        if (channelName.length > 100) {
            return await sendErrorEmbed(interaction, 'Nom trop long', 'Le nom du salon ne peut pas dépasser 100 caractères.');
        }
        
        if (userLimit < 0 || userLimit > 99) {
            return await sendErrorEmbed(interaction, 'Limite invalide', 'La limite d\'utilisateurs doit être entre 0 et 99.');
        }
        
        if (bitrate < 8000 || bitrate > 384000) {
            return await sendErrorEmbed(interaction, 'Débit invalide', 'Le débit audio doit être entre 8 et 384 kbps.');
        }
        
        // Appliquer les modifications
        await Promise.all([
            channel.setName(channelName),
            channel.setUserLimit(userLimit),
            channel.setBitrate(bitrate)
        ]);
        
        const embed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setTitle('✏️ **Salon modifié avec succès**')
            .setDescription('Les paramètres de base ont été mis à jour.')
            .addFields([
                { 
                    name: '📊 Nouveaux paramètres', 
                    value: `\`\`\`yaml\nNom: ${channelName}\nLimite: ${userLimit || 'Illimitée'}\nQualité: ${Math.round(bitrate / 1000)} kbps\n\`\`\``, 
                    inline: false 
                }
            ])
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        
    } catch (error) {
        console.error('[AUTO-VOICE] ❌ Erreur lors de l\'édition:', error);
        await sendSystemErrorEmbed(interaction, error);
    }
}

// Fonctions utilitaires
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

// 🔐 Gestionnaire pour le modal de configuration du mot de passe
async function handlePasswordModal(interaction, channel, channelData) {
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const hasExistingPassword = channelData.password && channelData.password.enabled;
        const autoVoiceData = loadAutoVoiceData();
        const guildId = interaction.guild.id;
        
        let currentPassword, newPassword, confirmPassword, description;
        
        if (hasExistingPassword) {
            // Modal avec mot de passe existant
            currentPassword = interaction.fields.getTextInputValue('current_password');
            newPassword = interaction.fields.getTextInputValue('new_password') || '';
            confirmPassword = interaction.fields.getTextInputValue('confirm_password') || '';
            
            // Vérifier le mot de passe actuel
            if (!currentPassword) {
                return await sendErrorEmbed(interaction, 'Mot de passe requis', 'Vous devez entrer le mot de passe actuel pour le modifier.');
            }
            
            const isCurrentValid = await bcrypt.compare(currentPassword, channelData.password.hash);
            if (!isCurrentValid) {
                return await sendErrorEmbed(interaction, 'Mot de passe incorrect', 'Le mot de passe actuel est incorrect.');
            }
        } else {
            // Modal pour nouveau mot de passe
            newPassword = interaction.fields.getTextInputValue('new_password');
            confirmPassword = interaction.fields.getTextInputValue('confirm_password');
            description = interaction.fields.getTextInputValue('password_description') || '';
        }
        
        // Si pas de nouveau mot de passe et qu'il y en avait un, supprimer la protection
        if (!newPassword && hasExistingPassword) {
            channelData.password = {
                enabled: false,
                hash: null,
                authorizedUsers: []
            };
            
            // Supprimer toutes les restrictions pour tous les membres actuels
            for (const member of channel.members.values()) {
                if (member.id !== channelData.ownerId) {
                    try {
                        await removePasswordRestrictions(member, channel);
                    } catch (error) {
                        console.error(`[AUTO-VOICE] Erreur lors de la suppression des restrictions pour ${member.displayName}:`, error);
                    }
                }
            }
            
            const embed = new EmbedBuilder()
                .setColor(COLORS.SUCCESS)
                .setTitle('🔓 **Protection par mot de passe supprimée**')
                .setDescription('Le salon n\'est plus protégé par un mot de passe. Tous les membres ont maintenant un accès libre.')
                .addFields([
                    { name: '✅ Changements appliqués', value: '• Mot de passe supprimé\n• Restrictions levées pour tous\n• Accès libre restauré\n• Muet/Sourd désactivés', inline: false },
                    { name: '🎉 Résultat', value: 'Votre salon est maintenant ouvert à tous !', inline: false }
                ])
                .setFooter({ text: `Supprimé par ${interaction.user.displayName}` })
                .setTimestamp();
            
            // Sauvegarder les données
            const userChannelKey = Object.keys(autoVoiceData[guildId].userChannels).find(
                key => autoVoiceData[guildId].userChannels[key].channelId === channel.id
            );
            if (userChannelKey) {
                autoVoiceData[guildId].userChannels[userChannelKey] = channelData;
                saveAutoVoiceData(autoVoiceData);
            }
            
            console.log(`[AUTO-VOICE] 🔓 Protection par mot de passe supprimée pour ${channel.name} par ${interaction.user.displayName}`);
            return await interaction.editReply({ embeds: [embed] });
        }
        
        // Si pas de nouveau mot de passe et pas de mot de passe existant, erreur
        if (!newPassword && !hasExistingPassword) {
            return await sendErrorEmbed(interaction, 'Mot de passe requis', 'Vous devez définir un mot de passe pour protéger votre salon.');
        }
        
        // Vérifier la confirmation du mot de passe
        if (newPassword !== confirmPassword) {
            return await sendErrorEmbed(interaction, 'Mots de passe différents', 'Le mot de passe et sa confirmation ne correspondent pas.');
        }
        
        // Valider le mot de passe
        if (newPassword.length < 4) {
            return await sendErrorEmbed(interaction, 'Mot de passe trop court', 'Le mot de passe doit contenir au moins 4 caractères.');
        }
        
        if (newPassword.length > 50) {
            return await sendErrorEmbed(interaction, 'Mot de passe trop long', 'Le mot de passe ne peut pas dépasser 50 caractères.');
        }
        
        // Hasher le nouveau mot de passe
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        
        // Configurer la protection
        channelData.password = {
            enabled: true,
            hash: hashedPassword,
            authorizedUsers: channelData.password?.authorizedUsers || [],
            description: description || '',
            createdAt: Date.now(),
            createdBy: interaction.user.id,
            lastModified: Date.now()
        };
        
        // Sauvegarder les données
        const userChannelKey = Object.keys(autoVoiceData[guildId].userChannels).find(
            key => autoVoiceData[guildId].userChannels[key].channelId === channel.id
        );
        if (userChannelKey) {
            autoVoiceData[guildId].userChannels[userChannelKey] = channelData;
            saveAutoVoiceData(autoVoiceData);
        }
        
        const actionText = hasExistingPassword ? 'modifié' : 'configuré';
        const titleText = hasExistingPassword ? 'Mot de passe modifié avec succès' : 'Mot de passe configuré avec succès';
        
        const embed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setTitle(`🔐 **${titleText}**`)
            .setDescription(`Le salon est maintenant protégé par un mot de passe ${hasExistingPassword ? 'mis à jour' : 'sécurisé'}.`)
            .addFields([
                { 
                    name: '🔒 **Protection Activée**', 
                    value: `• Mot de passe ${actionText}\n• Restrictions automatiques\n• Accès contrôlé`, 
                    inline: true 
                },
                { 
                    name: '⚙️ **Fonctionnement**', 
                    value: '• Nouveaux membres = restrictions\n• Message automatique dans le salon\n• Déverrouillage par bouton', 
                    inline: true 
                },
                { 
                    name: '💡 **Information**', 
                    value: `${description ? `**Description :** ${description}\n\n` : ''}Les nouveaux membres devront entrer le mot de passe pour accéder pleinement au salon.`, 
                    inline: false 
                }
            ])
            .setFooter({ text: `${hasExistingPassword ? 'Modifié' : 'Configuré'} par ${interaction.user.displayName}` })
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        
        console.log(`[AUTO-VOICE] 🔐 Mot de passe ${actionText} pour ${channel.name} par ${interaction.user.displayName}`);
        
    } catch (error) {
        console.error('[AUTO-VOICE] ❌ Erreur lors de la configuration du mot de passe:', error);
        await sendSystemErrorEmbed(interaction, error);
    }
}

// 🔓 Gestionnaire pour le modal de déverrouillage
async function handleUnlockModal(interaction, channel, channelData) {
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const enteredPassword = interaction.fields.getTextInputValue('unlock_password');
        
        if (!channelData.password || !channelData.password.enabled) {
            return await sendErrorEmbed(interaction, 'Aucun mot de passe', 'Ce salon n\'est pas protégé par un mot de passe.');
        }
        
        // Vérifier si le mot de passe a expiré
        if (channelData.password.temporary && channelData.password.expiresAt && Date.now() > channelData.password.expiresAt) {
            // Désactiver la protection expirée
            channelData.password.enabled = false;
            const autoVoiceData = loadAutoVoiceData();
            const guildId = interaction.guild.id;
            const userChannelKey = Object.keys(autoVoiceData[guildId].userChannels).find(
                key => autoVoiceData[guildId].userChannels[key].channelId === channel.id
            );
            if (userChannelKey) {
                autoVoiceData[guildId].userChannels[userChannelKey] = channelData;
                saveAutoVoiceData(autoVoiceData);
            }
            
            return await sendErrorEmbed(interaction, 'Mot de passe expiré', 'La protection par mot de passe a expiré. Le salon est maintenant libre d\'accès.');
        }
        
        // Vérifier le mot de passe
        const isPasswordValid = await bcrypt.compare(enteredPassword, channelData.password.hash);
        
        if (!isPasswordValid) {
            // Enregistrer la tentative échouée
            console.log(`[AUTO-VOICE] 🚫 Tentative de mot de passe échouée pour ${interaction.user.displayName} sur ${channel.name}`);
            
            const embed = new EmbedBuilder()
                .setColor(COLORS.ERROR)
                .setTitle('❌ **Mot de passe incorrect**')
                .setDescription('Le mot de passe que vous avez entré est incorrect.')
                .addFields([
                    { name: '🔒 **Accès refusé**', value: 'Vérifiez le mot de passe et réessayez.', inline: false },
                    { name: '💡 **Aide**', value: 'Contactez le propriétaire du salon si vous avez besoin d\'aide.', inline: false }
                ])
                .setTimestamp();
            
            return await interaction.editReply({ embeds: [embed] });
        }
        
        // Mot de passe correct - ajouter à la liste des autorisés
        if (!channelData.password.authorizedUsers) {
            channelData.password.authorizedUsers = [];
        }
        
        if (!channelData.password.authorizedUsers.includes(interaction.user.id)) {
            channelData.password.authorizedUsers.push(interaction.user.id);
            
            // Sauvegarder les données
            const autoVoiceData = loadAutoVoiceData();
            const guildId = interaction.guild.id;
            const userChannelKey = Object.keys(autoVoiceData[guildId].userChannels).find(
                key => autoVoiceData[guildId].userChannels[key].channelId === channel.id
            );
            if (userChannelKey) {
                autoVoiceData[guildId].userChannels[userChannelKey] = channelData;
                saveAutoVoiceData(autoVoiceData);
            }
        }
        
        // Supprimer les restrictions
        const member = interaction.member;
        await removePasswordRestrictions(member, channel);
        
        const embed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setTitle('🔓 **Accès déverrouillé avec succès**')
            .setDescription('Vous avez maintenant accès complet au salon vocal.')
            .addFields([
                { name: '✅ **Restrictions levées**', value: '• Microphone activé\n• Audio activé\n• Chat autorisé\n• Partage d\'écran autorisé', inline: false },
                { name: '🎉 **Bienvenue !**', value: 'Vous pouvez maintenant profiter pleinement du salon.', inline: false }
            ])
            .setFooter({ text: 'Vous n\'aurez plus besoin de saisir le mot de passe' })
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        
        console.log(`[AUTO-VOICE] 🔓 Accès déverrouillé pour ${interaction.user.displayName} sur ${channel.name}`);
        
        // Notifier le propriétaire si activé
        if (channelData.password.notify) {
            try {
                const owner = await interaction.guild.members.fetch(channelData.ownerId);
                const notificationEmbed = new EmbedBuilder()
                    .setColor(COLORS.INFO)
                    .setTitle('🔓 **Nouveau membre autorisé**')
                    .setDescription(`${interaction.user.displayName} a saisi le mot de passe correct et a accédé à votre salon.`)
                    .addFields([
                        { name: '👤 Membre', value: `${interaction.user.tag}`, inline: true },
                        { name: '🎵 Salon', value: `${channel.name}`, inline: true },
                        { name: '🕐 Heure', value: `<t:${Math.floor(Date.now() / 1000)}:T>`, inline: true }
                    ])
                    .setTimestamp();
                
                await owner.send({ embeds: [notificationEmbed] });
            } catch (notifyError) {
                console.error('[AUTO-VOICE] ❌ Erreur lors de la notification au propriétaire:', notifyError);
            }
        }
        
    } catch (error) {
        console.error('[AUTO-VOICE] ❌ Erreur lors du déverrouillage:', error);
        await sendSystemErrorEmbed(interaction, error);
    }
}

export {
    handleModalSubmit,
    handleSettingsModal,
    handleBlacklistModal,
    handlePermissionsModal,
    handleEditModal,
    handlePasswordModal,
    handleUnlockModal
};