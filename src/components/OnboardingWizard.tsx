import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store, Phone, MapPin, Check, ArrowRight, ArrowLeft,
  Upload, Loader2, Sparkles
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

type Step = 'welcome' | 'store' | 'import' | 'done';

const STEPS: Step[] = ['welcome', 'store', 'import', 'done'];

interface Props {
  onComplete: () => void;
}

export default function OnboardingWizard({ onComplete }: Props) {
  const { updateAppSettings } = useData();
  const { user } = useAuth();

  const [step, setStep]           = useState<Step>('welcome');
  const [saving, setSaving]       = useState(false);

  // store form
  const [storeName, setStoreName] = useState(user?.storeName || '');
  const [whatsapp, setWhatsapp]   = useState('');
  const [instagram, setInstagram] = useState('');
  const [address, setAddress]     = useState('');

  const stepIndex = STEPS.indexOf(step);

  const next = () => setStep(STEPS[stepIndex + 1] as Step);
  const back = () => setStep(STEPS[stepIndex - 1] as Step);

  const saveStore = async () => {
    setSaving(true);
    try {
      await updateAppSettings({
        storeName:    storeName || user?.storeName || 'A minha loja',
        whatsapp,
        instagram,
        storeAddress: address,
      });
      next();
    } finally {
      setSaving(false);
    }
  };

  const finish = async () => {
    setSaving(true);
    // Mark onboarding complete in settings
    await updateAppSettings({
      storeName:    storeName || user?.storeName || 'A minha loja',
      whatsapp,
      instagram,
      storeAddress: address,
      onboarding_complete: true,
    });
    setSaving(false);
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Progress bar */}
        <div className="h-1 bg-[hsl(35_18%_90%)]">
          <motion.div
            className="h-full bg-[hsl(340_72%_45%)]"
            animate={{ width: `${((stepIndex) / (STEPS.length - 1)) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">

            {/* ── WELCOME ────────────────────────────────── */}
            {step === 'welcome' && (
              <motion.div key="welcome"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="text-center"
              >
                <div className="mx-auto mb-5 h-16 w-16 rounded-2xl bg-[hsl(340_40%_95%)] flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-[hsl(340_72%_45%)]" />
                </div>
                <h2 className="font-['Playfair_Display'] text-3xl font-bold mb-3">
                  Bem-vinda, {user?.storeName || 'à sua loja'}!
                </h2>
                <p className="text-[hsl(30_8%_48%)] mb-2 leading-relaxed">
                  Vamos configurar a sua loja em 2 minutos.
                </p>
                <p className="text-sm text-[hsl(30_8%_60%)] mb-8">
                  Pode alterar tudo isto mais tarde nas Configurações.
                </p>

                <div className="grid grid-cols-3 gap-3 mb-8 text-center">
                  {[
                    { n: '1', label: 'Configurar loja' },
                    { n: '2', label: 'Importar dados' },
                    { n: '3', label: 'Pronto a vender' },
                  ].map(s => (
                    <div key={s.n} className="rounded-xl bg-[hsl(38_25%_96%)] p-3">
                      <div className="h-7 w-7 rounded-full bg-[hsl(340_72%_45%)] text-white text-xs font-bold flex items-center justify-center mx-auto mb-1.5">
                        {s.n}
                      </div>
                      <p className="text-xs text-[hsl(20_15%_20%)] font-medium">{s.label}</p>
                    </div>
                  ))}
                </div>

                <button onClick={next}
                  className="w-full flex items-center justify-center gap-2 bg-[hsl(340_72%_45%)] text-white font-semibold py-3.5 rounded-xl hover:bg-[hsl(340_72%_38%)] transition-all">
                  Começar configuração
                  <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            )}

            {/* ── STORE DETAILS ──────────────────────────── */}
            {step === 'store' && (
              <motion.div key="store"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-[hsl(340_40%_95%)] flex items-center justify-center">
                    <Store className="h-5 w-5 text-[hsl(340_72%_45%)]" />
                  </div>
                  <div>
                    <h2 className="font-['Playfair_Display'] text-xl font-bold">A sua loja</h2>
                    <p className="text-xs text-[hsl(30_8%_48%)]">Informações de contacto e identidade</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block">
                    <span className="text-xs font-semibold text-[hsl(20_15%_12%)] mb-1.5 block">Nome da loja *</span>
                    <input value={storeName} onChange={e => setStoreName(e.target.value)}
                      placeholder="Ex: Boutique Âncora"
                      className="w-full px-4 py-3 rounded-xl border border-[hsl(35_18%_88%)] text-sm outline-none focus:border-[hsl(340_72%_45%)] focus:ring-2 focus:ring-[hsl(340_72%_45%/0.15)] transition"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs font-semibold text-[hsl(20_15%_12%)] mb-1.5 block">
                        <Phone className="inline h-3 w-3 mr-1" />WhatsApp
                      </span>
                      <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                        placeholder="+351 912 345 678"
                        className="w-full px-4 py-3 rounded-xl border border-[hsl(35_18%_88%)] text-sm outline-none focus:border-[hsl(340_72%_45%)] focus:ring-2 focus:ring-[hsl(340_72%_45%/0.15)] transition"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-[hsl(20_15%_12%)] mb-1.5 block">Instagram</span>
                      <input value={instagram} onChange={e => setInstagram(e.target.value)}
                        placeholder="@sujaloja"
                        className="w-full px-4 py-3 rounded-xl border border-[hsl(35_18%_88%)] text-sm outline-none focus:border-[hsl(340_72%_45%)] focus:ring-2 focus:ring-[hsl(340_72%_45%/0.15)] transition"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-xs font-semibold text-[hsl(20_15%_12%)] mb-1.5 block">
                      <MapPin className="inline h-3 w-3 mr-1" />Morada
                    </span>
                    <input value={address} onChange={e => setAddress(e.target.value)}
                      placeholder="Rua das Flores 12, Lisboa"
                      className="w-full px-4 py-3 rounded-xl border border-[hsl(35_18%_88%)] text-sm outline-none focus:border-[hsl(340_72%_45%)] focus:ring-2 focus:ring-[hsl(340_72%_45%/0.15)] transition"
                    />
                  </label>
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={back}
                    className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-[hsl(35_18%_88%)] text-sm font-medium text-[hsl(30_8%_48%)] hover:border-[hsl(340_72%_45%)] transition">
                    <ArrowLeft className="h-4 w-4" />Voltar
                  </button>
                  <button onClick={saveStore} disabled={saving || !storeName.trim()}
                    className="flex-1 flex items-center justify-center gap-2 bg-[hsl(340_72%_45%)] text-white font-semibold py-3 rounded-xl hover:bg-[hsl(340_72%_38%)] transition disabled:opacity-60">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Guardar e continuar</span><ArrowRight className="h-4 w-4" /></>}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── IMPORT ─────────────────────────────────── */}
            {step === 'import' && (
              <motion.div key="import"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-[hsl(340_40%_95%)] flex items-center justify-center">
                    <Upload className="h-5 w-5 text-[hsl(340_72%_45%)]" />
                  </div>
                  <div>
                    <h2 className="font-['Playfair_Display'] text-xl font-bold">Importar dados</h2>
                    <p className="text-xs text-[hsl(30_8%_48%)]">Opcional — pode fazer isto depois</p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  {[
                    { icon: '📦', title: 'Importar produtos', desc: 'Ficheiro Excel com o seu catálogo', path: '/app/base-itens' },
                    { icon: '📋', title: 'Importar encomendas', desc: 'Histórico de vendas em Excel', path: '/app/encomendas' },
                    { icon: '👥', title: 'Importar clientes', desc: 'Base de dados de clientes', path: '/app/base-clientes' },
                  ].map(item => (
                    <div key={item.title}
                      className="flex items-center gap-4 p-4 rounded-xl border border-[hsl(35_18%_88%)] bg-[hsl(38_25%_98%)]">
                      <span className="text-2xl">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{item.title}</p>
                        <p className="text-xs text-[hsl(30_8%_48%)]">{item.desc}</p>
                      </div>
                      <span className="text-xs text-[hsl(30_8%_60%)] shrink-0">Após configuração</span>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl bg-[hsl(340_40%_97%)] border border-[hsl(340_40%_88%)] p-4 mb-6">
                  <p className="text-xs text-[hsl(340_72%_35%)] font-medium">
                    💡 Encontrará o botão de importação Excel no canto superior da sidebar depois de concluir esta configuração.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button onClick={back}
                    className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-[hsl(35_18%_88%)] text-sm font-medium text-[hsl(30_8%_48%)] hover:border-[hsl(340_72%_45%)] transition">
                    <ArrowLeft className="h-4 w-4" />Voltar
                  </button>
                  <button onClick={next}
                    className="flex-1 flex items-center justify-center gap-2 bg-[hsl(340_72%_45%)] text-white font-semibold py-3 rounded-xl hover:bg-[hsl(340_72%_38%)] transition">
                    Continuar
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── DONE ───────────────────────────────────── */}
            {step === 'done' && (
              <motion.div key="done"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.1, stiffness: 200 }}
                  className="mx-auto mb-5 h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center"
                >
                  <Check className="h-8 w-8 text-emerald-600" />
                </motion.div>

                <h2 className="font-['Playfair_Display'] text-3xl font-bold mb-3">Tudo pronto!</h2>
                <p className="text-[hsl(30_8%_48%)] mb-8 leading-relaxed">
                  A sua loja <strong className="text-[hsl(20_15%_12%)]">{storeName}</strong> está configurada e pronta a usar.
                </p>

                <div className="grid grid-cols-2 gap-3 mb-8 text-left">
                  {[
                    { emoji: '🛍️', label: 'Ponto de Venda', sub: 'Registe vendas agora' },
                    { emoji: '📦', label: 'Stock', sub: 'Gerir inventário' },
                    { emoji: '📊', label: 'Dashboard', sub: 'Ver relatórios' },
                    { emoji: '⚙️', label: 'Configurações', sub: 'Personalizar mais' },
                  ].map(c => (
                    <div key={c.label} className="rounded-xl bg-[hsl(38_25%_96%)] p-3 flex items-center gap-3">
                      <span className="text-xl">{c.emoji}</span>
                      <div>
                        <p className="font-semibold text-xs">{c.label}</p>
                        <p className="text-[10px] text-[hsl(30_8%_48%)]">{c.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={finish} disabled={saving}
                  className="w-full flex items-center justify-center gap-2 bg-[hsl(340_72%_45%)] text-white font-semibold py-3.5 rounded-xl hover:bg-[hsl(340_72%_38%)] transition disabled:opacity-60">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Entrar no painel</span><ArrowRight className="h-4 w-4" /></>}
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
