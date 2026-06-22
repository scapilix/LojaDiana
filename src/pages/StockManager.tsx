import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
} from 'lucide-react';
import React from 'react';
import { useStockLogic, StockStatus } from '../hooks/useStockLogic';
import { useData } from '../contexts/DataContext';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusBadge } from '../components/ui/StatusBadge';

export default function StockManager() {
  const { data, addPurchase, addProduct, updateProduct, updateSizes, updateColors } = useData();
  const stockInventory = useStockLogic();
  const [searchTerm, _setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isManualSize, setIsManualSize] = useState(false);
  const [isManualColor, setIsManualColor] = useState(false);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);
  };

  const [formData, setFormData] = useState({
    ref: '',
    quantidade: 1,
    data_compra: new Date().toISOString().split('T')[0],
    fornecedor: '',
    preco_custo: '',
    nome_artigo: '',
    pvp: '',
    size: '',
    color: ''
  });

  const isNewItem = useMemo(() => {
    if (!formData.ref || formData.ref.length < 2) return false;
    // Check if ref exists in inventory
    const exists = stockInventory.find(item => item.ref === formData.ref);
    return !exists;
  }, [formData.ref, stockInventory]);

  const projectedProfit = useMemo(() => {
    if (!formData.pvp || !formData.preco_custo) return null;
    return Number(formData.pvp) - Number(formData.preco_custo);
  }, [formData.pvp, formData.preco_custo]);

  const selectedItemData = useMemo(() => {
    if (!formData.ref || formData.ref.length < 2) return null;
    return stockInventory.find(item => item.ref === formData.ref) || null;
  }, [formData.ref, stockInventory]);

  // Sorting State
  const [sortConfig] = useState<{ key: keyof StockStatus | 'profit_unit'; direction: 'asc' | 'desc' } | null>(null);

  const filteredStock = useMemo(() => {
    let result = stockInventory.filter(item =>
      (item.ref || '').includes(searchTerm.toUpperCase()) ||
      (item.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortConfig) {
      result.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof StockStatus];
        let bValue: any = b[sortConfig.key as keyof StockStatus];

        // Handle undefined values
        if (aValue === undefined) aValue = -Infinity;
        if (bValue === undefined) bValue = -Infinity;
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [stockInventory, searchTerm, sortConfig]);

  const handleAddPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ref || formData.quantidade <= 0) return;

    try {
      setIsSubmitting(true);

      // If new item, register it first
      if (isNewItem) {
        if (!formData.nome_artigo || !formData.pvp) {
          alert('Por favor preencha os dados do novo artigo (Nome e PVP).');
          setIsSubmitting(false);
          return;
        }

        await addProduct({
          ref: formData.ref,
          nome_artigo: formData.nome_artigo,
          pvp_cica: Number(formData.pvp),
          base_price: Number(formData.preco_custo),
          iva: 0.23, // Defaulting to 23% for now or 0
          lucro_meu_faturado: (Number(formData.pvp) - Number(formData.preco_custo)),
          fornecedor: formData.fornecedor || 'Desconhecido'
        });
      }

      await addPurchase({
        ref: formData.ref,
        quantidade: Number(formData.quantidade),
        data_compra: formData.data_compra,
        fornecedor: formData.fornecedor,
        preco_custo: formData.preco_custo ? Number(formData.preco_custo) : undefined,
        size: formData.size || undefined,
        color: formData.color || undefined
      });

      // Sync variations with product catalog if they are new
      if (selectedItemData) {
        const newSize = (formData.size || '').trim().toUpperCase();
        const newColor = (formData.color || '').trim();

        const hasNewSize = newSize && !selectedItemData.sizes?.includes(newSize);
        const hasNewColor = newColor && !selectedItemData.colors?.includes(newColor);

        if (hasNewSize || hasNewColor) {
          const updatedSizes = hasNewSize ? Array.from(new Set([...(selectedItemData.sizes || []), newSize])) : selectedItemData.sizes;
          const updatedColors = hasNewColor ? Array.from(new Set([...(selectedItemData.colors || []), newColor])) : selectedItemData.colors;

          // Also update global settings if it's a completely new value for the whole store
          if (hasNewSize && !data.sizes?.includes(newSize)) await updateSizes([...(data.sizes || []), newSize]);
          if (hasNewColor && !data.colors?.includes(newColor)) await updateColors([...(data.colors || []), newColor]);

          await updateProduct(formData.ref, {
            sizes: updatedSizes,
            colors: updatedColors
          });
        }
      }

      setIsAddModalOpen(false);
      setFormData({
        ref: '',
        quantidade: 1,
        data_compra: new Date().toISOString().split('T')[0],
        fornecedor: '',
        preco_custo: '',
        nome_artigo: '',
        pvp: '',
        size: '',
        color: ''
      });
      setIsManualSize(false);
      setIsManualColor(false);
    } catch (error) {
      console.error('Error adding purchase:', error);
      alert('Erro ao registar compra. Verifique a consola.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Inventário" />
      <div className="flex-1 overflow-y-auto p-5 bg-[hsl(38_25%_96%)]">
        <div className="bg-white rounded-[14px] border border-[hsl(35_18%_90%)] shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
          {filteredStock.length === 0 ? (
            <EmptyState title="Sem inventário" description="Importe dados para ver o inventário" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[hsl(35_18%_92%)]">
                  {['Ref', 'Produto', 'Stock Actual', 'Stock Mínimo', 'Estado'].map(h => (
                    <th key={h} className="text-left text-[9px] font-bold text-[hsl(30_8%_55%)] uppercase tracking-[0.07em] px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStock.map((item, idx) => {
                  const isLow = item.status !== 'ok';
                  return (
                    <tr key={item.ref ?? idx} className="border-b border-[hsl(35_18%_96%)] hover:bg-[hsl(38_25%_98%)] transition-colors">
                      <td className="px-4 py-2.5 text-[11px] font-bold text-[hsl(340_72%_45%)]">{item.ref}</td>
                      <td className="px-4 py-2.5 text-[11px] font-semibold text-[hsl(20_15%_8%)]">{item.name}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-bold text-[hsl(20_15%_8%)]">{item.current_stock}</span>
                          {isLow && (
                            <span className="text-[9px] font-bold bg-[#fef2f2] text-[#dc2626] px-1.5 py-0.5 rounded-full">
                              ⚠ Baixo
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-[11px] text-[hsl(30_8%_55%)]">—</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={isLow ? 'Erro' : 'Activo'} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Purchase Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-950 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black text-slate-950 dark:text-white tracking-tight">Registar Compra</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Entrada de material</p>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleAddPurchase} className="p-8 space-y-6">
                {/* Autocomplete for Reference */}
                <div className="space-y-2 relative">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Referência / Produto</label>
                  <input
                    type="text"
                    required
                    value={formData.ref}
                    onChange={(e) => setFormData({ ...formData, ref: e.target.value })}
                    className="w-full px-4 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-bold uppercase transition-all"
                    placeholder="Comece a escrever para pesquisar..."
                    autoComplete="off"
                  />

                  {/* Suggestions list */}
                  {formData.ref.length > 1 && !stockInventory.find(s => s.ref === formData.ref) && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-white/10 z-50 max-h-60 overflow-y-auto">
                      {stockInventory
                        .filter(item =>
                          item.ref.includes(formData.ref.toUpperCase()) ||
                          (item.name || '').toLowerCase().includes(formData.ref.toLowerCase())
                        )
                        .slice(0, 5)
                        .map(suggestion => (
                          <button
                            key={suggestion.ref}
                            type="button"
                            onClick={() => setFormData({
                              ...formData,
                              ref: suggestion.ref,
                              fornecedor: suggestion.supplier || formData.fornecedor
                            })}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 flex flex-col border-b border-slate-50 dark:border-white/5 last:border-0"
                          >
                            <span className="font-black text-xs text-slate-900 dark:text-white">{suggestion.ref}</span>
                            <span className="text-[10px] text-slate-500 truncate">{suggestion.name}</span>
                          </button>
                        ))
                      }
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {isNewItem && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 overflow-hidden"
                    >
                      <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-2xl border border-purple-100 dark:border-purple-500/10">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white">
                            <Plus className="w-3 h-3" />
                          </div>
                          <span className="font-black text-sm text-purple-700 dark:text-purple-300">Novo Artigo Detetado</span>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Artigo</label>
                            <input
                              type="text"
                              required={isNewItem}
                              value={formData.nome_artigo}
                              onChange={(e) => setFormData({ ...formData, nome_artigo: e.target.value })}
                              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-500/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-bold"
                              placeholder="Ex: Capa Silicone IPhone 15"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço Custo (€)</label>
                              <input
                                type="number"
                                step="0.01"
                                required={isNewItem}
                                value={formData.preco_custo}
                                onChange={(e) => setFormData({ ...formData, preco_custo: e.target.value })}
                                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-500/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-bold"
                                placeholder="0.00"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PVP Venda (€)</label>
                              <input
                                type="number"
                                step="0.01"
                                required={isNewItem}
                                value={formData.pvp}
                                onChange={(e) => setFormData({ ...formData, pvp: e.target.value })}
                                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-500/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-bold"
                                placeholder="0.00"
                              />
                            </div>
                          </div>

                          {projectedProfit !== null && (
                            <div className="flex justify-between items-center px-3 py-2 bg-white/50 dark:bg-slate-900/50 rounded-xl">
                              <span className="text-xs font-bold text-slate-500">Lucro Estimado:</span>
                              <span className={`text-sm font-black ${projectedProfit > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {formatCurrency(projectedProfit)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Variation Settings */}
                {/* Variation Settings */}
                {selectedItemData && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-1 gap-4 bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      {/* Size Selector */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between ml-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tamanho</label>
                          <button
                            type="button"
                            onClick={() => setIsManualSize(!isManualSize)}
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-lg transition-colors ${isManualSize ? 'bg-purple-600 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500'}`}
                          >
                            {isManualSize ? 'Lista' : 'Manual'}
                          </button>
                        </div>
                        {isManualSize ? (
                          <input
                            type="text"
                            value={formData.size}
                            onChange={(e) => setFormData({ ...formData, size: e.target.value.toUpperCase() })}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-500/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-bold"
                            placeholder="Ex: XL"
                          />
                        ) : (
                          <select
                            value={formData.size}
                            onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-bold appearance-none"
                          >
                            <option value="">Nenhum</option>
                            {/* Merge global and product specific for convenience */}
                            {Array.from(new Set([...(data.sizes || []), ...(selectedItemData.sizes || [])])).map((s: string) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Color Selector */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between ml-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cor</label>
                          <button
                            type="button"
                            onClick={() => setIsManualColor(!isManualColor)}
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-lg transition-colors ${isManualColor ? 'bg-purple-600 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500'}`}
                          >
                            {isManualColor ? 'Lista' : 'Manual'}
                          </button>
                        </div>
                        {isManualColor ? (
                          <input
                            type="text"
                            value={formData.color}
                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-500/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-bold"
                            placeholder="Ex: Vermelho"
                          />
                        ) : (
                          <select
                            value={formData.color}
                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-bold appearance-none"
                          >
                            <option value="">Nenhuma</option>
                            {Array.from(new Set([...(data.colors || []), ...(selectedItemData.colors || [])])).map((c: string) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantidade</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.quantidade}
                      onChange={(e) => setFormData({ ...formData, quantidade: Number(e.target.value) })}
                      className="w-full px-4 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data</label>
                    <input
                      type="date"
                      required
                      value={formData.data_compra}
                      onChange={(e) => setFormData({ ...formData, data_compra: e.target.value })}
                      className="w-full px-4 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fornecedor (Opcional)</label>
                  <input
                    type="text"
                    value={formData.fornecedor}
                    onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })}
                    className="w-full px-4 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-bold"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'A Guardar...' : 'Confirmar Entrada'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
