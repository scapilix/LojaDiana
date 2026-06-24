import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('Introduza o seu email.'); return; }
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#/reset-password`,
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-[hsl(38_25%_96%)] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Link to="/" className="inline-block mb-8 font-['Playfair_Display'] text-xl font-bold text-[hsl(340_72%_45%)]">
          Loja Diana
        </Link>

        <div className="bg-white rounded-2xl border border-[hsl(35_18%_88%)] p-8 shadow-sm">
          <AnimatePresence mode="wait">
            {!sent ? (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h1 className="font-['Playfair_Display'] text-2xl font-bold mb-1">Esqueceu a senha?</h1>
                <p className="text-sm text-[hsl(30_8%_48%)] mb-6">
                  Enviaremos um link para redefinir a sua senha.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <label className="block">
                    <span className="text-xs font-semibold text-[hsl(20_15%_12%)] mb-1.5 block">Email</span>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(30_8%_60%)]" />
                      <input
                        type="email" value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="a@sujaloja.pt" autoFocus
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-[hsl(35_18%_88%)] text-sm outline-none focus:border-[hsl(340_72%_45%)] focus:ring-2 focus:ring-[hsl(340_72%_45%/0.15)] transition"
                      />
                    </div>
                  </label>

                  {error && (
                    <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <button type="submit" disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-[hsl(340_72%_45%)] text-white font-semibold py-3 rounded-xl hover:bg-[hsl(340_72%_38%)] transition disabled:opacity-60">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar link de recuperação'}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div key="sent" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4">
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <h2 className="font-['Playfair_Display'] text-xl font-bold mb-2">Email enviado!</h2>
                <p className="text-sm text-[hsl(30_8%_48%)] mb-1">
                  Enviámos um link para <strong className="text-[hsl(20_15%_12%)]">{email}</strong>
                </p>
                <p className="text-xs text-[hsl(30_8%_60%)]">Verifique também a pasta de spam.</p>
              </motion.div>
            )}
          </AnimatePresence>

          <Link to="/login"
            className="mt-5 flex items-center justify-center gap-1.5 text-sm text-[hsl(30_8%_60%)] hover:text-[hsl(340_72%_45%)] transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
