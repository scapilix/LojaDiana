import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Package,
  BarChart3,
  Menu,
  X,
  Truck,
  Database,
  Tag,
  Box,
  LogOut,
  ShieldCheck,
  KeyRound,
  FileText,
  Wallet,
  Banknote,
  PlusCircle,
  ClipboardList,
  ShoppingBag,
  Settings,
  Store,
  Layers,
  Video
} from 'lucide-react';


import { ThemeToggle } from '../ThemeToggle';
import { ExcelImport } from '../ExcelImport';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';

const navGroups = [
  {
    label: 'Visão Geral',
    items: [
      { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
      { id: 'rankings', label: 'Relatórios & Rankings', icon: BarChart3, path: '/rankings' },
    ]
  },
  {
    label: 'Vendas',
    items: [
      { id: 'pos', label: 'POS', icon: Store, path: '/pos' },
      { id: 'cadastro-vendas', label: 'Nova Venda', icon: PlusCircle, path: '/cadastro-vendas' },
      { id: 'encomendas', label: 'Pedidos / Encomendas', icon: ClipboardList, path: '/encomendas' },
      { id: 'diretos', label: 'Diretos / Live', icon: Video, path: '/diretos' },
      { id: 'portes', label: 'Logística & Retornos', icon: Truck, path: '/portes' },
    ]
  },
  {
    label: 'Catálogo',
    items: [
      { id: 'base-itens', label: 'Produtos', icon: Tag, path: '/base-itens' },
      { id: 'produtos', label: 'Análise de Produtos', icon: Package, path: '/produtos' },
      { id: 'variacoes', label: 'Variáveis', icon: Layers, path: '/variacoes' },
      { id: 'stock-manager', label: 'Gestão de Inventário', icon: Box, path: '/stock-manager' },
    ]
  },
  {
    label: 'Clientes',
    items: [
      { id: 'clientes', label: 'Análise de Clientes', icon: Users, path: '/clientes' },
      { id: 'base-clientes', label: 'CRM / Lista de Clientes', icon: Database, path: '/base-clientes' },
    ]
  },
  {
    label: 'Financeiro',
    items: [
      { id: 'despesas', label: 'Gestão de Despesas', icon: Wallet, path: '/despesas' },
      { id: 'emprestimos', label: 'Crédito / Empréstimos', icon: Banknote, path: '/emprestimos' },
      { id: 'faturas', label: 'Faturas & Recibos', icon: FileText, path: '/faturas' },
    ]
  },
  {
    label: 'Sistema',
    items: [
      { id: 'settings', label: 'Configurações', icon: Settings, path: '/settings' },
      { id: 'loja', label: 'Ver Loja Online', icon: ShoppingBag, path: '/loja' },
    ]
  },
];


// Flat list kept for path lookup
const navigation = navGroups.flatMap(g => g.items);


function AppLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Collapsed state
  const [isDark, setIsDark] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { data, setData, setIsLoading } = useData();
  const { logout, changePassword } = useAuth();

  // States for Password Change
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passError, setPassError] = useState(false);
  const [passSuccess, setPassSuccess] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const handlePassChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await changePassword(oldPass, newPass);
    if (success) {
      setPassSuccess(true);
      setTimeout(() => {
        setIsPassModalOpen(false);
        setPassSuccess(false);
        setOldPass('');
        setNewPass('');
      }, 2000);
    } else {
      setPassError(true);
      setTimeout(() => setPassError(false), 2000);
    }
  };

  useEffect(() => {
    // Binary theme logic: light or dark based on isDark state
    const body = document.body;
    const theme = isDark ? 'dark' : 'light';
    
    body.classList.remove('light', 'dark');
    body.classList.add(theme);
    
    // Also remove any legacy theme-xxx classes
    const existingThemes = Array.from(body.classList).filter(c => c.startsWith('theme-'));
    existingThemes.forEach(c => body.classList.remove(c));

    return () => {
      body.classList.remove('light', 'dark');
    };
  }, [isDark]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const getPageTitle = () => {
    const route = navigation.find(nav => nav.path === location.pathname);
    return route ? route.label : 'Overview';
  };

  const handleDataImport = (importedData: { orders: any[]; customers: any[] }) => {
    setIsLoading(true);
    setData(importedData);
    setIsLoading(false);
  };

  return (
    <div className="flex h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] overflow-hidden font-sans transition-colors duration-500">
      {/* Sidebar - Desktop */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarCollapsed ? 64 : 200 }}
        className="hidden lg:flex bg-[hsl(var(--sidebar-bg))] border-r border-slate-200 dark:border-white/5 flex-col z-30 transition-all duration-300"
      >
        <div className={`p-4 flex items-center gap-2 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
          <div
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-10 h-10 bg-[#8c25f4] rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20 transform transition-all hover:scale-105 cursor-pointer flex-shrink-0"
          >
            <Box className="text-white w-4 h-4" />
          </div>
          {!isSidebarCollapsed && (
            <div className="flex flex-col overflow-hidden whitespace-nowrap">
              <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white leading-none">
                {data.appSettings?.storeName || 'Gestão de Loja'}
              </span>
              <span className="text-[10px] text-[#8c25f4] font-bold uppercase tracking-wider mt-0.5">Premium Store</span>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 mt-4 overflow-y-auto custom-scrollbar space-y-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              {!isSidebarCollapsed && (
                <p className="px-2 mb-1 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600 opacity-60">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    title={isSidebarCollapsed ? item.label : ''}
                    className={({ isActive }) =>
                      `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${isActive
                        ? 'nav-item-active'
                        : 'text-slate-500 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-primary/5 hover:text-primary'
                      } ${isSidebarCollapsed ? 'justify-center' : ''}`
                    }
                  >
                    <item.icon className={`w-4 h-4 flex-shrink-0 ${isSidebarCollapsed ? '' : 'transition-transform group-hover:scale-110'}`} />
                    {!isSidebarCollapsed && (
                      <span className="font-bold text-xs truncate tracking-wide">{item.label}</span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

      </motion.aside>

      {/* Mobile Menu Button - Unchanged */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-lg shadow-md flex items-center justify-center border border-purple-100 dark:border-white/10"
      >
        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile Menu Overlay & Drawer - Unchanged (Simplified for brevity regarding collapse logic) */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: isMobileMenuOpen ? 0 : -300 }}
        transition={{ type: "spring", damping: 20 }}
        className="lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-slate-900 z-50 flex flex-col shadow-2xl"
      >
        <div className="p-6 flex items-center gap-4 border-b border-purple-100/50 dark:border-white/5">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
            <BarChart3 className="text-white w-5 h-5" />
          </div>
          <span className="font-black text-2xl text-gradient">
            {data.appSettings?.storeName || 'Gestão de Loja'}
          </span>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
          {navigation.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)} // Close on navigate
              className={({ isActive }) =>
                `w-full flex items-center gap-4 px-5 py-3 rounded-xl transition-all ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium text-sm">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-purple-100/50 dark:border-white/5">
          <ExcelImport onDataImported={handleDataImport} variant="sidebar" />
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative bg-[hsl(var(--background))] scroll-smooth transition-all duration-300">
        {/* Compact Header */}
        <header className="sticky top-0 z-20 h-14 px-6 flex justify-between items-center backdrop-blur-md border-b border-slate-100 dark:border-primary/10 bg-white/80 dark:bg-[hsl(var(--background))]/80 shadow-sm">
          <div className="flex items-center gap-3 ml-12 lg:ml-0">
            {/* Toggle Button for Desktop */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden lg:flex p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md text-slate-400 transition-colors"
            >
              <Menu className="w-3.5 h-3.5" />
            </button>

            <div className="flex flex-col">
              <h1 className="text-[8px] font-black tracking-[0.3em] uppercase text-slate-400 dark:text-slate-500 leading-tight">
                {getPageTitle()}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle isDark={isDark} toggle={() => setIsDark(!isDark)} />

            <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-white/10 relative">
              <div className="text-right hidden md:block cursor-pointer" onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}>
                <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Diana</p>
                <div className="flex items-center gap-1 justify-end">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Admin</span>
                </div>
              </div>
              <div
                className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-black text-[10px] shadow-lg cursor-pointer"
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              >
                DI
              </div>

              {/* User Dropdown */}
              {isUserDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsUserDropdownOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-full right-0 mt-3 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-3xl"
                  >
                    <button
                      onClick={() => { setIsPassModalOpen(true); setIsUserDropdownOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl text-slate-600 dark:text-slate-300 transition-colors text-xs font-bold"
                    >
                      <KeyRound className="w-4 h-4 text-purple-500" />
                      Alterar Senha
                    </button>
                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl text-rose-600 transition-colors text-xs font-bold"
                    >
                      <LogOut className="w-4 h-4" />
                      Terminar Sessão
                    </button>
                  </motion.div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-5 space-y-5 max-w-[1700px] mx-auto relative z-10">
          <Outlet />
        </div>
      </main>


      {/* Password Change Modal */}
      {isPassModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsPassModalOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-sm glass p-8 rounded-[2.5rem] border-white/10 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Segurança</h3>
              <button onClick={() => setIsPassModalOpen(false)} className="p-2 bg-slate-100 dark:bg-white/5 rounded-full"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handlePassChange} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Senha Atual</label>
                <input
                  type="password"
                  value={oldPass}
                  onChange={(e) => setOldPass(e.target.value)}
                  className="w-full mt-1.5 px-4 py-3 bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  placeholder="••••"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nova Senha</label>
                <input
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="w-full mt-1.5 px-4 py-3 bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  placeholder="Mín. 4 caracteres"
                />
              </div>

              {passError && <p className="text-rose-500 text-[10px] font-bold uppercase tracking-wider text-center">Senha atual incorreta</p>}
              {passSuccess && <p className="text-emerald-500 text-[10px] font-bold uppercase tracking-wider text-center">Senha alterada com sucesso!</p>}

              <button
                type="submit"
                className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-purple-500/20 active:scale-[0.98] transition-all pt-4"
              >
                Guardar Nova Senha
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default AppLayout;
