import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link } from 'react-router-dom';
import { KpiCard }    from '../components/ui/KpiCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState }  from '../components/ui/EmptyState';
import { PageHeader }  from '../components/ui/PageHeader';
import { SmartDateFilter } from '../components/SmartDateFilter';
import { useFilters } from '../contexts/FilterContext';
import { useDashboardData } from '../hooks/useDashboardData';
import { useData } from '../contexts/DataContext';
import { ShoppingBag, ChevronRight } from 'lucide-react';

function Overview() {
  const { filters, setFilters } = useFilters();

  const {
    totalRevenue,
    orderCount,
    avgTicket,
    exchangeCount,
    exchangeRate: _exchangeRate,
    topProducts,
    salesByDate,
    filteredOrders,
    isFiltered: _isFiltered,
    availableFilters,
    filterCounts
  } = useDashboardData(filters) as any;

  const formatCurrency = (value: number) =>
    value?.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }) || '0,00 €';

  const dayChartData = useMemo(() =>
    (salesByDate || []).map((item: any) => ({
      name: new Date(item.date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }),
      valor: item.revenue || 0,
      pedidos: item.count || 0,
    })),
    [salesByDate]
  );

  const recentOrders = useMemo(() => (filteredOrders || []).slice(0, 6), [filteredOrders]);

  const { data } = useData();
  const pendingOnlineOrders = useMemo(
    () => (data.onlineOrders || []).filter((o: any) => o.status === 'Aguarda pagamento'),
    [data.onlineOrders]
  );

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Dashboard"
        subtitle={`· ${new Date().toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}`}
        filters={
          <SmartDateFilter
            filters={filters}
            setFilters={setFilters}
            availableFilters={availableFilters as any}
            counts={filterCounts}
          />
        }
      />

      <div className="flex-1 overflow-y-auto p-5 bg-[hsl(38_25%_96%)] space-y-4">

        {/* Online orders alert */}
        {pendingOnlineOrders.length > 0 && (
          <div className="flex items-center justify-between bg-rose-50 border border-rose-200 rounded-2xl px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-rose-800">
                  {pendingOnlineOrders.length} encomenda{pendingOnlineOrders.length > 1 ? 's' : ''} online a aguardar pagamento
                </p>
                <p className="text-xs text-rose-600">Envia o link de pagamento via WhatsApp</p>
              </div>
            </div>
            <Link
              to="/app/encomendas"
              className="flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-100 hover:bg-rose-200 px-3 py-2 rounded-xl transition-colors"
            >
              Ver <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard accent="rose"  label="Receita Total"  value={formatCurrency(totalRevenue)} />
          <KpiCard accent="green" label="Encomendas"     value={orderCount} />
          <KpiCard accent="blue"  label="Ticket Médio"   value={formatCurrency(avgTicket)} />
          <KpiCard accent="amber" label="Trocas"         value={exchangeCount} />
        </div>

        {/* Chart + Top Produtos */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4">

          {/* Gráfico de vendas */}
          <div className="bg-white rounded-[14px] border border-[hsl(35_18%_90%)] shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(35_18%_92%)]">
              <div>
                <h2 className="text-[13px] font-bold text-[hsl(20_15%_8%)]">Vendas por dia</h2>
                <p className="text-[11px] text-[hsl(30_8%_55%)] mt-0.5">Receita diária no período selecionado</p>
              </div>
              <span className="text-[11px] font-semibold text-[hsl(340_72%_45%)] bg-[hsl(340_72%_97%)] px-2.5 py-1 rounded-full">
                {dayChartData.length} dias
              </span>
            </div>
            <div className="px-2 pt-4 pb-2 h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dayChartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"  stopColor="hsl(340,72%,50%)" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="hsl(340,72%,50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="hsl(35,18%,93%)" strokeDasharray="3 0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: 'hsl(30,8%,58%)', fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    tickMargin={8}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'hsl(30,8%,58%)', fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
                    width={36}
                    tickMargin={4}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'white',
                      border: '1px solid hsl(35,18%,88%)',
                      borderRadius: 10,
                      fontSize: 12,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                      padding: '8px 12px',
                    }}
                    labelStyle={{ color: 'hsl(20,15%,30%)', fontWeight: 700, marginBottom: 2 }}
                    formatter={(value: number) => [`${value.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €`, 'Receita']}
                    cursor={{ stroke: 'hsl(340,72%,45%)', strokeWidth: 1, strokeDasharray: '4 2' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="valor"
                    stroke="hsl(340,72%,45%)"
                    strokeWidth={2.5}
                    fill="url(#colorRevenue)"
                    dot={false}
                    activeDot={{ r: 5, fill: 'hsl(340,72%,45%)', stroke: 'white', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Produtos */}
          <div className="bg-white rounded-[14px] border border-[hsl(35_18%_90%)] shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[hsl(35_18%_92%)]">
              <h2 className="text-[13px] font-bold text-[hsl(20_15%_8%)]">Top Produtos</h2>
            </div>
            <div className="p-4 space-y-3">
              {(topProducts || []).slice(0, 5).map((p: any, i: number) => (
                <div key={p.ref ?? i} className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-[6px] flex items-center justify-center text-[9px] font-black flex-shrink-0 ${i === 0 ? 'bg-[#fef3c7] text-[#92640a]' : 'bg-[hsl(38_25%_93%)] text-[hsl(30_8%_55%)]'}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-[hsl(20_15%_8%)] truncate">{p.name ?? p.ref}</p>
                    <div className="mt-1 h-1 rounded-full bg-[hsl(35_18%_92%)]">
                      <div className="h-full rounded-full bg-[hsl(340_72%_45%)]"
                        style={{ width: `${topProducts[0]?.totalRevenue || topProducts[0]?.revenue ? ((p.totalRevenue || p.revenue || 0) / (topProducts[0].totalRevenue || topProducts[0].revenue)) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-[hsl(20_15%_8%)] flex-shrink-0">{formatCurrency(p.totalRevenue || p.revenue || 0)}</span>
                </div>
              ))}
              {(!topProducts || topProducts.length === 0) && (
                <EmptyState title="Sem produtos" description="Importe encomendas para ver o ranking" />
              )}
            </div>
          </div>
        </div>

        {/* Últimas Encomendas */}
        <div className="bg-white rounded-[14px] border border-[hsl(35_18%_90%)] shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[hsl(35_18%_92%)]">
            <h2 className="text-[13px] font-bold text-[hsl(20_15%_8%)]">Últimas Encomendas</h2>
            <Link to="/encomendas" className="text-[11px] font-semibold text-[hsl(340_72%_45%)] hover:underline">
              Ver todas →
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <EmptyState title="Sem encomendas" description="As encomendas aparecerão aqui após importação" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[hsl(35_18%_92%)]">
                  {['Ref', 'Cliente', 'Produto', 'Valor', 'Estado'].map(h => (
                    <th key={h} className="text-left text-[9px] font-bold text-[hsl(30_8%_55%)] uppercase tracking-[0.07em] px-5 py-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order: any, idx: number) => (
                  <tr key={order.id ?? idx} className="border-b border-[hsl(35_18%_96%)] hover:bg-[hsl(38_25%_98%)] transition-colors">
                    <td className="px-5 py-2.5 text-[11px] font-bold text-[hsl(340_72%_45%)]">#{order.ref ?? order.id}</td>
                    <td className="px-5 py-2.5 text-[11px] font-semibold text-[hsl(20_15%_8%)]">{order.customer ?? order.nome_cliente}</td>
                    <td className="px-5 py-2.5 text-[11px] text-[hsl(30_8%_45%)] max-w-[180px] truncate">{order.product ?? order.nome_artigo}</td>
                    <td className="px-5 py-2.5 text-[12px] font-bold text-[hsl(20_15%_8%)]">{formatCurrency(Number(order.value ?? order.pvp ?? 0))}</td>
                    <td className="px-5 py-2.5"><StatusBadge status={order.status ?? order.estado ?? 'Pendente'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}

export default Overview;
