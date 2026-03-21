import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ChevronRight,
  ChevronDown,
  Filter,
  X,
  Package,
  MessageCircle,
  Receipt,
  Star,
  Copy,
  Printer,
  FileText,
  Clock,
  Instagram,
  CreditCard,
  Truck as TruckIcon
} from 'lucide-react';
import { useDashboardData } from '../hooks/useDashboardData';
import { useFilters } from '../contexts/FilterContext';
import { useData } from '../contexts/DataContext';
import { SmartDateFilter } from '../components/SmartDateFilter';

const FilterDropdown = ({
  label,
  value,
  options,
  onChange,
  icon: Icon
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  icon?: any;
}) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center gap-1.5 px-2">
      {Icon && <Icon className="w-2.5 h-2.5 text-slate-400" />}
      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
    </div>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-[10px] font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-purple-500/50 transition-all min-w-[120px] appearance-none cursor-pointer hover:border-purple-300 dark:hover:border-purple-700"
    >
      <option value="">TODOS</option>
      {options.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
);

const SortHeader = ({
  label,
  sortKey,
  currentSort,
  onRequestSort,
  align = 'left'
}: {
  label: string;
  sortKey: string;
  currentSort: { key: string; direction: 'asc' | 'desc' } | null;
  onRequestSort: (key: string) => void;
  align?: 'left' | 'right';
}) => {
  const isActive = currentSort?.key === sortKey;
  return (
    <th
      className={`px-3 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group ${align === 'right' ? 'text-right' : ''}`}
      onClick={() => onRequestSort(sortKey)}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        <span>{label}</span>
        <div className={`flex flex-col -space-y-1 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}>
          <ChevronDown className={`w-2.5 h-2.5 transition-transform ${isActive && currentSort.direction === 'desc' ? 'rotate-180' : ''}`} />
        </div>
      </div>
    </th>
  );
};

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

export default function Encomendas() {
  const { filters, setFilters } = useFilters();
  const { data, updateSaleStatus } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Follow-up Modal State
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<any>(null);
  const [followUpData] = useState<{ type: 'delivery' | 'feedback', order: any } | null>(null);

  const {
    filteredOrders,
    isFiltered,
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

  const sortedItems = useMemo(() => {
    let sortableItems = [...filteredItems];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any = a[sortConfig.key];
        let bValue: any = b[sortConfig.key];

        // Derived values handling
        if (sortConfig.key === 'mesano') {
          aValue = new Date(a.data_venda).getTime();
          bValue = new Date(b.data_venda).getTime();
        } else if (sortConfig.key === 'dia_da_semana') {
          const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
          aValue = days.indexOf(formatWeekday(a.data_venda));
          bValue = days.indexOf(formatWeekday(b.data_venda));
        } else if (sortConfig.key === 'canal') {
          aValue = a.site_kyte || 'KYTE';
          bValue = b.site_kyte || 'KYTE';
        } else if (sortConfig.key === 'envio') {
          aValue = a.loja_ctt || 'CTT';
          bValue = b.loja_ctt || 'CTT';
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredItems, sortConfig, formatWeekday]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getCustomerContact = (order: any) => {
    if (order.telefone && order.telefone !== '-' && order.telefone !== 'N/A') return order.telefone;
    
    // Lookup in database by Name or Instagram
    const customer = data.customers?.find((c: any) => {
      const dbName = (c.nome_cliente || '').trim().toUpperCase();
      const orderName = (order.nome_cliente || '').trim().toUpperCase();
      const dbInsta = (c.instagram || '').trim().toUpperCase().replace('@', '');
      const orderInsta = (order.instagram || '').trim().toUpperCase().replace('@', '');
      
      return (orderName && dbName === orderName) || (orderInsta && orderInsta !== '-' && dbInsta === orderInsta);
    });
    
    return customer?.telefone_cliente || customer?.phone || '-';
  };

  const getWhatsAppLink = (order: any) => {
    const contact = getCustomerContact(order);
    const phone = contact?.replace(/\D/g, '');
    if (!phone || phone === '') return '#';

    const itemsList = (order.items || [])
      .map((i: any) => `- ${i.designacao || i.ref} (x${i.quantidade || 1})`)
      .join('\n');

    const address = [order.morada, order.localidade]
      .filter(val => val && val !== 'N/A')
      .join(', ');

    const message = `Olá ${order.nome_cliente?.split(' ')[0]}!\n\n` +
      `Passo para lhe enviar o resumo detalhado da sua encomenda *${order.id_venda}*:\n\n` +
      `*ITENS COMPRADOS:*\n${itemsList}\n\n` +
      `*VALOR TOTAL:* ${formatCurrency(Number(order.pvp))}\n\n` +
      `*FORMA DE PAGAMENTO:* ${order.forma_de_pagamento || 'N/A'}\n\n` +
      `*MÉTODO DE ENVIO:* ${order.loja_ctt || 'CTT'}\n` +
      `*MORADA:* ${address || 'N/A'}\n\n` +
      `Se precisar de alguma ajuda ou tiver alguma dúvida, estou por aqui!\n\n` +
      `Muito obrigado pela preferência!`;

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  const uniqueOptions = useMemo(() => {
    const payments = new Set<string>();
    const weekdays = new Set<string>();
    const monthYears = new Set<string>();
    const instagrams = new Set<string>();
    const canals = new Set<string>();
    const envios = new Set<string>();
    const statuses = data.order_statuses?.map(s => s.name) || ['Pendente', 'Pago', 'Enviado', 'Entregue'];

    filteredOrders.forEach(o => {
      if (o.forma_de_pagamento) payments.add(o.forma_de_pagamento);
      weekdays.add(formatWeekday(o.data_venda));
      monthYears.add(formatMonthYear(o.data_venda));
      if (o.instagram) instagrams.add(o.instagram);
      canals.add(o.site_kyte || 'KYTE');
      envios.add(o.loja_ctt || 'CTT');
    });

    return {
      payments: Array.from(payments).sort(),
      weekdays: Array.from(weekdays).sort(),
      monthYears: Array.from(monthYears).sort(),
      instagrams: Array.from(instagrams).sort(),
      canals: Array.from(canals).sort(),
      envios: Array.from(envios).sort(),
      statuses
    };
  }, [filteredOrders, formatWeekday, formatMonthYear]);

  const toggleOrder = (index: number) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(index)) newExpanded.delete(index);
    else newExpanded.add(index);
    setExpandedOrders(newExpanded);
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-xl font-black text-slate-950 dark:text-white tracking-tighter uppercase">Pedidos / Encomendas</h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Histórico completo de vendas e envios ({filteredItems.length})</p>
        </div>

        <div className="flex-1 w-full md:w-auto max-w-md relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all font-bold text-xs"
            placeholder="Buscar por cliente, ID, ref..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="relative z-40 flex flex-wrap items-center gap-4 bg-white/50 dark:bg-slate-800/40 p-2 rounded-2xl border border-purple-100 dark:border-purple-800/20 backdrop-blur-xl">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 dark:bg-white/10 rounded-xl border border-purple-200 dark:border-white/5">
          <Filter className="w-3 h-3 text-purple-800 dark:text-purple-300" />
          <span className="text-[10px] font-black text-purple-950 dark:text-purple-100 uppercase tracking-wider">Filtros</span>
        </div>

        <div className="scale-90 origin-left">
          <SmartDateFilter
            filters={filters}
            setFilters={setFilters as any}
            availableFilters={availableFilters as any}
            counts={filterCounts}
            itemLabel="Encomendas"
          />
        </div>

        <div className="h-8 w-[1px] bg-slate-200 dark:bg-white/10 mx-2 hidden lg:block" />

        <div className="flex flex-wrap items-center gap-4">
          <FilterDropdown
            label="Pagamento"
            value={filters.payment}
            options={uniqueOptions.payments}
            onChange={(val) => setFilters(prev => ({ ...prev, payment: val }))}
          />
          <FilterDropdown
            label="Dia Semana"
            value={filters.weekday}
            options={uniqueOptions.weekdays}
            onChange={(val) => setFilters(prev => ({ ...prev, weekday: val }))}
          />
          <FilterDropdown
            label="Mês / Ano"
            value={filters.monthYear}
            options={uniqueOptions.monthYears}
            onChange={(val) => setFilters(prev => ({ ...prev, monthYear: val }))}
          />
          <FilterDropdown
            label="Canal"
            value={filters.canal}
            options={uniqueOptions.canals}
            onChange={(val) => setFilters(prev => ({ ...prev, canal: val }))}
          />
          <FilterDropdown
            label="Envio"
            value={filters.envio}
            options={uniqueOptions.envios}
            onChange={(val) => setFilters(prev => ({ ...prev, envio: val }))}
          />
          <FilterDropdown
            label="Status"
            value={filters.status}
            options={uniqueOptions.statuses}
            onChange={(val) => setFilters(prev => ({ ...prev, status: val }))}
          />
          <FilterDropdown
            label="Instagram"
            value={filters.instagram}
            options={uniqueOptions.instagrams}
            onChange={(val) => setFilters(prev => ({ ...prev, instagram: val }))}
          />
        </div>

        {isFiltered && (
          <button
            onClick={() => setFilters(prev => ({
              ...prev,
              year: '',
              month: '',
              days: [],
              payment: '',
              weekday: '',
              monthYear: '',
              instagram: '',
              canal: '',
              envio: '',
              status: ''
            }))}
            className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300"
          >
            <X className="w-3 h-3" />
            Limpar
          </button>
        )}
      </div>

      <div className="glass overflow-hidden rounded-[2rem] border-purple-100 dark:border-purple-800/20">
        <div className="overflow-x-auto max-h-[750px] overflow-y-auto custom-scrollbar">
          <table className="min-w-full text-left text-[10px] whitespace-nowrap">
            <thead className="sticky top-0 z-10 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-[9px] text-slate-500 dark:text-slate-400 font-black">
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-white/5 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                <th className="px-2 py-2 w-8"></th>
                <th className="px-2 py-2 w-8 text-center text-[8px] font-black uppercase tracking-widest text-slate-400">RECIBO</th>
                <SortHeader label="DATA VENDA" sortKey="data_venda" currentSort={sortConfig} onRequestSort={requestSort} />
                <SortHeader label="STATUS" sortKey="status" currentSort={sortConfig} onRequestSort={requestSort} />
                <SortHeader label="ID VENDA" sortKey="id_venda" currentSort={sortConfig} onRequestSort={requestSort} />
                <th className="px-2 py-2 text-center text-[8px] font-black uppercase tracking-widest text-slate-400">PAG.</th>
                <th className="px-2 py-2 text-center text-[8px] font-black uppercase tracking-widest text-slate-400">ENV.</th>
                <SortHeader label="CLIENTE" sortKey="nome_cliente" currentSort={sortConfig} onRequestSort={requestSort} />
                <SortHeader label="INSTAGRAM" sortKey="instagram" currentSort={sortConfig} onRequestSort={requestSort} />
                <th className="px-2 py-2 text-[8px] font-black uppercase tracking-widest text-slate-400">CONTACTO</th>
                <SortHeader label="PVP TOTAL" sortKey="pvp" currentSort={sortConfig} onRequestSort={requestSort} align="right" />
                <SortHeader label="DESCONTOS" sortKey="descontos" currentSort={sortConfig} onRequestSort={requestSort} align="right" />
                <SortHeader label="CUSTO" sortKey="custo" currentSort={sortConfig} onRequestSort={requestSort} align="right" />
                <SortHeader label="LUCRO" sortKey="lucro" currentSort={sortConfig} onRequestSort={requestSort} align="right" />
                <SortHeader label="PORTES" sortKey="portes" currentSort={sortConfig} onRequestSort={requestSort} align="right" />
                <SortHeader label="MÉTODO" sortKey="forma_de_pagamento" currentSort={sortConfig} onRequestSort={requestSort} />
                <SortHeader label="CANAL" sortKey="canal" currentSort={sortConfig} onRequestSort={requestSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedItems.map((order, index) => (
                <React.Fragment key={index}>
                  <tr
                    onClick={() => toggleOrder(index)}
                    className={`hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group cursor-pointer ${expandedOrders.has(index) ? 'bg-purple-50/50 dark:bg-purple-500/5' : ''}`}
                  >
                    <td className="px-2 py-1.5">
                      {expandedOrders.has(index) ? <ChevronDown className="w-3 h-3 text-purple-500" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrderForInvoice(order);
                          setShowInvoiceModal(true);
                        }}
                        className="p-1.5 hover:bg-purple-100 dark:hover:bg-purple-500/20 text-purple-600 rounded-lg transition-all"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                      </button>
                    </td>
                    <td className="px-2 py-1.5 font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                      {formatDate(order.data_venda)}
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        value={order.status || 'Pendente'}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          updateSaleStatus(order.id_venda, e.target.value);
                        }}
                        className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md border-none cursor-pointer outline-none transition-all ${(() => {
                          const statusConfig = data.order_statuses?.find(s => s.name === (order.status || 'Pendente'));
                          if (!statusConfig) return 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400';
                          
                          switch(statusConfig.color) {
                            case 'blue': return 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400';
                            case 'purple': return 'bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400';
                            case 'emerald': return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400';
                            case 'rose': return 'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400';
                            case 'amber': return 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400';
                            case 'indigo': return 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400';
                            case 'pink': return 'bg-pink-100 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400';
                            default: return 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400';
                          }
                        })()}`}
                      >
                        {(data.order_statuses || []).map(s => (
                          <option key={s.name} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5 font-black text-slate-400 text-[11px]">
                      {order.id_venda || '#N/A'}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const isPaid = order.status === 'Pago' || order.status === 'Enviado' || order.status === 'Entregue';
                          updateSaleStatus(order.id_venda, isPaid ? 'Pendente' : 'Pago');
                        }}
                        className={`p-1.5 rounded-lg transition-all ${
                          (order.status === 'Pago' || order.status === 'Enviado' || order.status === 'Entregue')
                            ? 'bg-blue-500/10 text-blue-600'
                            : 'hover:bg-slate-100 text-slate-300 dark:text-slate-700'
                        }`}
                        title={order.status === 'Pago' ? 'Marcar como Pendente' : 'Marcar como Pago'}
                      >
                        <CreditCard className="w-3.5 h-3.5 mx-auto" />
                      </button>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const isSent = order.status === 'Enviado' || order.status === 'Entregue';
                          updateSaleStatus(order.id_venda, isSent ? 'Pago' : 'Enviado');
                        }}
                        className={`p-1.5 rounded-lg transition-all ${
                          (order.status === 'Enviado' || order.status === 'Entregue')
                            ? 'bg-purple-500/10 text-purple-600'
                            : 'hover:bg-slate-100 text-slate-300 dark:text-slate-700'
                        }`}
                        title={order.status === 'Enviado' ? 'Marcar como Pago' : 'Marcar como Enviado'}
                      >
                        <TruckIcon className="w-3.5 h-3.5 mx-auto" />
                      </button>
                    </td>
                    <td className="px-2 py-1.5 font-black text-slate-900 dark:text-white text-[11px]">
                      {order.nome_cliente || 'N/A'}
                    </td>
                    <td className="px-3 py-2.5 font-bold">
                      <div className="flex items-center gap-1.5">
                        <Instagram className="w-3 h-3 text-pink-500" />
                        {order.instagram && order.instagram !== '-' ? (
                          <a 
                            href={`https://instagram.com/${order.instagram.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-pink-500 dark:text-pink-400 hover:underline transition-all"
                          >
                            {order.instagram}
                          </a>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-2">
                        {getCustomerContact(order) !== '-' ? (
                          <>
                            <a 
                              href={`tel:${getCustomerContact(order)}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-bold text-slate-500 hover:text-purple-600 transition-colors text-[11px]"
                            >
                              {getCustomerContact(order)}
                            </a>
                            <a
                              href={getWhatsAppLink(order)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded transition-all"
                              title="Abrir WhatsApp"
                            >
                              <MessageCircle className="w-2.5 h-2.5" />
                            </a>
                          </>
                        ) : (
                          <span className="font-bold text-slate-300 text-[11px]">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="text-slate-900 dark:text-white font-black text-[11px]">
                        {formatCurrency(Number(order.pvp))}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-rose-500">
                      {formatCurrency(Number(order.descontos || 0))}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-slate-400">
                      {formatCurrency(
                        order.items?.reduce((sum: number, item: any) => sum + (Number(item.base) || 0), 0) || 
                        (Number(order.pvp || 0) - Number(order.lucro || 0))
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="text-emerald-600 dark:text-emerald-400 font-black">
                        {formatCurrency(Number(order.lucro))}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-slate-600">
                      {formatCurrency(Number(order.portes || 0))}
                    </td>
                    <td className="px-3 py-2.5 font-black text-blue-500">
                      {order.forma_de_pagamento || 'N/A'}
                    </td>
                    <td className="px-3 py-2.5 font-black text-purple-600">
                      {order.site_kyte || 'KYTE'}
                    </td>
                  </tr>

                  {/* Expanded Items Row */}
                  {/* Expanded Items as Sub-Rows (Perfect Alignment) */}
                  <AnimatePresence>
                    {expandedOrders.has(index) && (
                      <>
                        {/* Sub-header row */}
                        <tr className="bg-slate-50/50 dark:bg-slate-900/40 divide-y-0">
                          <td className="px-6 py-2"></td>
                          <td colSpan={13} className="px-6 py-2">
                            <div className="flex items-center gap-2">
                              <Package className="w-3.5 h-3.5 text-purple-400" />
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Produtos desta encomenda</span>
                            </div>
                          </td>
                        </tr>

                        {/* Item rows */}
                        {order.items?.map((item: any, i: number) => (
                          <motion.tr
                            key={`item-${index}-${i}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-slate-50/30 dark:bg-slate-900/20 border-l-2 border-l-purple-500/30 hover:bg-purple-500/5 transition-colors"
                          >
                            <td className="px-6 py-3"></td>
                            <td className="px-6 py-3 text-[10px] font-black text-slate-400">ITEM {i + 1}</td>
                            <td className="px-6 py-3">
                              <div className="w-8 h-8 rounded-lg bg-white dark:bg-white/5 flex items-center justify-center font-bold text-slate-400 text-[10px] border border-slate-100 dark:border-white/5">
                                {item.ref}
                              </div>
                            </td>
                            <td className="px-6 py-3 min-w-[200px]">
                              <div className="flex flex-col">
                                <span className="font-black text-slate-900 dark:text-white text-[11px]">{item.designacao || 'Unknown'}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Quantidade: {item.quantidade || 1}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3"></td> {/* Portes space */}
                            <td className="px-6 py-3"></td> {/* Descontos space */}
                            <td className="px-6 py-3 text-right">
                              <div className="flex flex-col justify-end">
                                <span className="text-[8px] font-black text-slate-400 uppercase leading-none mb-0.5">Preço Un.</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">{formatCurrency(Number(item.pvp))}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3 text-right">
                              <div className="flex flex-col justify-end">
                                <span className="text-[8px] font-black text-emerald-400 uppercase leading-none mb-0.5 whitespace-nowrap">Lucro Item</span>
                                <span className="font-black text-emerald-600 dark:text-emerald-400 text-[11px]">{formatCurrency(Number(item.lucro))}</span>
                              </div>
                            </td>
                            <td colSpan={6} className="px-6 py-3"></td> {/* Remaining columns */}
                          </motion.tr>
                        ))}

                        {/* Action Buttons & Status History */}
                        <tr className="bg-slate-50/50 dark:bg-slate-900/40 divide-y-0 border-t border-slate-200 dark:border-white/5">
                          <td className="px-6 py-4"></td>
                          <td colSpan={13} className="px-6 py-4">
                            <div className="flex flex-wrap items-center gap-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrderForInvoice(order);
                                  setShowInvoiceModal(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all group shadow-sm"
                              >
                                <FileText className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
                                Ver Resumo / Fatura
                              </button>
                            </div>

                            {/* Status History */}
                            {order.status_history && order.status_history.length > 0 && (
                              <div className="mt-6 border-t border-slate-200 dark:border-white/5 pt-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Histórico de Status</span>
                                </div>
                                <div className="space-y-2">
                                  {order.status_history.map((h: any, i: number) => (
                                    <div key={i} className="flex items-center gap-3 text-[10px]">
                                      <span className="font-black text-slate-400 w-24">
                                        {new Date(h.timestamp).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                      <span className={`px-2 py-0.5 rounded-md font-bold uppercase ${(() => {
                                        const statusConfig = data.order_statuses?.find(s => s.name === h.status);
                                        if (!statusConfig) return 'bg-slate-100 text-slate-600';
                                        
                                        switch(statusConfig.color) {
                                          case 'blue': return 'bg-blue-100 text-blue-600';
                                          case 'purple': return 'bg-purple-100 text-purple-600';
                                          case 'emerald': return 'bg-emerald-100 text-emerald-600';
                                          case 'rose': return 'bg-rose-100 text-rose-600';
                                          case 'amber': return 'bg-amber-100 text-amber-600';
                                          case 'indigo': return 'bg-indigo-100 text-indigo-600';
                                          case 'pink': return 'bg-pink-100 text-pink-600';
                                          default: return 'bg-slate-100 text-slate-600';
                                        }
                                      })()}`}>
                                        {h.status}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>

                        {/* Spacing bottom row */}
                        <tr className="h-4 bg-transparent"><td colSpan={14}></td></tr>
                      </>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {filteredItems.length === 0 && (
            <div className="p-20 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Nenhuma encomenda encontrada</p>
            </div>
          )}
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-3 text-[10px] text-slate-500 font-black uppercase tracking-widest text-center border-t border-slate-100 dark:border-slate-800">
          Exibindo {filteredItems.length} encomendas
        </div>
      </div>

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
                    <button
                      onClick={() => {
                        const printable = document.getElementById('printable-invoice');
                        if (!printable) return;
                        
                        const WinPrint = window.open('', '', 'width=900,height=800');
                        WinPrint?.document.write(`
                          <html>
                            <head>
                              <title>Fatura ${selectedOrderForInvoice.id_venda}</title>
                              <style>
                                body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
                                .invoice-box { max-width: 800px; margin: auto; }
                                .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; }
                                .logo { font-size: 28px; font-weight: 900; color: #7c3aed; }
                                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
                                .label { font-size: 10px; font-weight: 900; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; margin-bottom: 4px; }
                                .value { font-size: 14px; font-weight: 700; }
                                table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
                                th { text-align: left; font-size: 10px; font-weight: 900; text-transform: uppercase; color: #94a3b8; border-bottom: 1px solid #f1f5f9; padding: 12px 8px; }
                                td { padding: 12px 8px; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 600; }
                                .total-section { margin-left: auto; width: 250px; }
                                .total-row { display: flex; justify-content: space-between; padding: 4px 0; }
                                .grand-total { border-top: 2px solid #7c3aed; margin-top: 10px; padding-top: 10px; font-size: 18px; font-weight: 900; color: #7c3aed; }
                                @media print { .no-print { display: none; } }
                              </style>
                            </head>
                            <body>
                              <div class="invoice-box">
                                <div class="header">
                                  <div class="logo">LUZ</div>
                                  <div style="text-align: right">
                                    <div class="label">ID VENDA</div>
                                    <div class="value" style="font-size: 20px">#${selectedOrderForInvoice.id_venda}</div>
                                    <div class="label" style="margin-top: 8px">DATA</div>
                                    <div class="value">${new Date(selectedOrderForInvoice.data_venda).toLocaleDateString('pt-PT')}</div>
                                  </div>
                                </div>
                                
                                <div class="info-grid">
                                  <div>
                                    <div class="label">CLIENTE</div>
                                    <div class="value">${selectedOrderForInvoice.nome_cliente}</div>
                                    <div class="label" style="margin-top: 12px">CONTACTO</div>
                                    <div class="value">${selectedOrderForInvoice.telefone || '-'}</div>
                                  </div>
                                  <div>
                                    <div class="label">FORMA DE PAGAMENTO</div>
                                    <div class="value">${selectedOrderForInvoice.forma_de_pagamento || '-'}</div>
                                    <div class="label" style="margin-top: 12px">MÉTODO DE ENVIO</div>
                                    <div class="value">${selectedOrderForInvoice.loja_ctt || 'CTT'}</div>
                                  </div>
                                </div>

                                <table>
                                  <thead>
                                    <tr>
                                      <th>Artigo</th>
                                      <th style="text-align: center">Qtd</th>
                                      <th style="text-align: right">Preço Un.</th>
                                      <th style="text-align: right">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    ${(selectedOrderForInvoice.items || []).map((item: any) => `
                                      <tr>
                                        <td>${item.designacao}</td>
                                        <td style="text-align: center">${item.quantidade}</td>
                                        <td style="text-align: right">${new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(Number(item.pvp) / Number(item.quantidade))}</td>
                                        <td style="text-align: right">${new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(Number(item.pvp))}</td>
                                      </tr>
                                    `).join('')}
                                  </tbody>
                                </table>

                                <div class="total-section">
                                  <div class="total-row">
                                    <span class="label">Subtotal</span>
                                    <span class="value">${new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(Number(selectedOrderForInvoice.pvp) - Number(selectedOrderForInvoice.portes || 0) + Number(selectedOrderForInvoice.descontos || 0))}</span>
                                  </div>
                                  <div class="total-row">
                                    <span class="label">Portes</span>
                                    <span class="value">${new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(Number(selectedOrderForInvoice.portes || 0))}</span>
                                  </div>
                                  <div class="total-row">
                                    <span class="label" style="color: #ef4444">Descontos</span>
                                    <span class="value" style="color: #ef4444">-${new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(Number(selectedOrderForInvoice.descontos || 0))}</span>
                                  </div>
                                  <div class="total-row grand-total">
                                    <span>TOTAL</span>
                                    <span>${new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(Number(selectedOrderForInvoice.pvp))}</span>
                                  </div>
                                </div>
                              </div>
                            </body>
                          </html>
                        `);
                        WinPrint?.document.close();
                        WinPrint?.focus();
                        setTimeout(() => {
                          WinPrint?.print();
                          WinPrint?.close();
                        }, 500);
                      }}
                      className="p-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors flex items-center gap-2 text-xs font-black uppercase tracking-widest"
                    >
                      <Printer className="w-4 h-4" />
                      Gerar PDF / Imprimir
                    </button>
                    <button onClick={() => setShowInvoiceModal(false)} className="p-2.5 bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-rose-500 rounded-xl transition-colors">
                      <X className="w-5 h-5" />
                    </button>
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
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
