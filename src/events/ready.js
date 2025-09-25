import reactionRoleStore from '../store/reactionRoleStore.js';
import rgbManager from '../utils/rgbManager.js';
import logger from '../utils/logger.js';
import { displayStartupFooter } from '../utils/startup.js';

export default {
    name: 'ready',
    once: true,
    async execute(client) {
        logger.success(`Bot connecté en tant que ${client.user.tag}`);
        logger.info(`Prêt à servir ${client.users.cache.size} utilisateurs dans ${client.guilds.cache.size} serveurs`);

        // Réparation automatique du système ReactionRole
        try {
            logger.info('Démarrage de la réparation automatique du système ReactionRole...');
            const repairLog = await reactionRoleStore.autoRepair(client);
            
            if (repairLog.length > 0) {
                logger.warn(`Réparations effectuées: ${repairLog.length} problèmes détectés et corrigés`);
                repairLog.forEach(log => logger.warn(`- ${log}`));
            } else {
                logger.success('Aucune réparation nécessaire - Système ReactionRole en bon état');
            }
        } catch (error) {
            logger.error('Erreur lors de la réparation automatique:', error);
        }

        // Nettoyage des configurations obsolètes
        try {
            const cleaned = await reactionRoleStore.cleanup();
            if (cleaned) {
                logger.info('Nettoyage des configurations obsolètes effectué');
            }
        } catch (error) {
            logger.error('Erreur lors du nettoyage:', error);
        }

        // Afficher les statistiques du système ReactionRole
        try {
            let totalMessages = 0;
            let totalEntries = 0;
            
            for (const guild of client.guilds.cache.values()) {
                const stats = await reactionRoleStore.getGuildStats(guild.id);
                totalMessages += stats.totalMessages;
                totalEntries += stats.totalReactions;
            }
            
            if (totalMessages > 0) {
                logger.info(`Système ReactionRole: ${totalMessages} messages avec ${totalEntries} entrées configurées`);
            }
        } catch (error) {
            logger.error('Erreur lors du calcul des statistiques:', error);
        }





        // Redémarrage automatique des rôles RGB
        try {
            logger.info('🎨 [INFO] Démarrage du système RGB...');
            const restartedRoles = await rgbManager.restartActiveRoles(client);
            
            if (restartedRoles.length > 0) {
                logger.success(`🎨 [SUCCÈS] ${restartedRoles.length} rôle(s) RGB redémarré(s) automatiquement`);
                restartedRoles.forEach(roleInfo => {
                    logger.info(`🎨 [ACTION] RGB actif pour ${roleInfo.roleName} (${roleInfo.interval}ms)`);
                });
            } else {
                logger.info('🎨 [INFO] Aucun rôle RGB à redémarrer');
            }
        } catch (error) {
            logger.error('❌ [ERREUR] Erreur lors du redémarrage des rôles RGB:', error);
        }

        // Afficher le footer de démarrage
        displayStartupFooter(client);
    }
};