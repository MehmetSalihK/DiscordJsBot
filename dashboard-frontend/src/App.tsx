import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from './components/ui';
import { ThemeProvider } from './components/theme-provider';
import Sidebar from './components/Sidebar';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Types
import type { PanelType, Stats, User, Member, LeaderboardEntry, GuildRole, ModulesResponse } from './types/app';

// Constants
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

function App() {
  // UI State
  const [selectedPanel, setSelectedPanel] = useState<PanelType>('Aperçu');
  const [isDark, setIsDark] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [modal, setModal] = useState<string | null>(null);
  const [accent2, setAccent2] = useState<string>('');
  
  // Server & User Data
  const [selectedGuild, setSelectedGuild] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [me, setMe] = useState<{ username: string; id: string; avatar: string | null; discriminator: string; csrf: string } | null>(null);
  const [token, setToken] = useState<string>('');
  
  // Stats & System Info
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsHistory, setStatsHistory] = useState<Stats[]>([]);
  
  // Leaderboard & XP
  const [lbType, setLbType] = useState<'global' | 'message' | 'voice'>('global');
  const [lbLoading, setLbLoading] = useState<boolean>(false);
  const [lbError, setLbError] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<Array<{ userId: string; totalXp?: number; messageXp?: number; voiceXp?: number; levelInfo?: any }>>([]);
  const [xp, setXp] = useState<any>(null);
  
  // Members & Roles
  const [members, setMembers] = useState<Array<{ id: string; username: string | null; displayName: string; avatar: string | null; bot: boolean; status: string; roles: Array<{ id: string; name: string }> }>>([]);
  const [membersLoading, setMembersLoading] = useState<boolean>(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState<string>('');
  const [memberMap, setMemberMap] = useState<Record<string, { displayName: string; avatar: string | null }>>({});
  const [guildRoles, setGuildRoles] = useState<GuildRole[] | null>(null);
  
  // Server Overview
  const [overview, setOverview] = useState<{ 
    id: string; 
    name: string; 
    icon: string | null; 
    members: { total: number; online: number; bots: number }; 
    roles: { count: number }; 
    channels: { total: number; text: number; voice: number; categories: number }; 
    emojis: { count: number }; 
    stickers: { count: number } 
  } | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  
  // Channels
  const [guildChannels, setGuildChannels] = useState<{ 
    text: Array<{ id: string; name: string; category?: string | null }>; 
    voice: Array<{ id: string; name: string; category?: string | null }> 
  } | null>(null);
  
  // Modules & Features
  const [modulesAgg, setModulesAgg] = useState<ModulesResponse | null>(null);
  const [social, setSocial] = useState<any>(null);
  
  // Logging
  const [logs, setLogs] = useState<any[]>([]);
  const [logFilter, setLogFilter] = useState<string>('all');
  const [logSearch, setLogSearch] = useState<string>('');
  const [logLoading, setLogLoading] = useState<boolean>(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [logLock, setLogLock] = useState<boolean>(false);
  const [logAutoScroll, setLogAutoScroll] = useState<boolean>(true);
  const [logFollow, setLogFollow] = useState<boolean>(true);
  const [logLines, setLogLines] = useState<number>(100);
  const [logLevel, setLogLevel] = useState<string>('info');
  const [logSource, setLogSource] = useState<string>('all');
  const [logStartDate, setLogStartDate] = useState<string>('');
  const [logEndDate, setLogEndDate] = useState<string>('');
  const [logSearchResults, setLogSearchResults] = useState<any[]>([]);
  const [logSearchIndex, setLogSearchIndex] = useState<number>(-1);
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  
  // Search options (simplified)
  const [searchOptions, setSearchOptions] = useState({
    caseSensitive: false,
    useRegex: false,
    wholeWord: false,
    inSelection: false,
    preserveCase: false,
    useRe2: false,
    usePCRE: false,
    useRipgrep: false,
    useGitGrep: false,
    useAg: false,
    usePt: false,
    useAck: false,
    useSift: false,
    useSilverSearcher: false,
    useRipgrepAll: false,
    useGitGrepAll: false,
    useAgAll: false,
    usePtAll: false,
    useAckAll: false,
    useSiftAll: false,
    useSilverSearcherAll: false,
    useRipgrepMultiline: false,
    useGitGrepMultiline: false,
    useAgMultiline: false,
    usePtMultiline: false,
    useAckMultiline: false,
    useSiftMultiline: false,
    useSilverSearcherMultiline: false,
    useRipgrepSmartCase: false,
    useGitGrepSmartCase: false
  });
  
  // Available panels
  const panels: PanelType[] = ['Aperçu', 'Utilisateurs', 'Leaderboard XP', 'Canaux Vocaux Auto', 'Logs', 'Configuration', 'Bot'];
  const [logSearchUseAgSmartCase, setLogSearchUseAgSmartCase] = useState<boolean>(false);
  const [logSearchUsePtSmartCase, setLogSearchUsePtSmartCase] = useState<boolean>(false);
  const [logSearchUseAckSmartCase, setLogSearchUseAckSmartCase] = useState<boolean>(false);
  const [logSearchUseSiftSmartCase, setLogSearchUseSiftSmartCase] = useState<boolean>(false);
  const [logSearchUseSilverSearcherSmartCase, setLogSearchUseSilverSearcherSmartCase] = useState<boolean>(false);
  const [logSearchUseRipgrepIgnoreCase, setLogSearchUseRipgrepIgnoreCase] = useState<boolean>(false);
  const [logSearchUseGitGrepIgnoreCase, setLogSearchUseGitGrepIgnoreCase] = useState<boolean>(false);
  const [logSearchUseAgIgnoreCase, setLogSearchUseAgIgnoreCase] = useState<boolean>(false);
  const [logSearchUsePtIgnoreCase, setLogSearchUsePtIgnoreCase] = useState<boolean>(false);
  const [logSearchUseAckIgnoreCase, setLogSearchUseAckIgnoreCase] = useState<boolean>(false);
  const [logSearchUseSiftIgnoreCase, setLogSearchUseSiftIgnoreCase] = useState<boolean>(false);
  const [logSearchUseSilverSearcherIgnoreCase, setLogSearchUseSilverSearcherIgnoreCase] = useState<boolean>(false);
  const [logSearchUseRipgrepWordRegexp, setLogSearchUseRipgrepWordRegexp] = useState<boolean>(false);
  const [logSearchUseGitGrepWordRegexp, setLogSearchUseGitGrepWordRegexp] = useState<boolean>(false);
  const [logSearchUseAgWordRegexp, setLogSearchUseAgWordRegexp] = useState<boolean>(false);
  const [logSearchUsePtWordRegexp, setLogSearchUsePtWordRegexp] = useState<boolean>(false);
  const [logSearchUseAckWordRegexp, setLogSearchUseAckWordRegexp] = useState<boolean>(false);
  const [logSearchUseSiftWordRegexp, setLogSearchUseSiftWordRegexp] = useState<boolean>(false);
  const [logSearchUseSilverSearcherWordRegexp, setLogSearchUseSilverSearcherWordRegexp] = useState<boolean>(false);
  const [logSearchUseRipgrepFixedStrings, setLogSearchUseRipgrepFixedStrings] = useState<boolean>(false);
  const [logSearchUseGitGrepFixedStrings, setLogSearchUseGitGrepFixedStrings] = useState<boolean>(false);
  const [logSearchUseAgFixedStrings, setLogSearchUseAgFixedStrings] = useState<boolean>(false);
  const [logSearchUsePtFixedStrings, setLogSearchUsePtFixedStrings] = useState<boolean>(false);
  const [logSearchUseAckFixedStrings, setLogSearchUseAckFixedStrings] = useState<boolean>(false);
  const [logSearchUseSiftFixedStrings, setLogSearchUseSiftFixedStrings] = useState<boolean>(false);
  const [logSearchUseSilverSearcherFixedStrings, setLogSearchUseSilverSearcherFixedStrings] = useState<boolean>(false);

  // Mock user data for now
  const mockUser = {
    username: 'Admin',
    role: 'Administrateur',
    avatar: null
  };

  useEffect(() => {
    const io = (window as any).io;
    if (!io) return;
    
    const socket = io(API_BASE);
    
    socket.on('stats', (s: Stats) => {
      setStats(s);
      setStatsHistory((prev) => {
        const next = [...prev, { 
          t: Date.now(), 
          cpu: s.cpu, 
          ram: s.ram, 
          servers: s.servers, 
          users: s.users 
        }];
        return next.length > 180 ? next.slice(next.length - 180) : next;
      });
    });
    
    socket.on('logs.bootstrap', (events: any[]) => {
      setLogs(events.map((e) => ({ 
        id: e.id, 
        level: e.level, 
        message: e.message, 
        timestamp: e.timestamp 
      })));
    });
    
    socket.on('logEvent', (e: any) => {
      setLogs((prev) => {
        const next = [
          { 
            id: e.id, 
            level: e.level, 
            message: e.message, 
            timestamp: e.timestamp 
          },
          ...prev,
        ];
        return next.slice(0, 500);
      });
    });
    // Écouter les mises à jour de configuration et afficher un toast succès
    socket.on('configUpdated', (evt: any) => {
      const moduleName = evt?.module || 'serveur';
      setToast({ type: 'success', message: `Configuration ${moduleName} mise à jour ✅` });
      if (evt?.guildId && evt.guildId === selectedGuild) {
        if (moduleName === 'xp' && evt.config) setXp(evt.config);
        else if (moduleName === 'logs' && evt.config) setLogs(evt.config);
        else if (moduleName === 'linkModeration' && evt.config) setAntiLink(evt.config);
        else if (moduleName === 'autorole' && evt.config) setAutorole(evt.config);
        else if (moduleName === 'rgbrole' && evt.config) setRgbrole(evt.config);
        else if (moduleName === 'reactionroles' && evt.config) setReactionRoles(evt.config);
        else if (moduleName === 'autoVoiceChannels' && evt.config) setAutoVoice(evt.config);
        else if (moduleName === 'security' && evt.config) setSecurity(evt.config);
        else if (moduleName === 'social' && evt.config) setSocial(evt.config);
      }
    });
    return () => socket.disconnect();
  }, [selectedGuild]);

  // Récupérer les serveurs et infos utilisateur
  useEffect(() => {
    if (!token) return;
  fetch(`${API_BASE}/api/servers`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setServers)
      .catch(console.error);
  fetch(`${API_BASE}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setMe)
      .catch(console.error);
  }, [token]);

  // Charger modules pour le serveur sélectionné
  useEffect(() => {
    if (!token || !selectedGuild) return;
  fetch(`${API_BASE}/api/modules/${selectedGuild}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setModulesAgg)
      .catch(console.error);
  fetch(`${API_BASE}/api/module/linkModeration/${selectedGuild}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setAntiLink)
      .catch(console.error);
  fetch(`${API_BASE}/api/module/xp/${selectedGuild}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setXp)
      .catch(console.error);
  fetch(`${API_BASE}/api/module/logs/${selectedGuild}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setLogs)
      .catch(console.error);
  fetch(`${API_BASE}/api/module/autorole/${selectedGuild}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setAutorole)
      .catch(console.error);
  fetch(`${API_BASE}/api/module/rgbrole/${selectedGuild}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setRgbrole)
      .catch(console.error);
  fetch(`${API_BASE}/api/module/social/${selectedGuild}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setSocial)
      .catch(console.error);
  fetch(`${API_BASE}/api/module/security/${selectedGuild}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setSecurity)
      .catch(console.error);
  fetch(`${API_BASE}/api/module/reactionroles/${selectedGuild}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setReactionRoles)
      .catch(console.error);
  fetch(`${API_BASE}/api/module/autoVoiceChannels/${selectedGuild}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setAutoVoice)
      .catch(console.error);
  }, [token, selectedGuild]);

  // Charger la liste des salons (texte/vocal) et rôles pour le serveur sélectionné
  useEffect(() => {
    if (!token || !selectedGuild) { setGuildChannels(null); setGuildRoles(null); return; }
    fetch(`${API_BASE}/api/guild/${selectedGuild}/channels`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((data) => {
        if (data && (Array.isArray(data.text) || Array.isArray(data.voice))) {
          setGuildChannels({ text: data.text || [], voice: data.voice || [] });
        } else {
          setGuildChannels(null);
        }
      })
      .catch(() => setGuildChannels(null));
    fetch(`${API_BASE}/api/guild/${selectedGuild}/roles`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((roles) => {
        if (Array.isArray(roles)) setGuildRoles(roles as GuildRole[]); else setGuildRoles([]);
      })
      .catch(() => setGuildRoles(null));
  }, [token, selectedGuild]);

  // Fin du chargement lorsque les premières données arrivent ou après délai de grâce
  useEffect(() => {
    if (token && (stats || servers.length > 0)) setBooting(false);
  }, [token, stats, servers]);
  useEffect(() => {
    const tm = setTimeout(() => setBooting(false), 2500);
    return () => clearTimeout(tm);
  }, []);

  // Auto-fermeture des toasts
  useEffect(() => {
    if (!toast) return;
    const tm = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(tm);
  }, [toast]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCmd = (e.ctrlKey || (e as any).metaKey) && e.key.toLowerCase() === 'k';
      if (isCmd) { e.preventDefault(); setCmdOpen(true); }
      if (e.key === 'Escape') setCmdOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Suivi automatique des logs lorsque le verrouillage n'est pas actif
  useEffect(() => {
    if (scrollLock) return;
    const el = logConsoleRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [logEvents, scrollLock]);

  // Charger l'aperçu du serveur lorsqu'on est sur Aperçu ou qu'on change de serveur
  useEffect(() => {
    if (!token || !selectedGuild) return;
    if (selectedPanel !== 'Aperçu') return;
    const loadOverview = async () => {
      try {
        setOverviewError(null);
        const res = await fetch(`${API_BASE}/api/guild/${selectedGuild}/overview`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text.slice(0,120)}`);
        }
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
          const text = await res.text();
          throw new Error(`Réponse non-JSON reçue: ${text.slice(0,120)}`);
        }
        const data = await res.json();
        setOverview(data);
      } catch (e: any) {
        setOverview(null);
        setOverviewError(e?.message || 'Erreur de chargement de l\'aperçu');
      }
    };
    loadOverview();
  }, [token, selectedGuild, selectedPanel]);

  // Charger les membres lorsqu'on ouvre le panneau "Utilisateurs" ou que la recherche change
  useEffect(() => {
    if (!token || !selectedGuild) return;
    if (selectedPanel !== 'Utilisateurs') return;
    const loadMembers = async () => {
      try {
        setMembersLoading(true);
        setMembersError(null);
    const url = `${API_BASE}/api/guild/${selectedGuild}/members?limit=100&search=${encodeURIComponent(memberSearch)}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text.slice(0,120)}`);
        }
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
          const text = await res.text();
          throw new Error(`Réponse non-JSON reçue: ${text.slice(0,120)}`);
        }
        const data = await res.json();
        setMembers(Array.isArray(data) ? data : []);
      } catch (e: any) {
        setMembersError(e?.message || 'Erreur de chargement des membres');
        setMembers([]);
      } finally {
        setMembersLoading(false);
      }
    };
    loadMembers();
  }, [token, selectedGuild, selectedPanel, memberSearch]);

  // Mettre à jour une map {userId -> infos} pour le rendu (utilisé dans le leaderboard)
  useEffect(() => {
    const map: Record<string, { displayName: string; avatar: string | null }> = {};
    for (const m of members) {
      map[m.id] = { displayName: m.displayName || m.username || m.id, avatar: m.avatar };
    }
    setMemberMap(map);
  }, [members]);

  // Charger des membres même sur le panneau Leaderboard pour afficher pseudos/avatars
  useEffect(() => {
    if (!token || !selectedGuild) return;
    if (selectedPanel !== 'Leaderboard XP') return;
    const loadMembersForLb = async () => {
      try {
        // Ne pas écraser un chargement utilisateur en cours
        if (membersLoading) return;
    const url = `${API_BASE}/api/guild/${selectedGuild}/members?limit=200`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return; // silencieux si non dispo
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) return;
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) setMembers(data);
      } catch {}
    };
    loadMembersForLb();
  }, [token, selectedGuild, selectedPanel]);

  // Charger le leaderboard lorsqu'on ouvre le panneau ou change le type
  useEffect(() => {
    if (!token || !selectedGuild) return;
    if (selectedPanel !== 'Leaderboard XP') return;
    const load = async () => {
      try {
        setLbLoading(true);
        setLbError(null);
    const url = `${API_BASE}/api/xp/leaderboard/${lbType}/${selectedGuild}?limit=10`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text.slice(0,120)}`);
        }
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
          const text = await res.text();
          throw new Error(`Réponse non-JSON reçue (peut-être une redirection/login): ${text.slice(0,120)}`);
        }
        const data = await res.json();
        if ((data as any)?.error) throw new Error((data as any).error);
        setLeaderboard((data as any)?.leaderboard || []);
      } catch (e: any) {
        setLbError(e?.message || 'Erreur de chargement');
        setLeaderboard([]);
      } finally {
        setLbLoading(false);
      }
    };
    load();
  }, [token, selectedGuild, selectedPanel, lbType]);

  const uptimeFmt = useMemo(() => {
    if (!stats) return '';
    const sec = Math.floor(stats.uptime);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h}h ${m}m ${s}s`;
  }, [stats]);

  const setAccentColor = (a: string, b?: string) => {
    setAccent(a);
    if (b) setAccent2(b);
    const root = document.documentElement;
    root.style.setProperty('--accent', a);
    if (b) root.style.setProperty('--accent-2', b);
    try {
      localStorage.setItem('accent', a);
      if (b) localStorage.setItem('accent2', b);
    } catch {}
  };

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    const root = document.documentElement;
    if (next) root.classList.add('dark');
    else root.classList.remove('dark');
    try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch {}
  };

  // Helpers
  const formatBytes = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const handleDownloadLogs = () => {
    const blob = new Blob([JSON.stringify(logEvents, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs_${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveXpConfig = async () => {
    if (!token || !selectedGuild || !xp) return;
  const res = await fetch(`${API_BASE}/api/module/xp/${selectedGuild}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(xp),
    }).then(r => r.json()).catch(e => ({ error: e.message }));
    if ((res as any)?.ok) setToast({ type: 'success', message: 'Configuration XP enregistrée ✅' });
    else setToast({ type: 'error', message: (res as any)?.error || 'Erreur ❌' });
  };

  const reloadXpConfig = async () => {
    if (!token || !selectedGuild) return;
  fetch(`${API_BASE}/api/module/xp/${selectedGuild}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setXp)
      .catch(console.error);
  };

  const saveLogsConfig = async () => {
    if (!token || !selectedGuild || !logs) return;
  const res = await fetch(`${API_BASE}/api/module/logs/${selectedGuild}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(logs),
    }).then(r => r.json()).catch(e => ({ error: e.message }));
    if ((res as any)?.ok) setToast({ type: 'success', message: 'Configuration des logs enregistrée ✅' });
    else setToast({ type: 'error', message: (res as any)?.error || 'Erreur ❌' });
  };

  // Sauvegardes modules
  const saveAntiLinkConfig = async (patch?: any) => {
    if (!token || !selectedGuild || !antiLink) return;
    const body = JSON.stringify(patch ? { ...antiLink, ...patch } : antiLink);
    const res = await fetch(`${API_BASE}/api/module/linkModeration/${selectedGuild}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body,
    }).then(r => r.json()).catch(e => ({ error: e.message }));
    if ((res as any)?.ok) setToast({ type: 'success', message: 'Anti-Link mis à jour ✅' }); else setToast({ type: 'error', message: (res as any)?.error || 'Erreur ❌' });
  };
  const saveAutorole = async (patch?: any) => {
    if (!token || !selectedGuild || !autorole) return;
    const body = JSON.stringify(patch ? { ...autorole, ...patch } : autorole);
    const res = await fetch(`${API_BASE}/api/module/autorole/${selectedGuild}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body,
    }).then(r => r.json()).catch(e => ({ error: e.message }));
    if ((res as any)?.ok) setToast({ type: 'success', message: '👑 AutoRole has been configured successfully!' }); else setToast({ type: 'error', message: (res as any)?.error || 'Error ❌' });
  };
  const saveRgbrole = async (patch?: any) => {
    if (!token || !selectedGuild || !rgbrole) return;
    const body = JSON.stringify(patch ? { ...rgbrole, ...patch } : rgbrole);
    const res = await fetch(`${API_BASE}/api/module/rgbrole/${selectedGuild}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body,
    }).then(r => r.json()).catch(e => ({ error: e.message }));
    if ((res as any)?.ok) setToast({ type: 'success', message: '🌈 RGB Role updated successfully!' }); else setToast({ type: 'error', message: (res as any)?.error || 'Error ❌' });
  };
  const saveSocial = async (patch?: any) => {
    if (!token || !selectedGuild || !social) return;
    const body = JSON.stringify(patch ? { ...social, ...patch } : social);
    const res = await fetch(`${API_BASE}/api/module/social/${selectedGuild}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body,
    }).then(r => r.json()).catch(e => ({ error: e.message }));
    if ((res as any)?.ok) setToast({ type: 'success', message: 'Social System mis à jour ✅' }); else setToast({ type: 'error', message: (res as any)?.error || 'Erreur ❌' });
  };
  const saveSecurity = async (patch?: any) => {
    if (!token || !selectedGuild || !security) return;
    const body = JSON.stringify(patch ? { ...security, ...patch } : security);
    const res = await fetch(`${API_BASE}/api/module/security/${selectedGuild}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body,
    }).then(r => r.json()).catch(e => ({ error: e.message }));
    if ((res as any)?.ok) setToast({ type: 'success', message: 'Sécurité mise à jour ✅' }); else setToast({ type: 'error', message: (res as any)?.error || 'Erreur ❌' });
  };
  const saveReactionRoles = async (patch?: any) => {
    if (!token || !selectedGuild || !reactionRoles) return;
    const body = JSON.stringify(patch ? { ...reactionRoles, ...patch } : reactionRoles);
    const res = await fetch(`${API_BASE}/api/module/reactionroles/${selectedGuild}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body,
    }).then(r => r.json()).catch(e => ({ error: e.message }));
    if ((res as any)?.ok) setToast({ type: 'success', message: 'Reaction Roles mis à jour ✅' }); else setToast({ type: 'error', message: (res as any)?.error || 'Erreur ❌' });
  };
  const saveAutoVoice = async (patch?: any) => {
    if (!token || !selectedGuild || !autoVoice) return;
    const body = JSON.stringify(patch ? { ...autoVoice, ...patch } : autoVoice);
    const res = await fetch(`${API_BASE}/api/module/autoVoiceChannels/${selectedGuild}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body,
    }).then(r => r.json()).catch(e => ({ error: e.message }));
    if ((res as any)?.ok) setToast({ type: 'success', message: 'Auto Voice mis à jour ✅' }); else setToast({ type: 'error', message: (res as any)?.error || 'Erreur ❌' });
  };
  const saveSuspensions = async (patch?: any) => {
    if (!token || !selectedGuild) return;
    const url = `${API_BASE}/api/module/suspensions/${selectedGuild}`;
    const res = await fetch(url, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(patch || {})
    }).then(r => r.json()).catch(e => ({ error: e.message }));
    if ((res as any)?.ok) setToast({ type: 'success', message: 'Sanctions mises à jour ✅' }); else setToast({ type: 'error', message: (res as any)?.error || 'Erreur ❌' });
  };
  const saveServerConfig = async () => {
    if (!token || !selectedGuild) return;
    const current = servers.find(s => s.id === selectedGuild);
    if (!current) return;
    const res = await fetch(`${API_BASE}/api/server/${selectedGuild}/config`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(current.config || {})
    }).then(r => r.json()).catch(e => ({ error: e.message }));
    if ((res as any)?.ok) setToast({ type: 'success', message: 'Paramètres serveur enregistrés ✅' }); else setToast({ type: 'error', message: (res as any)?.error || 'Erreur ❌' });
  };

  const reloadLogsConfig = async () => {
    if (!token || !selectedGuild) return;
    fetch(`${API_BASE}/api/module/logs/${selectedGuild}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setLogs)
      .catch(console.error);
  };

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="avatar" aria-hidden="true" />
          <div>
            <div className="text-md">🤖 Tableau de bord</div>
            <div className="text-sm text-muted">Modern • Sombre</div>
          </div>
        </div>
        <div className="sidebar__nav">
          {!token && (
  <a className="nav-item" href={`${API_BASE}/auth/discord/login`}>
              <span className="nav-item__icon">🔑</span>
              <span className="sidebar__label">Se connecter via Discord</span>
            </a>
          )}
          {token && servers.map((s) => (
            <button
              key={s.id}
              className={`nav-item ${selectedGuild === s.id ? 'nav-item--active' : ''}`}
              onClick={() => setSelectedGuild(s.id)}
              title={s.config?.name || s.id}
            >
              <span className="nav-item__icon">🛡️</span>
              <span className="sidebar__label">{s.config?.name || s.id}</span>
              {selectedGuild === s.id && <span className="nav-item__badge">Actif</span>}
            </button>
          ))}
        </div>
      </aside>

      {/* Main area */}
      <div>
        {/* Topbar */}
        <div className="topbar">
          <div className="topbar__inner">
              <div className="inline-flex items-center gap-4" title="Statut et métriques du bot">
                <span className="text-lg">{me ? `👑 ${me.username}` : '👤 Invité'}</span>
                <span className={`chip ${stats ? 'chip--active' : ''}`} title={stats ? 'Bot en ligne' : 'Bot hors ligne'}>{stats ? '🟢 En ligne' : '⚪️ Hors ligne'}</span>
                <span className="chip" title="Total serveurs connectés">🗂️ {stats?.servers ?? '-'} serveurs</span>
                <span className="chip" title="Nombre d'utilisateurs suivis">👥 {stats?.users ?? '-'} utilisateurs</span>
                <span className="chip" title="Uptime du bot">⏱️ {uptimeFmt || '-'}</span>
                <span className="chip" title="Mémoire utilisée">🧠 {stats ? formatBytes(stats.ram) : '-'}</span>
                <span className="chip" title="Charge CPU (%)">🧮 {stats?.cpu?.toFixed(2) ?? '-'}</span>
              </div>
            <div className="inline-flex items-center gap-4">
              <div className="search">
                <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16a6.471 6.471 0 0 0 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zM9.5 14C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path></svg>
                <input className="input" placeholder="🔎 Rechercher un utilisateur..." value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} />
              </div>
              <button className="btn btn--ghost" title="Préférences" onClick={() => setPrefsOpen(true)}>⚙️</button>
              {me && me.isOwner && (
                <button
                  className="btn btn--danger"
                  onClick={() => {
  fetch(`${API_BASE}/api/admin/restart`, {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}`, 'x-csrf-token': me?.csrf || '' },
                    })
                      .then(r => r.json())
                      .then((res) => alert(res.ok ? '🔁 Redémarrage initié' : res.error || 'Erreur'));
                  }}
                >Redémarrer le bot</button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="content">
          <div className="breadcrumb mb-2">
            <span>Accueil</span>
            <span className="breadcrumb__sep">/</span>
            <span>{selectedPanel}</span>
            {selectedGuild && (
              <>
                <span className="breadcrumb__sep">/</span>
                <span>{servers.find(s => s.id === selectedGuild)?.config?.name || selectedGuild}</span>
              </>
            )}
          </div>
          <div className="tabs mb-4">
            {panels.map((p) => (
              <button key={p} className={`tab ${selectedPanel === p ? 'tab--active' : ''}`} onClick={() => setSelectedPanel(p)}>{p}</button>
            ))}
          </div>

          {/* Panels avec animations */}
          <AnimatePresence mode="wait">
          {selectedPanel === 'Aperçu' && (
            <motion.div
              key="Aperçu"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="grid"
              style={{ gridTemplateColumns: '1fr 1fr', gap: '24px' }}
            >
              {modulesAgg?.modules && (
                <div className="card card--glass" style={{ gridColumn: '1 / span 2' }}>
                  <div className="card__header"><div className="card__title">📦 Modules (Aperçu)</div></div>
                  <div className="card__body">
                    {Object.entries(modulesAgg.modules).map(([name, conf]: [string, any]) => (
                      <div key={name} className="inline-flex items-center justify-between gap-4 py-1">
                        <div className="inline-flex items-center gap-2">
                          <span>
                            {name === 'xp' ? '🎯 Système XP' :
                             name === 'logs' ? '🔔 Logs' :
                             name === 'linkModeration' ? '🔗 Anti-Link' :
                             name === 'reactionroles' ? '🎟️ Reaction Role' :
                             name === 'rgbrole' ? '🌈 RGB Role' :
                             name === 'autoVoiceChannels' ? '🎤 Auto Voice Channel' :
                             name === 'autorole' ? '👑 AutoRole' :
                             name === 'social' ? '🧠 Social System' :
                             name === 'security' ? '🔐 Sécurité' : name}
                          </span>
                        </div>
                        <div className="inline-flex items-center gap-3">
                          {name === 'xp' && (
                            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!xp?.active} onChange={(e)=> { const v = e.target.checked; setXp({ ...(xp||conf), active: v }); saveXpConfig(); }} /> Actif</label>
                          )}
                          {name === 'logs' && (
                            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!logs?.active} onChange={(e)=> { const v = e.target.checked; setLogs({ ...(logs||conf), active: v }); saveLogsConfig(); }} /> Actif</label>
                          )}
                          {name === 'linkModeration' && (
                            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!antiLink?.enabled} onChange={(e)=> { const v = e.target.checked; setAntiLink({ ...(antiLink||conf), enabled: v }); saveAntiLinkConfig({ enabled: v }); }} /> Actif</label>
                          )}
                          {name === 'reactionroles' && (
                            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!reactionRoles?.enabled} onChange={(e)=> { const v = e.target.checked; setReactionRoles({ ...(reactionRoles||conf), enabled: v }); saveReactionRoles({ enabled: v }); }} /> Actif</label>
                          )}
                          {name === 'rgbrole' && (
                            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!rgbrole?.enabled} onChange={(e)=> { const v = e.target.checked; setRgbrole({ ...(rgbrole||conf), enabled: v }); saveRgbrole({ enabled: v }); }} /> Actif</label>
                          )}
                          {name === 'autoVoiceChannels' && (
                            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!autoVoice?.enabled} onChange={(e)=> { const v = e.target.checked; setAutoVoice({ ...(autoVoice||conf), enabled: v }); saveAutoVoice({ enabled: v }); }} /> Actif</label>
                          )}
                          {name === 'autorole' && (
                            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!autorole?.enabled} onChange={(e)=> { const v = e.target.checked; setAutorole({ ...(autorole||conf), enabled: v }); saveAutorole({ enabled: v }); }} /> Actif</label>
                          )}
                          {name === 'social' && (
                            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!social?.enabled} onChange={(e)=> { const v = e.target.checked; setSocial({ ...(social||conf), enabled: v }); saveSocial({ enabled: v }); }} /> Actif</label>
                          )}
                          {name === 'security' && (
                            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!security?.enabled} onChange={(e)=> { const v = e.target.checked; setSecurity({ ...(security||conf), enabled: v }); saveSecurity({ enabled: v }); }} /> Actif</label>
                          )}
                          {['linkModeration','reactionroles','rgbrole','autoVoiceChannels','autorole','social','security'].includes(name) && (
                            <button className="btn btn--secondary" onClick={()=> setModal(name === 'linkModeration' ? 'antilink' : name === 'reactionroles' ? 'reactionroles' : name === 'rgbrole' ? 'rgbrole' : name === 'autoVoiceChannels' ? 'autovoice' : name === 'autorole' ? 'autorole' : name === 'social' ? 'social' : 'security')}>Configurer</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="card glow-soft card--tilt" title="Aperçu des infos du serveur">
                <div className="card__header">
                  <div className="card__title">📌 Aperçu du serveur</div>
                  <div className="card__actions">
                    <button className="btn" onClick={() => reloadXpConfig()}>🔄 Rafraîchir</button>
                    <button className="btn btn--primary" onClick={() => setSelectedPanel('Configuration')}>⚙️ Configurer</button>
                  </div>
                </div>
                <div className="card__body">
                  {overviewError && <div className="alert alert--error">❌ {overviewError}</div>}
                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="stat"><div className="stat__icon">🏷️</div><div><div className="stat__value">{overview?.name || servers.find(s=>s.id===selectedGuild)?.config?.name || '—'}</div><div className="stat__label">Nom du serveur</div></div></div>
                    <div className="stat"><div className="stat__icon">👥</div><div><div className="stat__value">{overview?.members?.total ?? '—'}</div><div className="stat__label">Membres totaux</div></div></div>
                    <div className="stat"><div className="stat__icon">🟢</div><div><div className="stat__value">{overview?.members?.online ?? '—'}</div><div className="stat__label">Membres en ligne</div></div></div>
                    <div className="stat"><div className="stat__icon">🗃️</div><div><div className="stat__value">{overview ? `${overview.roles.count} rôles • ${overview.channels.total} canaux • ${overview.channels.categories} catégories` : '—'}</div><div className="stat__label">Rôles • Canaux • Catégories</div></div></div>
                  </div>
                  <div className="mt-4">
                    <div className="chip">🎯 XP: {xp?.active ? 'Actif' : 'Inactif'}</div>{' '}
                    <div className="chip">🔔 Logs: {logs?.active ? 'Actifs' : 'Inactifs'}</div>{' '}
                    <div className="chip">🔗 Anti-Link: {antiLink?.enabled ? 'Actif' : 'Inactif'}</div>
                  </div>
                </div>
              </div>

              <div className="card card--glass card--tilt" title="Actions rapides">
                <div className="card__header"><div className="card__title">⚙️ Actions rapides</div></div>
                <div className="card__body inline-flex gap-4">
                  <button className="btn btn--secondary" onClick={() => reloadLogsConfig()}>🔄 Recharger les logs</button>
                  <button className="btn btn--ghost" onClick={() => setSelectedPanel('Logs')}>🧾 Ouvrir les logs</button>
                  <button className="btn btn--success" onClick={() => setSelectedPanel('Leaderboard XP')}>🏆 Voir le classement</button>
                </div>
              </div>

              {/* Graphiques temps réel */}
              <div className="card card--glass card--tilt" title="Graphique CPU et RAM">
                <div className="card__header"><div className="card__title">⚡ CPU & RAM</div></div>
                <div className="card__body" style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={statsHistory.map((p)=>({
                      t: new Date(p.t).toLocaleTimeString([], {hour12:false, minute:'2-digit', second:'2-digit'}),
                      cpu: Number((p.cpu as number)?.toFixed?.(2) ?? p.cpu),
                      ram: Number((p.ram as number)?.toFixed?.(2) ?? p.ram),
                    }))} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradCpu" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.05}/>
                        </linearGradient>
                        <linearGradient id="gradRam" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#34d399" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="#34d399" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(230,238,246,0.08)" strokeDasharray="3 3" />
                      <XAxis dataKey="t" tick={{ fill: 'rgba(230,238,246,0.6)' }} />
                      <YAxis tick={{ fill: 'rgba(230,238,246,0.6)' }} domain={[0, 'auto']} />
                      <RTooltip contentStyle={{ background: 'rgba(17,24,39,0.92)', border: '1px solid rgba(230,238,246,0.12)', borderRadius: 10 }} />
                      <Area type="monotone" dataKey="cpu" stroke="#60a5fa" fill="url(#gradCpu)" name="CPU (%)" />
                      <Area type="monotone" dataKey="ram" stroke="#34d399" fill="url(#gradRam)" name="RAM (GB)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card card--glass card--tilt" title="Graphique utilisateurs et serveurs">
                <div className="card__header"><div className="card__title">📈 Utilisateurs & Serveurs</div></div>
                <div className="card__body" style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={statsHistory.map((p)=>({
                      t: new Date(p.t).toLocaleTimeString([], {hour12:false, minute:'2-digit', second:'2-digit'}),
                      users: p.users,
                      servers: p.servers,
                    }))} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(230,238,246,0.08)" strokeDasharray="3 3" />
                      <XAxis dataKey="t" tick={{ fill: 'rgba(230,238,246,0.6)' }} />
                      <YAxis tick={{ fill: 'rgba(230,238,246,0.6)' }} domain={[0, 'auto']} />
                      <RTooltip contentStyle={{ background: 'rgba(17,24,39,0.92)', border: '1px solid rgba(230,238,246,0.12)', borderRadius: 10 }} />
                      <Line type="monotone" dataKey="users" stroke="#f59e0b" name="Utilisateurs" dot={false} />
                      <Line type="monotone" dataKey="servers" stroke="#a78bfa" name="Serveurs" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          )}

          {selectedPanel === 'Utilisateurs' && (
            <motion.div
              key="Utilisateurs"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="card"
            >
              <div className="card__header"><div className="card__title">👥 Gestion des utilisateurs</div></div>
              <div className="card__body">
                <div className="grid" style={{ gridTemplateColumns: '1fr auto', gap: '12px' }}>
                  <input className="input" placeholder="Rechercher par pseudo, ID..." value={memberSearch} onChange={(e)=> setMemberSearch(e.target.value)} />
                  <div className="inline-flex gap-2">
                    <button className="btn">➕ Donner un rôle</button>
                    <button className="btn btn--danger">⚠️ Ajouter un avertissement</button>
                    <button className="btn btn--ghost">🧹 Réinitialiser XP</button>
                    <button className="btn btn--secondary">✉️ Envoyer un MP</button>
                  </div>
                </div>
                <div className="mt-4">
                  <table className="table">
                    <thead>
                      <tr><th>#</th><th>Avatar</th><th>Utilisateur</th><th>ID</th><th>Statut</th><th>Rôles</th><th>Niveau</th><th>XP Total</th><th>XP Vocal</th><th>XP Message</th></tr>
                    </thead>
                  <tbody>
                      {membersError ? (
                        <tr><td colSpan={10} className="text-error">❌ {membersError}</td></tr>
                      ) : membersLoading ? (
                        <tr>
                          <td className="skeleton" style={{height: '18px'}}></td>
                          <td><div className="leaderboard__avatar skeleton" /></td>
                          <td className="skeleton" style={{height: '18px'}}></td>
                          <td className="skeleton" style={{height: '18px'}}></td>
                          <td className="skeleton" style={{height: '18px'}}></td>
                          <td className="skeleton" style={{height: '18px'}}></td>
                          <td className="skeleton" style={{height: '18px'}}></td>
                          <td className="skeleton" style={{height: '18px'}}></td>
                          <td className="skeleton" style={{height: '18px'}}></td>
                          <td className="skeleton" style={{height: '18px'}}></td>
                        </tr>
                      ) : members.length === 0 ? (
                        <tr><td colSpan={10} className="text-muted">Aucun membre trouvé pour ce serveur/filtre.</td></tr>
                      ) : (
                        members.map((m, idx) => (
                          <tr key={m.id}>
                            <td>{idx + 1}</td>
                            <td>
                              <div
                                className="leaderboard__avatar"
                                style={{
                                  backgroundImage: m.avatar ? `url(${m.avatar})` : undefined,
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center',
                                }}
                              />
                            </td>
                            <td>{m.displayName || m.username || m.id}</td>
                            <td>{m.id}</td>
                            <td>{m.status}</td>
                            <td className="text-xs">{m.roles?.map(r=>r.name).join(', ') || '—'}</td>
                            <td>—</td>
                            <td>—</td>
                            <td>—</td>
                            <td>—</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {selectedPanel === 'Leaderboard XP' && (
            <motion.div
              key="Leaderboard XP"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="card"
            >
              <div className="card__header">
                <div className="card__title">🏆 Classement XP</div>
                <div className="card__actions">
                  <button className={`btn ${lbType==='global'?'btn--secondary':''}`} onClick={()=>setLbType('global')}>🌐 Global</button>
                  <button className={`btn ${lbType==='message'?'btn--secondary':''}`} onClick={()=>setLbType('message')}>💬 Messages</button>
                  <button className={`btn ${lbType==='voice'?'btn--secondary':''}`} onClick={()=>setLbType('voice')}>🎤 Vocal</button>
                  <button className="btn" onClick={() => {
                    // force reload
                    setLbType(lbType);
                  }}>🔄 Actualiser</button>
                </div>
              </div>
              <div className="card__body">
                {lbError && <div className="alert alert--error">❌ {lbError}</div>}
                <table className="table">
                  <thead><tr><th>Rang</th><th>Avatar</th><th>Utilisateur</th><th>Niveau</th><th>XP Total</th><th>XP Vocal</th><th>XP Message</th></tr></thead>
                  <tbody>
                    {lbLoading ? (
                      <tr>
                        <td className="skeleton" style={{height:'18px'}}></td>
                        <td><div className="leaderboard__avatar skeleton" /></td>
                        <td className="skeleton" style={{height:'18px'}}></td>
                        <td className="skeleton" style={{height:'18px'}}></td>
                        <td className="skeleton" style={{height:'18px'}}></td>
                        <td className="skeleton" style={{height:'18px'}}></td>
                        <td className="skeleton" style={{height:'18px'}}></td>
                      </tr>
                    ) : (
                      leaderboard.length === 0 ? (
                        <tr><td colSpan={7} className="text-muted">Aucun résultat pour ce serveur/type.</td></tr>
                      ) : (
                        leaderboard.map((u, idx) => (
                          <tr key={u.userId}>
                            <td>{idx + 1}</td>
                            <td>
                              <div
                                className="leaderboard__avatar"
                                style={{
                                  backgroundImage: memberMap[u.userId]?.avatar ? `url(${memberMap[u.userId]?.avatar})` : undefined,
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center',
                                }}
                              />
                            </td>
                            <td>{memberMap[u.userId]?.displayName || u.userId}</td>
                            <td>{u.levelInfo?.level ?? '—'}</td>
                            <td>{(u.totalXp ?? (u.messageXp||0)+(u.voiceXp||0))?.toLocaleString('fr-FR')}</td>
                            <td>{(u.voiceXp ?? 0)?.toLocaleString('fr-FR')}</td>
                            <td>{(u.messageXp ?? 0)?.toLocaleString('fr-FR')}</td>
                          </tr>
                        ))
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {selectedPanel === 'Canaux Vocaux Auto' && (
            <motion.div
              key="Canaux Vocaux Auto"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="card"
            >
              <div className="card__header"><div className="card__title">🎤 Canaux vocaux automatiques</div></div>
              <div className="card__body">
                <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                  <div>
                    <div className="inline-flex gap-2 mb-4">
                      <button className="btn">Activer</button>
                      <button className="btn btn--ghost">Désactiver</button>
                      <button className="btn btn--secondary">🔒 Mot de passe</button>
                    </div>
                    <table className="table">
                      <thead><tr><th>Canal maître</th><th>Statut</th><th>Propriétaire</th><th>Actions</th></tr></thead>
                      <tbody>
                        <tr><td>—</td><td>—</td><td>—</td><td><button className="btn btn--sm">👢 Kick</button> <button className="btn btn--sm btn--danger">⛔ Ban</button></td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <div className="field"><label className="label">🔑 Mot de passe du canal</label><input className="input" placeholder="Optionnel" /></div>
                    <div className="field mt-4"><label className="label">🎚️ Permissions du propriétaire</label><div className="inline-flex gap-2"><button className="btn btn--sm">➕ Autoriser</button><button className="btn btn--sm">🚫 Retirer</button></div></div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {selectedPanel === 'Logs' && (
            <motion.div
              key="Logs"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="card"
            >
              <div className="card__header">
                <div className="card__title">🧾 Console de logs en temps réel</div>
                <div className="card__actions">
                  <button className="btn" onClick={() => setLogEvents([])}>🧹 Effacer</button>
                  <button className="btn btn--secondary" onClick={handleDownloadLogs}>📤 Exporter</button>
                  <label className="inline-flex items-center gap-2"><input type="checkbox" onChange={(e)=>setScrollLock(e.target.checked)} /> Verrouiller le scroll</label>
                </div>
              </div>
              <div className="card__body">
                <div className="log-toolbar">
                  <div className="inline-flex gap-2">
                    {['info','warn','error','success'].map((lvl) => (
                      <button key={lvl} className={`btn btn--sm ${logLevelChips[lvl] ? 'btn--secondary' : ''}`} onClick={() => setLogLevelChips(prev => ({ ...prev, [lvl]: !prev[lvl] }))}>{lvl.toUpperCase()}</button>
                    ))}
                  </div>
                  <input className="input" placeholder="Filtrer par texte..." value={logFilter} onChange={(e) => setLogFilter(e.target.value)} />
                </div>
                <div className="log-console" style={{ height: 300 }} ref={logConsoleRef}>
                  {logEvents
                    .filter((e) => logLevelChips[e.level.toLowerCase()] !== false)
                    .filter((e) => {
                      if (!logFilter) return true;
                      const f = logFilter.toLowerCase();
                      return e.level.toLowerCase().includes(f) || e.message.toLowerCase().includes(f);
                    })
                    .map((e) => (
                      <div key={e.id} className={`log-entry log-entry--${e.level.toLowerCase()}`}>
                        <div className="log-entry__level" />
                        <div>
                          <div className="text-xs text-muted">[{new Date(e.timestamp).toLocaleString()}] <strong className="text-sm">{e.level.toUpperCase()}</strong></div>
                          <div>{e.message}</div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </motion.div>
          )}

          {selectedPanel === 'Configuration' && (
            <motion.div
              key="Configuration"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="grid"
              style={{ gridTemplateColumns: '1fr 1fr', gap: '24px' }}
            >
              <div className="card">
                <div className="card__header"><div className="card__title">⚙️ Paramètres du serveur</div></div>
                <div className="card__body">
                  <div className="field"><label className="label">🪪 Serveur sélectionné</label><input className="input" value={selectedGuild || ''} readOnly /></div>
                  <div className="field mt-4"><label className="label">📌 Préfixe du serveur</label><input className="input" placeholder="!" value={(servers.find(s=>s.id===selectedGuild)?.config?.prefix) || ''} onChange={(e)=>{
                    const id = selectedGuild; if (!id) return; const current = servers.find(s=>s.id===id); if (!current) return; current.config = { ...(current.config||{}), prefix: e.target.value }; setServers([...servers]);
                  }} /></div>
                  <div className="inline-flex gap-2 mt-2">
                    <button className="btn btn--secondary" onClick={saveServerConfig}>Enregistrer le préfixe</button>
                  </div>
                  <label className="inline-flex items-center gap-2 mt-4"><input type="checkbox" checked={!!(logs?.active)} onChange={(e)=> setLogs({ ...(logs||{ active:false, logChannelId:null }), active: e.target.checked })} /> Activer les logs</label>
                  {guildChannels?.text?.length ? (
                    <div className="field mt-4"><label className="label">🔔 Canal des logs</label>
                      <select className="input" value={logs?.logChannelId || ''} onChange={(e)=> setLogs({ ...(logs||{ active:false, logChannelId:null }), logChannelId: e.target.value })}>
                        <option value="">— Sélectionner un salon texte —</option>
                        {guildChannels.text.map((ch) => (
                          <option key={ch.id} value={ch.id}>{ch.name}{ch.category ? ` • ${ch.category}` : ''}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="field mt-4"><label className="label">🔔 Canal des logs (ID)</label><input className="input" aria-invalid={!!(logs?.logChannelId && !/^[0-9]{17,20}$/.test(logs.logChannelId))} value={logs?.logChannelId || ''} onChange={(e)=> setLogs({ ...(logs||{ active:false, logChannelId:null }), logChannelId: e.target.value })} /><div className="text-xs text-muted">Utilisez l’identifiant du salon texte (17–20 chiffres). (Liste des salons indisponible)</div></div>
                  )}
                  <div className="inline-flex gap-2 mt-4">
                    <button className="btn btn--secondary" onClick={saveLogsConfig}>Enregistrer les logs</button>
                    <button className="btn" onClick={reloadLogsConfig}>Recharger</button>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card__header"><div className="card__title">🎯 Système XP</div></div>
                <div className="card__body">
                  {xp && (
                    <div className="grid" style={{ gap: '12px' }}>
                      <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!xp.active} onChange={(e)=> setXp({ ...xp, active: e.target.checked })} /> Activer le système XP</label>
                      <div className="field"><label className="label">📝 XP par message</label><input className="input" type="number" min={0} value={xp.messageXP} onChange={(e)=> setXp({ ...xp, messageXP: Math.max(0, Number(e.target.value)) })} /></div>
                      <div className="field"><label className="label">🎤 XP par 5 min vocal</label><input className="input" type="number" min={0} value={xp.voiceXPPer5Min} onChange={(e)=> setXp({ ...xp, voiceXPPer5Min: Math.max(0, Number(e.target.value)) })} /></div>
                      {guildChannels?.voice?.length ? (
                        <div className="field"><label className="label">🚫 Canal AFK ignoré</label>
                          <select className="input" value={xp.ignoreAfkChannelId || ''} onChange={(e)=> setXp({ ...xp, ignoreAfkChannelId: e.target.value })}>
                            <option value="">— Sélectionner un salon vocal —</option>
                            {guildChannels.voice.map((ch) => (
                              <option key={ch.id} value={ch.id}>{ch.name}{ch.category ? ` • ${ch.category}` : ''}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="field"><label className="label">🚫 Canal AFK ignoré (ID)</label><input className="input" aria-invalid={!!(xp.ignoreAfkChannelId && !/^[0-9]{17,20}$/.test(xp.ignoreAfkChannelId))} value={xp.ignoreAfkChannelId || ''} onChange={(e)=> setXp({ ...xp, ignoreAfkChannelId: e.target.value })} /><div className="text-xs text-muted">ID du salon vocal AFK à ignorer (17–20 chiffres). (Liste des salons indisponible)</div></div>
                      )}
                      <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!xp.logsActive} onChange={(e)=> setXp({ ...xp, logsActive: e.target.checked })} /> Activer les logs XP</label>
                      {guildChannels?.text?.length ? (
                        <div className="field"><label className="label">🔔 Canal logs XP</label>
                          <select className="input" value={xp.xpLogs?.logChannelId || ''} onChange={(e)=> setXp({ ...xp, xpLogs: { ...(xp.xpLogs||{ logChannelId:null }), logChannelId: e.target.value } })}>
                            <option value="">— Sélectionner un salon texte —</option>
                            {guildChannels.text.map((ch) => (
                              <option key={ch.id} value={ch.id}>{ch.name}{ch.category ? ` • ${ch.category}` : ''}</option>
                            ))}
                          </select>
                          <div className="text-xs text-muted">Salon texte où enregistrer les gains XP.</div>
                        </div>
                      ) : (
                        <div className="field"><label className="label">🔔 Canal logs XP (ID)</label><input className="input" aria-invalid={!!(xp.xpLogs?.logChannelId && !/^[0-9]{17,20}$/.test(xp.xpLogs.logChannelId))} value={xp.xpLogs?.logChannelId || ''} onChange={(e)=> setXp({ ...xp, xpLogs: { ...(xp.xpLogs||{ logChannelId:null }), logChannelId: e.target.value } })} /><div className="text-xs text-muted">Identifiant du salon texte pour les logs XP. (Liste des salons indisponible)</div></div>
                      )}
                      <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!(xp.voiceLogs?.active)} onChange={(e)=> setXp({ ...xp, voiceLogs: { ...(xp.voiceLogs||{ logChannelId:null, active:false }), active: e.target.checked } })} /> Activer les logs vocaux</label>
                      {guildChannels?.text?.length ? (
                        <div className="field"><label className="label">🔔 Canal logs vocal</label>
                          <select className="input" value={xp.voiceLogs?.logChannelId || ''} onChange={(e)=> setXp({ ...xp, voiceLogs: { ...(xp.voiceLogs||{ active:false, logChannelId:null }), logChannelId: e.target.value } })}>
                            <option value="">— Sélectionner un salon texte —</option>
                            {guildChannels.text.map((ch) => (
                              <option key={ch.id} value={ch.id}>{ch.name}{ch.category ? ` • ${ch.category}` : ''}</option>
                            ))}
                          </select>
                          <div className="text-xs text-muted">Salon texte où enregistrer les événements vocaux.</div>
                        </div>
                      ) : (
                        <div className="field"><label className="label">🔔 Canal logs vocal (ID)</label><input className="input" aria-invalid={!!(xp.voiceLogs?.logChannelId && !/^[0-9]{17,20}$/.test(xp.voiceLogs.logChannelId))} value={xp.voiceLogs?.logChannelId || ''} onChange={(e)=> setXp({ ...xp, voiceLogs: { ...(xp.voiceLogs||{ active:false }), logChannelId: e.target.value } })} /><div className="text-xs text-muted">Identifiant du salon texte pour les événements vocaux. (Liste des salons indisponible)</div></div>
                      )}
                      <div className="inline-flex gap-2 mt-2">
                        <button className="btn btn--secondary" onClick={saveXpConfig}>Enregistrer</button>
                        <button className="btn" onClick={reloadXpConfig}>Recharger</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modules supplémentaires */}
              <div className="card card--glass">
                <div className="card__header"><div className="card__title">🔗 Anti-Link</div></div>
                <div className="card__body">
                  {antiLink && (
                    <div className="inline-flex items-center gap-4">
                      <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!antiLink.enabled} onChange={(e)=> { const v = e.target.checked; setAntiLink({ ...(antiLink||{ enabled:false, whitelist:[], blacklist:[] }), enabled: v }); saveAntiLinkConfig({ enabled: v }); }} /> Activer</label>
                      <button className="btn btn--secondary" onClick={()=> setModal('antilink')}>Configurer</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="card card--glass">
                <div className="card__header"><div className="card__title">🎟️ Reaction Role</div></div>
                <div className="card__body">
                  {reactionRoles && (
                    <div className="inline-flex items-center gap-4">
                      <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!reactionRoles.enabled} onChange={(e)=> { const v = e.target.checked; setReactionRoles({ ...(reactionRoles||{ enabled:false, messageId:null, pairs:[] }), enabled: v }); saveReactionRoles({ enabled: v }); }} /> Activer</label>
                      <button className="btn btn--secondary" onClick={()=> setModal('reactionroles')}>Configurer</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="card card--glass">
                <div className="card__header"><div className="card__title">🌈 RGB Role</div></div>
                <div className="card__body">
                  {rgbrole && (
                    <div className="inline-flex items-center gap-4">
                      <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!rgbrole.enabled} onChange={(e)=> { const v = e.target.checked; setRgbrole({ ...(rgbrole||{ enabled:false, roleId:null, interval:60 }), enabled: v }); saveRgbrole({ enabled: v }); }} /> Activer</label>
                      <button className="btn btn--secondary" onClick={()=> setModal('rgbrole')}>Configurer</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="card card--glass">
                <div className="card__header"><div className="card__title">🎤 Auto Voice Channel</div></div>
                <div className="card__body">
                  {autoVoice && (
                    <div className="inline-flex items-center gap-4">
                      <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!autoVoice.enabled} onChange={(e)=> { const v = e.target.checked; setAutoVoice({ ...(autoVoice||{ enabled:false, baseChannelId:null }), enabled: v }); saveAutoVoice({ enabled: v }); }} /> Activer</label>
                      <button className="btn btn--secondary" onClick={()=> setModal('autovoice')}>Configurer</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="card card--glass">
                <div className="card__header"><div className="card__title">👑 AutoRole</div></div>
                <div className="card__body">
                  {autorole && (
                    <div className="inline-flex items-center gap-4">
                      <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!autorole.enabled} onChange={(e)=> { const v = e.target.checked; setAutorole({ ...(autorole||{ enabled:false, roleId:null }), enabled: v }); saveAutorole({ enabled: v }); }} /> Activer</label>
                      <button className="btn btn--secondary" onClick={()=> setModal('autorole')}>Configurer</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="card card--glass">
                <div className="card__header"><div className="card__title">🧠 Social System</div></div>
                <div className="card__body">
                  {social && (
                    <div className="inline-flex items-center gap-4">
                      <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!social.enabled} onChange={(e)=> { const v = e.target.checked; setSocial({ ...(social||{ enabled:false, welcome:'Bienvenue sur le serveur !', goodbye:'À bientôt !', image:null, channelId:null }), enabled: v }); saveSocial({ enabled: v }); }} /> Activer</label>
                      <button className="btn btn--secondary" onClick={()=> setModal('social')}>Configurer</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="card card--glass">
                <div className="card__header"><div className="card__title">⛔ Suspension / Sanctions</div></div>
                <div className="card__body">
                  <div className="inline-flex items-center gap-4">
                    <button className="btn btn--secondary" onClick={()=> setModal('suspensions')}>Configurer</button>
                  </div>
                </div>
              </div>

              <div className="card card--glass">
                <div className="card__header"><div className="card__title">🔐 Sécurité / Mot de passe vocal</div></div>
                <div className="card__body">
                  {security && (
                    <div className="inline-flex items-center gap-4">
                      <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!security.enabled} onChange={(e)=> { const v = e.target.checked; setSecurity({ ...(security||{ enabled:false, password:null, warningMessage:null, logsChannelId:null }), enabled: v }); saveSecurity({ enabled: v }); }} /> Activer</label>
                      <button className="btn btn--secondary" onClick={()=> setModal('security')}>Configurer</button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {selectedPanel === 'Bot' && (
            <motion.div
              key="Bot"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="card"
            >
              <div className="card__header"><div className="card__title">🤖 Informations du bot</div></div>
              <div className="card__body">
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="stat"><div className="stat__icon">🟢</div><div><div className="stat__value">{stats ? 'En ligne' : 'Hors ligne'}</div><div className="stat__label">Statut</div></div></div>
                  <div className="stat"><div className="stat__icon">🗂️</div><div><div className="stat__value">{stats?.servers ?? '-'}</div><div className="stat__label">Serveurs</div></div></div>
                  <div className="stat"><div className="stat__icon">👥</div><div><div className="stat__value">{stats?.users ?? '-'}</div><div className="stat__label">Utilisateurs</div></div></div>
                  <div className="stat"><div className="stat__icon">⏱️</div><div><div className="stat__value">{uptimeFmt || '-'}</div><div className="stat__label">Uptime</div></div></div>
                </div>
                <div className="mt-4 inline-flex gap-2">
                  {me && me.isOwner && (
                    <button
                      className="btn btn--danger"
                      onClick={() => {
  fetch(`${API_BASE}/api/admin/restart`, {
                          method: 'POST',
                          headers: { Authorization: `Bearer ${token}`, 'x-csrf-token': me?.csrf || '' },
                        })
                          .then(r => r.json())
                          .then((res) => alert(res.ok ? '🔁 Redémarrage initié' : res.error || 'Erreur'));
                      }}
                    >Redémarrer le bot</button>
                  )}
                  <button className="btn btn--ghost" onClick={() => alert('Mode maintenance à implémenter')}>🛠️ Basculer maintenance</button>
                </div>
              </div>
            </motion.div>
          )}

          </AnimatePresence>

          {/* Modals de configuration – première série */}
          <AnimatePresence>
            {modal === 'antilink' && (
              <motion.div key="m-antilink" className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.div className="overlay__inner" initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} transition={{ duration: 0.14 }}>
                  <div className="card card--glass" style={{ width: '100%', maxWidth: 680 }}>
                    <div className="card__header"><div className="card__title">🔗 Anti-Link</div></div>
                    <div className="card__body">
                      {antiLink && (
                        <div className="grid" style={{ gap: '12px' }}>
                          <div className="field"><label className="label">✅ Liste blanche (URLs autorisées)</label><textarea className="input" rows={3} placeholder="https://discord.com, https://example.com" value={(antiLink.whitelist||[]).join('\n')} onChange={(e)=> setAntiLink({ ...(antiLink||{enabled:false, whitelist:[], blacklist:[]}), whitelist: e.target.value.split(/\n|,/).map(s=>s.trim()).filter(Boolean) })} /></div>
                          <div className="field"><label className="label">🚫 Liste noire (optionnel)</label><textarea className="input" rows={3} placeholder="domain.com" value={(antiLink.blacklist||[]).join('\n')} onChange={(e)=> setAntiLink({ ...(antiLink||{enabled:false, whitelist:[], blacklist:[]}), blacklist: e.target.value.split(/\n|,/).map(s=>s.trim()).filter(Boolean) })} /></div>
                          <div className="field"><label className="label">🛠️ Action automatique</label><select className="input" onChange={(e)=> setAntiLink({ ...(antiLink||{}), action: e.target.value as any })} value={(antiLink as any)?.action || 'delete'}><option value="delete">Supprimer</option><option value="warn">Avertir</option><option value="kick">Kick</option></select></div>
                          <div className="field"><label className="label">🔔 Canal de logs (ID)</label><input className="input" value={(antiLink as any)?.logChannelId || ''} onChange={(e)=> setAntiLink({ ...(antiLink||{}), logChannelId: e.target.value })} /></div>
                        </div>
                      )}
                    </div>
                    <div className="card__actions">
                      <button className="btn btn--secondary" onClick={()=> { saveAntiLinkConfig(); setModal(null); }}>Enregistrer</button>
                      <button className="btn" onClick={()=> setModal(null)}>Fermer</button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {modal === 'reactionroles' && (
              <motion.div key="m-reactionroles" className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.div className="overlay__inner" initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} transition={{ duration: 0.14 }}>
                  <div className="card card--glass" style={{ width: '100%', maxWidth: 680 }}>
                    <div className="card__header"><div className="card__title">🎟️ Reaction Role</div></div>
                    <div className="card__body">
                      {reactionRoles && (
                        <div className="grid" style={{ gap: '12px' }}>
                          <div className="field"><label className="label">🎯 Message cible (ID)</label><input className="input" value={reactionRoles.messageId || ''} onChange={(e)=> setReactionRoles({ ...(reactionRoles||{enabled:false, messageId:null, pairs:[]}), messageId: e.target.value })} /></div>
                          <div className="field"><label className="label">🔗 Paires Emoji → Rôle (JSON)</label><textarea className="input" rows={4} placeholder='[{"emoji":"🔥","roleId":"123"}]' value={JSON.stringify(reactionRoles.pairs || [])} onChange={(e)=> { try { const val = JSON.parse(e.target.value || '[]'); setReactionRoles({ ...(reactionRoles||{enabled:false, messageId:null, pairs:[]}), pairs: Array.isArray(val)? val: [] }); } catch {} }} /></div>
                        </div>
                      )}
                    </div>
                    <div className="card__actions">
                      <button className="btn btn--secondary" onClick={()=> { saveReactionRoles(); setModal(null); }}>Enregistrer</button>
                      <button className="btn" onClick={()=> setModal(null)}>Fermer</button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {modal === 'rgbrole' && (
              <motion.div key="m-rgbrole" className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.div className="overlay__inner" initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} transition={{ duration: 0.14 }}>
                  <div className="card card--glass" style={{ width: '100%', maxWidth: 560 }}>
                    <div className="card__header"><div className="card__title">🌈 RGB Role</div></div>
                    <div className="card__body">
                      {rgbrole && (
                        <div className="grid" style={{ gap: '12px' }}>
                          {guildRoles?.length ? (
                            <div className="field"><label className="label">🏷️ Rôle cible</label>
                              <select className="input" value={rgbrole.roleId || ''} onChange={(e)=> setRgbrole({ ...(rgbrole||{enabled:false, roleId:null, interval:60}), roleId: e.target.value })}>
                                <option value="">— Sélectionner un rôle —</option>
                                {guildRoles.slice().sort((a,b)=> b.position - a.position).map(r => (
                                  <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div className="field"><label className="label">🏷️ Rôle cible (ID)</label><input className="input" value={rgbrole.roleId || ''} onChange={(e)=> setRgbrole({ ...(rgbrole||{enabled:false, roleId:null, interval:60}), roleId: e.target.value })} /><div className="text-xs text-muted">La liste des rôles n’est pas disponible. Entrez l’ID du rôle.</div></div>
                          )}
                          <div className="field">
                            <label className="label">⏱️ Intervalle (secondes)</label>
                            <input className="input" type="range" min={10} max={600} step={5} value={rgbrole.interval || 60} onChange={(e)=> setRgbrole({ ...(rgbrole||{enabled:false, roleId:null, interval:60}), interval: Number(e.target.value || 60) })} />
                            <div className="text-xs text-muted">{rgbrole.interval || 60}s • Fréquence de changement de couleur</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted mb-1">Aperçu de la palette</div>
                            {(() => {
                              const colors = (rgbrole as any)?.palette || ['#ff4d4f','#40a9ff','#73d13d','#faad14','#9254de'];
                              const gradient = `linear-gradient(90deg, ${colors.join(', ')})`;
                              return (
                                <motion.div style={{ height: 12, borderRadius: 8, backgroundImage: gradient, backgroundSize: '200% 100%' }} animate={{ backgroundPosition: ['0% 0%','200% 0%'] }} transition={{ repeat: Infinity, duration: Math.max(4, (rgbrole.interval||60)/6), ease: 'linear' }} />
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="card__actions">
                      <button className="btn btn--secondary" onClick={()=> { saveRgbrole(); setModal(null); }}>Enregistrer</button>
                      <button className="btn" onClick={()=> setModal(null)}>Fermer</button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {modal === 'autovoice' && (
              <motion.div key="m-autovoice" className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.div className="overlay__inner" initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} transition={{ duration: 0.14 }}>
                  <div className="card card--glass" style={{ width: '100%', maxWidth: 640 }}>
                    <div className="card__header"><div className="card__title">🎤 Auto Voice Channel</div></div>
                    <div className="card__body">
                      {autoVoice && (
                        <div className="grid" style={{ gap: '12px' }}>
                          <div className="field"><label className="label">🎛️ Canal base (ID)</label><input className="input" value={autoVoice.baseChannelId || ''} onChange={(e)=> setAutoVoice({ ...(autoVoice||{enabled:false, baseChannelId:null}), baseChannelId: e.target.value })} /></div>
                          <div className="field"><label className="label">👥 Limite d'utilisateurs</label><input className="input" type="number" value={autoVoice.userLimit || 0} onChange={(e)=> setAutoVoice({ ...(autoVoice||{enabled:false, baseChannelId:null}), userLimit: Number(e.target.value || 0) })} /></div>
                          <div className="field"><label className="label">🔑 Mot de passe vocal</label><input className="input" value={autoVoice.password || ''} onChange={(e)=> setAutoVoice({ ...(autoVoice||{enabled:false, baseChannelId:null}), password: e.target.value })} /></div>
                          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!autoVoice.enforcePermissions} onChange={(e)=> setAutoVoice({ ...(autoVoice||{enabled:false, baseChannelId:null}), enforcePermissions: e.target.checked })} /> Empêcher non-autorisés d'activer micro/cam</label>
                        </div>
                      )}
                    </div>
                    <div className="card__actions">
                      <button className="btn btn--secondary" onClick={()=> { saveAutoVoice(); setModal(null); }}>Enregistrer</button>
                      <button className="btn" onClick={()=> setModal(null)}>Fermer</button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {modal === 'autorole' && (
              <motion.div key="m-autorole" className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.div className="overlay__inner" initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} transition={{ duration: 0.14 }}>
                  <div className="card card--glass" style={{ width: '100%', maxWidth: 560 }}>
                    <div className="card__header"><div className="card__title">👑 AutoRole</div></div>
                    <div className="card__body">
                      {autorole && (
                        <div className="grid" style={{ gap: '12px' }}>
                          {guildRoles?.length ? (
                            <div className="field"><label className="label">🏷️ Rôle à donner</label>
                              <select className="input" value={autorole.roleId || ''} onChange={(e)=> setAutorole({ ...(autorole||{enabled:false, roleId:null}), roleId: e.target.value })}>
                                <option value="">— Sélectionner un rôle —</option>
                                {guildRoles.slice().sort((a,b)=> b.position - a.position).map(r => (
                                  <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div className="field"><label className="label">🏷️ Rôle à donner (ID)</label><input className="input" value={autorole.roleId || ''} onChange={(e)=> setAutorole({ ...(autorole||{enabled:false, roleId:null}), roleId: e.target.value })} /><div className="text-xs text-muted">La liste des rôles n’est pas disponible. Entrez l’ID du rôle.</div></div>
                          )}
                          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!(autorole as any)?.welcomeMessage} onChange={(e)=> setAutorole({ ...(autorole||{enabled:false, roleId:null}), welcomeMessage: e.target.checked } as any)} /> Envoyer un message de bienvenue</label>
                        </div>
                      )}
                    </div>
                    <div className="card__actions">
                      <button className="btn btn--secondary" onClick={()=> { saveAutorole(); setModal(null); }}>Enregistrer</button>
                      <button className="btn" onClick={()=> setModal(null)}>Fermer</button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {modal === 'social' && (
              <motion.div key="m-social" className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.div className="overlay__inner" initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} transition={{ duration: 0.14 }}>
                  <div className="card card--glass" style={{ width: '100%', maxWidth: 680 }}>
                    <div className="card__header"><div className="card__title">🧠 Social System</div></div>
                    <div className="card__body">
                      {social && (
                        <div className="grid" style={{ gap: '12px' }}>
                          <div className="field"><label className="label">👋 Message de bienvenue</label><input className="input" value={social.welcome || ''} onChange={(e)=> setSocial({ ...(social||{enabled:false, welcome:'', goodbye:'', image:null, channelId:null}), welcome: e.target.value })} /></div>
                          <div className="field"><label className="label">👋 Message d'au revoir</label><input className="input" value={social.goodbye || ''} onChange={(e)=> setSocial({ ...(social||{enabled:false, welcome:'', goodbye:'', image:null, channelId:null}), goodbye: e.target.value })} /></div>
                          <div className="field"><label className="label">🖼️ Image personnalisée (URL)</label><input className="input" value={social.image || ''} onChange={(e)=> setSocial({ ...(social||{enabled:false, welcome:'', goodbye:'', image:null, channelId:null}), image: e.target.value })} /></div>
                          <div className="field"><label className="label">🔔 Salon de bienvenue (ID)</label><input className="input" value={social.channelId || ''} onChange={(e)=> setSocial({ ...(social||{enabled:false, welcome:'', goodbye:'', image:null, channelId:null}), channelId: e.target.value })} /></div>
                        </div>
                      )}
                    </div>
                    <div className="card__actions">
                      <button className="btn btn--secondary" onClick={()=> { saveSocial(); setModal(null); }}>Enregistrer</button>
                      <button className="btn" onClick={()=> setModal(null)}>Fermer</button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {modal === 'suspensions' && (
              <motion.div key="m-suspensions" className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.div className="overlay__inner" initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} transition={{ duration: 0.14 }}>
                  <div className="card card--glass" style={{ width: '100%', maxWidth: 680 }}>
                    <div className="card__header"><div className="card__title">⛔ Suspension / Sanctions</div></div>
                    <div className="card__body">
                      <div className="grid" style={{ gap: '12px' }}>
                        <div className="field"><label className="label">⚒️ Activer auto-warn / auto-mute / auto-ban</label><div className="inline-flex gap-2"><button className="btn btn--sm" onClick={()=> saveSuspensions({ autoWarn: true })}>Warn</button><button className="btn btn--sm" onClick={()=> saveSuspensions({ autoMute: true })}>Mute</button><button className="btn btn--sm" onClick={()=> saveSuspensions({ autoBan: true })}>Ban</button></div></div>
                        <div className="field"><label className="label">⏱️ Durée par défaut (minutes)</label><input className="input" type="number" placeholder="60" onChange={(e)=> saveSuspensions({ defaultDurationMin: Number(e.target.value || 0) })} /></div>
                        <div className="field"><label className="label">🔔 Canal des logs (ID)</label><input className="input" placeholder="123" onChange={(e)=> saveSuspensions({ logsChannelId: e.target.value })} /></div>
                      </div>
                    </div>
                    <div className="card__actions">
                      <button className="btn" onClick={()=> setModal(null)}>Fermer</button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {modal === 'security' && (
              <motion.div key="m-security" className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.div className="overlay__inner" initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} transition={{ duration: 0.14 }}>
                  <div className="card card--glass" style={{ width: '100%', maxWidth: 560 }}>
                    <div className="card__header"><div className="card__title">🔐 Sécurité / Mot de passe vocal</div></div>
                    <div className="card__body">
                      {security && (
                        <div className="grid" style={{ gap: '12px' }}>
                          <div className="field"><label className="label">🔑 Mot de passe d'accès</label><input className="input" value={security.password || ''} onChange={(e)=> setSecurity({ ...(security||{enabled:false, password:null, warningMessage:null, logsChannelId:null}), password: e.target.value })} /></div>
                          <div className="field"><label className="label">⚠️ Message d'avertissement</label><input className="input" value={security.warningMessage || ''} onChange={(e)=> setSecurity({ ...(security||{enabled:false, password:null, warningMessage:null, logsChannelId:null}), warningMessage: e.target.value })} /></div>
                          <div className="field"><label className="label">🔔 Canal de logs (ID)</label><input className="input" value={security.logsChannelId || ''} onChange={(e)=> setSecurity({ ...(security||{enabled:false, password:null, warningMessage:null, logsChannelId:null}), logsChannelId: e.target.value })} /></div>
                        </div>
                      )}
                    </div>
                    <div className="card__actions">
                      <button className="btn btn--secondary" onClick={()=> { saveSecurity(); setModal(null); }}>Enregistrer</button>
                      <button className="btn" onClick={()=> setModal(null)}>Fermer</button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Palette de commandes */}
          <AnimatePresence>
            {cmdOpen && (
              <motion.div key="cmd" className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.div className="overlay__inner" initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} transition={{ duration: 0.14 }}>
                  <div className="card card--glass" style={{ width: '100%', maxWidth: 640 }}>
                    <div className="card__header"><div className="card__title">⌘ Commande rapide</div></div>
                    <div className="card__body">
                      <input
                        className="input"
                        autoFocus
                        placeholder="Tapez une commande… (ex: apercu, utilisateurs, logs, config)"
                        value={cmdQuery}
                        onChange={(e)=> setCmdQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const actions: Array<{ label: string; run: () => void }> = [];
                            actions.push({ label: 'Aller à Aperçu', run: () => setSelectedPanel('Aperçu') });
                            actions.push({ label: 'Ouvrir Utilisateurs', run: () => setSelectedPanel('Utilisateurs') });
                            actions.push({ label: 'Ouvrir Logs', run: () => setSelectedPanel('Logs') });
                            actions.push({ label: 'Éditer Configuration', run: () => setSelectedPanel('Configuration') });
                            const list = actions.filter(a => a.label.toLowerCase().includes(cmdQuery.toLowerCase()));
                            const first = list[0];
                            if (first) { first.run(); setCmdOpen(false); }
                          }
                        }}
                      />
                      <div className="mt-3 grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {['Aperçu','Utilisateurs','Logs','Configuration','Leaderboard XP'].filter(p => p.toLowerCase().includes(cmdQuery.toLowerCase())).map((p)=> (
                          <button key={p} className="btn btn--ghost text-left" onClick={()=> { setSelectedPanel(p as any); setCmdOpen(false); }}>{p}</button>
                        ))}
                        {servers.slice(0, 8).filter(s => (s.config?.name || s.id).toLowerCase().includes(cmdQuery.toLowerCase())).map((s) => (
                          <button key={s.id} className="btn btn--secondary text-left" onClick={()=> { setSelectedGuild(s.id); setCmdOpen(false); }}>Basculer serveur: {s.config?.name || s.id}</button>
                        ))}
                        {me && me.isOwner && (
                          <button className="btn btn--danger" onClick={() => {
                            fetch(`${API_BASE}/api/admin/restart`, {
                              method: 'POST',
                              headers: { Authorization: `Bearer ${token}`, 'x-csrf-token': me?.csrf || '' },
                            })
                              .then(r => r.json())
                              .then((res) => setToast({ type: res.ok ? 'success' : 'error', message: res.ok ? '🔁 Redémarrage initié' : (res.error || 'Erreur') }));
                            setCmdOpen(false);
                          }}>🛠️ Redémarrer le bot</button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Préférences (thème et accent) */}
          <AnimatePresence>
            {prefsOpen && (
              <motion.div key="prefs" className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.div className="overlay__inner" initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} transition={{ duration: 0.14 }}>
                  <div className="card card--glass" style={{ width: '100%', maxWidth: 560 }}>
                    <div className="card__header"><div className="card__title">⚙️ Préférences</div></div>
                    <div className="card__body">
                      <div className="mb-3">Couleur d'accent</div>
                      <div className="inline-flex gap-2 flex-wrap">
                        {['#38bdf8','#34d399','#f59e0b','#a78bfa','#ef4444','#22c55e','#0ea5e9','#14b8a6'].map((c) => (
                          <button key={c} className="btn btn--sm" style={{ background: c, borderColor: 'transparent', color: '#00131f' }} onClick={() => setAccentColor(c)} title={c}>{c}</button>
                        ))}
                      </div>
                      <div className="mt-2">Dégradé d'accent (Material You)</div>
                      <div className="inline-flex gap-2 flex-wrap">
                        {[['#4A90E2','#7F57F1'],['#38bdf8','#a78bfa'],['#22c55e','#34d399']].map(([a,b]) => (
                          <button key={a+b} className="btn btn--sm" style={{ backgroundImage: `linear-gradient(90deg, ${a}, ${b})`, color: '#00131f' }} onClick={() => setAccentColor(a, b)} title={`${a} → ${b}`}>Dégradé</button>
                        ))}
                      </div>
                      <div className="mt-3 inline-flex items-center gap-2">
                        {accent && (<span className="chip" style={{ background: accent, borderColor: 'transparent', color: '#00131f' }}>Accent actuel</span>)}
                        {accent2 && (<span className="chip" style={{ backgroundImage: `linear-gradient(90deg, ${accent}, ${accent2})`, color: '#00131f' }}>Dégradé actuel</span>)}
                      </div>
                      <div className="mt-4 inline-flex items-center gap-2">
                        <input id="pref-dark" type="checkbox" checked={isDark} onChange={toggleTheme} />
                        <label htmlFor="pref-dark">Mode sombre</label>
                      </div>
                      <div className="mt-2 text-muted">Langue: Français</div>
                    </div>
                    <div className="card__actions">
                      <button className="btn btn--secondary" onClick={() => setPrefsOpen(false)}>Fermer</button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Écran de chargement au démarrage */}
          <AnimatePresence>
            {booting && (
              <motion.div key="boot" className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.div className="overlay__inner" initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} transition={{ duration: 0.18 }}>
                  <div className="card card--glass" style={{ width: '100%', maxWidth: 560 }}>
                    <div className="card__header"><div className="card__title">🚀 Chargement du tableau de bord</div></div>
                    <div className="card__body">
                      <div className="spinner" aria-label="Chargement" />
                      <div className="mt-3 text-muted">Connexion aux services en temps réel...</div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Toast notifications */}
          {toast && (
            <div className={`toast toast--${toast.type}`} role="status" aria-live="polite">
              <div>{toast.message}</div>
              <button className="btn btn--ghost btn--sm" onClick={() => setToast(null)}>✖️</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;