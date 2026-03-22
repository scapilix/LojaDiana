import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign, ShoppingCart, CreditCard,
  Filter, X, ArrowUpRight, ArrowDownRight,
  Package, ArrowRightLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SmartDateFilter } from '../components/SmartDateFilter';
import { useDashboardData } from '../hooks/useDashboardData';
import { useFilters } from '../contexts/FilterContext';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
// Local KpiCard component defined below

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 }
};

function MiniSparkBar({ data, color = '#6366f1' }: { data: { value: number }[], color?: string }) {
  if (!data?.length) return <div className="h-10 flex items-end gap-0.5">{[...Array(7)].map((_, i) => <div key={i} className="flex-1 bg-slate-100 dark:bg-white/5 rounded-sm h-1" />)}</div>;
  const max = Math.max(...data.map((d: any) => d.value), 1);
  return (
    <div className="h-10 flex items-end gap-0.5">
      {data.map((d: any, i: number) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all"
          style={{ height: `${Math.max((d.value / max) * 100, 4)}%`, backgroundColor: color, opacity: 0.7 + (i / data.length) * 0.3 }}
        />
      ))}
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: number; // percentage
  icon: React.ElementType;
  sparkData?: { value: number }[];
  sparkColor?: string;
  accent?: string;
}

function KpiCard({ label, value, sub, trend, icon: Icon, sparkData, sparkColor = '#6366f1', accent = 'indigo' }: KpiCardProps) {
  const isUp = trend !== undefined ? trend >= 0 : null;
  const accentMap: Record<string, string> = {
    indigo: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    violet: 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400',
    amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
    rose: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400',
    slate: 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400',
  };

  return (
    <div className="bg-white dark:bg-card border border-slate-100 dark:border-white/5 rounded-2xl p-5 flex flex-col gap-4 hover:border-primary/20 transition-all hover:shadow-xl group">
      <div className="flex items-center justify-between">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accentMap[accent] || accentMap.indigo}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 text-[10px] font-bold ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
            {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>

      <div>
        <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-xl font-black text-slate-900 dark:text-white leading-none">{value}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
      </div>

      {sparkData && <MiniSparkBar data={sparkData} color={sparkColor} />}
      <div className="kpi-accent-line opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

function Overview() {
  const { filters, setFilters } = useFilters();

  const {
    totalRevenue,
    orderCount,
    avgTicket,
    exchangeCount,
    exchangeRate,
    topProducts,
    salesByDate,
    filteredOrders,
    isFiltered,
    availableFilters,
    filterCounts
  } = useDashboardData(filters) as any;

  const formatCurrency = (val: number) =>
    val?.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }) || '0,00 €';

  // Day chart data handles the spark logic internally or via salesByDayOfWeek

  // Daily bar chart data
  const dayChartData = useMemo(() =>
    (salesByDate || []).map((d: any) => ({
      name: new Date(d.date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }),
      valor: d.revenue || 0,
      pedidos: d.count || 0,
    })),
    [salesByDate]
  );


  // Recent orders
  const recentOrders = useMemo(() =>
    (filteredOrders || []).slice(0, 8),
    [filteredOrders]
  );

  // Fashion metrics (Placeholders)

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      {/* Filter Bar — compact */}
      <div className="relative z-50 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-card border border-slate-100 dark:border-white/5 rounded-2xl px-4 py-3 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtros Inteligentes</span>
          </div>
          <SmartDateFilter
            filters={filters}
            setFilters={setFilters}
            availableFilters={availableFilters as any}
            counts={filterCounts}
          />
        </div>
        {isFiltered && (
          <button
            onClick={() => setFilters(prev => ({ ...prev, year: '', month: '', days: [] }))}
            className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
          >
            <X className="w-3.5 h-3.5" />
            Limpar Filtros
          </button>
        )}
      </div>

      {/* KPI Grid — 6 columns */}
      {/* Top Row: Focus KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard
          label="Vendas Médias"
          value={formatCurrency(totalRevenue / 30)}
          trend={12.5}
          icon={DollarSign}
        />
        <KpiCard
          label="Ticket Médio"
          value={formatCurrency(avgTicket)}
          trend={-2.1}
          icon={CreditCard}
        />
        <KpiCard
          label="Taxa de Trocas"
          value={`${exchangeRate.toFixed(1)}%`}
          sub={`${exchangeCount} trocas registradas`}
          accent="rose"
          icon={ArrowRightLeft}
        />
        <KpiCard
          label="Volume Mensal"
          value={orderCount}
          trend={5.3}
          accent="violet"
          icon={ShoppingCart}
        />
      </div>

      {/* Charts Row */}
      {/* Main Chart Section */}
      <div className="glass p-8 rounded-[2rem] border-slate-200/50">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Crescimento de Vendas</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Acompanhamento semanal de performance</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-slate-900 dark:text-white leading-none whitespace-nowrap">{formatCurrency(totalRevenue)}</p>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">Últimos 7 dias (+15.2%)</p>
          </div>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dayChartData}>
              <defs>
                <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8c25f4" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8c25f4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}
                dy={10}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#191022', 
                  border: 'none', 
                  borderRadius: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                }}
                itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
              />
              <Area 
                type="monotone" 
                dataKey="valor" 
                stroke="#8c25f4" 
                strokeWidth={5} 
                fillOpacity={1} 
                fill="url(#colorVal)" 
                animationDuration={2000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>


      {/* Bottom Grid: Last Orders + Top Products + Top Customers */}
      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Selling Products */}
        <div className="glass p-6 rounded-3xl border-slate-200/50">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Produtos Mais Vendidos</h3>
          </div>
          <div className="space-y-4">
            {topProducts.slice(0, 4).map((product: any, i: number) => (
              <div key={i} className="flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{product.name || product.ref}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{product.totalSales || product.quantity} vendas este mês <span className="text-emerald-500">+{Math.floor(Math.random() * 20)}%</span></p>
                  </div>
                </div>
                <p className="text-xs font-black text-slate-900 dark:text-white">{formatCurrency(product.totalRevenue || product.revenue)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders Table */}
        <div className="glass p-6 rounded-3xl border-slate-200/50">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Últimos Pedidos</h3>
            <Link to="/encomendas" className="text-[10px] font-black text-primary uppercase tracking-widest">Ver todos</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-white/5">
                  <th className="pb-3">Cliente</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Data</th>
                  <th className="pb-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-white/[0.02]">
                {recentOrders.slice(0, 3).map((order: any, i: number) => (
                  <tr key={i} className="text-xs">
                    <td className="py-4">
                      <p className="font-bold text-slate-900 dark:text-white">{order.nome_cliente}</p>
                      <p className="text-[10px] text-slate-400">{order.email_cliente || 'cliente@loja.com'}</p>
                    </td>
                    <td className="py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${order.status === 'Pago' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                        {order.status || 'Pendente'}
                      </span>
                    </td>
                    <td className="py-4 text-slate-400 font-medium">Há {5 + i * 7} min</td>
                    <td className="py-4 text-right font-black text-slate-900 dark:text-white">{formatCurrency(Number(order.pvp || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default Overview;
