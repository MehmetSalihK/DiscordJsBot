import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import * as Models from '../models/JsonFile.js';

const folders = [path.join(process.cwd(), 'json'), path.join(process.cwd(), 'data')];

// Determine which model/collection to use based on file name
function getModelForFile(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.includes('voice')) return Models.VoiceChannels;
  if (lower.includes('xp') || lower.includes('level')) return Models.XPSystem;
  if (lower.includes('warn') || lower.includes('suspension') || lower.includes('blacklist')) return Models.Moderation;
  if (lower.includes('user') || lower.includes('profile')) return Models.Users;
  if (lower.includes('server') || lower.includes('config') || lower.includes('setting')) return Models.Servers;
  if (lower.includes('log')) return Models.Logs;
  return Models.Misc;
}

async function syncFromMongo() {
  for (const key of ['VoiceChannels', 'XPSystem', 'Moderation', 'Users', 'Servers', 'Logs', 'Misc']) {
    const Model = Models[key];
    const docs = await Model.find({});
    for (const doc of docs) {
      for (const folder of folders) {
        if (!fs.existsSync(folder)) continue;
        const filePath = path.join(folder, doc.fileName);
        try {
          fs.writeFileSync(filePath, JSON.stringify(doc.data ?? {}, null, 2));
          console.log(`⬇️  Synced ${doc.fileName} from ${key}`);
        } catch (err) {
          console.warn(`⚠️ Failed writing ${filePath}:`, err.message);
        }
      }
    }
  }
}

async function syncFileToMongo(filePath) {
  const fileName = path.basename(filePath);
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const jsonData = raw ? JSON.parse(raw) : {};
    const Model = getModelForFile(fileName);
    await Model.findOneAndUpdate(
      { fileName },
      { data: jsonData, updatedAt: Date.now() },
      { upsert: true, new: true }
    );
    console.log(`⬆️  Synced ${fileName} → ${Model.collection.collectionName}`);
  } catch (err) {
    console.warn(`⚠️ Failed syncing ${fileName} to MongoDB:`, err.message);
  }
}

function watchFiles() {
  const watcher = chokidar.watch(folders, { ignored: /(^|[\/\\])\../ });
  watcher.on('change', (filePath) => syncFileToMongo(filePath));
  watcher.on('add', (filePath) => syncFileToMongo(filePath));
  console.log('👀 Watching JSON files for categorized sync...');
}

export async function initializeSyncCategorized() {
  console.log('🔄 Initializing categorized JSON ⇄ MongoDB sync...');
  try {
    await syncFromMongo();
  } catch (err) {
    console.warn('⚠️ MongoDB unavailable, using local JSON files only.');
  }
  watchFiles();
}

export { syncFileToMongo };