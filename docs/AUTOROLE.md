# Système AutoRole

Le système AutoRole permet d'attribuer automatiquement des rôles aux nouveaux membres qui rejoignent le serveur.

## Fonctionnalités

- Attribution automatique de rôles aux nouveaux membres
- Panneau de configuration interactif avec boutons et menus
- Commandes slash pour la gestion complète
- Système de logs détaillé avec configuration flexible
- Gestion des permissions et sécurité avancée
- Configuration par serveur avec stockage persistant
- Interface utilisateur moderne et intuitive

## Commandes

### `/autorole panel`
Affiche le panneau de configuration interactif de l'AutoRole avec boutons pour :
- Activer/Désactiver le système
- Ajouter des rôles via menu de sélection
- Supprimer des rôles via menu de sélection
- Configurer le canal de logs
- Réinitialiser la configuration

### `/autorole config`
Affiche la configuration actuelle de l'AutoRole.

### `/autorole toggle`
Active ou désactive l'attribution automatique des rôles.

### `/autorole add @rôle`
Ajoute un rôle à la liste des rôles attribués automatiquement.

### `/autorole remove @rôle`
Retire un rôle de la liste des rôles attribués automatiquement.

### `/autorole logs [canal]`
Configure le canal de logs pour l'AutoRole. Si aucun canal n'est spécifié, désactive les logs.

### `/autorole reset`
Réinitialise complètement la configuration de l'AutoRole.

## Configuration

La configuration est stockée dans `./json/servers.json` avec la structure suivante :

```json
{
  "guildId": {
    "name": "Nom du serveur",
    "prefix": "!",
    "logChannelId": "ID du canal de logs général",
    "logsActive": true,
    "autoRole": {
      "active": false,
      "roles": ["roleId1", "roleId2"],
      "logChannelId": "ID du canal de logs AutoRole spécifique"
    }
  }
}
```

### Structure de la configuration AutoRole

- `active` : Boolean - Indique si l'AutoRole est activé
- `roles` : Array - Liste des IDs des rôles à attribuer automatiquement
- `logChannelId` : String - ID du canal de logs spécifique à l'AutoRole (optionnel)

## Permissions requises

- Le bot doit avoir la permission `Gérer les rôles`
- Les utilisateurs doivent avoir la permission `Administrateur` pour utiliser les commandes
- Le rôle du bot doit être plus élevé que les rôles à attribuer

## Logs

Le système AutoRole dispose d'un système de logs complet qui enregistre toutes les actions :

### Types de logs

- **Logs de succès** : Attribution réussie de rôles aux nouveaux membres
- **Logs d'erreur** : Erreurs lors de l'attribution (permissions insuffisantes, rôle introuvable, etc.)
- **Logs d'avertissement** : Situations particulières (rôle déjà possédé, etc.)
- **Logs de configuration** : Modifications de la configuration (activation/désactivation, ajout/suppression de rôles, etc.)
- **Logs d'information** : Informations générales sur le système

### Configuration des logs

1. **Canal spécifique AutoRole** : Configuré via `/autorole logs #canal` ou le panneau interactif
2. **Canal de logs général** : Utilisé si aucun canal spécifique n'est configuré
3. **Logs désactivés** : Si aucun canal n'est configuré

Les logs incluent des informations détaillées comme l'utilisateur concerné, les rôles impliqués, l'heure de l'action et l'utilisateur responsable des modifications.

## Dépannage

### Les rôles ne sont pas attribués

1. Vérifiez que l'AutoRole est activé avec `/autorole enable`
2. Vérifiez que le bot a la permission `Gérer les rôles`
3. Vérifiez que le rôle du bot est plus élevé que les rôles à attribuer
4. Vérifiez les logs du bot pour des erreurs

### Les boutons ne fonctionnent pas

1. Vérifiez que vous avez la permission `Administrateur`
2. Vérifiez que le bot a les permissions nécessaires
3. Vérifiez les logs du bot pour des erreurs

## Exemples

### Activer l'AutoRole et ajouter un rôle

```
/autorole enable
/autorole add @Membre
```

### Désactiver l'AutoRole

```
/autorole disable
```

### Réinitialiser la configuration

```
/autorole reset
```
