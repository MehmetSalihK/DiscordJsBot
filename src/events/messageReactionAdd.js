import reactionRoleStore from '../store/reactionRoleStore.js';
import logger from '../utils/logger.js';

export default {
    name: 'messageReactionAdd',
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

            // Vérifier si le membre a déjà le rôle
            if (member.roles.cache.has(role.id)) {
                return; // Le membre a déjà le rôle
            }

            // Gestion du mode exclusif
            if (reactionRole.exclusive) {
                // Obtenir tous les rôles de ce message que l'utilisateur possède
                const userRoles = await reactionRoleStore.getUserRolesForMessage(
                    guild.id, 
                    reaction.message.id, 
                    user.id, 
                    guild
                );
                
                // Retirer tous les autres rôles de ce message
                for (const roleId of userRoles) {
                    if (roleId !== role.id) {
                        const roleToRemove = guild.roles.cache.get(roleId);
                        if (roleToRemove && member.roles.cache.has(roleId)) {
                            await member.roles.remove(roleToRemove);
                            logger.action(`Rôle retiré (mode exclusif): ${roleToRemove.name} de ${user.tag}`);
                        }
                    }
                }
            }

            // Ajouter le rôle
            await member.roles.add(role);
            
            // Log de l'action
            logger.action(`Rôle ajouté: ${role.name} à ${user.tag} via réaction ${emoji}`);

        } catch (error) {
            logger.error('Erreur dans messageReactionAdd:', error);
        }
    }
};