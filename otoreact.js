import { Client, GatewayIntentBits, Partials } from "discord.js";
import config from "./config.json" with { type: "json" };
import dotenv from "dotenv";

dotenv.config();

const clients = {};

config.forEach((regle, index) => {
  clients[index] = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
  });

  // Quand le bot est prêt
  clients[index].once("clientReady", async () => {
    try {
      const salon = await clients[index].channels.fetch(regle.id_salon);
      await salon.messages.fetch(regle.id_message);
      console.log(
        `✅ Connecté en tant que ${clients[index].user.tag}, surveille le message ${regle.id_message} dans le salon ${salon.id}`
      );
    } catch (err) {
      console.error("❌ Erreur lors du fetch du message :", err);
    }
  });

  // Quand quelqu'un ajoute une réaction
  clients[index].on("messageReactionAdd", async (reaction, utilisateur) => {
    if (utilisateur.bot) return;
    if (reaction.message.id !== regle.id_message) return;

    const serveur = reaction.message.guild;
    const membre = await serveur.members.fetch(utilisateur.id);

    const idRole = regle.reactions.find(
      (r) => r.id_emoji === reaction.emoji.id
    )?.id_role;

    if (!idRole) return;

    try {
      await membre.roles.add(idRole);
      console.log(`✅ Rôle ajouté à ${utilisateur.tag}`);
    } catch (err) {
      console.error("❌ Impossible d'ajouter le rôle :", err);
    }
  });

  // Quand quelqu'un retire une réaction
  clients[index].on("messageReactionRemove", async (reaction, utilisateur) => {
    if (utilisateur.bot) return;
    if (reaction.message.id !== regle.id_message) return;

    const serveur = reaction.message.guild;
    const membre = await serveur.members.fetch(utilisateur.id);

    const idRole = regle.reactions.find(
      (r) => r.id_emoji === reaction.emoji.id
    )?.id_role;

    if (!idRole) return;

    try {
      await membre.roles.remove(idRole);
      console.log(`❌ Rôle retiré à ${utilisateur.tag}`);
    } catch (err) {
      console.error("❌ Impossible de retirer le rôle :", err);
    }
  });

  // Connexion
  clients[index].login(process.env.BOT_TOKEN);
});


