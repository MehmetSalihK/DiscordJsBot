import { EmbedBuilder } from 'discord.js';
import reactionRoleStore from '../store/reactionRoleStore.js';

/**
 * Système de logs pour les ReactionRoles
 */
class ReactionRoleLogger {
    /**
     * Envoie un log dans le canal configuré
     */
    async sendLog(guild, type, data) {
        try {
            const config = await reactionRoleStore.getGuildConfig(guild.id);
            
            if (!config.logsEnabled || !config.logsChannel) {
                return;
            }

            const channel = guild.channels.cache.get(config.logsChannel);
            if (!channel || !channel.isTextBased()) {
                return;
            }

            const embed = this.createLogEmbed(type, data);
            await channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Erreur lors de l\'envoi du log ReactionRole:', error);
        }
    }

    /**
     * Crée un embed de log selon le type d'action
     */
    createLogEmbed(type, data) {
        const embed = new EmbedBuilder()
            .setTimestamp()
            .setFooter({ text: 'ReactionRole System' });

        switch (type) {
            case 'role_added':
                return embed
                    .setTitle('🟢 Rôle Ajouté')
                    .setColor('#00ff00')
                    .setDescription(`Un rôle a été ajouté via ReactionRole`)
                    .addFields(
                        { name: '👤 Utilisateur', value: `${data.user} (${data.user.id})`, inline: true },
                        { name: '🎭 Rôle', value: `${data.role} (${data.role.id})`, inline: true },
                        { name: '📝 Message', value: `[Lien](${data.messageUrl})`, inline: true },
                        { name: '😀 Réaction', value: data.emoji, inline: true },
                        { name: '📍 Canal', value: `${data.channel}`, inline: true }
                    );

            case 'role_removed':
                return embed
                    .setTitle('🔴 Rôle Retiré')
                    .setColor('#ff0000')
                    .setDescription(`Un rôle a été retiré via ReactionRole`)
                    .addFields(
                        { name: '👤 Utilisateur', value: `${data.user} (${data.user.id})`, inline: true },
                        { name: '🎭 Rôle', value: `${data.role} (${data.role.id})`, inline: true },
                        { name: '📝 Message', value: `[Lien](${data.messageUrl})`, inline: true },
                        { name: '😀 Réaction', value: data.emoji, inline: true },
                        { name: '📍 Canal', value: `${data.channel}`, inline: true }
                    );

            case 'reaction_added':
                return embed
                    .setTitle('➕ Réaction Ajoutée')
                    .setColor('#0099ff')
                    .setDescription(`Une nouvelle réaction role a été configurée`)
                    .addFields(
                        { name: '👤 Admin', value: `${data.admin} (${data.admin.id})`, inline: true },
                        { name: '🎭 Rôle', value: `${data.role} (${data.role.id})`, inline: true },
                        { name: '📝 Message', value: `[Lien](${data.messageUrl})`, inline: true },
                        { name: '😀 Réaction', value: data.emoji, inline: true },
                        { name: '📍 Canal', value: `${data.channel}`, inline: true }
                    );

            case 'reaction_removed':
                return embed
                    .setTitle('➖ Réaction Supprimée')
                    .setColor('#ff9900')
                    .setDescription(`Une réaction role a été supprimée`)
                    .addFields(
                        { name: '👤 Admin', value: `${data.admin} (${data.admin.id})`, inline: true },
                        { name: '🎭 Rôle', value: `${data.role} (${data.role.id})`, inline: true },
                        { name: '📝 Message', value: `[Lien](${data.messageUrl})`, inline: true },
                        { name: '😀 Réaction', value: data.emoji, inline: true },
                        { name: '📍 Canal', value: `${data.channel}`, inline: true }
                    );

            case 'system_toggled':
                return embed
                    .setTitle(data.enabled ? '✅ Système Activé' : '❌ Système Désactivé')
                    .setColor(data.enabled ? '#00ff00' : '#ff0000')
                    .setDescription(`Le système ReactionRole a été ${data.enabled ? 'activé' : 'désactivé'}`)
                    .addFields(
                        { name: '👤 Admin', value: `${data.admin} (${data.admin.id})`, inline: true },
                        { name: '📊 Statut', value: data.enabled ? 'Activé' : 'Désactivé', inline: true }
                    );

            case 'message_toggled':
                return embed
                    .setTitle(data.enabled ? '📝 Message Activé' : '📝 Message Désactivé')
                    .setColor(data.enabled ? '#00ff00' : '#ff0000')
                    .setDescription(`Un message ReactionRole a été ${data.enabled ? 'activé' : 'désactivé'}`)
                    .addFields(
                        { name: '👤 Admin', value: `${data.admin} (${data.admin.id})`, inline: true },
                        { name: '📝 Message', value: `[Lien](${data.messageUrl})`, inline: true },
                        { name: '📍 Canal', value: `${data.channel}`, inline: true },
                        { name: '📊 Statut', value: data.enabled ? 'Activé' : 'Désactivé', inline: true }
                    );

            case 'reaction_toggled':
                return embed
                    .setTitle(data.enabled ? '😀 Réaction Activée' : '😀 Réaction Désactivée')
                    .setColor(data.enabled ? '#00ff00' : '#ff0000')
                    .setDescription(`Une réaction spécifique a été ${data.enabled ? 'activée' : 'désactivée'}`)
                    .addFields(
                        { name: '👤 Admin', value: `${data.admin} (${data.admin.id})`, inline: true },
                        { name: '😀 Réaction', value: data.emoji, inline: true },
                        { name: '🎭 Rôle', value: `${data.role} (${data.role.id})`, inline: true },
                        { name: '📝 Message', value: `[Lien](${data.messageUrl})`, inline: true },
                        { name: '📊 Statut', value: data.enabled ? 'Activé' : 'Désactivé', inline: true }
                    );

            case 'system_reset':
                return embed
                    .setTitle('🔄 Système Réinitialisé')
                    .setColor('#ff0000')
                    .setDescription(`Toutes les configurations ReactionRole ont été supprimées`)
                    .addFields(
                        { name: '👤 Admin', value: `${data.admin} (${data.admin.id})`, inline: true },
                        { name: '📊 Messages supprimés', value: data.messagesCount.toString(), inline: true },
                        { name: '📊 Réactions supprimées', value: data.reactionsCount.toString(), inline: true }
                    );

            case 'logs_configured':
                return embed
                    .setTitle('📋 Logs Configurés')
                    .setColor('#0099ff')
                    .setDescription(`Le canal de logs a été configuré`)
                    .addFields(
                        { name: '👤 Admin', value: `${data.admin} (${data.admin.id})`, inline: true },
                        { name: '📍 Canal', value: `${data.channel}`, inline: true },
                        { name: '📊 Statut', value: 'Activé', inline: true }
                    );

            case 'logs_toggled':
                return embed
                    .setTitle(data.enabled ? '📋 Logs Activés' : '📋 Logs Désactivés')
                    .setColor(data.enabled ? '#00ff00' : '#ff0000')
                    .setDescription(`Les logs ont été ${data.enabled ? 'activés' : 'désactivés'}`)
                    .addFields(
                        { name: '👤 Admin', value: `${data.admin} (${data.admin.id})`, inline: true },
                        { name: '📊 Statut', value: data.enabled ? 'Activé' : 'Désactivé', inline: true }
                    );

            case 'error':
                return embed
                    .setTitle('⚠️ Erreur ReactionRole')
                    .setColor('#ff0000')
                    .setDescription(`Une erreur s'est produite dans le système ReactionRole`)
                    .addFields(
                        { name: '❌ Erreur', value: data.error, inline: false },
                        { name: '👤 Utilisateur', value: data.user ? `${data.user} (${data.user.id})` : 'Système', inline: true },
                        { name: '📍 Action', value: data.action || 'Inconnue', inline: true }
                    );

            case 'permissions_config':
                return embed
                    .setTitle('🔐 Configuration des Permissions')
                    .setColor('#9932cc')
                    .setDescription(`Les permissions ont été configurées`)
                    .addFields(
                        { name: '👤 Admin', value: `${data.admin} (${data.admin.id})`, inline: true },
                        { name: '⚙️ Action', value: data.action, inline: true }
                    );

            case 'cooldown_config':
                return embed
                    .setTitle('⏱️ Configuration du Cooldown')
                    .setColor('#ff6347')
                    .setDescription(`Le cooldown a été configuré`)
                    .addFields(
                        { name: '👤 Admin', value: `${data.admin} (${data.admin.id})`, inline: true },
                        { name: '⏱️ Durée', value: `${data.cooldownSeconds} secondes`, inline: true }
                    );

            case 'restrictions_config':
                return embed
                    .setTitle('🚫 Configuration des Restrictions')
                    .setColor('#dc143c')
                    .setDescription(`Les restrictions ont été configurées`)
                    .addFields(
                        { name: '👤 Admin', value: `${data.admin} (${data.admin.id})`, inline: true },
                        { name: '🎭 Max Rôles', value: data.maxRoles.toString(), inline: true }
                    );

            case 'backup_created':
                return embed
                    .setTitle('💾 Sauvegarde Créée')
                    .setColor('#32cd32')
                    .setDescription(`Une sauvegarde a été créée`)
                    .addFields(
                        { name: '👤 Admin', value: `${data.admin} (${data.admin.id})`, inline: true },
                        { name: '🆔 ID Sauvegarde', value: data.backupId, inline: true }
                    );

            case 'config_import_export':
                return embed
                    .setTitle(data.action === 'import' ? '📥 Configuration Importée' : '📤 Configuration Exportée')
                    .setColor('#4169e1')
                    .setDescription(`Configuration ${data.action === 'import' ? 'importée' : 'exportée'} avec succès`)
                    .addFields(
                        { name: '👤 Admin', value: `${data.admin} (${data.admin.id})`, inline: true },
                        { name: '📋 Détails', value: data.details || 'Aucun détail', inline: true }
                    );

            case 'repair_action':
                return embed
                    .setTitle('🔧 Action de Réparation')
                    .setColor('#ffa500')
                    .setDescription(`Action de réparation effectuée`)
                    .addFields(
                        { name: '👤 Admin', value: `${data.admin} (${data.admin.id})`, inline: true },
                        { name: '🔧 Action', value: data.action, inline: true },
                        { name: '📊 Résultats', value: data.results || 'Aucun résultat', inline: false }
                    );

            case 'cleanup_action':
                return embed
                    .setTitle('🧹 Action de Nettoyage')
                    .setColor('#20b2aa')
                    .setDescription(`Action de nettoyage effectuée`)
                    .addFields(
                        { name: '👤 Admin', value: `${data.admin} (${data.admin.id})`, inline: true },
                        { name: '🧹 Action', value: data.action, inline: true },
                        { name: '📊 Résultats', value: data.results || 'Aucun résultat', inline: false }
                    );

            default:
                return embed
                    .setTitle('📝 Action ReactionRole')
                    .setColor('#0099ff')
                    .setDescription(`Action: ${type}`)
                    .addFields(
                        { name: 'Données', value: JSON.stringify(data, null, 2).substring(0, 1000), inline: false }
                    );
        }
    }

    /**
     * Log pour l'ajout d'un rôle
     */
    async logRoleAdded(guild, user, role, message, emoji) {
        await this.sendLog(guild, 'role_added', {
            user,
            role,
            messageUrl: `https://discord.com/channels/${guild.id}/${message.channel.id}/${message.id}`,
            emoji,
            channel: message.channel
        });
    }

    /**
     * Log pour la suppression d'un rôle
     */
    async logRoleRemoved(guild, user, role, message, emoji) {
        await this.sendLog(guild, 'role_removed', {
            user,
            role,
            messageUrl: `https://discord.com/channels/${guild.id}/${message.channel.id}/${message.id}`,
            emoji,
            channel: message.channel
        });
    }

    /**
     * Log pour l'ajout d'une réaction role
     */
    async logReactionAdded(guild, admin, role, message, emoji) {
        await this.sendLog(guild, 'reaction_added', {
            admin,
            role,
            messageUrl: `https://discord.com/channels/${guild.id}/${message.channel.id}/${message.id}`,
            emoji,
            channel: message.channel
        });
    }

    /**
     * Log pour la suppression d'une réaction role
     */
    async logReactionRemoved(guild, admin, role, message, emoji) {
        await this.sendLog(guild, 'reaction_removed', {
            admin,
            role,
            messageUrl: `https://discord.com/channels/${guild.id}/${message.channel.id}/${message.id}`,
            emoji,
            channel: message.channel
        });
    }

    /**
     * Log pour l'activation/désactivation du système
     */
    async logSystemToggled(guild, admin, enabled) {
        await this.sendLog(guild, 'system_toggled', {
            admin,
            enabled
        });
    }

    /**
     * Log pour l'activation/désactivation d'un message
     */
    async logMessageToggled(guild, admin, message, enabled) {
        await this.sendLog(guild, 'message_toggled', {
            admin,
            messageUrl: `https://discord.com/channels/${guild.id}/${message.channel.id}/${message.id}`,
            channel: message.channel,
            enabled
        });
    }

    /**
     * Log pour l'activation/désactivation d'une réaction
     */
    async logReactionToggled(guild, admin, role, message, emoji, enabled) {
        await this.sendLog(guild, 'reaction_toggled', {
            admin,
            emoji,
            role,
            messageUrl: `https://discord.com/channels/${guild.id}/${message.channel.id}/${message.id}`,
            enabled
        });
    }

    /**
     * Log pour la réinitialisation du système
     */
    async logSystemReset(guild, admin, messagesCount, reactionsCount) {
        await this.sendLog(guild, 'system_reset', {
            admin,
            messagesCount,
            reactionsCount
        });
    }

    /**
     * Log pour la configuration des logs
     */
    async logLogsConfigured(guild, admin, channel) {
        await this.sendLog(guild, 'logs_configured', {
            admin,
            channel
        });
    }

    /**
     * Log pour l'activation/désactivation des logs
     */
    async logLogsToggled(guild, admin, enabled) {
        await this.sendLog(guild, 'logs_toggled', {
            admin,
            enabled
        });
    }

    /**
     * Log pour les erreurs
     */
    async logError(guild, error, user = null, action = null) {
        await this.sendLog(guild, 'error', {
            error: error.message || error,
            user,
            action
        });
    }

    // Nouvelles méthodes pour les fonctionnalités avancées

    /**
     * Configure le canal de logs
     */
    async setLogChannel(guildId, channelId) {
        await reactionRoleStore.setLogsChannel(guildId, channelId);
    }

    /**
     * Obtient le canal de logs configuré
     */
    async getLogChannel(guildId) {
        const config = await reactionRoleStore.getGuildConfig(guildId);
        return config.logsChannel;
    }

    /**
     * Vérifie si les logs sont activés
     */
    async areLogsEnabled(guildId) {
        const config = await reactionRoleStore.getGuildConfig(guildId);
        return config.logsEnabled && config.logsChannel;
    }

    /**
     * Active/désactive les logs
     */
    async toggleLogs(guildId) {
        return await reactionRoleStore.toggleLogs(guildId);
    }

    /**
     * Log une action générique
     */
    async logAction(guildId, action, data) {
        try {
            const config = await reactionRoleStore.getGuildConfig(guildId);
            
            if (!config.logsEnabled || !config.logsChannel) {
                return;
            }

            // Créer un log simple pour les nouvelles actions
            console.log(`[ReactionRole] ${action}:`, data);
        } catch (error) {
            console.error('Erreur lors du log d\'action:', error);
        }
    }

    /**
     * Log pour la configuration des permissions
     */
    async logPermissionsConfig(guild, admin, action, data) {
        await this.sendLog(guild, 'permissions_config', {
            admin,
            action,
            ...data
        });
    }

    /**
     * Log pour la configuration des cooldowns
     */
    async logCooldownConfig(guild, admin, cooldownSeconds) {
        await this.sendLog(guild, 'cooldown_config', {
            admin,
            cooldownSeconds
        });
    }

    /**
     * Log pour la configuration des restrictions
     */
    async logRestrictionsConfig(guild, admin, maxRoles) {
        await this.sendLog(guild, 'restrictions_config', {
            admin,
            maxRoles
        });
    }

    /**
     * Log pour la création de sauvegarde
     */
    async logBackupCreated(guild, admin, backupId) {
        await this.sendLog(guild, 'backup_created', {
            admin,
            backupId
        });
    }

    /**
     * Log pour l'import/export de configuration
     */
    async logConfigImportExport(guild, admin, action, details) {
        await this.sendLog(guild, 'config_import_export', {
            admin,
            action,
            details
        });
    }

    /**
     * Log pour les actions de réparation
     */
    async logRepairAction(guild, admin, action, results) {
        await this.sendLog(guild, 'repair_action', {
            admin,
            action,
            results
        });
    }

    /**
     * Log pour les actions de nettoyage
     */
    async logCleanupAction(guild, admin, action, results) {
        await this.sendLog(guild, 'cleanup_action', {
            admin,
            action,
            results
        });
    }
}

// Instance singleton
const reactionRoleLogger = new ReactionRoleLogger();

export default reactionRoleLogger;