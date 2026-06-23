import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Banknote,
  BarChart3,
  Box,
  ChevronLeft,
  ClipboardList,
  Database,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Monitor,
  Package,
  Settings,
  Settings2,
  ShoppingBag,
  Store,
  Tag,
  Ticket,
  Truck,
  Users,
  Video,
  Wallet,
  X
} from 'lucide-react';
import { ExcelImport } from '../ExcelImport';
import { ThemeToggle } from '../ThemeToggle';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import OnboardingWizard from '../OnboardingWizard';

const navGroups = [
  {
    label: 'Visão Geral',
    items: [
      { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, path: '/app' },
      { id: 'rankings', label: 'Relatórios', icon: BarChart3, path: '/app/rankings' },
    ]
  },
  {
    label: 'Vendas',
    items: [
      { id: 'pos', label: 'Ponto de Venda', icon: Store, path: '/app/pos' },
      { id: 'encomendas', label: 'Encomendas', icon: ClipboardList, path: '/app/encomendas' },
      { id: 'portes', label: 'Logística', icon: Truck, path: '/app/portes' },
    ]
  },
  {
    label: 'Diretos',
    items: [
      { id: 'pos-diretos', label: 'POS Diretos', icon: Monitor, path: '/app/pos-diretos' },
      { id: 'diretos', label: 'Gestão', icon: Video, path: '/app/diretos' },
      { id: 'analise-diretos', label: 'Análise', icon: BarChart3, path: '/app/analise-diretos' },
    ]
  },
  {
    label: 'Catálogo',
    items: [
      { id: 'base-itens', label: 'Produtos', icon: Tag, path: '/app/base-itens' },
      { id: 'produtos', label: 'Análise', icon: Package, path: '/app/produtos' },
      { id: 'variacoes', label: 'Variações', icon: Settings2, path: '/app/personalizacoes' },
      { id: 'stock-manager', label: 'Inventário', icon: Box, path: '/app/stock-manager' },
    ]
  },
  {
    label: 'Clientes',
    items: [
      { id: 'clientes', label: 'Análise', icon: Users, path: '/app/clientes' },
      { id: 'base-clientes', label: 'Base de Dados', icon: Database, path: '/app/base-clientes' },
    ]
  },
  {
    label: 'Financeiro',
    items: [
      { id: 'despesas', label: 'Despesas', icon: Wallet, path: '/app/despesas' },
      { id: 'emprestimos', label: 'Crédito', icon: Banknote, path: '/app/emprestimos' },
      { id: 'faturas', label: 'Faturas', icon: FileText, path: '/app/faturas' },
      { id: 'vales', label: 'Vales de Troca', icon: Ticket, path: '/app/vales' },
    ]
  },
  {
    label: 'Sistema',
    items: [
      { id: 'settings', label: 'Configurações', icon: Settings, path: '/app/settings' },
      { id: 'loja', label: 'Loja Online', icon: ShoppingBag, path: '/loja' },
    ]
  },
];

const navigation = navGroups.flatMap(group => group.items);

function AppLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passError, setPassError] = useState(false);
  const [passSuccess, setPassSuccess] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const location = useLocation();
  const { data, setData, setIsLoading } = useData();
  const { user, logout, changePassword } = useAuth();

  useEffect(() => {
    // Show onboarding wizard for new stores (after data loads)
    if (data.appSettings !== undefined && !data.appSettings?.onboarding_complete) {
      setShowOnboarding(true);
    }
  }, [data.appSettings]);

  useEffect(() => {
    const body = document.body;
    body.classList.remove('light', 'dark');
    body.classList.add(isDark ? 'dark' : 'light');
    return () => { body.classList.remove('light', 'dark'); };
  }, [isDark]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const getPageTitle = () => {
    const route = navigation.find(item => item.path === location.pathname);
    return route ? route.label : 'Dashboard';
  };

  const handleDataImport = (importedData: { orders: any[]; customers: any[] }) => {
    setIsLoading(true);
    setData(importedData);
    setIsLoading(false);
  };

  const handlePassChange = async (event: React.FormEvent) => {
    event.preventDefault();
    const success = await changePassword(oldPass, newPass);
    if (success) {
      setPassSuccess(true);
      setTimeout(() => {
        setIsPassModalOpen(false);
        setPassSuccess(false);
        setOldPass('');
        setNewPass('');
      }, 1800);
      return;
    }
    setPassError(true);
    setTimeout(() => setPassError(false), 2200);
  };

  const storeName = data.appSettings?.storeName || 'Loja Diana';

  const pendingOnlineOrders = useMemo(() => {
    const lastViewed = localStorage.getItem('last_orders_viewed') || '1970-01-01T00:00:00Z';
    return (data.onlineOrders || []).filter(
      (o: any) => o.status === 'Aguarda pagamento' && o.created_at > lastViewed
    ).length;
  }, [data.onlineOrders]);

  useEffect(() => {
    if (location.pathname === '/app/encomendas') {
      localStorage.setItem('last_orders_viewed', new Date().toISOString());
    }
  }, [location.pathname]);

  const planBadgeStyle = (plan?: string) => {
    if (plan === 'plus')  return { background: '#fef3c7', color: '#92640a' };
    if (plan === 'pro')   return { background: '#fdf0f3', color: '#c1392b' };
    return { background: '#f5f5f5', color: '#6b7280' };
  };

  const planLabel = (plan?: string) => {
    if (plan === 'plus')  return 'Plano Plus';
    if (plan === 'pro')   return 'Plano Pro';
    return 'Plano Básico';
  };

  const trialDaysLeft: number | null = null; // Will be populated after Stripe integration

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">

      {/* ── Onboarding Wizard ───────────────────────────── */}
      {showOnboarding && (
        <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
      )}

      {/* ── Desktop Sidebar ─────────────────────────────── */}
      <aside className={`hidden lg:flex flex-col flex-shrink-0 bg-white border-r border-[hsl(35_18%_90%)] transition-all duration-300 ${isSidebarCollapsed ? 'w-[60px]' : 'w-[220px]'}`}>

        {/* Brand */}
        <div className={`flex items-center gap-3 p-4 border-b border-[hsl(35_18%_90%)] ${isSidebarCollapsed ? 'justify-center' : ''}`}>
          <div className="flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center text-white font-bold text-base"
            style={{ background: 'linear-gradient(135deg, hsl(340 72% 45%), hsl(340 60% 62%))', fontFamily: '"Playfair Display", serif' }}>
            D
          </div>
          {!isSidebarCollapsed && (
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-[hsl(20_15%_8%)] truncate leading-tight">{storeName}</p>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5 inline-block"
                style={planBadgeStyle(user?.plan)}>
                {planLabel(user?.plan)}
              </span>
            </div>
          )}
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {navGroups.map(group => (
            <div key={group.label}>
              {!isSidebarCollapsed && (
                <p className="text-[9px] font-bold text-[hsl(30_8%_65%)] uppercase tracking-[0.1em] px-2 mb-1">
                  {group.label}
                </p>
              )}
              {group.items.map(item => (
                <NavLink key={item.id} to={item.path}
                  end={item.path === '/app'}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-2 py-2 rounded-[10px] mb-0.5 transition-colors ${
                      isActive
                        ? 'bg-[hsl(340_40%_95%)] text-[hsl(340_72%_40%)]'
                        : 'text-[hsl(30_8%_40%)] hover:bg-[hsl(38_25%_96%)] hover:text-[hsl(20_15%_8%)]'
                    } ${isSidebarCollapsed ? 'justify-center' : ''}`
                  }>
                  {({ isActive }) => (
                    <>
                      <item.icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-[hsl(340_72%_45%)]' : ''}`} />
                      {!isSidebarCollapsed && (
                        <>
                          <span className="text-[12px] font-medium flex-1 truncate">{item.label}</span>
                          {item.id === 'encomendas' && pendingOnlineOrders > 0 && (
                            <span className="text-[10px] font-bold bg-rose-500 text-white min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                              {pendingOnlineOrders}
                            </span>
                          )}
                          {(item as any).badge && (
                            <span className="text-[10px] font-bold bg-[hsl(340_72%_45%)] text-white px-1.5 py-0.5 rounded-full">
                              {(item as any).badge}
                            </span>
                          )}
                        </>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className={`border-t border-[hsl(35_18%_90%)] p-3 flex items-center gap-2.5 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
          <div className="h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold text-[hsl(340_72%_45%)]"
            style={{ background: 'linear-gradient(135deg, hsl(340 40% 90%), hsl(340 40% 82%))' }}>
            {user?.email?.[0]?.toUpperCase() ?? 'U'}
          </div>
          {!isSidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-[hsl(20_15%_8%)] truncate">{storeName}</p>
              <p className="text-[10px] text-[hsl(30_8%_55%)] capitalize">{user?.role ?? 'admin'}</p>
            </div>
          )}
          {!isSidebarCollapsed && (
            <button onClick={() => logout()} title="Sair"
              className="text-[hsl(30_8%_60%)] hover:text-rose-500 transition-colors">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </aside>

      {/* ── Mobile toggle ───────────────────────────────── */}
      <button
        onClick={() => setIsMobileMenuOpen(v => !v)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card shadow-sm lg:hidden"
        aria-label="Abrir menu"
      >
        {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile backdrop */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Mobile Sidebar ──────────────────────────────── */}
      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: isMobileMenuOpen ? 0 : -280 }}
        transition={{ type: 'spring', damping: 24, stiffness: 200 }}
        className="fixed bottom-0 left-0 top-0 z-50 flex w-72 flex-col shadow-2xl lg:hidden"
        style={{ backgroundColor: 'hsl(var(--sidebar-bg))' }}
      >
        <div
          className="flex items-center gap-3 border-b p-5"
          style={{ borderColor: 'hsl(var(--sidebar-border))' }}
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl font-display font-bold text-lg text-white"
            style={{ background: 'linear-gradient(135deg, hsl(340 72% 45%), hsl(340 72% 58%))' }}
          >
            {storeName.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-white">{storeName}</p>
            <p className="text-xs" style={{ color: 'hsl(var(--sidebar-label))' }}>Gestão de Loja</p>
          </div>
        </div>

        <nav className="sidebar-scroll mt-4 flex-1 space-y-5 overflow-y-auto px-3">
          {navGroups.map(group => (
            <section key={group.label}>
              <p className="sidebar-label mb-2 px-3">{group.label}</p>
              <div className="space-y-0.5">
                {navigation
                  .filter(item => group.items.some(g => g.id === item.id))
                  .map(item => (
                    <NavLink
                      key={item.id}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${
                          isActive ? 'nav-item-active' : ''
                        }`
                      }
                      style={({ isActive }) => ({
                        color: isActive
                          ? 'hsl(var(--sidebar-active-text))'
                          : 'hsl(var(--sidebar-foreground))',
                      })}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="text-sm font-medium flex-1">{item.label}</span>
                      {item.id === 'encomendas' && pendingOnlineOrders > 0 && (
                        <span className="text-[10px] font-bold bg-rose-500 text-white min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                          {pendingOnlineOrders}
                        </span>
                      )}
                    </NavLink>
                  ))}
              </div>
            </section>
          ))}
        </nav>

        <div
          className="border-t p-4"
          style={{ borderColor: 'hsl(var(--sidebar-border))' }}
        >
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-white/10"
            style={{ color: 'hsl(340 72% 68%)' }}
          >
            <LogOut className="h-4 w-4" />
            Terminar sessão
          </button>
        </div>
      </motion.aside>

      {/* ── Main Content ────────────────────────────────── */}
      <main className="relative flex-1 overflow-y-auto bg-background scroll-smooth">

        {/* ── Top bar ── */}
        <header className="bg-white border-b border-[hsl(35_18%_90%)] px-4 lg:px-6 py-3 flex items-center gap-3 flex-shrink-0">
          {/* Mobile menu button */}
          <button className="lg:hidden text-[hsl(30_8%_40%)]" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>

          {/* Collapse button desktop */}
          <button className="hidden lg:flex text-[hsl(30_8%_50%)] hover:text-[hsl(340_72%_45%)] transition-colors"
            onClick={() => setIsSidebarCollapsed((v: boolean) => !v)}>
            <ChevronLeft className={`h-4 w-4 transition-transform ${isSidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>

          <h1 className="font-['Playfair_Display'] text-[17px] font-bold text-[hsl(20_15%_8%)]">
            {getPageTitle()}
          </h1>

          <div className="flex-1" />

          {/* Trial badge */}
          {trialDaysLeft !== null && trialDaysLeft >= 0 && (
            <div className="hidden sm:flex items-center gap-1.5 bg-[#fffbeb] border border-[#fde5b0] rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-pulse" />
              <span className="text-[11px] font-semibold text-[#92640a]">
                Trial · {trialDaysLeft} dias restantes
              </span>
            </div>
          )}

          <ExcelImport onDataImported={handleDataImport} />
          <ThemeToggle isDark={isDark} toggle={() => setIsDark(v => !v)} />
        </header>

        {/* Page content */}
        <div className="relative z-10 mx-auto max-w-[1800px] space-y-5 p-4 lg:p-6">
          <Outlet />
        </div>
      </main>

      {/* ── Password Modal ──────────────────────────────── */}
      <AnimatePresence>
        {isPassModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50"
              onClick={() => setIsPassModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 4 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-7 shadow-2xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Alterar senha</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">Acesso seguro à sua conta</p>
                </div>
                <button
                  onClick={() => setIsPassModalOpen(false)}
                  className="rounded-lg p-2 transition-colors hover:bg-secondary"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <form onSubmit={handlePassChange} className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-foreground">Senha atual</span>
                  <input
                    type="password"
                    value={oldPass}
                    onChange={e => setOldPass(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="••••"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-foreground">Nova senha</span>
                  <input
                    type="password"
                    value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Mínimo 4 caracteres"
                  />
                </label>

                {passError && (
                  <p className="rounded-lg bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                    Senha atual incorreta
                  </p>
                )}
                {passSuccess && (
                  <p className="rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                    Senha alterada com sucesso!
                  </p>
                )}

                <button
                  type="submit"
                  className="btn-primary w-full rounded-xl py-2.5 text-sm font-semibold"
                >
                  Guardar nova senha
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AppLayout;
