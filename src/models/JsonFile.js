import mongoose from 'mongoose';

const genericSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  updatedAt: { type: Number, default: Date.now },
});

// Dedicated collections by category
export const VoiceChannels = mongoose.model('voice_channels', genericSchema);
export const XPSystem = mongoose.model('xp_system', genericSchema);
export const Moderation = mongoose.model('moderation', genericSchema);
export const Users = mongoose.model('users', genericSchema);
export const Servers = mongoose.model('servers', genericSchema);
export const Logs = mongoose.model('logs', genericSchema);
export const Misc = mongoose.model('misc', genericSchema);
// New dedicated collections
export const AutoRoles = mongoose.model('autoroles', genericSchema);
export const RgbRoles = mongoose.model('rgbroles', genericSchema);

// Keep a default export for backward compatibility (unused by new sync)
const fallbackSchema = new mongoose.Schema({
  fileName: { type: String, required: true, unique: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  updatedAt: { type: Number, default: Date.now },
});
export default mongoose.model('JsonFile', fallbackSchema);