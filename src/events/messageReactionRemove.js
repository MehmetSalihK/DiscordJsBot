import reactionRoleStore from '../store/reactionRoleStore.js';
import logger from '../utils/logger.js';

export default {
    name: 'messageReactionRemove',
    async execute(reaction, user) {
        // Ignorer les réactions du bot
        if (user.bot) return;

        // Récupérer le message complet si c'est une réaction partielle
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                logger.error('Erreur lors de la récupération de la réaction:', error);
                return;
            }
        }

        const guild = reaction.message.guild;
        if (!guild) return;

        try {
            // Vérifier si le système est activé pour cette guilde
            const guildConfig = await reactionRoleStore.getGuildConfig(guild.id);
            if (!guildConfig || !guildConfig.enabled) return;

            // Récupérer l'emoji (unicode ou custom)
            const emoji = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;
            
            // Chercher la configuration pour cette réaction
            const reactionRole = await reactionRoleStore.getReactionRole(
                guild.id,
                reaction.message.id,
                emoji
            );

            if (!reactionRole) return;

            // Vérifier si la configuration est active
            if (!reactionRole.globalEnabled || !reactionRole.messageEnabled || !reactionRole.reactionEnabled) {
                return;
            }

            // Récupérer le membre et le rôle
            const member = await guild.members.fetch(user.id).catch(() => null);
            const role = guild.roles.cache.get(reactionRole.roleId);

            if (!member || !role) {
                logger.warn(`Membre ou rôle introuvable: member=${!!member}, role=${!!role}`);
                return;
            }

            // Vérifier si le membre a le rôle
            if (!member.roles.cache.has(role.id)) {
                return; // Le membre n'a pas le rôle
            }

            // Vérifier si removeOnUnreact est activé pour ce message
            if (!reactionRole.removeOnUnreact) {
                return; // Ne pas retirer le rôle si removeOnUnreact est désactivé
            }

            // Supprimer le rôle
            await member.roles.remove(role, 'ReactionRole automatique');

            // Logger l'action
            logger.action(`Rôle retiré: ${role.name} de ${user.tag} via suppression de réaction ${emoji}`);

        } catch (error) {
            logger.error('Erreur dans messageReactionRemove:', error);
        }
    }
};