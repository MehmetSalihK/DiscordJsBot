import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

/**
 * Crée un embed pour le panneau de boutons de réaction
 * @param {Object} panelConfig - Configuration du panneau
 * @returns {EmbedBuilder} L'embed créé
 */
function createButtonReactEmbed(panelConfig) {
    const embed = new EmbedBuilder()
        .setTitle(panelConfig.title || '🎭 Panneau de Rôles')
        .setDescription(panelConfig.description || 'Cliquez sur les boutons ci-dessous pour obtenir ou retirer vos rôles !')
        .setColor(panelConfig.color || '#3498db')
        .setTimestamp();

    if (panelConfig.thumbnail) {
        embed.setThumbnail(panelConfig.thumbnail);
    }

    if (panelConfig.image) {
        embed.setImage(panelConfig.image);
    }

    if (panelConfig.footer) {
        embed.setFooter({ text: panelConfig.footer });
    }

    return embed;
}

/**
 * Crée les boutons pour le panneau de rôles
 * @param {Array} buttons - Configuration des boutons
 * @returns {Array<ActionRowBuilder>} Les rangées de boutons
 */
function createButtonReactButtons(buttons) {
    const rows = [];
    let currentRow = new ActionRowBuilder();
    let buttonCount = 0;

    for (const button of buttons) {
        if (buttonCount === 5) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder();
            buttonCount = 0;
        }

        const discordButton = new ButtonBuilder()
            .setCustomId(`buttonreact_${button.roleId}`)
            .setLabel(button.label)
            .setStyle(getButtonStyle(button.style || 'secondary'));

        if (button.emoji) {
            discordButton.setEmoji(button.emoji);
        }

        currentRow.addComponents(discordButton);
        buttonCount++;
    }

    if (buttonCount > 0) {
        rows.push(currentRow);
    }

    return rows;
}

/**
 * Convertit le style de bouton en style Discord
 * @param {string} style - Le style du bouton
 * @returns {ButtonStyle} Le style Discord correspondant
 */
function getButtonStyle(style) {
    const styles = {
        'primary': ButtonStyle.Primary,
        'secondary': ButtonStyle.Secondary,
        'success': ButtonStyle.Success,
        'danger': ButtonStyle.Danger,
        'blurple': ButtonStyle.Primary,
        'grey': ButtonStyle.Secondary,
        'gray': ButtonStyle.Secondary,
        'green': ButtonStyle.Success,
        'red': ButtonStyle.Danger
    };

    return styles[style.toLowerCase()] || ButtonStyle.Secondary;
}

/**
 * Valide la configuration d'un panneau de boutons
 * @param {Object} config - Configuration à valider
 * @returns {Object} Résultat de la validation
 */
function validatePanelConfig(config) {
    const errors = [];

    if (!config.title || config.title.length > 256) {
        errors.push('Le titre doit être présent et faire moins de 256 caractères');
    }

    if (!config.description || config.description.length > 4096) {
        errors.push('La description doit être présente et faire moins de 4096 caractères');
    }

    if (!config.buttons || !Array.isArray(config.buttons) || config.buttons.length === 0) {
        errors.push('Au moins un bouton doit être configuré');
    }

    if (config.buttons && config.buttons.length > 25) {
        errors.push('Maximum 25 boutons autorisés par panneau');
    }

    if (config.buttons) {
        for (let i = 0; i < config.buttons.length; i++) {
            const button = config.buttons[i];
            if (!button.roleId) {
                errors.push(`Bouton ${i + 1}: ID de rôle manquant`);
            }
            if (!button.label || button.label.length > 80) {
                errors.push(`Bouton ${i + 1}: Label manquant ou trop long (max 80 caractères)`);
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Génère un ID unique pour un panneau
 * @param {string} guildId - ID du serveur
 * @returns {string} ID unique du panneau
 */
function generatePanelId(guildId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${guildId}_${timestamp}_${random}`;
}

/**
 * Formate la liste des rôles pour l'affichage
 * @param {Array} buttons - Configuration des boutons
 * @param {Object} guild - Le serveur Discord
 * @returns {string} Liste formatée des rôles
 */
function formatRolesList(buttons, guild) {
    return buttons.map((button, index) => {
        const role = guild.roles.cache.get(button.roleId);
        const roleName = role ? role.name : 'Rôle introuvable';
        const emoji = button.emoji ? `${button.emoji} ` : '';
        return `${index + 1}. ${emoji}**${button.label}** → ${roleName}`;
    }).join('\n');
}

export {
    createButtonReactEmbed as createPanelEmbed,
    createButtonReactButtons as createButtonRow,
    validatePanelConfig,
    generatePanelId,
    formatRolesList as formatRoleList
};


