import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Video, 
  CheckCircle2, 
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  ShoppingCart
} from 'lucide-react';
import { useData } from '../contexts/DataContext';

export default function Diretos() {
  const { data, updateSaleStatus } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  // Filter orders that are specifically from Live Sessions and are still pending
  const diretosOrders = useMemo(() => {
    return (data.orders || [])
      .filter(order => order.is_direto === true && order.status === 'Pendente Direto')
      .filter(order => {
        const search = searchTerm.toLowerCase();
        return (
          String(order.nome_cliente || '').toLowerCase().includes(search) ||
          String(order.id_venda || '').toLowerCase().includes(search) ||
          String(order.instagram || '').toLowerCase().includes(search)
        );
      })
      .sort((a, b) => new Date(b.data_venda).getTime() - new Date(a.data_venda).getTime());
  }, [data.orders, searchTerm]);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedOrders(newExpanded);
  };

  const handleConfirm = async (idVenda: string) => {
    if (confirm('Deseja confirmar esta venda do direto?')) {
      await updateSaleStatus(idVenda, 'Concluída');
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-xl font-black text-slate-950 dark:text-white tracking-tighter uppercase flex items-center gap-2">
            <Video className="w-6 h-6 text-indigo-500" />
            Vendas em Direto
          </h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">
            Gestão de pedidos capturados durante live sessions ({diretosOrders.length})
          </p>
        </div>

        <div className="flex-1 w-full md:w-auto max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cliente ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {diretosOrders.map((order) => (
            <motion.div
              key={order.id_venda}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-white/10 shadow-xl overflow-hidden group"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-50 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-full">
                      Live Order
                    </span>
                    <h3 className="font-black text-sm text-slate-900 dark:text-white uppercase truncate max-w-[180px]">
                      {order.nome_cliente || 'Cliente Avulso'}
                    </h3>
                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold">
                      <Clock className="w-3 h-3" />
                      {new Date(order.data_venda).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-slate-900 dark:text-white leading-none">
                      {formatCurrency(order.pvp)}
                    </div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                      {order.id_venda}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleConfirm(order.id_venda)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirmar Venda
                  </button>
                  <button
                    className="p-2 bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-rose-500 rounded-xl transition-all"
                    title="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Items Summary */}
              <div className="p-5">
                <div 
                  onClick={() => toggleExpand(order.id_venda)}
                  className="flex items-center justify-between cursor-pointer group/toggle"
                >
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-3.5 h-3.5 text-slate-400 group-hover/toggle:text-indigo-500 transition-colors" />
                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      {order.items?.length || 0} ITENS NO PEDIDO
                    </span>
                  </div>
                  {expandedOrders.has(order.id_venda) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>

                <AnimatePresence>
                  {expandedOrders.has(order.id_venda) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-4 space-y-3"
                    >
                      {order.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between gap-4 p-2 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center font-black text-[9px] text-slate-400 border border-slate-100 dark:border-white/5 shrink-0">
                              {item.ref || 'SV'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-black text-slate-900 dark:text-white truncate uppercase">
                                {item.designacao}
                              </p>
                              <p className="text-[8px] font-bold text-slate-400 uppercase">
                                Qtd: {item.quantidade} {item.size ? `• ${item.size}` : ''} {item.color ? `• ${item.color}` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="text-[10px] font-black text-slate-900 dark:text-white">
                            {formatCurrency(item.pvp)}
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {!expandedOrders.has(order.id_venda) && order.items?.length > 0 && (
                  <div className="mt-3 flex gap-1.5 overflow-hidden">
                    {order.items.slice(0, 3).map((item: any, i: number) => (
                      <div key={i} className="px-2 py-1 bg-slate-100 dark:bg-white/5 rounded-md text-[8px] font-bold text-slate-500 uppercase truncate">
                        {item.designacao}
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <div className="px-2 py-1 bg-slate-100 dark:bg-white/5 rounded-md text-[8px] font-bold text-slate-400">
                        +{order.items.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer info */}
              <div className="px-5 py-3 bg-slate-50/50 dark:bg-white/5 border-t border-slate-50 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Aguardando Confirmação</span>
                </div>
                {order.instagram && (
                   <span className="text-[9px] font-black text-pink-500 uppercase">@{order.instagram}</span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {diretosOrders.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400">
            <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
              <Video className="w-10 h-10 opacity-20" />
            </div>
            <p className="font-black text-sm uppercase tracking-widest">Nenhuma venda de direto pendente</p>
            <p className="text-[10px] font-bold uppercase mt-2 opacity-60">As vendas marcadas como "Direto" no POS aparecerão aqui</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
