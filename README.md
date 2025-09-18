# Bot Discord en Français (discord.js v14)

Projet de bot Discord en Node.js, entièrement en français, séparant clairement les commandes préfixées et les commandes slash.

## Structure des dossiers

```
./commands/
  /prefix/
    /admin/
    /moderateur/
    /utilisateur/
  /slashcommands/
    /admin/
    /moderateur/
    /utilisateur/
src/
  config.js
  index.js
  loaders/
    commandLoader.js
  utils/
    logger.js
scripts/
  register-commands.js
```

## Prérequis
- Node.js 18+
- Un bot Discord (token) et les identifiants CLIENT_ID, GUILD_ID (facultatif pour des tests rapides)

## Installation
1. Cloner le dépôt ou copier ces fichiers dans votre dossier.
2. Installer les dépendances:
   ```bash
   npm install
   ```
3. Copier `.env.example` en `.env` puis renseigner:
   ```env
   DISCORD_TOKEN=VotreTokenIci
   CLIENT_ID=VotreClientIdIci
   GUILD_ID=VotreGuildIdIci # optionnel mais recommandé pour tester
   PREFIX=!
   ```

## Enregistrer les commandes slash
- En local (recommandé pour tests rapides):
  ```bash
  npm run register
  ```
  Si `GUILD_ID` est fourni, l'enregistrement est immédiat au niveau serveur.
  Sans `GUILD_ID`, l'enregistrement global peut prendre jusqu'à 1 heure.

## Lancer le bot
```bash
npm run start
```
Ou en développement avec rechargement:
```bash
npm run dev
```

## Ajouter de nouvelles commandes
- Commandes préfixées: placez un fichier `.js` dans `commands/prefix/<categorie>/`. Export attendu:
  ```js
  export default {
    name: 'nom',
    description: 'Description en français',
    category: '<categorie>',
    async execute(message, args, client) { /* ... */ },
  };
  ```
- Commandes slash: placez un fichier `.js` dans `commands/slashcommands/<categorie>/`. Export attendu:
  ```js
  import { SlashCommandBuilder } from 'discord.js';
  export default {
    category: '<categorie>',
    data: new SlashCommandBuilder().setName('nom').setDescription('Description en français'),
    async execute(interaction, client) { /* ... */ },
  };
  ```

Les chargeurs détectent automatiquement les nouveaux fichiers au démarrage. Des logs clairs apparaissent dans la console pour chaque commande chargée, ainsi que les erreurs éventuelles.

## Exemples fournis
- Préfixe: `ping` dans `commands/prefix/utilisateur/ping.js`
- Slash: `/ping` dans `commands/slashcommands/utilisateur/ping.js`

## Gestion des erreurs et logs
- Les erreurs d'exécution des commandes sont attrapées et un message d'erreur en français est renvoyé à l'utilisateur.
- La console affiche des logs `INFO`, `SUCCÈS`, `AVERTISSEMENT`, `ERREUR` lors du chargement et de l'exécution.

## Notes
- Vérifiez que le bot possède les intentions `MESSAGE CONTENT` activées dans le portail développeur si vous utilisez des commandes préfixées.
- Mettez à jour les permissions selon vos besoins.
