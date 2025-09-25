# 🎯 Système XP Discord Bot

## 📋 Vue d'ensemble

Le système XP est un système complet de progression et de récompenses pour votre serveur Discord. Il permet aux utilisateurs de gagner de l'expérience (XP) en envoyant des messages et en participant aux canaux vocaux, avec un système de niveaux, de classements et de récompenses automatiques.

## ✨ Fonctionnalités

### 🎮 Système de Progression
- **XP Messages** : Gagnez de l'XP en envoyant des messages (15-25 XP par message)
- **XP Vocal** : Gagnez de l'XP en restant dans les canaux vocaux (20 XP par minute)
- **Système de Niveaux** : Progression basée sur une formule mathématique configurable
- **Anti-Spam** : Protection contre le spam avec cooldowns et détection automatique

### 🏆 Classements et Statistiques
- **Classement Messages** : Top des utilisateurs par XP de messages
- **Classement Vocal** : Top des utilisateurs par XP vocal
- **Classement Global** : Combinaison des deux types d'XP
- **Profils Utilisateur** : Statistiques détaillées avec barres de progression

### 🎁 Système de Récompenses
- **Rôles Automatiques** : Attribution automatique de rôles selon le niveau
- **Notifications de Niveau** : Messages personnalisés lors des montées de niveau
- **Récompenses Configurables** : Système flexible de récompenses par niveau

### ⚙️ Configuration Avancée
- **Exclusions** : Exclure des canaux, rôles ou utilisateurs du système XP
- **Cooldowns Personnalisables** : Ajuster les délais entre les gains d'XP
- **Formules de Niveau** : Modifier la progression des niveaux
- **Import/Export** : Sauvegarde et restauration des données XP

## 🚀 Commandes

### Commandes Slash (`/xp`)

#### `/xp profil [utilisateur]`
Affiche le profil XP d'un utilisateur avec :
- Niveau actuel et progression
- XP total (messages + vocal)
- Barre de progression visuelle
- Statistiques détaillées

#### `/xp classement [type] [page]`
Affiche le classement du serveur :
- `type` : `messages`, `vocal`, ou `global`
- Navigation par pages avec boutons
- Mise à jour en temps réel

#### `/xp config [section]`
Configuration du système XP (Admin uniquement) :
- `general` : Paramètres généraux
- `messages` : Configuration XP messages
- `vocal` : Configuration XP vocal
- `recompenses` : Gestion des récompenses
- `exclusions` : Gestion des exclusions

#### `/xp reset <type> [utilisateur]`
Remet à zéro l'XP (Admin uniquement) :
- `type` : `messages`, `vocal`, ou `tout`
- `utilisateur` : Utilisateur spécifique ou tous

#### `/xp give <type> <utilisateur> <montant>`
Donne de l'XP à un utilisateur (Admin uniquement) :
- `type` : `messages` ou `vocal`
- Montant positif ou négatif

#### `/xp import <fichier>`
Importe des données XP depuis un fichier JSON (Admin uniquement)

#### `/xp export`
Exporte toutes les données XP du serveur (Admin uniquement)

### Commandes Prefix (`!xp`)

Toutes les commandes slash sont également disponibles en version prefix :
- `!xp profil [@utilisateur]`
- `!xp classement [type] [page]`
- `!xp config [section]`
- `!xp reset <type> [@utilisateur]`
- `!xp give <type> <@utilisateur> <montant>`
- `!xp help` - Affiche l'aide des commandes

## 🔧 Installation et Configuration

### 1. Fichiers Créés
Le système XP ajoute les fichiers suivants à votre bot :

```
src/
├── utils/
│   ├── xpDataManager.js      # Gestion des données JSON
│   ├── xpCalculator.js       # Calculs de niveaux et XP
│   ├── messageXpHandler.js   # Gestion XP messages
│   ├── voiceXpHandler.js     # Gestion XP vocal
│   ├── xpEmbeds.js          # Embeds et interfaces
│   └── roleRewardManager.js  # Gestion des récompenses
├── commands/
│   ├── slash/xp.js          # Commandes slash
│   └── prefix/xp.js         # Commandes prefix
├── handlers/
│   └── xpButtonHandler.js   # Gestion des boutons
└── events/                  # Événements modifiés
    ├── messageCreate.js     # Intégration XP messages
    ├── voiceStateUpdate.js  # Intégration XP vocal
    └── interactionCreate.js # Gestion des interactions

# Fichiers de données
messageXp.json              # Données XP messages
voiceSessions.json          # Sessions vocales actives
levelConfig.json            # Configuration (créé automatiquement)
```

### 2. Permissions Requises
Le bot doit avoir les permissions suivantes :
- `Send Messages` - Envoyer des notifications
- `Embed Links` - Afficher les embeds
- `Manage Roles` - Attribuer les récompenses de rôles
- `View Channel` - Accéder aux canaux
- `Connect` - Détecter l'activité vocale

### 3. Configuration Initiale

#### Configuration par Défaut
Le système démarre avec une configuration optimisée :
- **XP Messages** : 15-25 XP par message, cooldown 60 secondes
- **XP Vocal** : 20 XP par minute (chunks de 60 secondes)
- **Formule de Niveau** : `5 * (niveau^2) + 50 * niveau + 100`

#### Personnalisation
Utilisez `/xp config` pour personnaliser :
1. **Montants d'XP** : Ajustez les gains par message/minute
2. **Cooldowns** : Modifiez les délais entre les gains
3. **Exclusions** : Excluez des canaux, rôles ou utilisateurs
4. **Récompenses** : Configurez les rôles par niveau

## 📊 Système de Données

### Structure des Données
- **Cache en Mémoire** : Performances optimisées
- **Sauvegarde Automatique** : Données persistantes en JSON
- **Queue d'Écriture** : Évite la corruption des fichiers
- **Nettoyage Automatique** : Suppression des données obsolètes

### Sauvegarde et Restauration
- **Export Automatique** : Commande `/xp export`
- **Import Flexible** : Commande `/xp import`
- **Format JSON** : Compatible avec d'autres bots

## 🎨 Interface Utilisateur

### Embeds Interactifs
- **Design Moderne** : Couleurs et icônes attrayantes
- **Barres de Progression** : Visualisation claire du progrès
- **Navigation Intuitive** : Boutons pour la pagination

### Notifications
- **Montées de Niveau** : Messages automatiques avec embed
- **Récompenses** : Notifications d'attribution de rôles
- **Erreurs Gracieuses** : Messages d'erreur informatifs

## 🔒 Sécurité et Performance

### Anti-Spam
- **Cooldowns Intelligents** : Prévention du spam
- **Détection de Contenu** : Ignore les messages trop courts
- **Exclusions Flexibles** : Système d'exclusion granulaire

### Optimisations
- **Cache Intelligent** : Réduction des accès disque
- **Batch Processing** : Traitement groupé des données
- **Cleanup Automatique** : Gestion mémoire optimisée

## 🐛 Dépannage

### Problèmes Courants

#### XP non attribué
1. Vérifiez les exclusions (`/xp config exclusions`)
2. Contrôlez les cooldowns utilisateur
3. Vérifiez les permissions du bot

#### Récompenses non attribuées
1. Vérifiez que le bot a la permission `Manage Roles`
2. Assurez-vous que le rôle du bot est au-dessus des rôles à attribuer
3. Vérifiez la configuration des récompenses

#### Données perdues
1. Vérifiez les fichiers JSON dans le dossier racine
2. Utilisez la commande `/xp export` pour sauvegarder
3. Redémarrez le bot si nécessaire

### Logs et Debugging
Le système génère des logs détaillés :
- `[XP-SYSTEM]` : Événements généraux
- `[MESSAGE-XP]` : Traitement des messages
- `[VOICE-XP]` : Activité vocale
- `[ROLE-REWARDS]` : Attribution des récompenses

## 📈 Statistiques et Métriques

### Métriques Disponibles
- **Utilisateurs Actifs** : Nombre d'utilisateurs avec XP
- **Messages Traités** : Total des messages avec XP
- **Temps Vocal** : Durée totale en vocal
- **Niveaux Atteints** : Distribution des niveaux

### Analyse des Données
Utilisez `/xp export` pour analyser :
- Progression des utilisateurs
- Activité par canal
- Efficacité des récompenses

## 🔄 Mises à Jour et Maintenance

### Maintenance Automatique
- **Nettoyage des Sessions** : Suppression des sessions orphelines
- **Optimisation du Cache** : Gestion automatique de la mémoire
- **Sauvegarde Périodique** : Protection contre la perte de données

### Évolutions Futures
Le système est conçu pour être extensible :
- Nouveaux types de récompenses
- Intégration avec d'autres systèmes
- Métriques avancées
- Interface web (optionnel)

## 📞 Support

Pour toute question ou problème :
1. Consultez les logs du bot
2. Vérifiez la configuration avec `/xp config`
3. Testez avec `/xp profil` et `/xp classement`
4. Utilisez le script de test : `node test-xp-system.js`

---

**Version** : 1.0.0  
**Dernière mise à jour** : Janvier 2025  
**Compatibilité** : Discord.js v14+