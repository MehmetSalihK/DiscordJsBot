# Système AutoRole

Le système AutoRole permet d'attribuer automatiquement des rôles aux nouveaux membres qui rejoignent le serveur.

## Fonctionnalités

- Attribution automatique de rôles aux nouveaux membres
- Panneau de configuration interactif
- Commandes slash pour la gestion
- Logs des actions
- Configuration par serveur

## Commandes

### `/autorole panel`
Affiche le panneau de configuration de l'AutoRole.

### `/autorole add @rôle`
Ajoute un rôle à la liste des rôles attribués automatiquement.

### `/autorole remove @rôle`
Retire un rôle de la liste des rôles attribués automatiquement.

### `/autorole enable`
Active l'attribution automatique des rôles.

### `/autorole disable`
Désactive l'attribution automatique des rôles.

### `/autorole reset`
Réinitialise la configuration de l'AutoRole.

## Configuration

La configuration est stockée dans `./json/servers.json` avec la structure suivante :

```json
{
  "guildId": {
    "name": "Nom du serveur",
    "prefix": "!",
    "logChannelId": "ID du canal de logs",
    "logsActive": true,
    "autoRole": {
      "active": false,
      "roles": ["roleId1", "roleId2"]
    }
  }
}
```

## Permissions requises

- Le bot doit avoir la permission `Gérer les rôles`
- Les utilisateurs doivent avoir la permission `Administrateur` pour utiliser les commandes
- Le rôle du bot doit être plus élevé que les rôles à attribuer

## Logs

Les actions liées à l'AutoRole sont enregistrées dans le canal de logs configuré pour le serveur. Si aucun canal spécifique n'est défini, les logs sont envoyés dans le canal de logs général.

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
