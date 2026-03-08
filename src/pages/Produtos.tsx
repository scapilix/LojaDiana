import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Package, TrendingUp, BarChart3, DollarSign, Filter, X, Search, MessageCircle, Copy } from 'lucide-react';
import { useDashboardData } from '../hooks/useDashboardData';
import { useFilters } from '../contexts/FilterContext';
import { KpiCard } from '../components/KpiCard';
import { TopProdutos } from '../components/TopProdutos';
import { SmartDateFilter } from '../components/SmartDateFilter';
import { AnimatePresence } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

function Produtos() {
  const { filters, setFilters } = useFilters();
  const [searchTerm, setSearchTerm] = useState('');

  // Quote Modal State
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [selectedQuoteProduct, setSelectedQuoteProduct] = useState<any>(null);

  const {
    totalRevenue,
    orderCount,
    topProducts,
    isFiltered,
    availableFilters,
    filterCounts
  } = useDashboardData(filters);

  const formatCurrency = (val: number) =>
    val?.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }) || '0,00 €';

  // 1. Filter products by search term

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return topProducts;
    const term = searchTerm.toLowerCase();
    return topProducts.filter(p =>
      p.ref.toLowerCase().includes(term) ||
      (p.name && p.name.toLowerCase().includes(term))
    );
  }, [topProducts, searchTerm]);

  // 2. Derive metrics from filtered products
  const filteredRevenue = useMemo(() => {
    return filteredProducts.reduce((sum, p) => sum + p.revenue, 0);
  }, [filteredProducts]);

  const totalProductsSold = useMemo(() => {
    return filteredProducts.reduce((sum, product) => sum + product.quantity, 0);
  }, [filteredProducts]);

  const avgProductPrice = useMemo(() => {
    const totalQty = filteredProducts.reduce((sum, product) => sum + product.quantity, 0);
    return totalQty > 0 ? filteredRevenue / totalQty : 0;
  }, [filteredProducts, filteredRevenue]);

  const bestSeller = useMemo(() => {
    if (filteredProducts.length === 0) return 'N/A';
    return filteredProducts[0].ref;
  }, [filteredProducts]);

  // 3. Product performance matrix data
  const productMatrix = useMemo(() => {
    return filteredProducts.map(product => ({
      ref: product.ref,
      quantity: product.quantity,
      revenue: product.revenue,
      avgPrice: product.avgPrice
    }));
  }, [filteredProducts]);

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.4 }}
      className="space-y-12"
    >
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Análise de Produtos</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Monitorize a performance e tendências dos seus itens</p>
        </div>

        {/* Filter & Search Bar */}
        <div className="relative z-50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white shadow-sm dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-white/10 backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-500/10 rounded-2xl border border-purple-100 dark:border-purple-500/20">
              <Filter className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-black text-purple-700 dark:text-purple-300 uppercase tracking-widest leading-none">Smart Filters</span>
            </div>

            <SmartDateFilter
              filters={filters}
              setFilters={setFilters}
              availableFilters={availableFilters as any}
              counts={filterCounts}
            />

            {(isFiltered || searchTerm) && (
              <button
                onClick={() => {
                  setFilters(prev => ({ ...prev, year: '', month: '', days: [] }));
                  setSearchTerm('');
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 shrink-0"
              >
                <X className="w-3 h-3" />
                Limpar Tudo
              </button>
            )}
          </div>

          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
            <input
              type="text"
              placeholder="Pesquisar REF ou Nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl py-3 pl-11 pr-12 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-inner"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors"
                title="Limpar pesquisa"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Product KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <KpiCard
          label="Produtos Vendidos"
          value={totalProductsSold}
          icon={Package}
          trend={`${topProducts.length} SKUs ativos`}
          color="purple"
        />
        <KpiCard
          label="Faturamento Total"
          value={formatCurrency(filteredRevenue)}
          icon={DollarSign}
          trend={searchTerm ? `${filteredProducts.length} itens encontrados` : `${orderCount} transações`}
          color="green"
        />
        <KpiCard
          label="Preço Médio"
          value={formatCurrency(avgProductPrice)}
          icon={BarChart3}
          trend="Ticket médio/produto"
          color="purple"
        />
        <KpiCard
          label="Best Seller"
          value={bestSeller}
          icon={TrendingUp}
          trend="Produto mais vendido"
          color="orange"
        />
      </div>

      {/* Product Performance Matrix */}
      <div className="glass p-10 rounded-[2rem] border-purple-100 dark:border-purple-800/20">
        <div className="mb-8">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">Performance dos Produtos</h3>
          <p className="text-slate-800 dark:text-slate-200 text-sm mt-1 font-black">
            {searchTerm ? `Resultados para "${searchTerm}"` : 'Análise de quantidade vendida vs faturamento'}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-purple-200 dark:border-purple-800/30">
                <th className="text-left pb-4 px-4 text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Referência</th>
                <th className="text-right pb-4 px-4 text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Quantidade</th>
                <th className="text-right pb-4 px-4 text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Faturamento</th>
                <th className="text-right pb-4 px-4 text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Preço Médio</th>
                <th className="text-center pb-4 px-4 text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Performance</th>
                <th className="text-center pb-4 px-4 text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider w-10">Ação</th>
              </tr>
            </thead>
            <tbody>
              {productMatrix.map((product, index) => {
                const performanceScore = ((product.quantity / totalProductsSold) * 50) + ((product.revenue / totalRevenue) * 50);
                return (
                  <tr key={product.ref} className="border-b border-slate-100 dark:border-white/5 hover:bg-purple-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${index === 0 ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                            index === 1 ? 'bg-slate-100 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400' :
                              index === 2 ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400' :
                                'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400'
                          }`}>
                          {index + 1}
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-white">{product.ref}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-mono font-bold text-purple-600 dark:text-purple-400">{product.quantity}</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(product.revenue)}</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-mono text-slate-600 dark:text-slate-400">{formatCurrency(product.avgPrice)}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <div className="flex-1 max-w-[120px] h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                            style={{ width: `${Math.min(performanceScore, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 w-10 text-right">
                          {performanceScore.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => {
                          const fullProduct = filteredProducts.find(p => p.ref === product.ref);
                          setSelectedQuoteProduct(fullProduct);
                          setShowQuoteModal(true);
                        }}
                        className="p-2 hover:bg-purple-100 dark:hover:bg-purple-500/20 rounded-xl transition-colors text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100"
                        title="Gerar Orçamento / Pitch de Venda"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Products */}
      <div className="glass p-10 rounded-[2rem] border-purple-100 dark:border-purple-800/20">
        <div className="mb-8">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">Top Produtos</h3>
          <p className="text-slate-800 dark:text-slate-200 text-sm mt-1 font-black">
            {searchTerm ? `Top resultados para "${searchTerm}"` : 'Produtos mais vendidos por quantidade'}
          </p>
        </div>
        <TopProdutos products={filteredProducts} />
      </div>

      {/* Quote Generator Script Modal */}
      <AnimatePresence>
        {showQuoteModal && selectedQuoteProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQuoteModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Orçamento Premium</h3>
                  </div>
                  <button onClick={() => setShowQuoteModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-2xl border border-slate-200 dark:border-white/10 relative group">
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-medium font-serif leading-relaxed">
                    {`Olá! 👋 Recebi o seu interesse no produto ${selectedQuoteProduct.name || selectedQuoteProduct.ref}.\n\nPara que saiba, este é um dos nossos itens com maior saída atualmente (já foram mais de ${selectedQuoteProduct.quantity} unidades entregues).\n\nO valor dele é de apenas ${formatCurrency(selectedQuoteProduct.avgPrice)}.\n\nSe tiver alguma dúvida sobre tamanhos ou opções de envio, basta me responder por aqui. Se quiser garantir o seu antes que esgote o stock, posso registrar o pedido para você agora mesmo! 💜`}
                  </p>

                  <button
                    onClick={() => {
                      const text = `Olá! 👋 Recebi o seu interesse no produto ${selectedQuoteProduct.name || selectedQuoteProduct.ref}.\n\nPara que saiba, este é um dos nossos itens com maior saída atualmente (já foram mais de ${selectedQuoteProduct.quantity} unidades entregues).\n\nO valor dele é de apenas ${formatCurrency(selectedQuoteProduct.avgPrice)}.\n\nSe tiver alguma dúvida sobre tamanhos ou opções de envio, basta me responder por aqui. Se quiser garantir o seu antes que esgote o stock, posso registrar o pedido para você agora mesmo! 💜`;
                      navigator.clipboard.writeText(text);
                    }}
                    className="absolute top-4 right-4 p-2.5 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-white/10 rounded-xl text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 transition-all opacity-0 group-hover:opacity-100 hover:scale-105 active:scale-95"
                    title="Copiar mensagem"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center mt-4">
                  Mensagem otimizada para WhatsApp (Sales Automator)
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}

export default Produtos;
