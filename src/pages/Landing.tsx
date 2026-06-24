import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag, BarChart3, Users, Package, Zap, Shield,
  ChevronRight, Check, Star, Menu, X, ArrowRight,
  Globe, Smartphone, TrendingUp, Clock, Lock
} from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────
const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] },
});

// ── data ─────────────────────────────────────────────────────────────────────
const features = [
  { icon: ShoppingBag, title: 'POS Completo', desc: 'Caixa regista com impressão de recibo, múltiplos métodos de pagamento e gestão de turnos.' },
  { icon: Package,     title: 'Stock em Tempo Real', desc: 'Controlo total de entradas, saídas, variantes de tamanho e cor com alertas de stock mínimo.' },
  { icon: Users,       title: 'Base de Clientes', desc: 'Histórico de compras, segmentação, taxa de retorno e gestão de vales de troca.' },
  { icon: BarChart3,   title: 'Relatórios Avançados', desc: 'Dashboard com KPIs de vendas, margens, produtos top e análise geográfica.' },
  { icon: Globe,       title: 'Loja Online Integrada', desc: 'Catálogo público sincronizado com o seu stock. Partilhe por link ou Instagram.' },
  { icon: Smartphone,  title: 'Mobile Ready', desc: 'Funciona em tablet e telemóvel. Perfeito para feiras e pop-ups.' },
];

const plans = [
  {
    name: 'Básico',
    price: '29',
    period: '/mês',
    desc: 'Para lojas que estão a começar.',
    color: 'border-border',
    badge: null,
    features: [
      '1 utilizador',
      'POS & Encomendas',
      'Stock básico',
      'Relatórios mensais',
      'Suporte por email',
    ],
    cta: 'Começar Grátis',
    ctaStyle: 'border border-primary text-primary hover:bg-primary hover:text-white',
  },
  {
    name: 'Pro',
    price: '59',
    period: '/mês',
    desc: 'O mais popular para lojas em crescimento.',
    color: 'border-primary',
    badge: 'Mais Popular',
    features: [
      'Até 5 utilizadores',
      'Tudo do Básico',
      'Loja online pública',
      'Vales de troca & Empréstimos',
      'Análise de clientes',
      'Suporte prioritário',
    ],
    cta: 'Experimentar Pro',
    ctaStyle: 'bg-primary text-white hover:bg-[hsl(340_72%_38%)]',
  },
  {
    name: 'Plus',
    price: '99',
    period: '/mês',
    desc: 'Para cadeias e multi-lojas.',
    color: 'border-border',
    badge: null,
    features: [
      'Utilizadores ilimitados',
      'Tudo do Pro',
      'Multi-loja',
      'API & Integrações',
      'Relatórios personalizados',
      'Gestor de conta dedicado',
    ],
    cta: 'Falar com Vendas',
    ctaStyle: 'border border-primary text-primary hover:bg-primary hover:text-white',
  },
];

const testimonials = [
  { name: 'Ana Rodrigues', store: 'Boutique Âncora, Porto', text: 'Desde que migrámos para o Loja Diana o controlo de stock nunca mais foi um problema. A equipa adoptou em dois dias.', stars: 5 },
  { name: 'Margarida Costa', store: 'Moda Sofia, Lisboa', text: 'O POS é incrível. Fechamos o caixa em segundos e os relatórios aparecem logo. Poupamos horas por semana.', stars: 5 },
  { name: 'Beatriz Fernandes', store: 'Tendência Viana, Braga', text: 'A loja online integrada triplicou as encomendas pelo Instagram. Recomendo a qualquer boutique.', stars: 5 },
];

const stats = [
  { value: '320+', label: 'Lojas activas' },
  { value: '€4.2M', label: 'Volume processado/mês' },
  { value: '99.9%', label: 'Uptime garantido' },
  { value: '< 2min', label: 'Tempo médio de onboarding' },
];

// ── component ─────────────────────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const goLogin = () => navigate('/login');
  const goRegister = (plan?: string) => navigate(`/register${plan ? `?plan=${plan}` : ''}`);

  return (
    <div className="min-h-screen bg-white text-[hsl(20_15%_12%)] font-[DM_Sans,sans-serif]">

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur border-b border-[hsl(35_18%_88%)]">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <span className="font-['Playfair_Display'] text-xl font-bold text-[hsl(340_72%_45%)]">Loja Diana</span>

          {/* desktop links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[hsl(30_8%_48%)]">
            <a href="#features" className="hover:text-[hsl(340_72%_45%)] transition-colors">Funcionalidades</a>
            <a href="#pricing"  className="hover:text-[hsl(340_72%_45%)] transition-colors">Preços</a>
            <a href="#reviews"  className="hover:text-[hsl(340_72%_45%)] transition-colors">Testemunhos</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={goLogin} className="text-sm font-medium text-[hsl(30_8%_48%)] hover:text-[hsl(340_72%_45%)] transition-colors px-3 py-1.5">
              Entrar
            </button>
            <button onClick={() => goRegister()} className="text-sm font-semibold bg-[hsl(340_72%_45%)] text-white px-4 py-2 rounded-lg hover:bg-[hsl(340_72%_38%)] transition-colors">
              Começar Grátis
            </button>
          </div>

          {/* mobile hamburger */}
          <button className="md:hidden p-2" onClick={() => setMobileOpen(v => !v)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden border-t border-[hsl(35_18%_88%)] bg-white px-5 pb-4"
            >
              <div className="flex flex-col gap-4 pt-4 text-sm font-medium">
                <a href="#features" onClick={() => setMobileOpen(false)} className="text-[hsl(30_8%_48%)]">Funcionalidades</a>
                <a href="#pricing"  onClick={() => setMobileOpen(false)} className="text-[hsl(30_8%_48%)]">Preços</a>
                <a href="#reviews"  onClick={() => setMobileOpen(false)} className="text-[hsl(30_8%_48%)]">Testemunhos</a>
                <button onClick={goLogin} className="text-left text-[hsl(30_8%_48%)]">Entrar</button>
                <button onClick={() => goRegister()} className="bg-[hsl(340_72%_45%)] text-white px-4 py-2 rounded-lg font-semibold text-center">
                  Começar Grátis
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-24 px-5 bg-gradient-to-br from-white via-[hsl(38_25%_98%)] to-[hsl(340_40%_97%)]">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div {...fade(0)} className="inline-flex items-center gap-2 bg-[hsl(340_40%_95%)] text-[hsl(340_72%_45%)] text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <Zap className="h-3.5 w-3.5" />
            Software de gestão para boutiques portuguesas
          </motion.div>

          <motion.h1 {...fade(0.08)} className="font-['Playfair_Display'] text-5xl sm:text-6xl md:text-7xl font-bold leading-tight mb-6">
            A sua loja,{' '}
            <span className="text-[hsl(340_72%_45%)]">sem complicações</span>
          </motion.h1>

          <motion.p {...fade(0.16)} className="text-lg text-[hsl(30_8%_48%)] max-w-2xl mx-auto mb-10 leading-relaxed">
            POS, stock, clientes, encomendas e relatórios numa só plataforma. Desenhado para boutiques e lojas de roupa portuguesas.
          </motion.p>

          <motion.div {...fade(0.22)} className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => goRegister()}
              className="flex items-center justify-center gap-2 bg-[hsl(340_72%_45%)] text-white font-semibold px-7 py-3.5 rounded-xl hover:bg-[hsl(340_72%_38%)] transition-all shadow-lg shadow-[hsl(340_72%_45%/0.25)] hover:shadow-xl hover:shadow-[hsl(340_72%_45%/0.3)] hover:-translate-y-0.5"
            >
              Começar Grátis — 14 dias
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={goLogin}
              className="flex items-center justify-center gap-2 border border-[hsl(35_18%_88%)] text-[hsl(20_15%_12%)] font-semibold px-7 py-3.5 rounded-xl hover:border-[hsl(340_72%_45%)] hover:text-[hsl(340_72%_45%)] transition-all"
            >
              <Lock className="h-4 w-4" />
              Já tenho conta
            </button>
          </motion.div>

          <motion.p {...fade(0.28)} className="mt-4 text-xs text-[hsl(30_8%_60%)]">
            Sem cartão de crédito · Cancele quando quiser · Dados seguros em Portugal
          </motion.p>
        </div>

        {/* mock dashboard preview */}
        <motion.div {...fade(0.32)} className="max-w-5xl mx-auto mt-16 rounded-2xl overflow-hidden border border-[hsl(35_18%_88%)] shadow-2xl shadow-black/10">
          <div className="bg-[hsl(20_12%_7%)] px-4 py-2.5 flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
            <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
            <span className="h-3 w-3 rounded-full bg-[#28C840]" />
            <span className="ml-3 text-xs text-white/40 font-mono">app.lojadiana.pt — Dashboard</span>
          </div>
          <div className="bg-[hsl(38_25%_96%)] p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Vendas Hoje', value: '€1 240', up: true },
              { label: 'Encomendas', value: '38', up: true },
              { label: 'Stock Baixo', value: '3 itens', up: false },
              { label: 'Clientes', value: '847', up: true },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-xl p-4 border border-[hsl(35_18%_88%)] shadow-sm">
                <p className="text-xs text-[hsl(30_8%_48%)] font-semibold uppercase tracking-wide mb-2">{k.label}</p>
                <p className="font-['Playfair_Display'] text-2xl font-bold">{k.value}</p>
                <span className={`text-xs font-semibold mt-1 inline-block ${k.up ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {k.up ? '▲ +12%' : '▼ Atenção'}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <section className="py-16 bg-[hsl(20_12%_7%)]">
        <div className="max-w-5xl mx-auto px-5 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s, i) => (
            <motion.div key={s.label} {...fade(i * 0.08)}>
              <p className="font-['Playfair_Display'] text-4xl font-bold text-[hsl(340_72%_65%)]">{s.value}</p>
              <p className="text-sm text-white/50 mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-5 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fade()} className="text-center mb-16">
            <p className="text-xs font-semibold text-[hsl(340_72%_45%)] uppercase tracking-widest mb-3">Funcionalidades</p>
            <h2 className="font-['Playfair_Display'] text-4xl sm:text-5xl font-bold mb-4">Tudo o que a sua loja precisa</h2>
            <p className="text-[hsl(30_8%_48%)] max-w-xl mx-auto">Uma plataforma integrada. Sem folhas de cálculo, sem papel, sem confusão.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={f.title} {...fade(i * 0.07)}
                className="group p-6 rounded-2xl border border-[hsl(35_18%_88%)] hover:border-[hsl(340_72%_45%)] hover:shadow-lg hover:shadow-[hsl(340_72%_45%/0.08)] transition-all"
              >
                <div className="h-10 w-10 rounded-xl bg-[hsl(340_40%_95%)] flex items-center justify-center mb-4 group-hover:bg-[hsl(340_72%_45%)] transition-colors">
                  <f.icon className="h-5 w-5 text-[hsl(340_72%_45%)] group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-semibold text-base mb-2">{f.title}</h3>
                <p className="text-sm text-[hsl(30_8%_48%)] leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST BADGES ─────────────────────────────────────────────────── */}
      <section className="py-14 bg-[hsl(38_25%_96%)] border-y border-[hsl(35_18%_88%)]">
        <div className="max-w-4xl mx-auto px-5 grid sm:grid-cols-3 gap-8">
          {[
            { icon: Shield, title: 'Dados em Portugal', desc: 'Servidores na UE. Conformidade RGPD garantida.' },
            { icon: TrendingUp, title: 'Sem contratos', desc: 'Mensal, sem fidelização. Cancele a qualquer momento.' },
            { icon: Clock, title: 'Suporte humano', desc: 'Resposta em menos de 4 horas em dias úteis.' },
          ].map((b, i) => (
            <motion.div key={b.title} {...fade(i * 0.1)} className="flex gap-4">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-white border border-[hsl(35_18%_88%)] flex items-center justify-center shadow-sm">
                <b.icon className="h-5 w-5 text-[hsl(340_72%_45%)]" />
              </div>
              <div>
                <p className="font-semibold text-sm mb-1">{b.title}</p>
                <p className="text-xs text-[hsl(30_8%_48%)] leading-relaxed">{b.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-5 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fade()} className="text-center mb-16">
            <p className="text-xs font-semibold text-[hsl(340_72%_45%)] uppercase tracking-widest mb-3">Preços</p>
            <h2 className="font-['Playfair_Display'] text-4xl sm:text-5xl font-bold mb-4">Simples e transparente</h2>
            <p className="text-[hsl(30_8%_48%)]">14 dias grátis em todos os planos. Sem cartão de crédito.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((p, i) => (
              <motion.div key={p.name} {...fade(i * 0.08)}
                className={`relative rounded-2xl border-2 p-8 flex flex-col ${p.color} ${p.badge ? 'shadow-xl shadow-[hsl(340_72%_45%/0.15)]' : ''}`}
              >
                {p.badge && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[hsl(340_72%_45%)] text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                    {p.badge}
                  </span>
                )}
                <div className="mb-6">
                  <p className="font-semibold text-sm text-[hsl(30_8%_48%)] mb-1">{p.name}</p>
                  <div className="flex items-end gap-1 mb-2">
                    <span className="font-['Playfair_Display'] text-5xl font-bold">€{p.price}</span>
                    <span className="text-sm text-[hsl(30_8%_48%)] mb-1">{p.period}</span>
                  </div>
                  <p className="text-xs text-[hsl(30_8%_48%)]">{p.desc}</p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-[hsl(340_72%_45%)] mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => goRegister(p.name.toLowerCase())}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${p.ctaStyle}`}
                >
                  {p.cta}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </div>

          <motion.p {...fade(0.2)} className="text-center text-xs text-[hsl(30_8%_60%)] mt-8">
            Todos os preços incluem IVA. Facturação mensal sem surpresas.
          </motion.p>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section id="reviews" className="py-24 px-5 bg-[hsl(38_25%_96%)]">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fade()} className="text-center mb-14">
            <p className="text-xs font-semibold text-[hsl(340_72%_45%)] uppercase tracking-widest mb-3">Testemunhos</p>
            <h2 className="font-['Playfair_Display'] text-4xl font-bold">O que dizem as nossas clientes</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div key={t.name} {...fade(i * 0.1)}
                className="bg-white rounded-2xl p-6 border border-[hsl(35_18%_88%)] shadow-sm"
              >
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, s) => (
                    <Star key={s} className="h-4 w-4 fill-[hsl(340_72%_45%)] text-[hsl(340_72%_45%)]" />
                  ))}
                </div>
                <p className="text-sm text-[hsl(20_15%_20%)] leading-relaxed mb-5">"{t.text}"</p>
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-[hsl(30_8%_48%)]">{t.store}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────────────────── */}
      <section className="py-24 px-5 bg-[hsl(20_12%_7%)] text-center">
        <motion.div {...fade()} className="max-w-2xl mx-auto">
          <h2 className="font-['Playfair_Display'] text-4xl sm:text-5xl font-bold text-white mb-5">
            Pronta para simplificar a sua loja?
          </h2>
          <p className="text-white/50 mb-10 text-lg">14 dias grátis. Sem cartão. Sem compromisso.</p>
          <button
            onClick={() => goRegister()}
            className="inline-flex items-center gap-2 bg-[hsl(340_72%_45%)] text-white font-semibold px-8 py-4 rounded-xl hover:bg-[hsl(340_72%_38%)] transition-all text-lg shadow-lg shadow-[hsl(340_72%_45%/0.3)] hover:shadow-xl hover:-translate-y-0.5"
          >
            Começar Grátis
            <ArrowRight className="h-5 w-5" />
          </button>
        </motion.div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="py-10 px-5 bg-[hsl(20_12%_5%)] border-t border-white/5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/30">
          <span className="font-['Playfair_Display'] text-sm font-bold text-[hsl(340_72%_55%)]">Loja Diana</span>
          <span>© {new Date().getFullYear()} Loja Diana · Todos os direitos reservados</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white/60 transition-colors">Privacidade</a>
            <a href="#" className="hover:text-white/60 transition-colors">Termos</a>
            <a href="#" className="hover:text-white/60 transition-colors">Contacto</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
