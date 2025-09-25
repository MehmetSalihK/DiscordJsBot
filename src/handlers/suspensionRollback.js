const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getGuildConfig } = require('./suspensionRoles');
const fs = require('fs').promises;
const path = require('path');

const ROLLBACK_FILE = path.join(__dirname, '../data/suspensionRollbacks.json');

// Sauvegarder l'état avant une action pour permettre le rollback
async function saveSuspensionState(guildId, userId, action, previousState, newState, moderatorId) {
    try {
        let rollbacks = {};
        try {
            const data = await fs.readFile(ROLLBACK_FILE, 'utf8');
            rollbacks = JSON.parse(data);
        } catch (error) {
            // Fichier n'existe pas encore
        }

        if (!rollbacks[guildId]) {
            rollbacks[guildId] = {};
        }

        const rollbackId = `${Date.now()}_${userId}_${action}`;
        rollbacks[guildId][rollbackId] = {
            userId,
            action,
            previousState,
            newState,
            moderatorId,
            timestamp: Date.now(),
            canRollback: true
        };

        await fs.writeFile(ROLLBACK_FILE, JSON.stringify(rollbacks, null, 2));
        return rollbackId;
    } catch (error) {
        // console.error('Erreur lors de la sauvegarde du rollback:', error);
        return null;
    }
}

// Récupérer les rollbacks disponibles pour un serveur
async function getAvailableRollbacks(guildId, limit = 10) {
    try {
        const data = await fs.readFile(ROLLBACK_FILE, 'utf8');
        const rollbacks = JSON.parse(data);
        
        if (!rollbacks[guildId]) {
            return [];
        }

        const guildRollbacks = Object.entries(rollbacks[guildId])
            .filter(([_, rollback]) => rollback.canRollback)
            .sort(([_, a], [__, b]) => b.timestamp - a.timestamp)
            .slice(0, limit)
            .map(([id, rollback]) => ({ id, ...rollback }));

        return guildRollbacks;
    } catch (error) {
        // console.error('Erreur lors de la récupération des rollbacks:', error);
        return [];
    }
}

// Effectuer un rollback
async function performRollback(guild, rollbackId, moderatorId) {
    try {
        const data = await fs.readFile(ROLLBACK_FILE, 'utf8');
        const rollbacks = JSON.parse(data);
        
        if (!rollbacks[guild.id] || !rollbacks[guild.id][rollbackId]) {
            throw new Error('Rollback introuvable.');
        }

        const rollback = rollbacks[guild.id][rollbackId];
        
        if (!rollback.canRollback) {
            throw new Error('Ce rollback n\'est plus disponible.');
        }

        const member = await guild.members.fetch(rollback.userId).catch(() => null);
        if (!member) {
            throw new Error('Membre introuvable sur le serveur.');
        }

        const config = await getGuildConfig(guild.id);
        
        // Effectuer le rollback selon l'action
        switch (rollback.action) {
            case 'suspension_apply':
                await rollbackSuspensionApply(guild, member, rollback, config);
                break;
            case 'suspension_cancel':
                await rollbackSuspensionCancel(guild, member, rollback, config);
                break;
            case 'role_change':
                await rollbackRoleChange(guild, member, rollback);
                break;
            default:
                throw new Error('Type de rollback non supporté.');
        }

        // Marquer le rollback comme utilisé
        rollbacks[guild.id][rollbackId].canRollback = false;
        rollbacks[guild.id][rollbackId].rolledBackBy = moderatorId;
        rollbacks[guild.id][rollbackId].rolledBackAt = Date.now();

        await fs.writeFile(ROLLBACK_FILE, JSON.stringify(rollbacks, null, 2));

        return {
            success: true,
            action: rollback.action,
            userId: rollback.userId,
            previousState: rollback.previousState,
            newState: rollback.newState
        };

    } catch (error) {
        // console.error('Erreur lors du rollback:', error);
        throw error;
    }
}

// Rollback d'une application de suspension
async function rollbackSuspensionApply(guild, member, rollback, config) {
    const { newState } = rollback;
    
    // Retirer le rôle de suspension qui avait été ajouté
    if (newState.suspensionRole) {
        const role = guild.roles.cache.get(newState.suspensionRole);
        if (role && member.roles.cache.has(role.id)) {
            await member.roles.remove(role, 'Rollback de suspension');
        }
    }

    // Restaurer les rôles précédents si nécessaire
    if (rollback.previousState.roles) {
        for (const roleId of rollback.previousState.roles) {
            const role = guild.roles.cache.get(roleId);
            if (role && !member.roles.cache.has(roleId)) {
                await member.roles.add(role, 'Rollback - restauration des rôles');
            }
        }
    }
}

// Rollback d'une annulation de suspension
async function rollbackSuspensionCancel(guild, member, rollback, config) {
    const { previousState } = rollback;
    
    // Remettre le rôle de suspension qui avait été retiré
    if (previousState.suspensionRole) {
        const role = guild.roles.cache.get(previousState.suspensionRole);
        if (role && !member.roles.cache.has(role.id)) {
            await member.roles.add(role, 'Rollback - remise de la suspension');
        }
    }
}

// Rollback d'un changement de rôle
async function rollbackRoleChange(guild, member, rollback) {
    const { previousState, newState } = rollback;
    
    // Retirer les rôles qui avaient été ajoutés
    if (newState.addedRoles) {
        for (const roleId of newState.addedRoles) {
            const role = guild.roles.cache.get(roleId);
            if (role && member.roles.cache.has(roleId)) {
                await member.roles.remove(role, 'Rollback - retrait des rôles ajoutés');
            }
        }
    }

    // Remettre les rôles qui avaient été retirés
    if (newState.removedRoles) {
        for (const roleId of newState.removedRoles) {
            const role = guild.roles.cache.get(roleId);
            if (role && !member.roles.cache.has(roleId)) {
                await member.roles.add(role, 'Rollback - restauration des rôles retirés');
            }
        }
    }
}

// Afficher le panneau de rollback
async function showRollbackPanel(interaction) {
    const rollbacks = await getAvailableRollbacks(interaction.guild.id);
    
    if (rollbacks.length === 0) {
        const embed = new EmbedBuilder()
            .setTitle('📋 Aucun Rollback Disponible')
            .setDescription('Il n\'y a actuellement aucune action récente pouvant être annulée.')
            .setColor('#95a5a6')
            .addFields({
                name: 'ℹ️ Information',
                value: 'Les rollbacks sont automatiquement sauvegardés lors des actions de suspension et restent disponibles pendant 24h.',
                inline: false
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed], components: [] });
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle('🔄 Système de Rollback')
        .setDescription('Sélectionnez une action récente à annuler.')
        .setColor('#e67e22')
        .addFields({
            name: '⚠️ Attention',
            value: 'Le rollback annulera complètement l\'action sélectionnée. Cette opération est irréversible.',
            inline: false
        })
        .setFooter({ text: `${rollbacks.length} action(s) disponible(s)` });

    // Créer les boutons pour les rollbacks
    const components = [];
    let currentRow = new ActionRowBuilder();
    
    for (let i = 0; i < Math.min(rollbacks.length, 10); i++) {
        const rollback = rollbacks[i];
        const user = await interaction.client.users.fetch(rollback.userId).catch(() => null);
        const userName = user ? user.username : 'Utilisateur inconnu';
        
        const actionName = getActionDisplayName(rollback.action);
        const timeAgo = getTimeAgo(rollback.timestamp);
        
        embed.addFields({
            name: `${i + 1}. ${actionName}`,
            value: `👤 ${userName}\n⏰ ${timeAgo}`,
            inline: true
        });

        const button = new ButtonBuilder()
            .setCustomId(`suspension_rollback_${rollback.id}`)
            .setLabel(`${i + 1}`)
            .setStyle(ButtonStyle.Danger);

        currentRow.addComponents(button);
        
        if (currentRow.components.length === 5 || i === rollbacks.length - 1) {
            components.push(currentRow);
            currentRow = new ActionRowBuilder();
        }
    }

    // Ajouter le bouton de retour
    const backRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('suspension_back_main')
                .setLabel('Retour')
                .setEmoji('🔙')
                .setStyle(ButtonStyle.Secondary)
        );
    
    components.push(backRow);

    await interaction.editReply({ embeds: [embed], components });
}

// Confirmer et effectuer un rollback
async function confirmRollback(interaction, rollbackId) {
    const rollbacks = await getAvailableRollbacks(interaction.guild.id);
    const rollback = rollbacks.find(r => r.id === rollbackId);
    
    if (!rollback) {
        throw new Error('Rollback introuvable ou expiré.');
    }

    const user = await interaction.client.users.fetch(rollback.userId).catch(() => null);
    const userName = user ? user.tag : 'Utilisateur inconnu';
    const actionName = getActionDisplayName(rollback.action);
    
    const embed = new EmbedBuilder()
        .setTitle('⚠️ Confirmation de Rollback')
        .setDescription(`Êtes-vous sûr de vouloir annuler cette action ?`)
        .setColor('#e74c3c')
        .addFields(
            { name: 'Action', value: actionName, inline: true },
            { name: 'Utilisateur', value: userName, inline: true },
            { name: 'Date', value: `<t:${Math.floor(rollback.timestamp / 1000)}:R>`, inline: true },
            {
                name: '⚠️ Attention',
                value: 'Cette opération est irréversible et annulera complètement l\'action sélectionnée.',
                inline: false
            }
        )
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`suspension_rollback_confirm_${rollbackId}`)
                .setLabel('Confirmer le Rollback')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('suspension_rollback_cancel')
                .setLabel('Annuler')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.editReply({ embeds: [embed], components: [row] });
}

// Utilitaires
function getActionDisplayName(action) {
    const actionNames = {
        'suspension_apply': '🔒 Application de suspension',
        'suspension_cancel': '🔓 Annulation de suspension',
        'role_change': '🎭 Modification de rôles'
    };
    return actionNames[action] || action;
}

function getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) {
        return `Il y a ${days} jour(s)`;
    } else if (hours > 0) {
        return `Il y a ${hours} heure(s)`;
    } else if (minutes > 0) {
        return `Il y a ${minutes} minute(s)`;
    } else {
        return 'À l\'instant';
    }
}

module.exports = {
    saveSuspensionState,
    getAvailableRollbacks,
    performRollback,
    showRollbackPanel,
    confirmRollback
};