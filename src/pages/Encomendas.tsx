import { useState, useMemo, useEffect } from 'react';
import ReactDOMServer from 'react-dom/server';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { ReceiptTemplate } from '../components/POS/ReceiptTemplate';
import {
  Search,
  ChevronDown,
  X,
  Package,
  MessageCircle,
  Star,
  Copy,
  Printer,
  FileText,
  Clock,
  Mail,
  Share2,
  RotateCcw,
  Check,
  AlertCircle,
  Key
} from 'lucide-react';
import { useDashboardData } from '../hooks/useDashboardData';
import { useFilters } from '../contexts/FilterContext';
import { useData } from '../contexts/DataContext';
import { SmartDateFilter } from '../components/SmartDateFilter';
import { supabase } from '../lib/supabase';
import { FilterChips } from '../components/ui/FilterChips';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';


export default function Encomendas() {
  const { filters, setFilters } = useFilters();
  const { data, updateSaleStatus, addExchange } = useData();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');

  // Handle search via query parameter (for "Ver Encomenda Original")
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchParam = params.get('search');
    if (searchParam) {
      setSearchTerm(searchParam);
    }
  }, [location.search]);
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());

  // Follow-up Modal State
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<any>(null);
  const [followUpData, setFollowUpData] = useState<{ type: 'delivery' | 'feedback', order: any } | null>(null);

  // Exchange States
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [selectedOrderForExchange, setSelectedOrderForExchange] = useState<any>(null);
  const [exchangeStep, setExchangeStep] = useState(1);
  const [exchangePIN, setExchangePIN] = useState('');
  const [exchangeType, setExchangeType] = useState<'online' | 'fisico' | null>(null);
  const [selectedItemsForExchange, setSelectedItemsForExchange] = useState<string[]>([]);
  const [returnToStock, setReturnToStock] = useState(true);
  const [exchangePurchaseDate, setExchangePurchaseDate] = useState('');
  const [exchangeDate, setExchangeDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateChangeReason, setDateChangeReason] = useState('');
  const [isValidatingPIN, setIsValidatingPIN] = useState(false);
  const [pinError, setPinError] = useState('');
  const [validatedUser, setValidatedUser] = useState<string | null>(null);
  const [generatedVoucher, setGeneratedVoucher] = useState<any>(null);
  const [isFinalizingExchange, setIsFinalizingExchange] = useState(false);

  // Online specific exchange fields
  const [exchangeOnlinePurchaseDate, setExchangeOnlinePurchaseDate] = useState('');
  const [exchangeOnlineCustomerArrivalDate, setExchangeOnlineCustomerArrivalDate] = useState('');
  const [exchangeOnlineInternalArrivalDate, setExchangeOnlineInternalArrivalDate] = useState('');
  const [reshippingFeePaid, setReshippingFeePaid] = useState<boolean | null>(null);
  
  // Cancellation Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedOrderForCancel, setSelectedOrderForCancel] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [customCancelReason, setCustomCancelReason] = useState('');
  const [cancelPIN, setCancelPIN] = useState('');
  const [isValidatingCancelPIN, setIsValidatingCancelPIN] = useState(false);
  const [cancelPinError, setCancelPinError] = useState('');

  const {
    filteredOrders,
    availableFilters,
    filterCounts
  } = useDashboardData(filters);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('pt-PT');
  };

  const formatMonthYear = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const formatted = date.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const formatWeekday = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const formatted = date.toLocaleDateString('pt-PT', { weekday: 'long' });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const validatePIN = async () => {
    setIsValidatingPIN(true);
    setPinError('');
    try {
      const { data: userData, error } = await supabase
        .from('loja_users')
        .select('username')
        .eq('pin', exchangePIN)
        .single();
      
      if (userData && !error) {
        setValidatedUser(userData.username);
        setExchangeStep(3);
      } else {
        setPinError('PIN inválido');
      }
    } catch (err) {
      setPinError('Erro ao validar PIN');
    } finally {
      setIsValidatingPIN(false);
    }
  };

  const validateCancelPIN = async () => {
    if (!cancelPIN) return;
    setIsValidatingCancelPIN(true);
    setCancelPinError('');
    
    try {
      const { data: userData, error } = await supabase
        .from('loja_users')
        .select('username')
        .eq('pin', cancelPIN)
        .single();
      
      if (userData && !error) {
        const finalReason = cancelReason === 'Outro' ? customCancelReason : cancelReason;
        
        // Log stock restoration movements
        if (selectedOrderForCancel.items && Array.isArray(selectedOrderForCancel.items)) {
          for (const item of selectedOrderForCancel.items) {
            await supabase.from('loja_stock_movimentos').insert({
              produto_nome: item.designacao || item.ref,
              tipo_movimento: 'Entrada (Cancelamento)',
              quantidade: item.quantidade || 1,
              motivo: `Cancelamento da encomenda #${selectedOrderForCancel.id_venda}${finalReason ? `: ${finalReason}` : ''}`,
              data_movimento: new Date().toISOString().split('T')[0],
              referencia: item.ref
            });
          }
        }

        await updateSaleStatus(selectedOrderForCancel.id_venda, 'Cancelado', {
          reason: finalReason,
          collaborator: userData.username
        });
        setShowCancelModal(false);
        // Reset state
        setSelectedOrderForCancel(null);
        setCancelReason('');
        setCustomCancelReason('');
        setCancelPIN('');
      } else {
        setCancelPinError('PIN inválido');
      }
    } catch (err) {
      setCancelPinError('Erro ao validar PIN');
    } finally {
      setIsValidatingCancelPIN(false);
    }
  };

  const finalizeExchange = async () => {
    setIsFinalizingExchange(true);
    try {
      const voucherNumber = `TR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const totalExchangedValue = selectedItemsForExchange.reduce((sum, ref) => {
        const item = selectedOrderForExchange.items.find((i: any) => i.ref === ref);
        return sum + (Number(item?.pvp) || 0);
      }, 0);

      const exchangeData = {
        id: Math.random().toString(36).substring(2, 10),
        order_id: selectedOrderForExchange.id_venda,
        type: exchangeType,
        items: selectedItemsForExchange.map(ref => {
          const item = selectedOrderForExchange.items.find((i: any) => i.ref === ref);
          return { ref: item.ref, designacao: item.designacao, pvp: item.pvp };
        }),
        return_to_stock: returnToStock,
        purchase_date: exchangeType === 'online' ? (exchangeOnlinePurchaseDate || exchangePurchaseDate) : exchangePurchaseDate,
        exchange_date: exchangeDate,
        // Online specific
        customer_arrival_date: exchangeType === 'online' ? exchangeOnlineCustomerArrivalDate : null,
        internal_arrival_date: exchangeType === 'online' ? exchangeOnlineInternalArrivalDate : null,
        reshipping_fee_paid: exchangeType === 'online' ? reshippingFeePaid : null,
        reason: dateChangeReason,
        collaborator: validatedUser,
        voucher_number: voucherNumber,
        timestamp: new Date().toISOString()
      };

      const voucherData = {
        number: voucherNumber,
        value: totalExchangedValue,
        customer_name: selectedOrderForExchange.nome_cliente,
        order_id: selectedOrderForExchange.id_venda,
        issued_by: validatedUser,
        created_at: new Date().toISOString(),
        valid_until: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
        status: 'active'
      };

      // Add stock movement if returning to stock
      if (returnToStock) {
        for (const ref of selectedItemsForExchange) {
          const item = selectedOrderForExchange.items.find((i: any) => i.ref === ref);
          await supabase.from('loja_stock_movimentos').insert({
            produto_nome: item.designacao,
            tipo_movimento: 'Entrada (Troca)',
            quantidade: item.quantidade || 1,
            motivo: `Troca da encomenda #${selectedOrderForExchange.id_venda}`,
            data_movimento: exchangeDate,
            referencia: item.ref
          });
        }
      }

      await addExchange(exchangeData, voucherData);
      setGeneratedVoucher(voucherData);
      setExchangeStep(5);
      
      // Clear sensitive PIN data after success
      setExchangePIN('');
      setValidatedUser(null);
    } catch (err) {
      console.error('Failed to finalize exchange:', err);
    } finally {
      setIsFinalizingExchange(false);
    }
  };

  const filteredItems = useMemo(() => {
    return filteredOrders.filter(order => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = (
        String(order.nome_cliente || '').toLowerCase().includes(search) ||
        String(order.id_venda || '').toLowerCase().includes(search) ||
        String(order.localidade || '').toLowerCase().includes(search) ||
        (order.items && order.items.some((i: any) => String(i.ref || '').toLowerCase().includes(search)))
      );

      const matchesPayment = !filters.payment || order.forma_de_pagamento === filters.payment;
      const matchesWeekday = !filters.weekday || formatWeekday(order.data_venda) === filters.weekday;
      const matchesMonthYear = !filters.monthYear || formatMonthYear(order.data_venda) === filters.monthYear;
      const matchesInstagram = !filters.instagram || order.instagram === filters.instagram;
      const matchesCanal = !filters.canal || (order.site_kyte || 'KYTE') === filters.canal;
      const matchesEnvio = !filters.envio || (order.loja_ctt || 'CTT') === filters.envio;
      const matchesStatus = !filters.status || (order.status || 'Pendente') === filters.status;

      return matchesSearch && matchesPayment && matchesWeekday && matchesMonthYear && matchesInstagram && matchesCanal && matchesEnvio && matchesStatus;
    });
  }, [filteredOrders, searchTerm, filters, formatWeekday, formatMonthYear]);

  const sortedItems = filteredItems;


  const toggleOrder = (index: number) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(index)) newExpanded.delete(index);
    else newExpanded.add(index);
    setExpandedOrders(newExpanded);
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Encomendas"
        filters={
          <SmartDateFilter
            filters={filters}
            setFilters={setFilters as any}
            availableFilters={availableFilters as any}
            counts={filterCounts}
            itemLabel="Encomendas"
          />
        }
        actions={
          <div className="flex items-center gap-2 bg-[hsl(38_25%_97%)] border border-[hsl(35_18%_88%)] rounded-[10px] px-3 py-1.5">
            <Search className="h-3.5 w-3.5 text-[hsl(30_8%_60%)]" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar..."
              className="bg-transparent text-[12px] outline-none w-36 text-[hsl(20_15%_8%)] placeholder:text-[hsl(30_8%_65%)]"
            />
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-5 bg-[hsl(38_25%_96%)] space-y-3">

        <FilterChips
          active={filters.status || 'all'}
          onChange={(val) => setFilters(prev => ({ ...prev, status: val === 'all' ? '' : val }))}
          chips={[
            { value: 'all',       label: 'Todas',      count: filteredOrders.length,                                                   dotColor: '#9a8a7a' },
            { value: 'Pendente',  label: 'Pendentes',  count: filteredOrders.filter(o => (o.status || 'Pendente') === 'Pendente').length,  dotColor: '#d97706' },
            { value: 'Enviado',   label: 'Enviadas',   count: filteredOrders.filter(o => o.status === 'Enviado').length,               dotColor: '#2563eb' },
            { value: 'Pago',      label: 'Pagas',      count: filteredOrders.filter(o => o.status === 'Pago').length,                  dotColor: '#059669' },
            { value: 'Cancelado', label: 'Canceladas', count: filteredOrders.filter(o => o.status === 'Cancelado').length,             dotColor: '#dc2626' },
          ]}
        />

        <div className="bg-white rounded-[14px] border border-[hsl(35_18%_90%)] shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
          {sortedItems.length === 0 ? (
            <EmptyState
              title="Sem encomendas"
              description="Importe dados Excel para começar"
            />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[hsl(35_18%_92%)]">
                  {['Ref', 'Cliente', 'Produto', 'Valor', 'Data', 'Estado', ''].map(h => (
                    <th key={h} className="text-left text-[9px] font-bold text-[hsl(30_8%_55%)] uppercase tracking-[0.07em] px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((order, idx) => (
                  <tr
                    key={order.id_venda ?? idx}
                    onClick={() => toggleOrder(idx)}
                    className="border-b border-[hsl(35_18%_96%)] hover:bg-[hsl(38_25%_98%)] transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-2.5 text-[11px] font-bold text-[hsl(340_72%_45%)]">#{order.id_venda}</td>
                    <td className="px-4 py-2.5">
                      <p className="text-[11px] font-semibold text-[hsl(20_15%_8%)]">{order.nome_cliente}</p>
                      <p className="text-[10px] text-[hsl(30_8%_55%)]">{order.instagram ?? ''}</p>
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-[hsl(30_8%_40%)] max-w-[160px] truncate">
                      {order.items?.[0]?.designacao ?? ''}
                    </td>
                    <td className="px-4 py-2.5 text-[12px] font-bold text-[hsl(20_15%_8%)]">€{Number(order.pvp ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-[10px] text-[hsl(30_8%_55%)]">{formatDate(order.data_venda)}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={order.status ?? 'Pendente'} /></td>
                    <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          title="Ver talão"
                          onClick={() => { setSelectedOrderForInvoice(order); setShowInvoiceModal(true); }}
                          className="p-1.5 rounded-lg text-[hsl(30_8%_55%)] hover:text-purple-600 hover:bg-purple-50 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Troca"
                          onClick={() => { setSelectedOrderForExchange(order); setExchangeStep(1); setShowExchangeModal(true); }}
                          className="p-1.5 rounded-lg text-[hsl(30_8%_55%)] hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Cancelar encomenda"
                          onClick={() => { setSelectedOrderForCancel(order); setShowCancelModal(true); }}
                          className="p-1.5 rounded-lg text-[hsl(30_8%_55%)] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Acompanhamento"
                          onClick={() => { setFollowUpData({ type: 'delivery', order }); setShowFollowUpModal(true); }}
                          className="p-1.5 rounded-lg text-[hsl(30_8%_55%)] hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* Modals below — unchanged */}

      {/* Follow-up Script Modal */}
      <AnimatePresence>
        {showFollowUpModal && followUpData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFollowUpModal(false)}
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
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${followUpData.type === 'delivery' ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                      {followUpData.type === 'delivery' ? (
                        <MessageCircle className="w-5 h-5 text-indigo-600" />
                      ) : (
                        <Star className="w-5 h-5 text-amber-600" />
                      )}
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      {followUpData.type === 'delivery' ? 'Acompanhamento' : 'Feedback'}
                    </h3>
                  </div>
                  <button onClick={() => setShowFollowUpModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-2xl border border-slate-200 dark:border-white/10 relative group">
                  {followUpData.type === 'delivery' ? (
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-medium font-serif leading-relaxed">
                      {`Olá ${followUpData.order.nome_cliente.split(' ')[0]}!\n\nPassando apenas para avisar que a sua encomenda (${followUpData.order.id_venda}) acabou de ser enviada via ${followUpData.order.loja_ctt || 'CTT'}. \n\nQualquer dúvida sobre a entrega, estou à disposição por aqui. Muito obrigado pela preferência!`}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-medium font-serif leading-relaxed">
                      {`Olá ${followUpData.order.nome_cliente.split(' ')[0]}, tudo bem? \n\nVi que você recebeu a sua encomenda recente! O que achou dos produtos?\n\nO seu feedback é muito importante para continuarmos a melhorar e a trazer sempre o melhor para você. Se puder partilhar uma foto ou a sua opinião, ficarei muito feliz! `}
                    </p>
                  )}

                  <button
                    onClick={() => {
                      const text = followUpData.type === 'delivery'
                        ? `Olá ${followUpData.order.nome_cliente.split(' ')[0]}!\n\nPassando apenas para avisar que a sua encomenda (${followUpData.order.id_venda}) acabou de ser enviada via ${followUpData.order.loja_ctt || 'CTT'}. \n\nQualquer dúvida sobre a entrega, estou à disposição por aqui. Muito obrigado pela preferência!`
                        : `Olá ${followUpData.order.nome_cliente.split(' ')[0]}, tudo bem? \n\nVi que você recebeu a sua encomenda recente! O que achou dos produtos?\n\nO seu feedback é muito importante para continuarmos a melhorar e a trazer sempre o melhor para você. Se puder partilhar uma foto ou a sua opinião, ficarei muito feliz! `;
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

      {/* Invoice Summary Modal */}
      <AnimatePresence>
        {showInvoiceModal && selectedOrderForInvoice && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInvoiceModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
            >
              <div className="h-full flex flex-col">
                <div className="p-8 border-b border-slate-100 dark:border-white/5 flex justify-between items-center no-print">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-2xl flex items-center justify-center text-purple-600">
                      <FileText className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tighter">Resumo do Pedido</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const handlePrint = (type: 'sale' | 'exchange' | 'gift', exchangeCode?: string) => {
                        const printReceipt = () => {
                          const WinPrint = window.open('', '', 'width=900,height=900');
                          const html = ReactDOMServer.renderToString(
                            <ReceiptTemplate 
                              order={selectedOrderForInvoice} 
                              settings={data.appSettings} 
                              type={type}
                              exchangeCode={exchangeCode}
                            />
                          );
                          WinPrint?.document.write(`
                            <html>
                              <head>
                                <title>Talão ${type === 'gift' ? 'Oferta' : type === 'exchange' ? 'Troca' : 'Venda'} - #${selectedOrderForInvoice.id_venda}</title>
                                <script src="https://cdn.tailwindcss.com"></script>
                                <style>
                                  @media print {
                                    @page { margin: 0; }
                                    body { margin: 0; }
                                  }
                                </style>
                              </head>
                              <body>
                                ${html}
                              </body>
                            </html>
                          `);
                          WinPrint?.document.close();
                          setTimeout(() => {
                            WinPrint?.print();
                            WinPrint?.close();
                          }, 500);
                        };

                        printReceipt();
                        if (data.appSettings?.printer_double_print) {
                          setTimeout(printReceipt, 1500); // Small delay before second print dialog
                        }
                      };

                      const exchange = data.order_exchanges?.find((ex: any) => ex.order_id === selectedOrderForInvoice.id_venda);

                      return (
                        <>
                          <button 
                            onClick={() => handlePrint('sale')}
                            className="p-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-500/20"
                            title="Imprimir Talão Normal"
                          >
                            <Printer className="w-4 h-4" />
                            Imprimir
                          </button>

                          <button 
                            onClick={() => handlePrint('gift')}
                            className="p-2.5 bg-pink-500 text-white rounded-xl hover:bg-pink-600 transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-pink-500/20"
                            title="Talão de Oferta"
                          >
                            <Star className="w-4 h-4" />
                            Oferta
                          </button>

                          {exchange && (
                            <button 
                              onClick={() => handlePrint('exchange', exchange.voucher_number || exchange.id)}
                              className="p-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20"
                              title="Talão de Troca"
                            >
                              <RotateCcw className="w-4 h-4" />
                              Troca
                            </button>
                          )}
                        </>
                      );
                    })()}

                    <button 
                      onClick={() => {
                        const subject = encodeURIComponent(`Talão de Venda #${selectedOrderForInvoice.id_venda}`);
                        const body = encodeURIComponent(`Olá ${selectedOrderForInvoice.nome_cliente}, aqui está o resumo do seu pedido #${selectedOrderForInvoice.id_venda}.`);
                        window.location.href = `mailto:?subject=${subject}&body=${body}`;
                      }}
                      className="p-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
                      title="Enviar por E-mail"
                    >
                      <Mail className="w-4 h-4" />
                    </button>

                    <button 
                      onClick={() => {
                        const text = `Olá ${selectedOrderForInvoice.nome_cliente}! Segue o resumo do seu pedido #${selectedOrderForInvoice.id_venda} na ${data.appSettings?.storeName || 'nossa loja'}. Total: ${formatCurrency(selectedOrderForInvoice.pvp)}`;
                        const whatsappUrl = `https://wa.me/${selectedOrderForInvoice.telefone?.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
                        window.open(whatsappUrl, '_blank');
                      }}
                      className="p-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                      title="Partilhar WhatsApp"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>

                    <button onClick={() => setShowInvoiceModal(false)} className="p-2.5 bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-rose-500 rounded-xl transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

                <div className="p-8 overflow-y-auto max-h-[70vh] custom-scrollbar bg-slate-50/30 dark:bg-slate-900/40">
                  <div id="printable-invoice" className="bg-white dark:bg-slate-950 p-8 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm text-slate-900 dark:text-white">
                    {/* Visual Header */}
                    <div className="flex justify-between items-start mb-10">
                      <div>
                        <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mb-1 leading-none">LUZ</div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Invoice Summary</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ID Venda</div>
                        <div className="text-xl font-black text-slate-900 dark:text-white">#{selectedOrderForInvoice.id_venda}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-10 mb-10">
                      <div className="space-y-4">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Dados do Cliente</p>
                          <p className="text-base font-black uppercase">{selectedOrderForInvoice.nome_cliente}</p>
                          <p className="text-xs font-bold text-slate-500">{selectedOrderForInvoice.telefone || 'Sem contacto'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Pagamento</p>
                          <p className="text-sm font-black text-blue-600 dark:text-blue-400">{selectedOrderForInvoice.forma_de_pagamento || '-'}</p>
                        </div>
                      </div>
                      <div className="space-y-4 text-right">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Data da Venda</p>
                          <p className="text-sm font-black">{new Date(selectedOrderForInvoice.data_venda).toLocaleDateString('pt-PT')}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Método de Envio</p>
                          <p className="text-sm font-black text-indigo-500">{selectedOrderForInvoice.loja_ctt || 'CTT'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Items Table */}
                    <div className="mb-10">
                      <table className="w-full text-xs">
                        <thead className="border-b border-slate-100 dark:border-white/5">
                          <tr>
                            <th className="py-3 font-black text-slate-400 uppercase text-left">Artigo</th>
                            <th className="py-3 font-black text-slate-400 uppercase text-center">Qtd</th>
                            <th className="py-3 font-black text-slate-400 uppercase text-right">Preço Un.</th>
                            <th className="py-3 font-black text-slate-400 uppercase text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                          {(selectedOrderForInvoice.items || []).map((item: any, i: number) => (
                            <tr key={i}>
                              <td className="py-4 font-bold">{item.designacao}</td>
                              <td className="py-4 text-center font-black">{item.quantidade}</td>
                              <td className="py-4 text-right font-bold">{formatCurrency(Number(item.pvp) / Number(item.quantidade))}</td>
                              <td className="py-4 text-right font-black">{formatCurrency(Number(item.pvp))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Financial Summary */}
                    <div className="ml-auto w-64 space-y-2 border-t-2 border-slate-100 dark:border-white/5 pt-4">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                        <span>Subtotal</span>
                        <span>{formatCurrency(Number(selectedOrderForInvoice.pvp) - Number(selectedOrderForInvoice.portes || 0) + Number(selectedOrderForInvoice.descontos || 0))}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                        <span>Portes</span>
                        <span>{formatCurrency(Number(selectedOrderForInvoice.portes || 0))}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold text-rose-500 uppercase">
                        <span>Descontos</span>
                        <span>-{formatCurrency(Number(selectedOrderForInvoice.descontos || 0))}</span>
                      </div>
                      <div className="flex justify-between items-center py-4 text-emerald-600 dark:text-emerald-400 border-t border-slate-100 dark:border-white/5 mt-2">
                        <span className="text-[10px] font-black uppercase tracking-widest">Total do Pedido</span>
                        <span className="text-2xl font-black">{formatCurrency(Number(selectedOrderForInvoice.pvp))}</span>
                      </div>
                    </div>
                  </div>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Exchange Modal */}
      <AnimatePresence>
        {showExchangeModal && selectedOrderForExchange && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isFinalizingExchange) {
                  setShowExchangeModal(false);
                  setExchangePIN('');
                  setValidatedUser(null);
                }
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
            >
              <div className="p-8 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-2xl flex items-center justify-center text-amber-600">
                      <RotateCcw className={`w-5 h-5 ${exchangeStep === 5 ? 'animate-bounce' : ''}`} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tighter">Troca de Encomenda</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pedido #{selectedOrderForExchange.id_venda}</p>
                    </div>
                  </div>
                  {exchangeStep < 5 && (
                    <button 
                      onClick={() => {
                        setShowExchangeModal(false);
                        setExchangePIN('');
                        setValidatedUser(null);
                      }}
                      className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Step 1: Confirmation */}
                {exchangeStep === 1 && (
                  <div className="space-y-6 py-4">
                    <div className="text-center space-y-2">
                      <p className="text-lg font-bold text-slate-700 dark:text-slate-200">Tens a certeza que pretendes efetuar esta troca?</p>
                      <p className="text-sm text-slate-500">
                        Data da compra: <span className="font-black text-slate-900 dark:text-white">{formatDate(selectedOrderForExchange.data_venda)}</span>
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowExchangeModal(false)}
                        className="flex-1 py-4 bg-slate-100 dark:bg-white/5 text-slate-500 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all text-xs"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => setExchangeStep(2)}
                        className="flex-1 py-4 bg-amber-500 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 text-xs"
                      >
                        Sim, Continuar
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: PIN Validation */}
                {exchangeStep === 2 && (
                  <div className="space-y-6 py-4">
                    <div className="text-center space-y-2">
                      <p className="text-lg font-bold text-slate-700 dark:text-slate-200">Validação de Colaborador</p>
                      <p className="text-xs text-slate-500 uppercase font-black tracking-widest">Insira o seu Código (PIN) pessoal</p>
                    </div>
                    <div className="max-w-[200px] mx-auto space-y-4">
                      <input
                        type="password"
                        value={exchangePIN}
                        onChange={(e) => {
                          setExchangePIN(e.target.value);
                          if (pinError) setPinError('');
                        }}
                        autoFocus
                        className={`w-full text-center text-3xl tracking-[1em] font-black py-4 bg-slate-50 dark:bg-white/5 border-2 ${pinError ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-100 dark:border-white/10 focus:ring-purple-500/20'} rounded-2xl outline-none focus:ring-4 transition-all`}
                        placeholder="••••"
                        maxLength={6}
                        onKeyDown={(e) => e.key === 'Enter' && validatePIN()}
                      />
                      {pinError && (
                        <p className="text-center text-[10px] font-black text-rose-500 uppercase tracking-widest animate-shake">
                          {pinError}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={validatePIN}
                      disabled={isValidatingPIN || !exchangePIN}
                      className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:scale-100 text-xs flex items-center justify-center gap-2"
                    >
                      {isValidatingPIN ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : 'Validar Código (PIN)'}
                    </button>
                  </div>
                )}

                {/* Step 3: Type Selection */}
                {exchangeStep === 3 && (
                  <div className="space-y-6 py-4">
                    <div className="text-center space-y-1">
                      <p className="text-lg font-bold text-slate-700 dark:text-slate-200">Olá, {validatedUser}!</p>
                      <p className="text-xs text-slate-500 uppercase font-black tracking-widest">Que tipo de troca é?</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => {
                          setExchangeType('online');
                          setExchangeStep(4);
                        }}
                        className="group p-6 bg-slate-50 dark:bg-white/5 border-2 border-transparent hover:border-blue-500 rounded-[2rem] transition-all text-center space-y-3"
                      >
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 mx-auto group-hover:scale-110 transition-transform">
                          <Star className="w-6 h-6" />
                        </div>
                        <span className="block font-black uppercase tracking-widest text-xs text-slate-600 dark:text-slate-400 group-hover:text-blue-500 transition-colors">Online</span>
                      </button>
                      <button
                        onClick={() => {
                          setExchangeType('fisico');
                          setExchangeStep(4);
                        }}
                        className="group p-6 bg-slate-50 dark:bg-white/5 border-2 border-transparent hover:border-amber-500 rounded-[2rem] transition-all text-center space-y-3"
                      >
                        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600 mx-auto group-hover:scale-110 transition-transform">
                          <Package className="w-6 h-6" />
                        </div>
                        <span className="block font-black uppercase tracking-widest text-xs text-slate-600 dark:text-slate-400 group-hover:text-amber-500 transition-colors">Físico</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 4: Details */}
                {exchangeStep === 4 && (
                  <div className="space-y-6 max-h-[70vh] overflow-y-auto px-2 custom-scrollbar">
                    {/* Dates Section */}
                    {exchangeType === 'fisico' ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Data da Compra</label>
                          <input 
                            type="date" 
                            value={exchangePurchaseDate}
                            onChange={(e) => {
                              setExchangePurchaseDate(e.target.value);
                              if (e.target.value !== new Date(selectedOrderForExchange.data_venda).toISOString().split('T')[0] && !dateChangeReason) {
                                setDateChangeReason('Alteração manual da data original');
                              }
                            }}
                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500/20"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Data da Troca</label>
                          <input 
                            type="date" 
                            value={exchangeDate}
                            onChange={(e) => setExchangeDate(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500/20"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Data da Compra</label>
                            <input 
                              type="date" 
                              value={exchangeOnlinePurchaseDate || exchangePurchaseDate}
                              onChange={(e) => {
                                setExchangeOnlinePurchaseDate(e.target.value);
                                if (!dateChangeReason) setDateChangeReason('Alteração manual de data (Online)');
                              }}
                              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500/20"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Receção Cliente</label>
                            <input 
                              type="date" 
                              value={exchangeOnlineCustomerArrivalDate}
                              onChange={(e) => {
                                setExchangeOnlineCustomerArrivalDate(e.target.value);
                                if (!dateChangeReason) setDateChangeReason('Alteração manual de data (Online)');
                              }}
                              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500/20"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Receção Instalações</label>
                            <input 
                              type="date" 
                              value={exchangeOnlineInternalArrivalDate}
                              onChange={(e) => {
                                setExchangeOnlineInternalArrivalDate(e.target.value);
                                if (!dateChangeReason) setDateChangeReason('Alteração manual de data (Online)');
                              }}
                              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500/20"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Data da Troca</label>
                            <input 
                              type="date" 
                              value={exchangeDate}
                              onChange={(e) => setExchangeDate(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500/20"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {(
                      exchangePurchaseDate !== new Date(selectedOrderForExchange.data_venda).toISOString().split('T')[0] || 
                      exchangeDate !== new Date().toISOString().split('T')[0] ||
                      (exchangeType === 'online' && (exchangeOnlinePurchaseDate || exchangeOnlineCustomerArrivalDate || exchangeOnlineInternalArrivalDate))
                    ) && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <label className="text-[9px] font-black text-rose-500 uppercase tracking-widest px-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Motivo da alteração de data (Obrigatório)
                        </label>
                        <textarea
                          value={dateChangeReason}
                          onChange={(e) => setDateChangeReason(e.target.value)}
                          placeholder="Ex: Datas posteriores ao dia da troca, erro no registo original..."
                          className="w-full bg-rose-50/30 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-xl px-4 py-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-rose-500/20 min-h-[60px] resize-none"
                        />
                      </div>
                    )}

                    {/* Reshipping Fee Section (Online only) */}
                    {exchangeType === 'online' && (
                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">A cliente já pagou os portes de reenvio?</label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setReshippingFeePaid(true)}
                            className={`flex-1 py-3 rounded-2xl border-2 transition-all font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 ${
                              reshippingFeePaid === true
                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                : 'bg-slate-50 dark:bg-white/5 border-transparent text-slate-400'
                            }`}
                          >
                            <Check className={`w-3.5 h-3.5 ${reshippingFeePaid === true ? 'opacity-100' : 'opacity-0'}`} />
                            Sim
                          </button>
                          <button
                            onClick={() => setReshippingFeePaid(false)}
                            className={`flex-1 py-3 rounded-2xl border-2 transition-all font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 ${
                              reshippingFeePaid === false
                                ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/20'
                                : 'bg-slate-50 dark:bg-white/5 border-transparent text-slate-400'
                            }`}
                          >
                            <X className={`w-3.5 h-3.5 ${reshippingFeePaid === false ? 'opacity-100' : 'opacity-0'}`} />
                            Não
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Articles Section */}
                    <div className="space-y-3">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Selecionar Artigos para Troca</label>
                      <div className="space-y-2">
                        {selectedOrderForExchange.items?.map((item: any, i: number) => {
                          const isAlreadyExchanged = item.is_exchanged === true;
                          return (
                            <div 
                              key={i}
                              onClick={() => {
                                if (isAlreadyExchanged) return;
                                setSelectedItemsForExchange(prev => 
                                  prev.includes(item.ref) 
                                    ? prev.filter(r => r !== item.ref)
                                    : [...prev, item.ref]
                                );
                              }}
                              className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${
                                isAlreadyExchanged
                                  ? 'bg-slate-100 dark:bg-white/5 border-transparent opacity-50 cursor-not-allowed'
                                  : selectedItemsForExchange.includes(item.ref)
                                    ? 'bg-purple-50/50 dark:bg-purple-900/20 border-purple-500/50 cursor-pointer'
                                    : 'bg-slate-50 dark:bg-white/5 border-transparent hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                                  isAlreadyExchanged
                                    ? 'bg-slate-200 dark:bg-slate-700 border-slate-200 dark:border-slate-700'
                                    : selectedItemsForExchange.includes(item.ref)
                                      ? 'bg-purple-500 border-purple-500 text-white'
                                      : 'border-slate-300 dark:border-white/20'
                                }`}>
                                  {isAlreadyExchanged ? <X className="w-3.5 h-3.5 text-slate-400" /> : selectedItemsForExchange.includes(item.ref) && <Check className="w-3.5 h-3.5" />}
                                </div>
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold text-slate-900 dark:text-white leading-tight">{item.designacao}</span>
                                    {isAlreadyExchanged && (
                                      <span className="text-[8px] font-black bg-rose-100 text-rose-600 px-1 rounded uppercase">Já trocado</span>
                                    )}
                                  </div>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">REF: {item.ref}</span>
                                </div>
                              </div>
                              <span className="text-xs font-black text-slate-900 dark:text-white">{formatCurrency(Number(item.pvp))}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Stock Return Toggle */}
                    <div 
                      onClick={() => setReturnToStock(!returnToStock)}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                        returnToStock 
                          ? 'bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-500/50' 
                          : 'bg-slate-50 dark:bg-white/5 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                          returnToStock ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                        }`}>
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="block font-black uppercase tracking-widest text-[10px] text-slate-900 dark:text-white leading-none mb-1">Voltar ao Stock</span>
                          <span className="text-[10px] font-bold text-slate-400">O artigo será reintegrado no inventário</span>
                        </div>
                      </div>
                      <div className={`w-12 h-6 rounded-full relative transition-all ${returnToStock ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${returnToStock ? 'left-7' : 'left-1'}`} />
                      </div>
                    </div>

                    <button
                      onClick={finalizeExchange}
                      disabled={selectedItemsForExchange.length === 0 || ((exchangePurchaseDate !== new Date(selectedOrderForExchange.data_venda).toISOString().split('T')[0] || exchangeDate !== new Date().toISOString().split('T')[0]) && !dateChangeReason)}
                      className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:scale-100 text-xs flex items-center justify-center gap-2 sticky bottom-0 z-10"
                    >
                      {isFinalizingExchange ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Confirmar Troca e Gerar Vale
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setExchangeStep(3)}
                      className="w-full py-2 text-slate-400 font-bold uppercase tracking-widest text-[9px] hover:text-slate-600 transition-colors"
                    >
                      Voltar atrás
                    </button>
                  </div>
                )}

                {/* Step 5: Final Summary & Voucher */}
                {exchangeStep === 5 && generatedVoucher && (
                  <div className="space-y-6 py-4 animate-in zoom-in-95 duration-300">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
                        <Check className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Troca Concluída!</p>
                        <p className="text-xs text-slate-500 font-bold">O vale foi gerado com sucesso para {generatedVoucher.customer_name}.</p>
                      </div>
                    </div>

                    <div className="bg-slate-900 dark:bg-white p-8 rounded-[2.5rem] relative overflow-hidden group">
                      {/* Decorative elements */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 blur-3xl rounded-full translate-x-16 -translate-y-16" />
                      <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/20 blur-3xl rounded-full -translate-x-16 translate-y-16" />
                      
                      <div className="relative space-y-4 text-center">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Número do Vale</p>
                          <p className="text-3xl font-black text-white dark:text-slate-900 tracking-wider font-mono">{generatedVoucher.number}</p>
                        </div>
                        <div className="h-px bg-white/10 dark:bg-slate-200 mx-auto w-1/2" />
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Valor Total</p>
                          <p className="text-4xl font-black text-emerald-400 dark:text-emerald-600">{formatCurrency(generatedVoucher.value)}</p>
                        </div>
                        
                        <div className="pt-4 flex justify-center gap-3">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(generatedVoucher.number);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-white/10 dark:bg-slate-100 hover:bg-white/20 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Copiar código
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Validade: {new Date(generatedVoucher.valid_until).toLocaleDateString('pt-PT')}</p>
                      <button
                        onClick={() => {
                          setShowExchangeModal(false);
                          setGeneratedVoucher(null);
                        }}
                        className="w-full py-4 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all text-xs"
                      >
                        Fechar e Atualizar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cancellation Modal */}
      <AnimatePresence>
        {showCancelModal && selectedOrderForCancel && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 ml-0 lg:ml-64">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isValidatingCancelPIN) {
                  setShowCancelModal(false);
                  setCancelPIN('');
                  setCancelPinError('');
                }
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-purple-100 dark:border-white/10 overflow-hidden"
            >
              {/* Header */}
              <div className="relative p-6 sm:p-8 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Cancelar Encomenda</h3>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">ID: {selectedOrderForCancel.id_venda} • {selectedOrderForCancel.nome_cliente}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowCancelModal(false);
                      setCancelPIN('');
                      setCancelPinError('');
                    }}
                    className="p-3 hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl transition-all text-slate-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {/* Reason Selection */}
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Motivo do Cancelamento</label>
                  <div className="relative">
                    <select
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-rose-500/50 rounded-2xl px-4 py-2.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none transition-all appearance-none cursor-pointer pr-10 hover:bg-slate-100 dark:hover:bg-white/10"
                    >
                      <option value="" disabled className="dark:bg-slate-900">Selecione o motivo do cancelamento...</option>
                      {data.appSettings?.cancellationReasons?.map((reason: string) => (
                        <option key={reason} value={reason} className="dark:bg-slate-900">{reason}</option>
                      ))}
                      <option value="Outro" className="dark:bg-slate-900">Outro / Personalizado</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>

                  {cancelReason === 'Outro' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="pt-2"
                    >
                      <textarea
                        value={customCancelReason}
                        onChange={(e) => setCustomCancelReason(e.target.value)}
                        placeholder="Explique o motivo do cancelamento..."
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500/20 min-h-[100px] resize-none"
                      />
                    </motion.div>
                  )}
                </div>

                {/* PIN Section */}
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-white/5">
                  <div className="flex flex-col gap-0.5 px-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Código (PIN) de Autorização</label>
                    <span className="text-[10px] font-black text-rose-500/80 uppercase tracking-widest">Utilize o seu código (PIN) configurado nas definições</span>
                  </div>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      value={cancelPIN}
                      onChange={(e) => {
                        setCancelPIN(e.target.value);
                        setCancelPinError('');
                      }}
                      placeholder="••••"
                      className={`w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-white/5 border-2 rounded-2xl text-base font-black tracking-[0.5em] outline-none transition-all ${
                        cancelPinError ? 'border-rose-500' : 'border-transparent focus:border-rose-500/50 focus:bg-white dark:focus:bg-slate-800'
                      }`}
                    />
                  </div>
                  {cancelPinError && (
                    <p className="text-[10px] font-bold text-rose-500 px-1 ml-1">{cancelPinError}</p>
                  )}
                </div>
              </div>

              <div className="p-6 sm:p-8 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5">
                <button
                  onClick={validateCancelPIN}
                  disabled={!cancelReason || (cancelReason === 'Outro' && !customCancelReason) || !cancelPIN || isValidatingCancelPIN}
                  className="w-full py-4 bg-rose-500 text-white font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-rose-500/20 disabled:opacity-50 disabled:scale-100 text-xs flex items-center justify-center gap-2"
                >
                  {isValidatingCancelPIN ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      Confirmar Cancelamento Definitivo
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
