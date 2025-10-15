import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const API_PORT = Number((window as any).__DASHBOARD_PORT__) || 3001;
const API_BASE = `http://localhost:${API_PORT}`;

function ParticlesBackground() {
  const particles = useMemo(() => Array.from({ length: 24 }, (_, i) => ({
    id: i,
    size: 80 + Math.random() * 120,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 3,
    duration: 16 + Math.random() * 14,
    opacity: 0.08 + Math.random() * 0.12,
  })), []);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ x: `${p.x}%`, y: `${p.y}%`, opacity: 0 }}
          animate={{
            x: [`${p.x}%`, `${(p.x + 10) % 100}%`, `${(p.x - 5 + 100) % 100}%`],
            y: [`${p.y}%`, `${(p.y + 6) % 100}%`, `${(p.y - 8 + 100) % 100}%`],
            opacity: [0, p.opacity, p.opacity],
          }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            background: 'radial-gradient(closest-side, rgba(88,101,242,0.35), rgba(127,87,241,0.18), transparent)',
            filter: 'blur(20px)',
          }}
        />
      ))}
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ username?: string } | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const t = url.searchParams.get('token');
    if (t) {
      try { localStorage.setItem('jwt', t); } catch {}
      navigate('/dashboard', { replace: true });
      return;
    }
    const token = localStorage.getItem('jwt');
    if (token) {
      fetch(`${API_BASE}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(u => u && setUser(u))
        .catch(() => {});
    }
  }, [navigate]);

  const handleLogin = () => {
    window.location.href = `${API_BASE}/auth/discord/login`;
  };

  const handleGoDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#0D1117] to-[#1C1F26] text-white relative overflow-hidden">
      <ParticlesBackground />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="max-w-xl w-full rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-10 shadow-[0_0_80px_rgba(88,101,242,0.25)]"
        >
          <div className="flex flex-col items-center text-center gap-6">
            <motion.div
              initial={{ rotate: -4, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 120, damping: 14 }}
              className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#5865F2] to-[#7F57F1] p-1 shadow-[0_0_50px_rgba(127,87,241,0.35)]"
            >
              <div className="w-full h-full rounded-xl bg-[#0D1117]/70 grid place-items-center">
                <span className="text-3xl">🤖</span>
              </div>
            </motion.div>

            <motion.h1
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-2xl sm:text-3xl font-semibold tracking-tight"
            >
              Gérez votre serveur Discord avec style ⚙️
            </motion.h1>

            <motion.p
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-sm text-gray-300"
            >
              Interface moderne, sombre, animée et sécurisée.
            </motion.p>

            <div className="mt-2 w-full grid gap-3">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLogin}
                className="group relative inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-medium bg-gradient-to-r from-[#5865F2] to-[#7F57F1] text-white shadow-[0_0_30px_rgba(88,101,242,0.45)]"
              >
                <span className="absolute inset-0 rounded-xl blur-sm opacity-60 bg-gradient-to-r from-[#5865F2] to-[#7F57F1]"></span>
                <span className="relative z-10">Se connecter avec Discord</span>
              </motion.button>

              {user && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGoDashboard}
                  className="rounded-xl px-5 py-3 font-medium border border-white/15 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Bienvenue, {user.username}! Accéder au Dashboard →
                </motion.button>
              )}
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.9 }}
              transition={{ delay: 0.35, duration: 0.6 }}
              className="mt-4 text-[13px] text-gray-400"
            >
              Connexion sécurisée via Discord. Aucune donnée sensible n’est stockée sans votre consentement.
            </motion.p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}