import { EmbedBuilder } from 'discord.js';
import reactionRoleStore from '../store/reactionRoleStore.js';

/**
 * Système de logs avancé pour ReactionRole
 */
class ReactionRoleLogs {
    /**
     * Envoie un log dans le canal configuré
     */
    static async sendLog(guild, embed) {
        try {
            const config = await reactionRoleStore.getGuildConfig(guild.id);
            
            if (!config.logsEnabled || !config.logsChannel) {
                return;
            }

            const logChannel = guild.channels.cache.get(config.logsChannel);
            if (!logChannel) {
                console.warn(`Canal de logs ReactionRole introuvable: ${config.logsChannel}`);
                return;
            }

            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Erreur lors de l\'envoi du log ReactionRole:', error);
        }
    }

    /**
     * Log d'ajout de rôle via réaction
     */
    static async logRoleAdded(guild, user, role, emoji, messageId, channelId) {
        const embed = new EmbedBuilder()
            .setColor(0x00FF00) // Vert
            .setTitle('✅ [REACTION ROLE] Rôle Attribué')
            .setDescription('Un utilisateur a obtenu un rôle via une réaction')
            .addFields(
                { name: '👤 Utilisateur', value: `${user} (${user.tag})`, inline: true },
                { name: '🎭 Rôle attribué', value: `${role}`, inline: true },
                { name: '😀 Emoji utilisé', value: emoji, inline: true },
                { name: '📝 Message ID', value: messageId, inline: true },
                { name: '📍 Salon', value: `<#${channelId}>`, inline: true },
                { name: '🕐 Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setThumbnail(user.displayAvatarURL())
            .setTimestamp()
            .setFooter({ text: 'Système ReactionRole', iconURL: guild.iconURL() });

        await this.sendLog(guild, embed);
    }

    /**
     * Log de suppression de rôle via réaction
     */
    static async logRoleRemoved(guild, user, role, emoji, messageId, channelId) {
        const embed = new EmbedBuilder()
            .setColor(0xFF0000) // Rouge
            .setTitle('❌ [REACTION ROLE] Rôle Retiré')
            .setDescription('Un utilisateur a perdu un rôle via une réaction')
            .addFields(
                { name: '👤 Utilisateur', value: `${user} (${user.tag})`, inline: true },
                { name: '🎭 Rôle retiré', value: `${role}`, inline: true },
                { name: '😀 Emoji utilisé', value: emoji, inline: true },
                { name: '📝 Message ID', value: messageId, inline: true },
                { name: '📍 Salon', value: `<#${channelId}>`, inline: true },
                { name: '🕐 Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setThumbnail(user.displayAvatarURL())
            .setTimestamp()
            .setFooter({ text: 'Système ReactionRole', iconURL: guild.iconURL() });

        await this.sendLog(guild, embed);
    }

    /**
     * Log d'activation/désactivation du système
     */
    static async logSystemToggle(guild, user, enabled) {
        const embed = new EmbedBuilder()
            .setColor(enabled ? 0x00FF00 : 0xFF0000)
            .setTitle(`⚙️ [CONFIG] Système ReactionRole ${enabled ? 'Activé' : 'Désactivé'}`)
            .setDescription(`Le système ReactionRole a été ${enabled ? 'activé' : 'désactivé'} pour ce serveur`)
            .addFields(
                { name: '👤 Administrateur', value: `${user} (${user.tag})`, inline: true },
                { name: '📊 Statut', value: enabled ? '✅ Activé' : '❌ Désactivé', inline: true },
                { name: '🕐 Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setThumbnail(user.displayAvatarURL())
            .setTimestamp()
            .setFooter({ text: 'Configuration ReactionRole', iconURL: guild.iconURL() });

        await this.sendLog(guild, embed);
    }

    /**
     * Log de configuration du canal de logs
     */
    static async logLogsChannelSet(guild, user, channel) {
        const embed = new EmbedBuilder()
            .setColor(0x0099FF) // Bleu
            .setTitle('📍 [CONFIG] Canal de Logs Configuré')
            .setDescription('Le canal de logs ReactionRole a été configuré')
            .addFields(
                { name: '👤 Administrateur', value: `${user} (${user.tag})`, inline: true },
                { name: '📍 Canal de logs', value: channel ? `${channel}` : 'Désactivé', inline: true },
                { name: '🕐 Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setThumbnail(user.displayAvatarURL())
            .setTimestamp()
            .setFooter({ text: 'Configuration ReactionRole', iconURL: guild.iconURL() });

        await this.sendLog(guild, embed);
    }

    /**
     * Log d'activation/désactivation des logs
     */
    static async logLogsToggle(guild, user, enabled) {
        const embed = new EmbedBuilder()
            .setColor(enabled ? 0x00FF00 : 0xFF0000)
            .setTitle(`📝 [CONFIG] Logs ${enabled ? 'Activés' : 'Désactivés'}`)
            .setDescription(`Les logs ReactionRole ont été ${enabled ? 'activés' : 'désactivés'}`)
            .addFields(
                { name: '👤 Administrateur', value: `${user} (${user.tag})`, inline: true },
                { name: '📊 Statut', value: enabled ? '✅ Activés' : '❌ Désactivés', inline: true },
                { name: '🕐 Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setThumbnail(user.displayAvatarURL())
            .setTimestamp()
            .setFooter({ text: 'Configuration ReactionRole', iconURL: guild.iconURL() });

        await this.sendLog(guild, embed);
    }

    /**
     * Log d'ajout de configuration ReactionRole
     */
    static async logConfigAdded(guild, user, messageId, emoji, role, channelId) {
        const embed = new EmbedBuilder()
            .setColor(0x00FF00) // Vert
            .setTitle('🛠️ [CONFIG] ReactionRole Ajouté')
            .setDescription('Une nouvelle configuration ReactionRole a été ajoutée')
            .addFields(
                { name: '👤 Administrateur', value: `${user} (${user.tag})`, inline: true },
                { name: '🎭 Rôle configuré', value: `${role}`, inline: true },
                { name: '😀 Emoji', value: emoji, inline: true },
                { name: '📝 Message ID', value: messageId, inline: true },
                { name: '📍 Salon', value: `<#${channelId}>`, inline: true },
                { name: '🔗 Lien du message', value: `[Aller au message](https://discord.com/channels/${guild.id}/${channelId}/${messageId})`, inline: true }
            )
            .setThumbnail(user.displayAvatarURL())
            .setTimestamp()
            .setFooter({ text: 'Configuration ReactionRole', iconURL: guild.iconURL() });

        await this.sendLog(guild, embed);
    }

    /**
     * Log de suppression de configuration ReactionRole
     */
    static async logConfigRemoved(guild, user, messageId, emoji, role) {
        const embed = new EmbedBuilder()
            .setColor(0xFF0000) // Rouge
            .setTitle('🗑️ [CONFIG] ReactionRole Supprimé')
            .setDescription('Une configuration ReactionRole a été supprimée')
            .addFields(
                { name: '👤 Administrateur', value: `${user} (${user.tag})`, inline: true },
                { name: '🎭 Rôle supprimé', value: role ? `${role}` : 'Rôle introuvable', inline: true },
                { name: '😀 Emoji', value: emoji, inline: true },
                { name: '📝 Message ID', value: messageId, inline: true },
                { name: '🕐 Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setThumbnail(user.displayAvatarURL())
            .setTimestamp()
            .setFooter({ text: 'Configuration ReactionRole', iconURL: guild.iconURL() });

        await this.sendLog(guild, embed);
    }

    /**
     * Log de reset de configuration
     */
    static async logConfigReset(guild, user) {
        const embed = new EmbedBuilder()
            .setColor(0xFF6600) // Orange
            .setTitle('🔄 [CONFIG] Configuration Réinitialisée')
            .setDescription('Toute la configuration ReactionRole a été réinitialisée')
            .addFields(
                { name: '👤 Administrateur', value: `${user} (${user.tag})`, inline: true },
                { name: '⚠️ Action', value: 'Reset complet', inline: true },
                { name: '🕐 Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setThumbnail(user.displayAvatarURL())
            .setTimestamp()
            .setFooter({ text: 'Configuration ReactionRole', iconURL: guild.iconURL() });

        await this.sendLog(guild, embed);
    }

    /**
     * Log d'activation/désactivation d'un message spécifique
     */
    static async logMessageToggle(guild, user, messageId, enabled) {
        const embed = new EmbedBuilder()
            .setColor(enabled ? 0x00FF00 : 0xFF0000)
            .setTitle(`🔄 [CONFIG] Message ${enabled ? 'Activé' : 'Désactivé'}`)
            .setDescription(`Un message ReactionRole a été ${enabled ? 'activé' : 'désactivé'}`)
            .addFields(
                { name: '👤 Administrateur', value: `${user} (${user.tag})`, inline: true },
                { name: '📝 Message ID', value: messageId, inline: true },
                { name: '📊 Statut', value: enabled ? '✅ Activé' : '❌ Désactivé', inline: true },
                { name: '🕐 Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setThumbnail(user.displayAvatarURL())
            .setTimestamp()
            .setFooter({ text: 'Configuration ReactionRole', iconURL: guild.iconURL() });

        await this.sendLog(guild, embed);
    }

    /**
     * Log d'erreur
     */
    static async logError(guild, user, error, context) {
        const embed = new EmbedBuilder()
            .setColor(0xFF0000) // Rouge
            .setTitle('⚠️ [ERREUR] Erreur ReactionRole')
            .setDescription('Une erreur s\'est produite dans le système ReactionRole')
            .addFields(
                { name: '👤 Utilisateur', value: user ? `${user} (${user.tag})` : 'Système', inline: true },
                { name: '📍 Contexte', value: context || 'Non spécifié', inline: true },
                { name: '❌ Erreur', value: error.message || 'Erreur inconnue', inline: false },
                { name: '🕐 Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Système ReactionRole', iconURL: guild.iconURL() });

        await this.sendLog(guild, embed);
    }
}

export default ReactionRoleLogs;