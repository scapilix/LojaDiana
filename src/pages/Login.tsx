import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Lock, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [emailInput, setEmailInput]       = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError]                 = useState<false | 'credentials' | 'timeout'>(false);
  const { login, user, isSyncing }        = useAuth();
  const navigate                          = useNavigate();

  // Navigate once the auth state confirms the user is logged in
  useEffect(() => {
    if (user) navigate('/app', { replace: true });
  }, [user]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await login(emailInput, passwordInput);
    if (result !== true) {
      setError(result === 'timeout' ? 'timeout' : 'credentials');
      setTimeout(() => setError(false), 4000);
    }
    // navigation handled by useEffect above when user state updates
  };

  return (
    <main className="min-h-screen flex bg-[hsl(38_25%_96%)]">

      {/* ── Left panel: brand / visual ─────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative hidden lg:flex lg:w-[55%] flex-col justify-between overflow-hidden p-14"
        style={{ backgroundColor: 'hsl(20 12% 7%)' }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `
            radial-gradient(ellipse 60% 50% at 20% 20%, hsl(340 72% 30% / 0.35) 0%, transparent 70%),
            radial-gradient(ellipse 50% 60% at 80% 80%, hsl(340 72% 22% / 0.25) 0%, transparent 70%),
            radial-gradient(ellipse 40% 40% at 60% 30%, hsl(38 65% 40% / 0.12) 0%, transparent 60%)
          `
        }} />

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl text-white text-xl font-bold"
              style={{ background: 'linear-gradient(135deg, hsl(340 72% 45%), hsl(340 72% 60%))', fontFamily: '"Playfair Display", serif' }}>
              D
            </div>
            <div>
              <p className="text-white font-semibold text-base" style={{ fontFamily: '"DM Sans", sans-serif' }}>Loja Diana</p>
              <p className="text-xs" style={{ color: 'hsl(30 8% 45%)' }}>Painel de Gestão</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }}
          className="relative z-10 flex-1 flex flex-col justify-center">
          <p className="text-sm font-medium mb-5" style={{ color: 'hsl(340 60% 65%)' }}>Sistema de Gestão</p>
          <h1 className="text-white leading-tight mb-6"
            style={{ fontFamily: '"Playfair Display", serif', fontSize: 'clamp(2.5rem, 4vw, 3.5rem)', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Gerir a sua loja,<br />
            <span style={{ color: 'hsl(340 60% 65%)' }}>com elegância.</span>
          </h1>
          <p className="text-base leading-relaxed max-w-sm" style={{ color: 'hsl(30 8% 55%)' }}>
            Vendas, encomendas, stock, clientes e finanças — tudo num só lugar.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
          className="relative z-10 grid grid-cols-3 gap-6">
          {[{ label: 'Módulos', value: '12+' }, { label: 'Relatórios', value: '8' }, { label: 'Tempo real', value: '24/7' }].map(stat => (
            <div key={stat.label}>
              <p className="text-2xl font-bold mb-1" style={{ fontFamily: '"Playfair Display", serif', color: 'white' }}>{stat.value}</p>
              <p className="text-xs" style={{ color: 'hsl(30 8% 45%)' }}>{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* ── Right panel: login form ─────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-16">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.1 }}
          className="w-full max-w-[380px]">

          {/* Mobile logo */}
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white font-bold text-lg"
              style={{ background: 'linear-gradient(135deg, hsl(340 72% 45%), hsl(340 72% 60%))', fontFamily: '"Playfair Display", serif' }}>
              D
            </div>
            <p className="font-semibold text-foreground text-lg">Loja Diana</p>
          </div>

          <div className="mb-8">
            <h2 className="text-foreground leading-tight mb-2"
              style={{ fontFamily: '"Playfair Display", serif', fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Bem-vinda de volta
            </h2>
            <p className="text-sm text-muted-foreground">Acesso privado ao painel de gestão</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)}
                  autoComplete="email"
                  className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-4 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  placeholder="a@sujaloja.pt"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Palavra-passe</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)}
                  autoComplete="current-password"
                  className={`h-11 w-full rounded-xl border bg-card pl-10 pr-4 text-sm font-medium text-foreground outline-none transition focus:ring-2 ${
                    error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15' : 'border-input focus:border-primary focus:ring-primary/15'
                  }`}
                  placeholder="••••••"
                />
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error === 'timeout'
                  ? 'Sem resposta do servidor. Verifica a ligação e tenta novamente.'
                  : 'Email ou palavra-passe incorretos.'}
              </motion.div>
            )}

            <button type="submit" disabled={isSyncing}
              className="btn-primary mt-2 h-11 w-full rounded-xl text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60">
              {isSyncing ? 'A verificar...' : 'Entrar no painel'}
            </button>
          </form>

          <div className="mt-4 flex justify-end">
            <Link to="/forgot-password" className="text-sm text-[hsl(340_72%_45%)] hover:underline">
              Esqueceu a senha?
            </Link>
          </div>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Não tem conta?{' '}
            <Link to="/register" className="text-[hsl(340_72%_45%)] font-medium hover:underline">Criar conta grátis</Link>
          </p>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Painel privado — Loja Diana © {new Date().getFullYear()}
          </p>
        </motion.div>
      </div>
    </main>
  );
}
