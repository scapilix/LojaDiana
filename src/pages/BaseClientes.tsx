import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, Search, Instagram, MapPin, ShoppingBag, Clock, Calendar, ChevronsRight, Users, Wallet, Save } from 'lucide-react';
import { useDashboardData } from '../hooks/useDashboardData';
import { useFilters } from '../contexts/FilterContext';
import { useData } from '../contexts/DataContext';
import { SmartDateFilter } from '../components/SmartDateFilter';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';

export default function BaseClientes() {
  const { filters, setFilters } = useFilters();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const {
    allCustomers,
    isFiltered,
    availableFilters,
    filterCounts
  } = useDashboardData(filters);

  const { updateCustomer } = useData();
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [newBalance, setNewBalance] = useState<number>(0);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('pt-PT');
  };

  const copyToClipboard = (text: string) => {
    if (!text || text === '-' || text === 'N/A') return;
    navigator.clipboard.writeText(text);
  };

  // Filter based on search term
  const displayedCustomers = allCustomers.filter(customer => {
    const search = searchTerm.toLowerCase();
    return (
      String(customer.name || '').toLowerCase().includes(search) ||
      String(customer.address || '').toLowerCase().includes(search) ||
      String(customer.zipCode || '').toLowerCase().includes(search) ||
      String(customer.city || '').toLowerCase().includes(search) ||
      String(customer.instagram || '').toLowerCase().includes(search) ||
      String(customer.phone || '').toLowerCase().includes(search) ||
      String(customer.email || '').toLowerCase().includes(search)
    );
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Base de Clientes"
        subtitle={`${allCustomers.length} clientes`}
        filters={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[hsl(38_25%_97%)] border border-[hsl(35_18%_88%)] rounded-[10px] px-2.5 py-1.5">
              <Filter className="w-3 h-3 text-[hsl(30_8%_60%)]" />
              <span className="text-[10px] font-semibold text-[hsl(30_8%_55%)] uppercase tracking-wide">Filtros</span>
            </div>
            <div className="scale-90 origin-left">
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
                className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded-[10px] text-[10px] font-semibold uppercase tracking-wide transition-all"
              >
                <X className="w-3 h-3" />
                Limpar
              </button>
            )}
          </div>
        }
        actions={
          <div className="flex items-center gap-2 bg-[hsl(38_25%_97%)] border border-[hsl(35_18%_88%)] rounded-[10px] px-3 py-1.5">
            <Search className="h-3.5 w-3.5 text-[hsl(30_8%_60%)]" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar cliente..."
              className="bg-transparent text-[12px] outline-none w-36 placeholder:text-[hsl(30_8%_65%)]"
            />
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-5 bg-[hsl(38_25%_96%)]">
        {displayedCustomers.length === 0 ? (
          <EmptyState
            title="Sem clientes"
            description="Os clientes aparecem automaticamente com as encomendas importadas"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayedCustomers.map((customer, idx) => (
              <div
                key={customer.instagram ?? customer.name ?? idx}
                onClick={() => setSelectedCustomer(customer)}
                className="bg-white rounded-[14px] border border-[hsl(35_18%_90%)] shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-base text-[hsl(340_72%_45%)] flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, hsl(340 40% 90%), hsl(340 40% 82%))' }}
                  >
                    {(customer.instagram && customer.instagram !== 'N/A' && customer.instagram !== '-'
                      ? customer.instagram
                      : customer.name ?? '?')[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-[hsl(20_15%_8%)] truncate">{customer.name || 'Sem Nome'}</p>
                    <p className="text-[10px] text-[hsl(30_8%_55%)] truncate flex items-center gap-1">
                      {customer.instagram && customer.instagram !== 'N/A' && customer.instagram !== '-' ? (
                        <>
                          <Instagram className="w-3 h-3 text-pink-500 flex-shrink-0" />
                          {customer.instagram}
                        </>
                      ) : (
                        <span className="italic">Sem Instagram</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="bg-[hsl(38_25%_97%)] rounded-[8px] p-2">
                    <p className="text-[9px] text-[hsl(30_8%_60%)] font-semibold uppercase tracking-wide mb-0.5">Total gasto</p>
                    <p className="text-[13px] font-bold text-[hsl(20_15%_8%)]">{formatCurrency(customer.revenue ?? 0)}</p>
                  </div>
                  <div className="bg-[hsl(38_25%_97%)] rounded-[8px] p-2">
                    <p className="text-[9px] text-[hsl(30_8%_60%)] font-semibold uppercase tracking-wide mb-0.5">Encomendas</p>
                    <p className="text-[13px] font-bold text-[hsl(20_15%_8%)]">{customer.orders ?? 0}</p>
                  </div>
                </div>

                {customer.city && customer.city !== '-' && customer.city !== 'N/A' && (
                  <p className="text-[10px] text-[hsl(30_8%_60%)] flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {customer.city}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Customer Details Modal (Drawer) - Rendered via Portal */}
      <AnimatePresence>
        {selectedCustomer && (
          <>
            {createPortal(
              <div className="fixed inset-0 z-[100] flex justify-end pointer-events-none">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedCustomer(null)}
                  className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
                />
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="relative h-full w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto border-l border-slate-200 dark:border-slate-700 pointer-events-auto"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">{selectedCustomer.name}</h2>
                        <p className="text-slate-800 dark:text-slate-200 text-sm font-black">Histórico de Relacionamento</p>
                      </div>
                      <button
                        onClick={() => setSelectedCustomer(null)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      <div className="p-4 bg-purple-100 dark:bg-purple-900/40 rounded-2xl border border-purple-200 dark:border-purple-800/20">
                        <div className="text-purple-800 dark:text-purple-300 font-black text-[8px] uppercase mb-1 leading-none">Total Gasto</div>
                        <div className="text-lg font-black text-slate-900 dark:text-white leading-none">{formatCurrency(selectedCustomer.revenue)}</div>
                      </div>
                      <div className="p-4 bg-blue-100 dark:bg-blue-900/40 rounded-2xl border border-blue-200 dark:border-blue-800/20">
                        <div className="text-blue-800 dark:text-blue-300 font-black text-[8px] uppercase mb-1 leading-none">Compras</div>
                        <div className="text-lg font-black text-slate-900 dark:text-white leading-none">{selectedCustomer.orders}</div>
                      </div>
                      <div className="p-4 bg-emerald-100 dark:bg-emerald-900/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/20 group relative overflow-hidden">
                        <div className="text-emerald-800 dark:text-emerald-300 font-black text-[8px] uppercase mb-1 leading-none">Saldo</div>
                        <div className="flex items-end gap-2">
                          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 leading-none">{formatCurrency(selectedCustomer.saldo || 0)}</div>
                          <button
                            onClick={() => { setIsEditingBalance(true); setNewBalance(selectedCustomer.saldo || 0); }}
                            className="bg-emerald-500 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ChevronsRight className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isEditingBalance && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1.5"><Wallet className="w-3 h-3" /> Ajustar Saldo</span>
                            <button onClick={() => setIsEditingBalance(false)} className="text-slate-400 hover:text-rose-500"><X className="w-4 h-4" /></button>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1 relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</span>
                              <input
                                type="number"
                                value={newBalance}
                                onChange={(e) => setNewBalance(parseFloat(e.target.value) || 0)}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-7 pr-3 text-sm font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20"
                              />
                            </div>
                            <button
                              onClick={async () => {
                                await updateCustomer(selectedCustomer.name, { saldo: newBalance });
                                setSelectedCustomer({ ...selectedCustomer, saldo: newBalance });
                                setIsEditingBalance(false);
                              }}
                              className="px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex items-center gap-2 transition-all active:scale-95"
                            >
                              <Save className="w-4 h-4" />
                              <span className="text-[10px] font-black uppercase">Salvar</span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Contact Info Detail */}
                    <div className="space-y-4 mb-8">
                      <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Informações de Contacto
                      </h3>

                      <div className="grid grid-cols-1 gap-3">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-all">
                          <div className="flex justify-between items-start mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">
                            <span className="text-[10px] font-black text-slate-500 uppercase">Morada Completa</span>
                          </div>

                          <div className="space-y-3">
                            <div
                              className="group flex justify-between items-center cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-700/50 p-2 rounded-lg transition-all border border-transparent hover:border-purple-200 dark:hover:border-purple-800/30"
                              onClick={() => copyToClipboard(selectedCustomer.address)}
                            >
                              <div className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                                {selectedCustomer.address || '-'}
                              </div>
                              <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Copiar Morada</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div
                                className="group cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-700/50 p-2 rounded-lg transition-all border border-transparent hover:border-purple-200 dark:hover:border-purple-800/30"
                                onClick={() => copyToClipboard(selectedCustomer.zipCode)}
                              >
                                <div className="flex justify-between items-center mb-0.5">
                                  <span className="text-[9px] font-black text-slate-400 uppercase">Cód. Postal</span>
                                  <span className="text-[9px] text-purple-600 dark:text-purple-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Copiar</span>
                                </div>
                                <div className="text-sm font-bold text-slate-900 dark:text-white">
                                  {selectedCustomer.zipCode || '-'}
                                </div>
                              </div>

                              <div
                                className="group cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-700/50 p-2 rounded-lg transition-all border border-transparent hover:border-purple-200 dark:hover:border-purple-800/30"
                                onClick={() => copyToClipboard(selectedCustomer.city)}
                              >
                                <div className="flex justify-between items-center mb-0.5">
                                  <span className="text-[9px] font-black text-slate-400 uppercase">Localidade</span>
                                  <span className="text-[9px] text-purple-600 dark:text-purple-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Copiar</span>
                                </div>
                                <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                  {selectedCustomer.city || '-'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div
                            className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-purple-400 transition-all group"
                            onClick={() => copyToClipboard(selectedCustomer.email)}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-[10px] font-black text-slate-500 uppercase">Email</span>
                              <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">Copiar</span>
                            </div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {selectedCustomer.email || '-'}
                            </div>
                          </div>

                          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div className="text-[10px] font-black text-slate-500 uppercase mb-1">Telefone</div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white">
                              {selectedCustomer.phone || '-'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-6">
                      <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Histórico de Pedidos
                      </h3>

                      {selectedCustomer.history && selectedCustomer.history.length > 0 ? (
                        <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-3 space-y-8 pl-6 pb-2">
                          {selectedCustomer.history.map((order: any, i: number) => (
                            <div key={i} className="relative">
                              <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 bg-purple-500" />

                              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300">
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(order.data_venda)}
                                  </span>
                                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(Number(order.pvp))}
                                  </span>
                                </div>

                                <div className="text-xs text-slate-800 dark:text-slate-300 mb-2 font-mono font-bold">
                                  {order.id_venda || '#N/A'} • {order.forma_de_pagamento}
                                </div>

                                <div className="space-y-1">
                                  {order.items?.map((item: any, k: number) => (
                                    <div key={k} className="flex justify-between items-center text-xs border-b border-dashed border-slate-200 dark:border-slate-700/50 last:border-0 pb-1 last:pb-0">
                                      <span className="text-slate-700 dark:text-slate-300">{item.designacao || item.ref}</span>
                                      <span className="text-slate-500">x{item.quantidade || 1}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <EmptyState
                          icon={<ShoppingBag className="w-8 h-8" />}
                          title="Sem pedidos"
                          description="Este cliente ainda não realizou compras."
                        />
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>,
              document.body
            )}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
