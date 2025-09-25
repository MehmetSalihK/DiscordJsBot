import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import XPCalculator from './xpCalculator.js';

/**
 * Générateur d'embeds pour le système XP
 */
export default class XPEmbeds {
    
    /**
     * Crée un embed de profil utilisateur
     */
    static createProfileEmbed(user, member, messageStats, voiceStats, totalXp, globalLevelInfo) {
        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle(`📊 Profil XP de ${member.displayName}`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .addFields(
                {
                    name: '🌟 **Niveau Global**',
                    value: `\`\`\`yaml\nNiveau: ${globalLevelInfo.level}\nXP Total: ${XPCalculator.formatXP(totalXp)}\nProgression: ${Math.round(globalLevelInfo.progress)}%\`\`\``,
                    inline: true
                },
                {
                    name: '💬 **XP Messages**',
                    value: `\`\`\`fix\n${XPCalculator.formatXP(messageStats.totalXp)} XP\`\`\``,
                    inline: true
                },
                {
                    name: '🎤 **XP Vocal**',
                    value: `\`\`\`css\n${XPCalculator.formatXP(voiceStats.totalXp)} XP\n${Math.round(voiceStats.totalMinutes)} minutes\`\`\``,
                    inline: true
                }
            )
            .setTimestamp()
            .setFooter({
                text: `Système XP • ${member.guild.name}`,
                iconURL: member.guild.iconURL({ dynamic: true })
            });

        // Ajouter la barre de progression globale
        const progressBar = XPCalculator.generateProgressBar(
            globalLevelInfo.xpInCurrentLevel,
            globalLevelInfo.xpToNextLevel,
            20
        );
        
        embed.addFields({
            name: '📈 Progression vers le niveau suivant',
            value: `\`${progressBar}\`\n${XPCalculator.formatXP(globalLevelInfo.xpInCurrentLevel)} / ${XPCalculator.formatXP(globalLevelInfo.xpToNextLevel)} XP`,
            inline: false
        });

        // Ajouter des informations supplémentaires
        if (messageStats.lastMessageDate || voiceStats.lastVoiceDate) {
            embed.addFields({
                name: '📅 Dernière activité',
                value: `**Message:** ${messageStats.lastMessageDate ? `<t:${Math.floor(new Date(messageStats.lastMessageDate).getTime() / 1000)}:R>` : 'Jamais'}\n**Vocal:** ${voiceStats.lastVoiceDate ? `<t:${Math.floor(new Date(voiceStats.lastVoiceDate).getTime() / 1000)}:R>` : 'Jamais'}`,
                inline: false
            });
        }

        return embed;
    }

    /**
     * Crée un embed de classement avec pagination
     */
    static createLeaderboardEmbed(leaderboard, type, page, totalPages, guild) {
        const titles = {
            global: '🏆 Classement XP Global',
            message: '🏆 Classement XP Messages',
            voice: '🏆 Classement XP Vocal'
        };

        const descriptions = {
            global: 'Classement basé sur l\'XP total (messages + vocal)',
            message: 'Classement basé sur l\'XP de messages',
            voice: 'Classement basé sur l\'XP vocal'
        };

        const embed = new EmbedBuilder()
            .setColor(0xf1c40f)
            .setTitle(titles[type] || titles.global)
            .setDescription(descriptions[type] || descriptions.global)
            .setTimestamp()
            .setFooter({
                text: `Page ${page}/${totalPages} • Système XP • ${guild.name}`,
                iconURL: guild.iconURL({ dynamic: true })
            });

        return embed;
    }

    /**
     * Formate une entrée de classement
     */
    static formatLeaderboardEntry(user, index, type, member) {
        const position = index + 1;
        const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}.`;
        const displayName = member ? member.displayName : `Utilisateur ${user.userId}`;
        
        let entry = `${medal} **${displayName}**\n`;
        
        if (type === 'global') {
            entry += `   🌟 Niveau ${user.levelInfo.level} • ${XPCalculator.formatXP(user.totalXp)} XP\n`;
            entry += `   💬 ${XPCalculator.formatXP(user.messageXp)} • 🎤 ${XPCalculator.formatXP(user.voiceXp)}\n\n`;
        } else {
            entry += `   🌟 Niveau ${user.levelInfo.level} • ${XPCalculator.formatXP(user.totalXp)} XP\n\n`;
        }
        
        return entry;
    }

    /**
     * Crée les boutons de navigation pour le classement
     */
    static createLeaderboardButtons(page, totalPages, type, disabled = false) {
        const row = new ActionRowBuilder();

        // Bouton première page
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`leaderboard_first_${type}`)
                .setLabel('⏮️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled || page === 1)
        );

        // Bouton page précédente
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`leaderboard_prev_${type}`)
                .setLabel('◀️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled || page === 1)
        );

        // Bouton page suivante
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`leaderboard_next_${type}`)
                .setLabel('▶️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled || page === totalPages)
        );

        // Bouton dernière page
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`leaderboard_last_${type}`)
                .setLabel('⏭️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled || page === totalPages)
        );

        // Bouton actualiser
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`leaderboard_refresh_${type}`)
                .setLabel('🔄')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(disabled)
        );

        return row;
    }

    /**
     * Crée les boutons de sélection de type de classement
     */
    static createLeaderboardTypeButtons(currentType, disabled = false) {
        const row = new ActionRowBuilder();

        row.addComponents(
            new ButtonBuilder()
                .setCustomId('leaderboard_type_global')
                .setLabel('🌟 Global')
                .setStyle(currentType === 'global' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                .setDisabled(disabled)
        );

        row.addComponents(
            new ButtonBuilder()
                .setCustomId('leaderboard_type_message')
                .setLabel('💬 Messages')
                .setStyle(currentType === 'message' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                .setDisabled(disabled)
        );

        row.addComponents(
            new ButtonBuilder()
                .setCustomId('leaderboard_type_voice')
                .setLabel('🎤 Vocal')
                .setStyle(currentType === 'voice' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                .setDisabled(disabled)
        );

        return row;
    }

    /**
     * Crée un embed de level-up
     */
    static createLevelUpEmbed(user, member, oldLevel, newLevel, totalXp, rewards = []) {
        const embed = new EmbedBuilder()
            .setColor(0xf1c40f)
            .setTitle('🎉 Félicitations ! Level Up !')
            .setDescription(`**${member.displayName}** vient d'atteindre le **niveau ${newLevel}** !`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .addFields(
                {
                    name: '📊 Progression',
                    value: `**Ancien niveau:** ${oldLevel}\n**Nouveau niveau:** ${newLevel}\n**XP Total:** ${XPCalculator.formatXP(totalXp)}`,
                    inline: true
                }
            )
            .setTimestamp()
            .setFooter({
                text: `Système XP • ${member.guild.name}`,
                iconURL: member.guild.iconURL({ dynamic: true })
            });

        // Ajouter les récompenses si il y en a
        if (rewards.length > 0) {
            const rewardText = rewards.map(reward => `<@&${reward.roleId}>`).join('\n');
            embed.addFields({
                name: '🎁 Récompenses débloquées',
                value: rewardText,
                inline: false
            });
        }

        return embed;
    }

    /**
     * Crée un embed de configuration
     */
    static createConfigEmbed(config, guild) {
        const embed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle('⚙️ Configuration du Système XP')
            .addFields(
                {
                    name: '🔧 Paramètres Généraux',
                    value: `**Activé:** ${config.enabled ? '✅' : '❌'}\n**Mode de progression:** ${config.levelThresholds.mode === 'arithmetic' ? 'Arithmétique' : 'Personnalisé'}`,
                    inline: true
                },
                {
                    name: '💬 XP Messages',
                    value: `**XP par message:** ${config.messageXp.minXp}-${config.messageXp.maxXp}\n**Cooldown:** ${config.messageXp.cooldownSeconds}s\n**Longueur min:** ${config.messageXp.minLength} caractères`,
                    inline: true
                },
                {
                    name: '🎤 XP Vocal',
                    value: `**XP par chunk:** ${config.voiceXp.voiceChunkXP}\n**Durée chunk:** ${config.voiceXp.voiceChunkSeconds}s\n**Ignorer AFK:** ${config.voiceXp.ignoreAfkChannel ? '✅' : '❌'}`,
                    inline: true
                },
                {
                    name: '🎁 Récompenses',
                    value: `**Nombre de rôles:** ${config.roleRewards.length}\n**Messages level-up:** ${config.levelUpMessages.enabled ? '✅' : '❌'}\n**Envoi en DM:** ${config.levelUpMessages.sendInDM ? '✅' : '❌'}`,
                    inline: true
                },
                {
                    name: '🚫 Exclusions',
                    value: `**Canaux exclus:** ${config.excludedChannels.length}\n**Rôles exclus:** ${config.excludedRoles.length}`,
                    inline: true
                }
            )
            .setTimestamp()
            .setFooter({
                text: `Système XP • ${guild.name}`,
                iconURL: guild.iconURL({ dynamic: true })
            });

        return embed;
    }

    /**
     * Crée les boutons de configuration
     */
    static createConfigButtons(disabled = false) {
        const row1 = new ActionRowBuilder();
        const row2 = new ActionRowBuilder();

        row1.addComponents(
            new ButtonBuilder()
                .setCustomId('config_general')
                .setLabel('🔧 Général')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled)
        );

        row1.addComponents(
            new ButtonBuilder()
                .setCustomId('config_message_xp')
                .setLabel('💬 XP Messages')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled)
        );

        row1.addComponents(
            new ButtonBuilder()
                .setCustomId('config_voice_xp')
                .setLabel('🎤 XP Vocal')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled)
        );

        row2.addComponents(
            new ButtonBuilder()
                .setCustomId('config_rewards')
                .setLabel('🎁 Récompenses')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled)
        );

        row2.addComponents(
            new ButtonBuilder()
                .setCustomId('config_exclusions')
                .setLabel('🚫 Exclusions')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled)
        );

        return [row1, row2];
    }

    /**
     * Crée un embed d'erreur
     */
    static createErrorEmbed(title, description, guild = null) {
        const embed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle(`❌ ${title}`)
            .setDescription(description)
            .setTimestamp();

        if (guild) {
            embed.setFooter({
                text: `Système XP • ${guild.name}`,
                iconURL: guild.iconURL({ dynamic: true })
            });
        }

        return embed;
    }

    /**
     * Crée un embed de succès
     */
    static createSuccessEmbed(title, description, guild = null) {
        const embed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle(`✅ ${title}`)
            .setDescription(description)
            .setTimestamp();

        if (guild) {
            embed.setFooter({
                text: `Système XP • ${guild.name}`,
                iconURL: guild.iconURL({ dynamic: true })
            });
        }

        return embed;
    }

    /**
     * Crée un embed d'information
     */
    static createInfoEmbed(title, description, guild = null) {
        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle(`ℹ️ ${title}`)
            .setDescription(description)
            .setTimestamp();

        if (guild) {
            embed.setFooter({
                text: `Système XP • ${guild.name}`,
                iconURL: guild.iconURL({ dynamic: true })
            });
        }

        return embed;
    }

    /**
     * Crée un embed d'aide pour les commandes XP
     */
    static createHelpEmbed(guild) {
        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('🎯 Aide - Commandes XP')
            .setDescription('Voici toutes les commandes disponibles pour le système XP :')
            .addFields(
                {
                    name: '📊 Profil',
                    value: '`/xp profil [@utilisateur]` ou `xp profil [@utilisateur]`\nAffiche le profil XP d\'un utilisateur',
                    inline: false
                },
                {
                    name: '🏆 Classement',
                    value: '`/xp classement [type]` ou `xp classement [type]`\nAffiche le classement du serveur (global, message, vocal)',
                    inline: false
                },
                {
                    name: '⚙️ Configuration',
                    value: '`/xp config` ou `xp config`\nGère la configuration du système (Admin uniquement)',
                    inline: false
                },
                {
                    name: '🗑️ Reset',
                    value: '`/xp reset` ou `xp reset`\nRemet à zéro l\'XP d\'un utilisateur (Admin uniquement)',
                    inline: false
                },
                {
                    name: '🎁 Donner XP',
                    value: '`/xp give` ou `xp give`\nDonne de l\'XP à un utilisateur (Admin uniquement)',
                    inline: false
                },
                {
                    name: '📥 Import/Export',
                    value: '`/xp import` et `/xp export`\nImporte ou exporte les données XP (Admin uniquement)',
                    inline: false
                }
            )
            .setTimestamp()
            .setFooter({
                text: `Système XP • ${guild.name}`,
                iconURL: guild.iconURL({ dynamic: true })
            });

        return embed;
    }

    /**
     * Crée un embed de statistiques du serveur
     */
    static createServerStatsEmbed(stats, guild) {
        const embed = new EmbedBuilder()
            .setColor(0x9b59b6)
            .setTitle('📈 Statistiques du Serveur')
            .addFields(
                {
                    name: '👥 Utilisateurs Actifs',
                    value: `**Total:** ${stats.totalUsers}\n**Avec XP Messages:** ${stats.messageUsers}\n**Avec XP Vocal:** ${stats.voiceUsers}`,
                    inline: true
                },
                {
                    name: '💬 Messages',
                    value: `**Total XP:** ${XPCalculator.formatXP(stats.totalMessageXp)}\n**Messages envoyés:** ${stats.totalMessages}\n**Moyenne par utilisateur:** ${Math.round(stats.avgMessageXp)}`,
                    inline: true
                },
                {
                    name: '🎤 Vocal',
                    value: `**Total XP:** ${XPCalculator.formatXP(stats.totalVoiceXp)}\n**Temps total:** ${Math.round(stats.totalVoiceMinutes)}min\n**Moyenne par utilisateur:** ${Math.round(stats.avgVoiceXp)}`,
                    inline: true
                },
                {
                    name: '🏆 Niveaux',
                    value: `**Niveau max:** ${stats.maxLevel}\n**Niveau moyen:** ${Math.round(stats.avgLevel * 10) / 10}\n**Utilisateurs niveau 10+:** ${stats.highLevelUsers}`,
                    inline: true
                }
            )
            .setTimestamp()
            .setFooter({
                text: `Système XP • ${guild.name}`,
                iconURL: guild.iconURL({ dynamic: true })
            });

        return embed;
    }
}