# 🎨 Guide de la commande RandomColor

## 📋 Description

La commande `randomcolor` attribue un rôle de couleur aléatoire à l'utilisateur qui l'exécute. Elle retire automatiquement les anciens rôles de couleur pour éviter les conflits.

## 🚀 Utilisation

### Version préfixe
```
!randomcolor
```

### Version slash
```
/randomcolor
```

## ⚙️ Configuration

### 1. Fichier de configuration des rôles

Les rôles de couleur sont définis dans `data/roles_boutons.json` :

```json
{
  "couleur": [
    {
      "name": "Rouge",
      "roleId": "123456789012345678",
      "color": "#FF0000"
    },
    {
      "name": "Bleu", 
      "roleId": "123456789012345679",
      "color": "#0000FF"
    }
  ]
}
```

### 2. Configuration des rôles sur Discord

1. **Créer les rôles de couleur** sur votre serveur Discord
2. **Copier les IDs des rôles** :
   - Mode développeur activé
   - Clic droit sur le rôle → "Copier l'ID"
3. **Modifier le fichier** `data/roles_boutons.json` avec les vrais IDs
4. **Positionner les rôles** : Le bot doit avoir un rôle plus haut que les rôles de couleur

### 3. Permissions requises

Le bot doit avoir les permissions :
- `Gérer les rôles`
- `Envoyer des messages`
- `Utiliser les commandes slash`

## 🔧 Fonctionnalités

### ✅ Gestion automatique des rôles
- Retire automatiquement les anciens rôles de couleur
- Attribue un nouveau rôle aléatoire
- Vérifie que les rôles existent sur le serveur

### 📊 Logs
- **Console** : Logs détaillés de chaque attribution
- **Canal de logs** : Messages automatiques si les logs sont activés
- **Format** : Utilisateur, rôle attribué, canal d'origine

### 🛡️ Gestion d'erreurs
- Vérification de l'existence des rôles
- Messages d'erreur informatifs
- Gestion des permissions manquantes

## 📝 Exemples d'utilisation

### Utilisateur normal
```
Utilisateur: !randomcolor
Bot: 🎨 Une nouvelle couleur t'a été attribuée : Rouge
```

### Logs (si activés)
```
[Console] [RandomColor] Rôle "Rouge" attribué à User#1234 (123456789)
[Canal logs] 🎨 Rôle de couleur attribué
             Utilisateur : User#1234 (123456789)
             Rôle attribué : Rouge
             Canal : #général
```

## 🚨 Résolution de problèmes

### Erreur : "Aucun rôle de couleur valide"
- Vérifiez que les IDs dans `roles_boutons.json` correspondent aux rôles du serveur
- Assurez-vous que les rôles existent et ne sont pas supprimés

### Erreur : "Permissions insuffisantes"
- Le bot doit avoir la permission "Gérer les rôles"
- Le rôle du bot doit être plus haut que les rôles de couleur

### La commande ne répond pas
- Vérifiez que le fichier `roles_boutons.json` est valide (JSON correct)
- Consultez les logs de la console pour plus de détails

## 🎯 Conseils d'utilisation

1. **Testez d'abord** avec un seul rôle de couleur
2. **Organisez vos rôles** : placez les rôles de couleur ensemble dans la liste
3. **Limitez le nombre** : 8-12 couleurs sont généralement suffisantes
4. **Noms clairs** : utilisez des noms de couleurs simples et reconnaissables

---

💡 **Astuce** : Pour ajouter de nouvelles couleurs, modifiez simplement le fichier `roles_boutons.json` et redémarrez le bot !