// src/handlers/eventHandler.js
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Charge tous les gestionnaires d'événements depuis le dossier events
 * @param {Client} client - L'instance du client Discord.js
 */
export async function loadEvents(client) {
  try {
    const eventsPath = path.join(__dirname, '../events');
    const eventFiles = (await fs.readdir(eventsPath)).filter(file => file.endsWith('.js'));
    
    if (eventFiles.length === 0) {
      logger.warn('Aucun gestionnaire d\'événement trouvé dans le dossier events');
      return;
    }
    
    let loadedCount = 0;
    
    for (const file of eventFiles) {
      try {
        const filePath = path.join(eventsPath, file);
        const { default: event } = await import(`file://${filePath.replace(/\\/g, '/')}`);
        
        if (!event || !event.name || !event.execute) {
          logger.warn(`Format de gestionnaire d'événement invalide dans ${file}: propriétés requises manquantes`);
          continue;
        }
        
        // Enregistrer l'événement
        if (event.once) {
          client.once(event.name, (...args) => {
            try {
              event.execute(...args, client);
            } catch (error) {
              logger.error(`Erreur dans l'événement ${event.name}:`, error);
            }
          });
        } else {
          client.on(event.name, (...args) => {
            try {
              event.execute(...args, client);
            } catch (error) {
              logger.error(`Erreur dans l'événement ${event.name}:`, error);
            }
          });
        }
        
        loadedCount++;
        logger.info(`Événement chargé: ${event.name} (${file})`);
      } catch (error) {
        logger.error(`Erreur lors du chargement de l'événement ${file}:`, error);
      }
    }
    
    logger.success(`${loadedCount}/${eventFiles.length} gestionnaires d'événements chargés avec succès`);
    
  } catch (error) {
    logger.error('Erreur critique lors du chargement des événements:', error);
    process.exit(1);
  }
}


