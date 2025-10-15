import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from './components/ui';
import { ThemeProvider } from './components/theme-provider';
import Sidebar from './components/Sidebar';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
import type { PanelType, Stats, User, GuildRole, ModulesResponse } from './types/app';

// Constants
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

// Mock user data
const mockUser = {
  username: 'Admin',
  role: 'Administrateur',
  avatar: null
};

function App() {
  // UI State
  const [selectedPanel, setSelectedPanel] = useState<PanelType>('Aperçu');
  const [isDark, setIsDark] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [modal, setModal] = useState<string | null>(null);
  
  // Server & User Data
  const [selectedGuild, setSelectedGuild] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [me, setMe] = useState<{ 
    username: string; 
    id: string; 
    avatar: string | null; 
    discriminator: string; 
    csrf: string 
  } | null>(null);
  
  // Stats & System Info
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsHistory, setStatsHistory] = useState<Stats[]>([]);
  
  // Logging
  const [logs, setLogs] = useState<any[]>([]);

  // Socket.io connection
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

    // Cleanup function
    return () => {
      socket.disconnect();
    };
  }, []);

  // Main render
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Router>
        <div className="min-h-screen bg-background">
          <div className="flex h-screen overflow-hidden">
            <Sidebar user={mockUser} />
            <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
              <main className="flex-1 p-4 md:p-8">
                <Routes>
                  <Route path="/dashboard" element={<div>Tableau de bord</div>} />
                  <Route path="/" element={<div>Accueil</div>} />
                </Routes>
              </main>
            </div>
          </div>
          <Toaster />
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
