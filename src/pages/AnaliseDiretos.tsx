import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  ShoppingCart, 
  CreditCard, 
  Package, 
  TrendingUp, 
  Users,
  Calendar,
  Star
} from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useDiretosData } from '../hooks/useDiretosData';
import { KpiCard } from '../components/KpiCard';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);


export default function AnaliseDiretos() {
  const { 
    totalRevenue, 
    orderCount, 
    avgTicket, 
    topProducts, 
    topCustomers, 
    sessions,
    bestLive 
  } = useDiretosData();

  const chartData = useMemo(() => 
    sessions.slice(0, 10).reverse().map(s => ({
      name: s.name.replace('Live ', ''),
      revenue: s.revenue,
      orders: s.orders
    })), [sessions]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-10"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-950 dark:text-white tracking-tighter uppercase flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-rose-500" />
            Análise de Diretos
          </h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">
            Performance consolidada das Live Sessions
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard 
          label="Faturação Total" 
          value={formatCurrency(totalRevenue)} 
          icon={DollarSign} 
          accent="rose"
        />
        <KpiCard 
          label="Volume de Vendas" 
          value={orderCount} 
          icon={ShoppingCart} 
          accent="rose"
        />
        <KpiCard 
          label="Ticket Médio" 
          value={formatCurrency(avgTicket)} 
          icon={CreditCard} 
          accent="rose"
        />
        {bestLive && (
          <KpiCard 
            label="Melhor Live" 
            value={formatCurrency(bestLive.revenue)} 
            sub={bestLive.name}
            icon={Star} 
            accent="rose"
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/10 p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Performance por Sessão</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Evolução de faturação nas últimas lives</p>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="roseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
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
                    borderRadius: '16px',
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
                  }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#f43f5e" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#roseGradient)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/10 p-8 shadow-2xl flex flex-col">
          <div className="mb-6">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Package className="w-4 h-4 text-rose-500" />
              Top Artigos (Lives)
            </h2>
          </div>
          <div className="flex-1 space-y-5">
            {topProducts.slice(0, 5).map((prod, i) => (
              <div key={prod.ref} className="flex items-center justify-between group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center font-black text-[10px] text-rose-500 shrink-0 border border-slate-100 dark:border-white/10">
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase truncate">{prod.name}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{prod.quantity} Vendidos</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] font-black text-slate-900 dark:text-white">{formatCurrency(prod.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Ranking Table */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/10 p-8 shadow-2xl overflow-hidden">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-rose-500" />
            Ranking de Live Sessions
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-white/5">
                  <th className="pb-4">Sessão</th>
                  <th className="pb-4">Vendas</th>
                  <th className="pb-4 text-right">Faturação</th>
                  <th className="pb-4 text-right">Efeito</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-white/[0.02]">
                {sessions.slice(0, 10).map((session) => (
                  <tr key={session.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="py-4">
                      <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase truncate max-w-[200px]">
                        {session.name}
                      </p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase">
                        {new Date(session.date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long' })}
                      </p>
                    </td>
                    <td className="py-4">
                      <span className="px-3 py-1 bg-rose-50 dark:bg-rose-500/10 text-rose-500 text-[10px] font-black rounded-lg">
                        {session.orders} Pedidos
                      </span>
                    </td>
                    <td className="py-4 text-right text-[11px] font-black text-slate-900 dark:text-white">
                      {formatCurrency(session.revenue)}
                    </td>
                    <td className="py-4 text-right">
                      {session.revenue > 500 ? (
                        <Star className="inline-block w-3.5 h-3.5 text-amber-500" />
                      ) : (
                        <TrendingUp className="inline-block w-3.5 h-3.5 text-emerald-500" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Live Customers */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/10 p-8 shadow-2xl">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Users className="w-4 h-4 text-rose-500" />
            Top Clientes das Lives
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topCustomers.slice(0, 4).map((customer, i) => (
              <div key={customer.instagram || i} className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-rose-500/20 transition-all group">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center font-black text-[10px]">
                    {customer.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase truncate">{customer.name}</p>
                    <p className="text-[8px] font-bold text-rose-500 uppercase tracking-tighter">@{customer.instagram}</p>
                  </div>
                </div>
                <div className="flex justify-between items-end mt-4">
                  <div>
                    <p className="text-[8px] font-bold text-slate-400 uppercase">Faturação</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(customer.revenue)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-bold text-slate-400 uppercase">Vendas</p>
                    <p className="text-sm font-black text-rose-500">{customer.orders}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
