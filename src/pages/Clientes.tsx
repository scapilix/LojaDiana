import { useMemo } from 'react';
import { Users, TrendingUp, Award, MapPin, Filter, X } from 'lucide-react';
import { useDashboardData } from '../hooks/useDashboardData';
import { useFilters } from '../contexts/FilterContext';
import { KpiCard } from '../components/KpiCard';
import { TopClientes } from '../components/TopClientes';
import { ProdutosPorLocalidade } from '../components/ProdutosPorLocalidade';
import { SmartDateFilter } from '../components/SmartDateFilter';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';

function Clientes() {
  const { filters, setFilters } = useFilters();

  const {
    totalRevenue,
    orderCount,
    topCustomers,
    customerSalesCount,
    salesByLocation,
    isFiltered,
    availableFilters,
    filterCounts
  } = useDashboardData(filters);

  const formatCurrency = (val: number) =>
    val?.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }) || '0,00 €';

  // Customer analytics calculations
  const totalCustomers = Object.keys(customerSalesCount).length;
  const repeatCustomers = Object.values(customerSalesCount).filter(count => count > 1).length;
  const repeatRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;
  const avgCustomerValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

  // Customer segmentation by purchase frequency
  const customerSegmentation = useMemo(() => {
    const segments = {
      'Uma vez': 0,
      'Ocasional (2-3)': 0,
      'Frequente (4-5)': 0,
      'VIP (6+)': 0
    };

    Object.values(customerSalesCount).forEach(count => {
      if (count === 1) segments['Uma vez']++;
      else if (count <= 3) segments['Ocasional (2-3)']++;
      else if (count <= 5) segments['Frequente (4-5)']++;
      else segments['VIP (6+)']++;
    });

    return Object.entries(segments).map(([name, value]) => ({
      name,
      value,
      percentage: totalCustomers > 0 ? (value / totalCustomers) * 100 : 0
    }));
  }, [customerSalesCount, totalCustomers]);

  const segmentColors = ['bg-slate-400', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500'];
  const segmentCardStyles = [
    'bg-slate-50 border-slate-200',
    'bg-blue-50 border-blue-200',
    'bg-purple-50 border-purple-200',
    'bg-amber-50 border-amber-200',
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Análise de Clientes"
        subtitle="Insights e segmentação da base de dados"
        filters={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[hsl(38_25%_97%)] border border-[hsl(35_18%_88%)] rounded-[10px] px-2.5 py-1.5">
              <Filter className="w-3 h-3 text-[hsl(30_8%_60%)]" />
              <span className="text-[10px] font-semibold text-[hsl(30_8%_55%)] uppercase tracking-wide">Filtros</span>
            </div>
            <SmartDateFilter
              filters={filters}
              setFilters={setFilters}
              availableFilters={availableFilters as any}
              counts={filterCounts}
            />
            {isFiltered && (
              <button
                onClick={() => setFilters(prev => ({ ...prev, year: '', month: '', days: [] }))}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded-[10px] text-[10px] font-semibold uppercase tracking-wide transition-all"
              >
                <X className="w-3 h-3" />
                Limpar
              </button>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-5 bg-[hsl(38_25%_96%)] space-y-4">
        {/* Customer KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Total de Clientes"
            value={totalCustomers}
            icon={Users}
            trend={`${orderCount} compras`}
          />
          <KpiCard
            label="Taxa de Retorno"
            value={`${repeatRate.toFixed(1)}%`}
            icon={TrendingUp}
            trend={`${repeatCustomers} clientes recorrentes`}
          />
          <KpiCard
            label="Valor Médio/Cliente"
            value={formatCurrency(avgCustomerValue)}
            icon={Award}
            trend="Customer Lifetime Value"
          />
          <KpiCard
            label="Localidades"
            value={salesByLocation.length}
            icon={MapPin}
            trend="Áreas de atuação"
          />
        </div>

        {/* Customer Segmentation */}
        <div className="bg-white rounded-[14px] border border-[hsl(35_18%_90%)] shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[hsl(35_18%_92%)]">
            <h2 className="text-[13px] font-bold text-[hsl(20_15%_8%)]">Segmentação de Clientes</h2>
            <p className="text-[11px] text-[hsl(30_8%_55%)] mt-0.5">Distribuição por frequência de compra</p>
          </div>

          {totalCustomers === 0 ? (
            <EmptyState
              title="Sem dados de segmentação"
              description="Os dados aparecem automaticamente com as encomendas importadas"
            />
          ) : (
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {customerSegmentation.map((segment, index) => (
                <div key={segment.name} className={`p-5 rounded-[10px] border-2 transition-all duration-300 hover:scale-[1.02] ${segmentCardStyles[index]}`}>
                  <div className="text-center">
                    <div className="text-4xl font-black font-mono mb-2">{segment.value}</div>
                    <div className="text-[12px] font-bold text-[hsl(20_15%_8%)] mb-1">{segment.name}</div>
                    <div className="text-[10px] font-semibold text-[hsl(30_8%_55%)]">{segment.percentage.toFixed(1)}%</div>
                  </div>
                  <div className="mt-4 h-1.5 bg-white/70 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${segmentColors[index]} rounded-full`}
                      style={{ width: `${segment.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Customers Leaderboard */}
        <div className="bg-white rounded-[14px] border border-[hsl(35_18%_90%)] shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[hsl(35_18%_92%)]">
            <h2 className="text-[13px] font-bold text-[hsl(20_15%_8%)]">Top Clientes</h2>
            <p className="text-[11px] text-[hsl(30_8%_55%)] mt-0.5">Clientes mais valiosos por número de compras</p>
          </div>

          {topCustomers.length === 0 ? (
            <EmptyState
              title="Sem clientes"
              description="Os top clientes aparecem automaticamente com as encomendas importadas"
            />
          ) : (
            <div className="p-5">
              <TopClientes customers={topCustomers} />
            </div>
          )}
        </div>

        {/* Geographic Distribution */}
        <div className="bg-white rounded-[14px] border border-[hsl(35_18%_90%)] shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[hsl(35_18%_92%)]">
            <h2 className="text-[13px] font-bold text-[hsl(20_15%_8%)]">Distribuição Geográfica</h2>
            <p className="text-[11px] text-[hsl(30_8%_55%)] mt-0.5">Vendas por localidade</p>
          </div>

          {salesByLocation.length === 0 ? (
            <EmptyState
              title="Sem dados geográficos"
              description="Os dados de localidade aparecem automaticamente com as encomendas importadas"
            />
          ) : (
            <div className="p-5">
              <ProdutosPorLocalidade locations={salesByLocation} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Clientes;
