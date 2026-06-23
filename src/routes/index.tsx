import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppLayout from '../components/Layout/AppLayout';
import Overview from '../pages/Overview';
import Clientes from '../pages/Clientes';
import BaseClientes from '../pages/BaseClientes';
import BaseItems from '../pages/BaseItems';
import StockManager from '../pages/StockManager';
import Produtos from '../pages/Produtos';
import Rankings from '../pages/Rankings';
import Portes from '../pages/Portes';
import Faturas from '../pages/Faturas';
import Despesas from '../pages/Despesas';
import Emprestimos from '../pages/Emprestimos';
import Encomendas from '../pages/Encomendas';
import Diretos from '../pages/Diretos';
import Loja from '../pages/Loja';
import Settings from '../pages/Settings';
import POS from '../pages/POS';
import POSDiretos from '../pages/POSDiretos';
import AnaliseDiretos from '../pages/AnaliseDiretos';
import Personalizacoes from '../pages/Personalizacoes';
import ValesTroca from '../pages/ValesTroca';
import Login from '../pages/Login';
import Landing from '../pages/Landing';
import Register from '../pages/Register';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';

import { FilterProvider } from '../contexts/FilterContext';
import { DataProvider } from '../contexts/DataContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { POSProvider } from '../contexts/POSContext';
import rawData from '../data/data.json';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isInitialized } = useAuth();
  const location = useLocation();

  if (!isInitialized) return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(38_25%_96%)]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white text-lg font-bold animate-pulse"
          style={{ background: 'linear-gradient(135deg, hsl(340 72% 45%), hsl(340 72% 60%))', fontFamily: '"Playfair Display", serif' }}>
          D
        </div>
        <p className="text-sm text-muted-foreground">A carregar...</p>
      </div>
    </div>
  );

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <HashRouter>
      <AuthProvider>
        <DataProvider initialData={rawData as any}>
          <FilterProvider>
            <POSProvider>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/loja/:slug" element={<Loja />} />
                <Route path="/loja" element={<Loja />} />

                {/* Protected app — lives under /app/* */}
                <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route index element={<Overview />} />
                  <Route path="clientes" element={<Clientes />} />
                  <Route path="base-clientes" element={<BaseClientes />} />
                  <Route path="base-itens" element={<BaseItems />} />
                  <Route path="stock-manager" element={<StockManager />} />
                  <Route path="pos" element={<POS />} />
                  <Route path="pos-diretos" element={<POSDiretos />} />
                  <Route path="analise-diretos" element={<AnaliseDiretos />} />
                  <Route path="produtos" element={<Produtos />} />
                  <Route path="rankings" element={<Rankings />} />
                  <Route path="portes" element={<Portes />} />
                  <Route path="faturas" element={<Faturas />} />
                  <Route path="despesas" element={<Despesas />} />
                  <Route path="emprestimos" element={<Emprestimos />} />
                  <Route path="encomendas" element={<Encomendas />} />
                  <Route path="diretos" element={<Diretos />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="personalizacoes" element={<Personalizacoes />} />
                  <Route path="vales" element={<ValesTroca />} />
                  <Route path="*" element={<Navigate to="/app" replace />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </POSProvider>
          </FilterProvider>
        </DataProvider>
      </AuthProvider>
    </HashRouter>
  );
}

export default AppRoutes;
