import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ReactDOMServer from 'react-dom/server';
import { ReceiptTemplate } from '../components/POS/ReceiptTemplate';
import { 
  Ticket, 
  Search, 
  Printer, 
  Calendar, 
  User, 
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { useData } from '../contexts/DataContext';

export default function ValesTroca() {
  const { data } = useData();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'used' | 'expired'>('all');

  const handleViewOrder = (orderId: string) => {
    navigate(`/encomendas?search=${orderId}`);
  };

  const handlePrint = (voucher: any) => {
    const originalOrder = data.orders.find(o => o.id_venda === voucher.order_id);
    
    // Prepare a minimal order object for the receipt if original not found
    // though ideally it should always be there if order_id exists
    const orderForReceipt = originalOrder || {
      id_venda: voucher.order_id || 'N/A',
      data_venda: voucher.created_at || new Date().toISOString(),
      nome_cliente: voucher.customer_name,
      items: [],
      total: voucher.value,
      forma_de_pagamento: 'Vale de Troca'
    };

    const receiptHtml = ReactDOMServer.renderToString(
      <ReceiptTemplate 
        order={orderForReceipt} 
        settings={data.appSettings}
        type="exchange"
        exchangeCode={voucher.number}
      />
    );

    const printWindow = document.createElement('iframe');
    printWindow.style.position = 'absolute';
    printWindow.style.top = '-1000px';
    document.body.appendChild(printWindow);
    
    const doc = printWindow.contentDocument || printWindow.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <html>
          <head>
            <style>
              @media print {
                body { margin: 0; }
                .receipt-container { width: 100% !important; box-shadow: none !important; }
              }
              body { font-family: monospace; }
            </style>
          </head>
          <body>
            ${receiptHtml}
          </body>
        </html>
      `);
      doc.close();
      
      setTimeout(() => {
        printWindow.contentWindow?.focus();
        printWindow.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(printWindow);
        }, 1000);
      }, 500);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('pt-PT');
  };

  const getStatus = (voucher: any) => {
    if (voucher.status === 'used') return 'used';
    if (new Date(voucher.valid_until) < new Date()) return 'expired';
    return 'active';
  };

  const filteredVouchers = useMemo(() => {
    const vouchers = data.vouchers || [];
    return vouchers.filter(v => {
      const status = getStatus(v);
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      const matchesSearch = 
        v.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.customer_name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [data.vouchers, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const vouchers = data.vouchers || [];
    return {
      total: { count: vouchers.length, value: vouchers.reduce((acc: number, v: any) => acc + Number(v.value || 0), 0) },
      active: { 
        count: vouchers.filter(v => getStatus(v) === 'active').length, 
        value: vouchers.filter(v => getStatus(v) === 'active').reduce((acc: number, v: any) => acc + Number(v.value || 0), 0) 
      },
      used: { 
        count: vouchers.filter(v => getStatus(v) === 'used').length, 
        value: vouchers.filter(v => getStatus(v) === 'used').reduce((acc: number, v: any) => acc + Number(v.value || 0), 0) 
      },
      expired: { 
        count: vouchers.filter(v => getStatus(v) === 'expired').length, 
        value: vouchers.filter(v => getStatus(v) === 'expired').reduce((acc: number, v: any) => acc + Number(v.value || 0), 0) 
      }
    };
  }, [data.vouchers]);

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Emitidos', amount: stats.total.count, value: stats.total.value, icon: Ticket, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { label: 'Vales Ativos', amount: stats.active.count, value: stats.active.value, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Vales Usados', amount: stats.used.count, value: stats.used.value, icon: ArrowRight, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Vales Expirados', amount: stats.expired.count, value: stats.expired.value, icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-white/5 p-4 rounded-3xl border border-slate-100 dark:border-white/10 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className={`${stat.bg} p-2 rounded-2xl`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className="flex flex-col">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 leading-none mb-1">
                  {stat.label}
                </p>
                <p className="text-xl font-black text-slate-900 dark:text-white leading-none mb-1">
                  {stat.amount}
                </p>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  {formatCurrency(stat.value)}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-white/5 p-4 rounded-3xl border border-slate-100 dark:border-white/10">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Procurar por nº de vale ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-white/5 border-transparent dark:border-white/10 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500/20"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'active', label: 'Ativos' },
            { id: 'used', label: 'Usados' },
            { id: 'expired', label: 'Expirados' }
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setStatusFilter(filter.id as any)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                statusFilter === filter.id
                  ? 'bg-[#8c25f4] text-white shadow-lg shadow-purple-500/20'
                  : 'bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="bg-white dark:bg-white/5 rounded-[2.5rem] border border-slate-100 dark:border-white/10 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5">
                <th className="px-6 py-5 text-left text-[9px] font-black uppercase tracking-widest text-slate-400">Nº do Vale</th>
                <th className="px-6 py-5 text-left text-[9px] font-black uppercase tracking-widest text-slate-400">Valor</th>
                <th className="px-6 py-5 text-left text-[9px] font-black uppercase tracking-widest text-slate-400">Cliente</th>
                <th className="px-6 py-5 text-left text-[9px] font-black uppercase tracking-widest text-slate-400">Vendedora</th>
                <th className="px-6 py-5 text-left text-[9px] font-black uppercase tracking-widest text-slate-400">Expira em</th>
                <th className="px-6 py-5 text-center text-[9px] font-black uppercase tracking-widest text-slate-400">Estado</th>
                <th className="px-6 py-5 text-right text-[9px] font-black uppercase tracking-widest text-slate-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              <AnimatePresence mode="popLayout">
                {filteredVouchers.map((voucher) => {
                  const status = getStatus(voucher);
                  return (
                    <motion.tr
                      key={voucher.number}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="group hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Ticket className="w-3 h-3 text-purple-500" />
                          <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{voucher.number}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-black text-purple-600 dark:text-purple-400">{formatCurrency(voucher.value)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{voucher.customer_name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-slate-400" />
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-300 capitalize">{voucher.issued_by || 'Admin'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{formatDate(voucher.valid_until)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          {status === 'active' && (
                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
                              Ativo
                            </span>
                          )}
                          {status === 'used' && (
                            <div className="flex flex-col items-center">
                              <span className="px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-500/20">
                                Usado
                              </span>
                              {voucher.used_at && (
                                <span className="text-[8px] text-slate-400 mt-1">{formatDate(voucher.used_at)}</span>
                              )}
                            </div>
                          )}
                          {status === 'expired' && (
                            <span className="px-3 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-rose-500/20">
                              Expirado
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            title="Imprimir"
                            onClick={() => handlePrint(voucher)}
                            className="p-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors text-slate-500 dark:text-slate-400"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {voucher.order_id && (
                            <button 
                              title="Ver Encomenda Original"
                              onClick={() => handleViewOrder(voucher.order_id)}
                              className="p-2 bg-purple-100/50 dark:bg-purple-500/10 hover:bg-purple-100 dark:hover:bg-purple-500/20 rounded-xl transition-colors text-purple-600 dark:text-purple-400"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        
        {filteredVouchers.length === 0 && (
          <div className="p-20 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
              <Ticket className="w-10 h-10 text-slate-200 dark:text-slate-800" />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1 tracking-tight">Nenhum vale encontrado</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
              Altere os filtros ou adicione uma nova troca para gerar um vale de troca.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
