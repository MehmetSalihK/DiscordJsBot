import { getGuildConfig, cleanInvalidRoles } from './storage.js';
import { logSuccess, logError, logWarning } from './logger.js';

/**
 * Valide qu'un rôle peut être attribué par le bot
 */
function validateRole(guild, role) {
  if (!role) return { valid: false, reason: 'Rôle introuvable' };
  
  const botMember = guild.members.me;
  if (!botMember) return { valid: false, reason: 'Bot non trouvé sur le serveur' };
  
  // Vérifier que le bot a la permission de gérer les rôles
  if (!botMember.permissions.has('ManageRoles')) {
    return { valid: false, reason: 'Le bot n\'a pas la permission "Gérer les rôles"' };
  }
  
  // Vérifier que le rôle du bot est plus élevé que le rôle à attribuer
  if (botMember.roles.highest.position <= role.position) {
    return { valid: false, reason: `Le rôle du bot doit être plus élevé que ${role.name}` };
  }
  
  // Vérifier que le rôle n'est pas @everyone
  if (role.id === guild.id) {
    return { valid: false, reason: 'Impossible d\'attribuer le rôle @everyone' };
  }
  
  // Vérifier que le rôle n'est pas géré par une intégration
  if (role.managed) {
    return { valid: false, reason: `Le rôle ${role.name} est géré par une intégration` };
  }
  
  return { valid: true };
}

/**
 * Filtre les rôles valides et invalides
 */
function filterRoles(guild, roleIds) {
  const validRoles = [];
  const invalidRoles = [];
  const errors = [];
  
  for (const roleId of roleIds) {
    const role = guild.roles.cache.get(roleId);
    
    if (!role) {
      invalidRoles.push(roleId);
      continue;
    }
    
    const validation = validateRole(guild, role);
    if (validation.valid) {
      validRoles.push(role);
    } else {
      errors.push({ role, reason: validation.reason });
    }
  }
  
  return { validRoles, invalidRoles, errors };
}

/**
 * Attribue les rôles AutoRole à un nouveau membre
 */
export async function assignAutoRoles(member) {
  try {
    const { guild, user } = member;
    
    // Récupérer la configuration AutoRole
    const config = getGuildConfig(guild.id);
    
    // Vérifier si l'AutoRole est activé
    if (!config.enabled) {
      return { success: true, message: 'AutoRole désactivé' };
    }
    
    // Vérifier s'il y a des rôles configurés
    if (!config.roles || config.roles.length === 0) {
      return { success: true, message: 'Aucun rôle configuré' };
    }
    
    // Filtrer les rôles valides
    const { validRoles, invalidRoles, errors } = filterRoles(guild, config.roles);
    
    // Nettoyer les rôles invalides de la configuration
    if (invalidRoles.length > 0) {
      const removedRoles = cleanInvalidRoles(guild.id, config.roles.filter(id => !invalidRoles.includes(id)));
      if (removedRoles.length > 0) {
        console.log(`🧹 Rôles invalides supprimés de ${guild.name}:`, removedRoles);
      }
    }
    
    // Logger les erreurs de validation
    for (const error of errors) {
      await logWarning(guild, user, `Impossible d'attribuer le rôle ${error.role.name}: ${error.reason}`);
    }
    
    // Attribuer les rôles valides
    if (validRoles.length > 0) {
      try {
        // Filtrer les rôles que l'utilisateur n'a pas déjà
        const rolesToAdd = validRoles.filter(role => !member.roles.cache.has(role.id));
        
        if (rolesToAdd.length === 0) {
          await logWarning(guild, user, 'L\'utilisateur possède déjà tous les rôles AutoRole');
          return { success: true, message: 'Utilisateur possède déjà tous les rôles' };
        }
        
        await member.roles.add(rolesToAdd, 'Attribution automatique des rôles (AutoRole)');
        
        console.log(`✅ AutoRole: ${rolesToAdd.length} rôle(s) attribué(s) à ${user.tag} sur ${guild.name}`);
        
        // Logger le succès
        await logSuccess(guild, user, rolesToAdd);
        
        return { 
          success: true, 
          message: `${rolesToAdd.length} rôle(s) attribué(s)`,
          roles: rolesToAdd
        };
        
      } catch (error) {
        console.error(`❌ AutoRole: Erreur lors de l'attribution des rôles à ${user.tag}:`, error);
        
        // Logger l'erreur
        await logError(guild, user, validRoles, error);
        
        return { 
          success: false, 
          message: 'Erreur lors de l\'attribution des rôles',
          error: error.message
        };
      }
    }
    
    return { success: true, message: 'Aucun rôle valide à attribuer' };
    
  } catch (error) {
    console.error('Erreur dans assignAutoRoles:', error);
    return { 
      success: false, 
      message: 'Erreur système',
      error: error.message
    };
  }
}

/**
 * Valide qu'un rôle peut être ajouté à la configuration AutoRole
 */
export function validateRoleForAutoRole(guild, role) {
  const validation = validateRole(guild, role);
  
  if (!validation.valid) {
    return validation;
  }
  
  // Vérifications supplémentaires pour l'ajout en configuration
  
  // Vérifier que ce n'est pas un rôle administrateur
  if (role.permissions.has('Administrator')) {
    return { valid: false, reason: 'Les rôles administrateur ne peuvent pas être ajoutés à l\'AutoRole' };
  }
  
  // Vérifier que ce n'est pas un rôle avec des permissions dangereuses
  const dangerousPermissions = [
    'ManageGuild',
    'ManageRoles',
    'ManageChannels',
    'ManageMessages',
    'BanMembers',
    'KickMembers'
  ];
  
  for (const permission of dangerousPermissions) {
    if (role.permissions.has(permission)) {
      return { 
        valid: false, 
        reason: `Le rôle ${role.name} a des permissions dangereuses (${permission})` 
      };
    }
  }
  
  return { valid: true };
}

/**
 * Récupère les statistiques AutoRole d'un serveur
 */
export function getAutoRoleStats(guild) {
  const config = getGuildConfig(guild.id);
  
  const stats = {
    enabled: config.enabled,
    totalRoles: config.roles.length,
    validRoles: 0,
    invalidRoles: 0,
    logChannel: config.logChannel,
    lastUpdated: config.updatedAt
  };
  
  // Compter les rôles valides/invalides
  for (const roleId of config.roles) {
    const role = guild.roles.cache.get(roleId);
    if (role && validateRole(guild, role).valid) {
      stats.validRoles++;
    } else {
      stats.invalidRoles++;
    }
  }
  
  return stats;
}