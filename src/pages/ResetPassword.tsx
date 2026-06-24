import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Lock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState('');
  const [ready, setReady]         = useState(false);

  useEffect(() => {
    // Supabase sets the session automatically from the URL hash
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else setError('Link inválido ou expirado. Peça um novo.');
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6)        { setError('A senha deve ter pelo menos 6 caracteres.'); return; }
    if (password !== confirm)        { setError('As senhas não coincidem.'); return; }
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setDone(true);
    setTimeout(() => navigate('/login'), 2500);
  };

  return (
    <div className="min-h-screen bg-[hsl(38_25%_96%)] flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <span className="inline-block mb-8 font-['Playfair_Display'] text-xl font-bold text-[hsl(340_72%_45%)]">
          Loja Diana
        </span>

        <div className="bg-white rounded-2xl border border-[hsl(35_18%_88%)] p-8 shadow-sm">
          {done ? (
            <div className="text-center py-4">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="font-['Playfair_Display'] text-xl font-bold mb-2">Senha actualizada!</h2>
              <p className="text-sm text-[hsl(30_8%_48%)]">A redirigir para o login…</p>
            </div>
          ) : (
            <>
              <h1 className="font-['Playfair_Display'] text-2xl font-bold mb-1">Nova senha</h1>
              <p className="text-sm text-[hsl(30_8%_48%)] mb-6">Escolha uma senha segura para a sua conta.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {(['Nova senha', 'Confirmar senha'] as const).map((label, i) => (
                  <label key={label} className="block">
                    <span className="text-xs font-semibold text-[hsl(20_15%_12%)] mb-1.5 block">{label}</span>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(30_8%_60%)]" />
                      <input
                        type="password"
                        value={i === 0 ? password : confirm}
                        onChange={e => i === 0 ? setPassword(e.target.value) : setConfirm(e.target.value)}
                        placeholder="••••••"
                        disabled={!ready}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-[hsl(35_18%_88%)] text-sm outline-none focus:border-[hsl(340_72%_45%)] focus:ring-2 focus:ring-[hsl(340_72%_45%/0.15)] transition disabled:opacity-50"
                      />
                    </div>
                  </label>
                ))}

                {error && (
                  <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
                    <AlertCircle className="h-4 w-4 shrink-0" />{error}
                  </div>
                )}

                <button type="submit" disabled={loading || !ready}
                  className="w-full flex items-center justify-center gap-2 bg-[hsl(340_72%_45%)] text-white font-semibold py-3 rounded-xl hover:bg-[hsl(340_72%_38%)] transition disabled:opacity-60">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar nova senha'}
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
