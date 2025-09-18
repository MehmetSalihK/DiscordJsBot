// src/config/autoRoleConfig.js

/**
 * Configuration pour le système AutoRole
 */
export const autoRoleConfig = {
  // Paramètres par défaut pour un nouveau serveur
  defaultSettings: {
    active: false,
    roles: []
  },
  
  // Messages d'erreur
  errors: {
    missingPermissions: 'Je n\'ai pas les permissions nécessaires pour gérer les rôles.',
    roleTooHigh: 'Je ne peux pas gérer ce rôle car il est supérieur ou égal à mon rôle le plus élevé.',
    roleAlreadyAdded: 'Ce rôle est déjà configuré pour l\'attribution automatique.',
    roleNotConfigured: 'Ce rôle n\'est pas configuré pour l\'attribution automatique.',
    noRolesConfigured: 'Aucun rôle n\'est configuré pour l\'attribution automatique.',
    invalidRole: 'Rôle invalide ou introuvable.'
  },
  
  // Messages de succès
  success: {
    roleAdded: 'Le rôle a été ajouté avec succès à l\'AutoRole.',
    roleRemoved: 'Le rôle a été retiré de l\'AutoRole avec succès.',
    enabled: 'L\'AutoRole a été activé avec succès.',
    disabled: 'L\'AutoRole a été désactivé avec succès.',
    reset: 'La configuration de l\'AutoRole a été réinitialisée avec succès.'
  },
  
  // Paramètres des messages
  messages: {
    panelTitle: '⚙️ Configuration AutoRole',
    panelDescription: 'Gérez les rôles attribués automatiquement aux nouveaux membres.',
    statusEnabled: '🟢 **Activé**\nLes nouveaux membres recevront automatiquement les rôles configurés.',
    statusDisabled: '🔴 **Désactivé**\nAucun rôle ne sera attribué automatiquement.',
    noRoles: '*Aucun rôle configuré*'
  },
  
  // Paramètres des boutons
  buttons: {
    add: {
      label: 'Ajouter un rôle',
      emoji: '➕',
      style: 'Primary'
    },
    remove: {
      label: 'Retirer un rôle',
      emoji: '➖',
      style: 'Danger'
    },
    toggle: {
      enabled: {
        label: 'Désactiver',
        emoji: '❌',
        style: 'Danger'
      },
      disabled: {
        label: 'Activer',
        emoji: '✅',
        style: 'Success'
      }
    },
    reset: {
      label: 'Réinitialiser',
      emoji: '🔄',
      style: 'Secondary'
    }
  },
  
  // Paramètres des logs
  logs: {
    colors: {
      success: 0x4CAF50,  // Vert
      error: 0xF44336,    // Rouge
      info: 0x2196F3,     // Bleu
      warning: 0xFF9800   // Orange
    },
    
    // Types de logs
    types: {
      ROLE_ADDED: 'ADDED',
      ROLE_REMOVED: 'REMOVED',
      ENABLED: 'ENABLED',
      DISABLED: 'DISABLED',
      RESET: 'RESET',
      ERROR: 'ERROR'
    }
  }
};

// Types de boutons pour les interactions
export const ButtonStyles = {
  Primary: 1,
  Secondary: 2,
  Success: 3,
  Danger: 4,
  Link: 5
};
