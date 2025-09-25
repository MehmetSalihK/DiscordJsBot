import { EmbedBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { loadAutoVCData, saveAutoVCData } from './autoVoiceHandlers.js';

// Gestionnaire pour les modals de liste noire
async function handleBlacklistModal(interaction) {
    try {
        const channelId = interaction.customId.split('_')[3];
        const channel = interaction.guild.channels.cache.get(channelId);
        
        if (!channel) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Salon introuvable')
                .setDescription('Le salon vocal n\'existe plus.')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        const userInput = interaction.fields.getTextInputValue('blacklist_user');
        const actionInput = interaction.fields.getTextInputValue('blacklist_action').toLowerCase();
        
        // Extraire l'ID utilisateur
        let userId = userInput.replace(/[<@!>]/g, '');
        
        // Vérifier si l'utilisateur existe
        const user = await interaction.client.users.fetch(userId).catch(() => null);
        if (!user) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Utilisateur introuvable')
                .setDescription('L\'utilisateur spécifié n\'a pas été trouvé.')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        const autoVCData = loadAutoVCData();
        const guildId = interaction.guild.id;
        
        // Trouver le propriétaire du salon
        let ownerId = null;
        for (const [uId, channelData] of Object.entries(autoVCData[guildId])) {
            if (channelData.channelID === channelId) {
                ownerId = uId;
                break;
            }
        }

        if (ownerId !== interaction.user.id) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Accès refusé')
                .setDescription('Seul le propriétaire du salon peut gérer la liste noire.')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        const channelData = autoVCData[guildId][ownerId];
        if (!channelData.blacklist) channelData.blacklist = [];

        if (actionInput === 'ajouter' || actionInput === 'add') {
            if (!channelData.blacklist.includes(userId)) {
                channelData.blacklist.push(userId);
                
                // Retirer les permissions du salon
                await channel.permissionOverwrites.edit(userId, {
                    ViewChannel: false,
                    Connect: false
                });

                // Expulser l'utilisateur s'il est connecté
                const member = channel.members.get(userId);
                if (member) {
                    await member.voice.disconnect();
                }

                saveAutoVCData(autoVCData);

                const successEmbed = new EmbedBuilder()
                    .setColor('#FF6B6B')
                    .setTitle('🚫 Utilisateur ajouté à la liste noire')
                    .setDescription(`✅ **${user.tag}** a été ajouté à la liste noire de votre salon vocal.`)
                    .addFields(
                        { name: '👤 Utilisateur', value: `${user.tag} (${user.id})`, inline: true },
                        { name: '🎵 Salon', value: `<#${channel.id}>`, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: '🎵 Auto Voice Channel System', iconURL: interaction.guild.iconURL() });
                
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            } else {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF6B35')
                    .setTitle('⚠️ Déjà dans la liste noire')
                    .setDescription('Cet utilisateur est déjà dans votre liste noire.')
                    .setTimestamp();
                
                await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }
        } else if (actionInput === 'retirer' || actionInput === 'remove') {
            const index = channelData.blacklist.indexOf(userId);
            if (index > -1) {
                channelData.blacklist.splice(index, 1);
                
                // Restaurer les permissions par défaut
                await channel.permissionOverwrites.delete(userId);

                saveAutoVCData(autoVCData);

                const embed = new EmbedBuilder()
                    .setColor('#00FF7F')
                    .setTitle('✅ **Utilisateur Retiré de la Liste Noire**')
                    .setDescription(`
> 🎉 **Débannissement réussi**
> **${user.tag}** a été retiré de la liste noire de votre salon vocal.

\`\`\`yaml
Utilisateur: ${user.tag}
ID: ${user.id}
Salon: ${channel.name}
Action: Permissions restaurées
\`\`\`

**🔓 Résultat :** L'utilisateur peut maintenant rejoindre votre salon vocal.
                    `)
                    .addFields(
                        { name: '👤 **Utilisateur débanni**', value: `\`${user.tag}\``, inline: true },
                        { name: '🎵 **Salon concerné**', value: `<#${channel.id}>`, inline: true },
                        { name: '🔄 **Statut**', value: '`✅ Accès autorisé`', inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: '🎵 Auto Voice Channel System', iconURL: interaction.guild.iconURL() });
                
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            } else {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF6B35')
                    .setTitle('⚠️ Pas dans la liste noire')
                    .setDescription('Cet utilisateur n\'est pas dans votre liste noire.')
                    .setTimestamp();
                
                await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }
        } else {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Action invalide')
                .setDescription('Veuillez spécifier "ajouter" ou "retirer".')
                .setTimestamp();
            
            await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

    } catch (error) {
        // console.error('[AUTO-VC] Erreur dans le modal de liste noire:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur système')
            .setDescription('Une erreur est survenue lors du traitement de votre demande.')
            .setTimestamp();
        
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
}

// Gestionnaire pour les modals de permissions
async function handlePermissionsModal(interaction) {
    try {
        const channelId = interaction.customId.split('_')[3];
        const channel = interaction.guild.channels.cache.get(channelId);
        
        if (!channel) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Salon introuvable')
                .setDescription('Le salon vocal n\'existe plus.')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        const userInput = interaction.fields.getTextInputValue('permission_user');
        const permissionType = interaction.fields.getTextInputValue('permission_type').toLowerCase();
        
        // Extraire l'ID utilisateur
        let userId = userInput.replace(/[<@!>]/g, '');
        
        // Vérifier si l'utilisateur existe
        const user = await interaction.client.users.fetch(userId).catch(() => null);
        if (!user) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Utilisateur introuvable')
                .setDescription('L\'utilisateur spécifié n\'a pas été trouvé.')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        const autoVCData = loadAutoVCData();
        const guildId = interaction.guild.id;
        
        // Trouver le propriétaire du salon
        let ownerId = null;
        for (const [uId, channelData] of Object.entries(autoVCData[guildId])) {
            if (channelData.channelID === channelId) {
                ownerId = uId;
                break;
            }
        }

        if (ownerId !== interaction.user.id) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Accès refusé')
                .setDescription('Seul le propriétaire du salon peut gérer les permissions.')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        let permissions = {};
        
        switch (permissionType) {
            case 'admin':
            case 'administrateur':
                permissions = {
                    ViewChannel: true,
                    Connect: true,
                    ManageChannels: true,
                    ManageRoles: true,
                    MoveMembers: true,
                    MuteMembers: true,
                    DeafenMembers: true
                };
                break;
            case 'moderateur':
            case 'mod':
                permissions = {
                    ViewChannel: true,
                    Connect: true,
                    MoveMembers: true,
                    MuteMembers: true,
                    DeafenMembers: true
                };
                break;
            case 'invite':
            case 'invité':
            case 'guest':
                permissions = {
                    ViewChannel: true,
                    Connect: true
                };
                break;
            case 'retirer':
            case 'remove':
                await channel.permissionOverwrites.delete(userId);
                
                const removeEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('✅ **Permissions Supprimées**')
                    .setDescription(`
> 🔄 **Permissions réinitialisées**
> Les permissions spéciales de **${user.tag}** ont été supprimées.

\`\`\`yaml
Utilisateur: ${user.tag}
ID: ${user.id}
Salon: ${channel.name}
Action: Retour aux permissions par défaut
\`\`\`

**📋 Résultat :** L'utilisateur a maintenant les permissions par défaut du salon.
                    `)
                    .setTimestamp();
                
                return await interaction.reply({ embeds: [removeEmbed], flags: MessageFlags.Ephemeral });
            default:
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Type de permission invalide')
                    .setDescription('Types disponibles: admin, moderateur, invité, retirer')
                    .setTimestamp();
                
                return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        await channel.permissionOverwrites.edit(userId, permissions);

        const embed = new EmbedBuilder()
            .setColor('#00FF7F')
            .setTitle('🔑 Permissions mises à jour')
            .setDescription(`✅ **${user.tag}** a reçu les permissions de **${permissionType}** pour votre salon vocal.`)
            .addFields(
                { name: '👤 Utilisateur', value: `${user.tag} (${user.id})`, inline: true },
                { name: '🔑 Niveau de permission', value: permissionType, inline: true },
                { name: '🎵 Salon', value: `<#${channel.id}>`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: '🎵 Auto Voice Channel System', iconURL: interaction.guild.iconURL() });
        
        await interaction.reply({ embeds: [successEmbed], flags: MessageFlags.Ephemeral });

    } catch (error) {
        // console.error('[AUTO-VC] Erreur dans le modal de permissions:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur système')
            .setDescription('Une erreur est survenue lors du traitement de votre demande.')
            .setTimestamp();
        
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
}

// Gestionnaire pour les modals de modification
async function handleModifyModal(interaction) {
    try {
        const channelId = interaction.customId.split('_')[3];
        const channel = interaction.guild.channels.cache.get(channelId);
        
        if (!channel) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Salon introuvable')
                .setDescription('Le salon vocal n\'existe plus.')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        const autoVCData = loadAutoVCData();
        const guildId = interaction.guild.id;
        
        // Trouver le propriétaire du salon
        let ownerId = null;
        for (const [uId, channelData] of Object.entries(autoVCData[guildId])) {
            if (channelData.channelID === channelId) {
                ownerId = uId;
                break;
            }
        }

        if (ownerId !== interaction.user.id) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Accès refusé')
                .setDescription('Seul le propriétaire du salon peut le modifier.')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        const newName = interaction.fields.getTextInputValue('channel_name');
        const userLimit = interaction.fields.getTextInputValue('user_limit');
        const bitrate = interaction.fields.getTextInputValue('bitrate');

        const changes = [];

        // Modifier le nom
        if (newName && newName.trim() !== '' && newName !== channel.name) {
            await channel.setName(newName.trim());
            changes.push(`**Nom:** ${newName.trim()}`);
        }

        // Modifier la limite d'utilisateurs
        if (userLimit && userLimit.trim() !== '') {
            const limit = parseInt(userLimit);
            if (!isNaN(limit) && limit >= 0 && limit <= 99) {
                await channel.setUserLimit(limit);
                changes.push(`**Limite d'utilisateurs:** ${limit === 0 ? 'Illimitée' : limit}`);
                
                // Mettre à jour les données
                autoVCData[guildId][ownerId].settings.userLimit = limit;
            }
        }

        // Modifier le bitrate
        if (bitrate && bitrate.trim() !== '') {
            const bitrateValue = parseInt(bitrate) * 1000;
            if (!isNaN(bitrateValue) && bitrateValue >= 8000 && bitrateValue <= 384000) {
                await channel.setBitrate(bitrateValue);
                changes.push(`**Bitrate:** ${parseInt(bitrate)}kbps`);
                
                // Mettre à jour les données
                autoVCData[guildId][ownerId].settings.bitrate = bitrateValue;
            }
        }

        saveAutoVCData(autoVCData);

        if (changes.length > 0) {
            const successEmbed = new EmbedBuilder()
                .setColor('#00FF7F')
                .setTitle('✏️ Salon modifié avec succès')
                .setDescription(`✅ **Modifications appliquées avec succès !**`)
                .addFields(
                    { name: '🎵 Salon', value: `<#${channel.id}>`, inline: true },
                    { name: '📝 Modifications', value: changes.join('\n'), inline: false }
                )
                .setTimestamp()
                .setFooter({ text: '🎵 Auto Voice Channel System', iconURL: interaction.guild.iconURL() });
            
            await interaction.reply({ embeds: [successEmbed], flags: MessageFlags.Ephemeral });
        } else {
            const infoEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('⚠️ Aucune modification')
                .setDescription('Aucune modification valide n\'a été détectée.')
                .addFields(
                    { name: '💡 Conseil', value: 'Vérifiez que les valeurs saisies sont différentes des valeurs actuelles et respectent les limites.', inline: false }
                )
                .setTimestamp()
                .setFooter({ text: '🎵 Auto Voice Channel System', iconURL: interaction.guild.iconURL() });
            
            await interaction.reply({ embeds: [infoEmbed], flags: MessageFlags.Ephemeral });
        }

    } catch (error) {
        // console.error('[AUTO-VC] Erreur dans le modal de modification:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur système')
            .setDescription('Une erreur est survenue lors du traitement de votre demande.')
            .setTimestamp();
        
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
}

export {
    handleBlacklistModal,
    handlePermissionsModal,
    handleModifyModal
};
