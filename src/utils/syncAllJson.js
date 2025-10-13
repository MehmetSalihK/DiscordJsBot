import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import JsonFile from '../models/JsonFile.js';
import mongoose from 'mongoose';

const folders = [path.join(process.cwd(), 'json'), path.join(process.cwd(), 'data')];

function findLocalPath(fileName) {
  for (const folder of folders) {
    const p = path.join(folder, fileName);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export async function syncFromMongo() {
  const docs = await JsonFile.find({});
  for (const doc of docs) {
    const localPath = findLocalPath(doc.fileName);
    if (localPath) {
      try {
        fs.writeFileSync(localPath, JSON.stringify(doc.data ?? {}, null, 2));
        console.log(`⬇️  Synced from MongoDB → ${doc.fileName}`);
      } catch (err) {
        console.warn(`⚠️ Failed writing local file ${doc.fileName}:`, err.message);
      }
    }
  }
}

export async function syncFileToMongo(filePath) {
  const fileName = path.basename(filePath);
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const jsonData = raw ? JSON.parse(raw) : {};
    await JsonFile.findOneAndUpdate(
      { fileName },
      { data: jsonData, updatedAt: Date.now() },
      { upsert: true, new: true }
    );
    console.log(`⬆️  Synced ${fileName} → MongoDB`);
  } catch (err) {
    console.warn(`⚠️ Failed syncing ${fileName} to MongoDB:`, err.message);
  }
}

async function syncAllLocalToMongo() {
  for (const folder of folders) {
    if (!fs.existsSync(folder)) continue;
    const files = fs.readdirSync(folder).filter(f => f.endsWith('.json'));
    for (const f of files) {
      await syncFileToMongo(path.join(folder, f));
    }
  }
}

function watchFiles() {
  const watcher = chokidar.watch(folders, { ignored: /(^|[\/\\])\../ });
  watcher.on('change', (filePath) => syncFileToMongo(filePath));
  watcher.on('add', (filePath) => syncFileToMongo(filePath));
  console.log('👀 Watching JSON files for sync...');
}

export async function initializeSync() {
  console.log('🔄 Initializing JSON ⇄ MongoDB sync...');
  try {
    await syncFromMongo();
  } catch (err) {
    console.warn('⚠️ MongoDB unavailable, using local JSON files only.');
  }
  watchFiles();

  // When Mongo connects or reconnects, push local files to Mongo
  if (mongoose?.connection) {
    mongoose.connection.on('connected', () => {
      console.log('🔌 Mongo connected — syncing local JSON to DB...');
      syncAllLocalToMongo();
    });
    mongoose.connection.on('reconnected', () => {
      console.log('🔌 Mongo reconnected — syncing local JSON to DB...');
      syncAllLocalToMongo();
    });
  }
}