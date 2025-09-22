import { EmbedBuilder } from 'discord.js';
import { loadButtonReactData, getGuildButtonReactConfig } from './storage.js';

/**
 * Crée un embed d'erreur
 * @param {string} message - Message d'erreur
 * @returns {EmbedBuilder} L'embed d'erreur
 */
function createErrorEmbed(message) {
    return new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('❌ Erreur')
        .setDescription(message)
        .setTimestamp();
}

/**
 * Crée un embed de succès
 * @param {string} message - Message de succès
 * @returns {EmbedBuilder} L'embed de succès
 */
function createSuccessEmbed(message) {
    return new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('✅ Succès')
        .setDescription(message)
        .setTimestamp();
}

/**
 * Gère les interactions des boutons de réaction
 * @param {ButtonInteraction} interaction - L'interaction du bouton
 */
async function handleButtonReactInteraction(interaction) {
    try {
        console.log('🔍 [DEBUG] Interaction reçue:', interaction.customId);
        
        if (!interaction.customId.startsWith('buttonreact_')) {
            console.log('❌ [DEBUG] CustomId ne commence pas par buttonreact_');
            return;
        }

        const roleId = interaction.customId.replace('buttonreact_', '');
        console.log('🎯 [DEBUG] Role ID extrait:', roleId);
        
        const member = interaction.member;
        const guild = interaction.guild;

        // Vérifier si le rôle existe
        const role = guild.roles.cache.get(roleId);
        console.log('🔍 [DEBUG] Rôle trouvé:', role ? role.name : 'INTROUVABLE');
        
        if (!role) {
            console.log('❌ [DEBUG] Rôle introuvable avec ID:', roleId);
            return await interaction.reply({
                embeds: [createErrorEmbed('Ce rôle n\'existe plus sur le serveur.')],
                flags: 64 // MessageFlags.Ephemeral
            });
        }

        // Vérifier si le bot peut gérer ce rôle
        console.log('🔍 [DEBUG] Position du rôle:', role.position, 'Position du bot:', guild.members.me.roles.highest.position);
        
        if (role.position >= guild.members.me.roles.highest.position) {
            console.log('❌ [DEBUG] Permissions insuffisantes pour gérer le rôle');
            return await interaction.reply({
                embeds: [createErrorEmbed('Je n\'ai pas les permissions pour gérer ce rôle.')],
                flags: 64 // MessageFlags.Ephemeral
            });
        }

        // Vérifier si le membre a déjà le rôle
        const hasRole = member.roles.cache.has(roleId);
        console.log('🔍 [DEBUG] Membre a déjà le rôle:', hasRole);

        try {
            if (hasRole) {
                // Retirer le rôle
                console.log('🔄 [DEBUG] Tentative de retrait du rôle...');
                await member.roles.remove(roleId);
                console.log('✅ [DEBUG] Rôle retiré avec succès');
                await interaction.reply({
                    embeds: [createSuccessEmbed(`Le rôle **${role.name}** vous a été retiré !`)],
                    flags: 64 // MessageFlags.Ephemeral
                });
            } else {
                // Ajouter le rôle
                console.log('🔄 [DEBUG] Tentative d\'ajout du rôle...');
                await member.roles.add(roleId);
                console.log('✅ [DEBUG] Rôle ajouté avec succès');
                await interaction.reply({
                    embeds: [createSuccessEmbed(`Le rôle **${role.name}** vous a été attribué !`)],
                    flags: 64 // MessageFlags.Ephemeral
                });
            }
        } catch (error) {
            console.error('❌ [DEBUG] Erreur lors de la gestion du rôle:', error);
            await interaction.reply({
                embeds: [createErrorEmbed('Une erreur est survenue lors de la gestion du rôle.')],
                flags: 64 // MessageFlags.Ephemeral
            });
        }

    } catch (error) {
        console.error('Erreur dans handleButtonReactInteraction:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                embeds: [createErrorEmbed('Une erreur inattendue est survenue.')],
                flags: 64 // MessageFlags.Ephemeral
            });
        }
    }
}

/**
 * Vérifie si une interaction concerne les boutons de réaction
 * @param {Interaction} interaction - L'interaction à vérifier
 * @returns {boolean} True si c'est une interaction de bouton de réaction
 */
function isButtonReactInteraction(interaction) {
    return interaction.isButton() && interaction.customId.startsWith('buttonreact_');
}

/**
 * Gère les interactions des menus de sélection pour les boutons de réaction
 * @param {SelectMenuInteraction} interaction - L'interaction du menu
 */
async function handleButtonReactSelectMenu(interaction) {
    try {
        // Cette fonction peut être étendue pour gérer des menus de sélection
        // pour la configuration des panneaux de boutons
        
        if (!interaction.customId.startsWith('buttonreact_select_')) {
            return;
        }

        // Logique pour les menus de sélection des boutons de réaction
        // À implémenter selon les besoins spécifiques

    } catch (error) {
        console.error('Erreur dans handleButtonReactSelectMenu:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                embeds: [createErrorEmbed('Une erreur inattendue est survenue.')],
                flags: 64 // MessageFlags.Ephemeral
            });
        }
    }
}

/**
 * Vérifie si une interaction concerne les menus de sélection des boutons de réaction
 * @param {Interaction} interaction - L'interaction à vérifier
 * @returns {boolean} True si c'est une interaction de menu de boutons de réaction
 */
function isButtonReactSelectMenuInteraction(interaction) {
    return interaction.isStringSelectMenu() && interaction.customId.startsWith('buttonreact_select_');
}

export {
    createErrorEmbed,
    createSuccessEmbed,
    handleButtonReactInteraction,
    handleButtonReactSelectMenu,
    isButtonReactInteraction,
    isButtonReactSelectMenuInteraction
};


