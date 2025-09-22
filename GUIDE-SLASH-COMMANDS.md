# 🔧 Guide de résolution des problèmes de Slash Commands

## 🚨 Problème : Les slash commands ne fonctionnent pas

### ✅ Solution rapide (recommandée)

1. **Obtenir l'ID de votre serveur Discord :**
   - Activez le mode développeur dans Discord : `Paramètres utilisateur > Avancé > Mode développeur`
   - Clic droit sur votre serveur → `Copier l'ID`

2. **Configurer GUILD_ID dans .env :**
   ```env
   GUILD_ID=123456789012345678  # Remplacez par l'ID de votre serveur
   ```

3. **Enregistrer les commandes au niveau serveur :**
   ```bash
   node register-guild-commands.js
   ```

### 🐌 Solution lente (globale)

Si vous ne configurez pas `GUILD_ID`, les commandes sont enregistrées globalement et peuvent prendre **jusqu'à 1 heure** pour apparaître.

## 🔍 Diagnostic des problèmes

### Vérifier l'enregistrement des commandes :
```bash
# Enregistrement rapide (serveur)
node register-guild-commands.js

# Enregistrement global (lent)
node scripts/register-commands.js
```

### Vérifier les permissions du bot :
- Le bot doit avoir la permission `applications.commands`
- Le bot doit être présent sur le serveur
- L'ID du serveur doit être correct

### Vérifier les logs du bot :
- Les commandes doivent être chargées sans erreur
- Le bot doit être connecté à Discord
- Aucune erreur dans les logs d'interaction

## 🛠️ Scripts utiles

- `register-guild-commands.js` - Enregistrement rapide (serveur)
- `scripts/register-commands.js` - Enregistrement global (lent)

## 📝 Configuration .env recommandée

```env
DISCORD_TOKEN=VotreTokenIci
CLIENT_ID=VotreClientIdIci
GUILD_ID=VotreServerIdIci  # ← IMPORTANT pour les tests rapides
PREFIX=!
YOUTUBE_API=VotreCléAPIYouTube
```

## 🎯 Résolution étape par étape

1. ✅ Vérifier que le bot est connecté
2. ✅ Configurer GUILD_ID dans .env
3. ✅ Exécuter `node register-guild-commands.js`
4. ✅ Tester une commande slash (ex: `/ping`)
5. ✅ Si ça ne marche pas, vérifier les permissions du bot

---

💡 **Astuce :** Pour les tests de développement, utilisez toujours GUILD_ID pour un enregistrement immédiat des commandes !