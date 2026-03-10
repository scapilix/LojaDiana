import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign, TrendingUp, ShoppingCart, CreditCard,
  RotateCcw, AlertTriangle, Filter, X, ArrowUpRight, ArrowDownRight,
  Package
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SmartDateFilter } from '../components/SmartDateFilter';
import { useDashboardData } from '../hooks/useDashboardData';
import { useFilters } from '../contexts/FilterContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

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
    <div className="bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.05] rounded-xl p-4 flex flex-col gap-3 hover:border-slate-200 dark:hover:border-white/10 transition-colors">
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
    </div>
  );
}

function Overview() {
  const { filters, setFilters } = useFilters();

  const {
    totalRevenue,
    totalProfit,
    orderCount,
    avgTicket,
    topCustomers,
    topProducts,
    salesByDate,
    salesByDayOfWeek,
    filteredOrders,
    isFiltered,
    availableFilters,
    filterCounts
  } = useDashboardData(filters) as any;

  const formatCurrency = (val: number) =>
    val?.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }) || '0,00 €';

  // Spark data for KPI cards (last 7 days from salesByDate)
  const sparkRevenue = useMemo(() =>
    (salesByDate || []).slice(-7).map((d: any) => ({ value: d.revenue || d.value || 0 })),
    [salesByDate]
  );
  const sparkOrders = useMemo(() =>
    (salesByDate || []).slice(-7).map((d: any) => ({ value: d.orders || d.count || 0 })),
    [salesByDate]
  );

  // Daily bar chart data
  const dayChartData = useMemo(() =>
    (salesByDayOfWeek || []).map((d: any) => ({
      name: (d.day || d.name || '').substring(0, 3),
      valor: d.revenue || d.value || 0,
      pedidos: d.orders || d.count || 0,
    })),
    [salesByDayOfWeek]
  );

  // Size donut chart - derive from order items
  const sizeData = useMemo(() => {
    const sizes: Record<string, number> = { 'P': 0, 'M': 0, 'G': 0, 'GG': 0, 'Outros': 0 };
    (filteredOrders || []).forEach((order: any) => {
      (order.items || []).forEach((item: any) => {
        const s = (item.tamanho || item.size || '').toUpperCase();
        if (s === 'P') sizes['P']++;
        else if (s === 'M') sizes['M']++;
        else if (s === 'G') sizes['G']++;
        else if (s === 'GG') sizes['GG']++;
        else sizes['Outros']++;
      });
    });
    return Object.entries(sizes).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [filteredOrders]);

  const DONUT_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#e0e7ff'];

  // Recent orders
  const recentOrders = useMemo(() =>
    (filteredOrders || []).slice(0, 8),
    [filteredOrders]
  );

  // Fashion metrics
  const returnRate = 0; // placeholder — no return data yet
  const outOfStockItems = 0; // placeholder

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
      <div className="relative z-50 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.05] rounded-xl px-3 py-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filtros</span>
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
          >
            <X className="w-3 h-3" />
            Limpar
          </button>
        )}
      </div>

      {/* KPI Grid — 6 columns */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          label="Receita"
          value={formatCurrency(totalRevenue)}
          trend={12.5}
          icon={DollarSign}
          sparkData={sparkRevenue}
          sparkColor="#6366f1"
          accent="indigo"
        />
        <KpiCard
          label="Lucro"
          value={formatCurrency(totalProfit)}
          trend={8.2}
          icon={TrendingUp}
          sparkData={sparkRevenue.map((d: any) => ({ value: d.value * 0.4 }))}
          sparkColor="#10b981"
          accent="emerald"
        />
        <KpiCard
          label="Pedidos"
          value={orderCount}
          trend={5.1}
          icon={ShoppingCart}
          sparkData={sparkOrders}
          sparkColor="#8b5cf6"
          accent="violet"
        />
        <KpiCard
          label="Ticket Médio"
          value={formatCurrency(avgTicket)}
          sub="Meta: > 25€"
          icon={CreditCard}
          sparkColor="#f59e0b"
          accent="amber"
        />
        <KpiCard
          label="Taxa Devolução"
          value={`${returnRate.toFixed(1)}%`}
          sub="Ideal: < 3%"
          trend={returnRate > 3 ? returnRate : undefined}
          icon={RotateCcw}
          accent="rose"
        />
        <KpiCard
          label="Sem Estoque"
          value={outOfStockItems}
          sub="Itens em falta"
          icon={AlertTriangle}
          accent="slate"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Bar chart — Vendas por Dia */}
        <div className="lg:col-span-2 bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.05] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-white">Vendas por Dia da Semana</p>
              <p className="text-[10px] text-slate-400">Volume de faturamento por dia</p>
            </div>
          </div>
          {dayChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={dayChartData} barSize={20} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 8, fontSize: 11 }}
                  cursor={{ fill: 'rgba(99,102,241,0.05)' }}
                  formatter={(v: any) => [formatCurrency(v), 'Faturamento']}
                />
                <Bar dataKey="valor" radius={[3, 3, 0, 0]}>
                  {dayChartData.map((_: any, idx: number) => (
                    <Cell key={idx} fill={idx === dayChartData.reduce((mi: number, d: any, i: number, arr: any[]) => d.valor > arr[mi].valor ? i : mi, 0) ? '#6366f1' : '#e2e8f0'} className="dark:[&_*]:fill-white/10" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[120px] flex items-center justify-center text-xs text-slate-400">Sem dados</div>
          )}
        </div>

        {/* Donut — Vendas por Tamanho */}
        <div className="bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.05] rounded-xl p-4">
          <p className="text-xs font-bold text-slate-800 dark:text-white mb-0.5">Por Tamanho</p>
          <p className="text-[10px] text-slate-400 mb-3">Distribuição P / M / G</p>
          {sizeData.length > 0 ? (
            <div className="flex items-center gap-3">
              <ResponsiveContainer width={80} height={80}>
                <PieChart>
                  <Pie data={sizeData} cx="50%" cy="50%" innerRadius={24} outerRadius={38} dataKey="value" strokeWidth={0}>
                    {sizeData.map((_: any, i: number) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-1">
                {sizeData.map((d: any, i: number) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                    <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">{d.name} <span className="text-slate-400">{d.value}</span></span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-20 flex items-center justify-center text-[10px] text-slate-400">Sem dados de tamanho</div>
          )}
        </div>
      </div>

      {/* Bottom Grid: Last Orders + Top Products + Top Customers */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        {/* Recent Orders — condensed table */}
        <div className="xl:col-span-2 bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.05] rounded-xl overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100 dark:border-white/[0.05]">
            <p className="text-xs font-bold text-slate-800 dark:text-white">Últimos Pedidos</p>
            <Link to="/encomendas" className="text-[10px] font-semibold text-indigo-500 hover:text-indigo-600 transition-colors flex items-center gap-1">
              Ver todos <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          {recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/[0.05]">
                    <th className="px-4 py-2 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Produto</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Cliente</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total</th>
                    <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-white/[0.03]">
                  {recentOrders.map((order: any, i: number) => {
                    const firstItem = order.items?.[0];
                    const statusColors: Record<string, string> = {
                      'Entregue': 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
                      'Enviado': 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400',
                      'Pago': 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
                      'Pendente': 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400',
                    };
                    const status = order.status || 'Pendente';
                    return (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            {/* Product thumbnail avatar */}
                            {firstItem?.image_url ? (
                              <img src={firstItem.image_url} alt="" className="w-7 h-7 rounded-md object-cover flex-shrink-0 bg-slate-100" />
                            ) : (
                              <div className="w-7 h-7 rounded-md bg-slate-100 dark:bg-white/5 flex items-center justify-center flex-shrink-0">
                                <Package className="w-3 h-3 text-slate-400" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px] text-[11px]">
                                {firstItem?.designacao || 'N/A'}
                              </p>
                              <p className="text-[10px] text-slate-400">{order.id_venda || '#—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400 truncate max-w-[100px] text-[11px]">{order.nome_cliente || '—'}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-slate-800 dark:text-white text-[11px]">{formatCurrency(Number(order.pvp || 0))}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${statusColors[status] || statusColors['Pendente']}`}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">Nenhuma encomenda ainda</div>
          )}
        </div>

        {/* Right column: Top Products + Top Customers */}
        <div className="flex flex-col gap-3">
          {/* Top Products */}
          <div className="bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.05] rounded-xl overflow-hidden flex-1">
            <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100 dark:border-white/[0.05]">
              <p className="text-xs font-bold text-slate-800 dark:text-white">Top Produtos</p>
              <Link to="/produtos" className="text-[10px] text-indigo-500 hover:text-indigo-600 transition-colors font-semibold">Ver todos</Link>
            </div>
            <div className="p-3 space-y-1">
              {topProducts.slice(0, 5).length > 0 ? topProducts.slice(0, 5).map((product: any, i: number) => {
                const max = topProducts[0]?.totalRevenue || topProducts[0]?.revenue || 1;
                const val = product.totalRevenue || product.revenue || 0;
                return (
                  <div key={i} className="flex items-center gap-2 py-1">
                    <span className="w-4 text-[10px] font-bold text-slate-300 dark:text-slate-600 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">{product.ref || product.name}</p>
                      <div className="mt-0.5 h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${(val / max) * 100}%` }} />
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 flex-shrink-0">{formatCurrency(val)}</span>
                  </div>
                );
              }) : <p className="text-[10px] text-slate-400 text-center py-4">Sem dados</p>}
            </div>
          </div>

          {/* Top Customers */}
          <div className="bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.05] rounded-xl overflow-hidden flex-1">
            <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100 dark:border-white/[0.05]">
              <p className="text-xs font-bold text-slate-800 dark:text-white">Top Clientes</p>
              <Link to="/clientes" className="text-[10px] text-indigo-500 hover:text-indigo-600 transition-colors font-semibold">Ver todos</Link>
            </div>
            <div className="p-3 space-y-1">
              {topCustomers.slice(0, 5).length > 0 ? topCustomers.slice(0, 5).map((customer: any, i: number) => {
                const initials = (customer.name || '?').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                return (
                  <div key={i} className="flex items-center gap-2.5 py-1">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white text-[9px] font-black flex-shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">{customer.name}</p>
                      <p className="text-[10px] text-slate-400">{customer.orderCount || customer.orders || 0} pedidos</p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 flex-shrink-0">
                      {formatCurrency(customer.totalRevenue || customer.revenue || 0)}
                    </span>
                  </div>
                );
              }) : <p className="text-[10px] text-slate-400 text-center py-4">Sem dados</p>}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default Overview;
