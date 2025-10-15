// Application types
export type PanelType = 'Aperçu' | 'Utilisateurs' | 'Leaderboard XP' | 'Canaux Vocaux Auto' | 'Logs' | 'Configuration' | 'Bot';

export interface Stats {
  cpu: number;
  memory: number;
  ram: number;
  uptime: number;
  ping: number;
  timestamp: string;
  servers?: number;
  users?: number;
}

export interface User {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  role: string;
  csrf?: string;
}

export interface GuildRole {
  id: string;
  name: string;
  color: number;
  position: number;
}

export interface ModulesResponse {
  modules: Record<string, any>;
}

export interface Member {
  id: string;
  username: string | null;
  displayName: string;
  avatar: string | null;
  bot: boolean;
  status: string;
  roles: Array<{ id: string; name: string }>;
}

export interface LeaderboardEntry {
  userId: string;
  totalXp?: number;
  messageXp?: number;
  voiceXp?: number;
  levelInfo?: any;
}
