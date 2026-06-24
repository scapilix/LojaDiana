import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Check, ArrowRight, ArrowLeft, Store, Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

// ── step types ────────────────────────────────────────────────────────────────
type Step = 'plan' | 'account' | 'store' | 'done';

const PLANS = [
  {
    id: 'basico',
    name: 'Básico',
    price: '29',
    desc: 'Para lojas que estão a começar',
    features: ['1 utilizador', 'POS & Encomendas', 'Stock básico', 'Relatórios mensais'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '59',
    desc: 'O mais popular',
    features: ['Até 5 utilizadores', 'Loja online pública', 'Análise de clientes', 'Suporte prioritário'],
    popular: true,
  },
  {
    id: 'plus',
    name: 'Plus',
    price: '99',
    desc: 'Para cadeias e multi-lojas',
    features: ['Utilizadores ilimitados', 'Multi-loja', 'API & Integrações', 'Gestor dedicado'],
  },
];

const STEPS: { id: Step; label: string }[] = [
  { id: 'plan',    label: 'Plano' },
  { id: 'account', label: 'Conta' },
  { id: 'store',   label: 'Loja' },
  { id: 'done',    label: 'Pronto' },
];

// ── component ─────────────────────────────────────────────────────────────────
export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialPlan = searchParams.get('plan') || 'pro';
  const [step, setStep]           = useState<Step>('plan');
  const [selectedPlan, setSelectedPlan] = useState(initialPlan);
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [storeName, setStoreName] = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const stepIndex = STEPS.findIndex(s => s.id === step);

  // ── handlers ──────────────────────────────────────────────────────────────
  const goNext = async () => {
    setError('');
    if (step === 'plan') {
      setStep('account');
    } else if (step === 'account') {
      if (!email || !password || password.length < 6) {
        setError('Preencha o email e uma senha com pelo menos 6 caracteres.');
        return;
      }
      setStep('store');
    } else if (step === 'store') {
      if (!storeName.trim()) {
        setError('Indique o nome da sua loja.');
        return;
      }
      await handleSignup();
    }
  };

  const handleSignup = async () => {
    setLoading(true);
    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error('Erro ao criar utilizador.');

      // 2. Create store + membership via RPC
      const { error: storeError } = await supabase.rpc('create_store_for_new_user', {
        p_user_id: userId,
        p_name:    storeName.trim(),
        p_plan:    selectedPlan,
      });
      if (storeError) throw storeError;

      setStep('done');
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[hsl(38_25%_96%)] flex flex-col items-center justify-center px-4 py-12">

      {/* Logo */}
      <Link to="/" className="mb-8 font-['Playfair_Display'] text-2xl font-bold text-[hsl(340_72%_45%)]">
        Loja Diana
      </Link>

      {/* Progress steps */}
      <div className="flex items-center gap-0 mb-10">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold transition-all ${
              i < stepIndex ? 'bg-[hsl(340_72%_45%)] text-white' :
              i === stepIndex ? 'bg-[hsl(340_72%_45%)] text-white ring-4 ring-[hsl(340_72%_45%/0.2)]' :
              'bg-white border-2 border-[hsl(35_18%_88%)] text-[hsl(30_8%_60%)]'
            }`}>
              {i < stepIndex ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className={`ml-2 text-xs font-medium hidden sm:block ${i === stepIndex ? 'text-[hsl(340_72%_45%)]' : 'text-[hsl(30_8%_60%)]'}`}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`mx-3 h-px w-8 sm:w-14 transition-colors ${i < stepIndex ? 'bg-[hsl(340_72%_45%)]' : 'bg-[hsl(35_18%_88%)]'}`} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── STEP 1: PLAN ───────────────────────────────────────────────── */}
        {step === 'plan' && (
          <motion.div key="plan"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-3xl"
          >
            <h1 className="font-['Playfair_Display'] text-3xl font-bold text-center mb-2">Escolha o seu plano</h1>
            <p className="text-center text-[hsl(30_8%_48%)] mb-8 text-sm">14 dias grátis · Sem cartão de crédito</p>
            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              {PLANS.map(plan => (
                <button key={plan.id} onClick={() => setSelectedPlan(plan.id)}
                  className={`relative text-left rounded-2xl border-2 p-6 transition-all ${
                    selectedPlan === plan.id
                      ? 'border-[hsl(340_72%_45%)] bg-white shadow-lg shadow-[hsl(340_72%_45%/0.12)]'
                      : 'border-[hsl(35_18%_88%)] bg-white hover:border-[hsl(340_72%_45%/0.5)]'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[hsl(340_72%_45%)] text-white text-[10px] font-bold px-3 py-0.5 rounded-full">
                      Mais Popular
                    </span>
                  )}
                  <p className="font-semibold mb-1">{plan.name}</p>
                  <div className="flex items-end gap-1 mb-2">
                    <span className="font-['Playfair_Display'] text-3xl font-bold">€{plan.price}</span>
                    <span className="text-xs text-[hsl(30_8%_48%)] mb-1">/mês</span>
                  </div>
                  <p className="text-xs text-[hsl(30_8%_48%)] mb-4">{plan.desc}</p>
                  <ul className="space-y-2">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs">
                        <Check className="h-3.5 w-3.5 text-[hsl(340_72%_45%)] shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {selectedPlan === plan.id && (
                    <div className="absolute top-4 right-4 h-5 w-5 rounded-full bg-[hsl(340_72%_45%)] flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            <div className="flex justify-center">
              <button onClick={goNext}
                className="flex items-center gap-2 bg-[hsl(340_72%_45%)] text-white font-semibold px-8 py-3 rounded-xl hover:bg-[hsl(340_72%_38%)] transition-all">
                Continuar
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: ACCOUNT ────────────────────────────────────────────── */}
        {step === 'account' && (
          <motion.div key="account"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-md"
          >
            <div className="bg-white rounded-2xl border border-[hsl(35_18%_88%)] p-8 shadow-sm">
              <h1 className="font-['Playfair_Display'] text-2xl font-bold mb-1">Criar conta</h1>
              <p className="text-sm text-[hsl(30_8%_48%)] mb-6">Plano <strong>{PLANS.find(p => p.id === selectedPlan)?.name}</strong> · 14 dias grátis</p>

              <div className="space-y-4">
                <label className="block">
                  <span className="text-xs font-semibold text-[hsl(20_15%_12%)] mb-1.5 block">Email</span>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(30_8%_60%)]" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="a@sujaloja.pt"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-[hsl(35_18%_88%)] text-sm outline-none focus:border-[hsl(340_72%_45%)] focus:ring-2 focus:ring-[hsl(340_72%_45%/0.15)] transition"
                    />
                  </div>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-[hsl(20_15%_12%)] mb-1.5 block">Senha</span>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(30_8%_60%)]" />
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-[hsl(35_18%_88%)] text-sm outline-none focus:border-[hsl(340_72%_45%)] focus:ring-2 focus:ring-[hsl(340_72%_45%/0.15)] transition"
                    />
                  </div>
                </label>
              </div>

              {error && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <button onClick={goNext}
                className="mt-6 w-full flex items-center justify-center gap-2 bg-[hsl(340_72%_45%)] text-white font-semibold py-3 rounded-xl hover:bg-[hsl(340_72%_38%)] transition-all">
                Continuar
                <ArrowRight className="h-4 w-4" />
              </button>

              <button onClick={() => setStep('plan')}
                className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-[hsl(30_8%_60%)] hover:text-[hsl(340_72%_45%)] transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar
              </button>
            </div>

            <p className="text-center text-xs text-[hsl(30_8%_60%)] mt-4">
              Já tem conta?{' '}
              <Link to="/login" className="text-[hsl(340_72%_45%)] font-medium hover:underline">Entrar</Link>
            </p>
          </motion.div>
        )}

        {/* ── STEP 3: STORE ──────────────────────────────────────────────── */}
        {step === 'store' && (
          <motion.div key="store"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-md"
          >
            <div className="bg-white rounded-2xl border border-[hsl(35_18%_88%)] p-8 shadow-sm">
              <h1 className="font-['Playfair_Display'] text-2xl font-bold mb-1">Dê um nome à sua loja</h1>
              <p className="text-sm text-[hsl(30_8%_48%)] mb-6">Pode alterar este nome mais tarde nas configurações.</p>

              <label className="block">
                <span className="text-xs font-semibold text-[hsl(20_15%_12%)] mb-1.5 block">Nome da loja</span>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(30_8%_60%)]" />
                  <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)}
                    placeholder="Ex: Boutique Âncora"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && goNext()}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-[hsl(35_18%_88%)] text-sm outline-none focus:border-[hsl(340_72%_45%)] focus:ring-2 focus:ring-[hsl(340_72%_45%/0.15)] transition"
                  />
                </div>
              </label>

              {error && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <button onClick={goNext} disabled={loading}
                className="mt-6 w-full flex items-center justify-center gap-2 bg-[hsl(340_72%_45%)] text-white font-semibold py-3 rounded-xl hover:bg-[hsl(340_72%_38%)] transition-all disabled:opacity-60">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Criar a minha loja</span><ArrowRight className="h-4 w-4" /></>}
              </button>

              <button onClick={() => setStep('account')}
                className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-[hsl(30_8%_60%)] hover:text-[hsl(340_72%_45%)] transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 4: DONE ───────────────────────────────────────────────── */}
        {step === 'done' && (
          <motion.div key="done"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md text-center"
          >
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.1, stiffness: 200 }}
              className="mx-auto mb-6 h-20 w-20 rounded-full bg-[hsl(340_40%_95%)] flex items-center justify-center"
            >
              <Check className="h-10 w-10 text-[hsl(340_72%_45%)]" />
            </motion.div>

            <h1 className="font-['Playfair_Display'] text-3xl font-bold mb-3">Bem-vinda, {storeName}!</h1>
            <p className="text-[hsl(30_8%_48%)] mb-2">A sua loja foi criada com sucesso.</p>
            <p className="text-sm text-[hsl(30_8%_60%)] mb-8">
              Verifique o seu email <strong className="text-[hsl(20_15%_12%)]">{email}</strong> para confirmar a conta antes de entrar.
            </p>

            <div className="flex flex-col gap-3">
              <button onClick={() => navigate('/login')}
                className="flex items-center justify-center gap-2 bg-[hsl(340_72%_45%)] text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-[hsl(340_72%_38%)] transition-all">
                Entrar na minha loja
                <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => navigate('/')}
                className="text-sm text-[hsl(30_8%_60%)] hover:text-[hsl(340_72%_45%)] transition-colors">
                Voltar ao início
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
