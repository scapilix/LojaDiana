import { useState, useMemo } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Database,
  Search,
  Plus, // This icon is explicitly mentioned to be removed from Settings.tsx, but not BaseItems.tsx. Keeping it as it's not explicitly removed from *this* file.
  Package,
  History,
  Tag, // This icon is explicitly mentioned to be removed from Settings.tsx, but not BaseItems.tsx. Keeping it as it's not explicitly removed from *this* file.
  Loader2,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  X,
  Edit3,
  Pencil,
  Camera,
  Expand,
  Globe,
  GlobeLock,
  CheckSquare,
  Square,
  Filter,
  Star,
  StarOff
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { uploadToSupabase } from '../lib/upload';
import { ImageZoomModal } from '../components/Loja/ImageZoomModal';
import { supabase } from '../lib/supabase';
import { useStockLogic } from '../hooks/useStockLogic';

interface ProductCatalogItem {
  ref: string;
  nome_artigo: string;
  pvp_cica: number;
  base_price?: number;
  iva: number;
  lucro_meu_faturado: number;
  fornecedor: string;
  image_url?: string;
  description?: string;
  categoria?: string;
  promo_price?: number;
  promo_start?: string;
  promo_end?: string;
  published?: boolean;
  featured?: boolean;
  additional_images?: string[];
  sizes?: string[];
  colors?: string[];
  color_images?: { [color: string]: string };
}

export default function BaseItems() {
  const { data, addPurchase, addProduct, deleteProduct, updateProduct, bulkUpdateProducts, deletePurchase, updatePurchase, updateAllProductsVisibility, clearAllItems, isLoading, setData } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<ProductCatalogItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [zoomedProduct, setZoomedProduct] = useState<any>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'stock'>('details');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedRefs, setSelectedRefs] = useState<Set<string>>(new Set());
  const [stockFilter, setStockFilter] = useState<string>('');
  const stockInventory = useStockLogic();

  const [stockFormData, setStockFormData] = useState({
    quantidade: 1,
    size: '',
    color: '',
    data_compra: new Date().toISOString().split('T')[0],
    preco_custo: ''
  });
  const [editingStockId, setEditingStockId] = useState<number | null>(null);
  const [editingStockData, setEditingStockData] = useState<any>(null);

  const [newItem, setNewItem] = useState<ProductCatalogItem>({
    ref: '',
    nome_artigo: '',
    pvp_cica: 0,
    base_price: 0,
    iva: 0.23,
    lucro_meu_faturado: 0,
    fornecedor: '',
    image_url: '',
    description: '',
    categoria: '',
    promo_price: 0,
    promo_start: '',
        sizes: [],
        colors: [],
        color_images: {},
        additional_images: [],
        published: true
      });

  // Combine catalogs and handle overrides
  const products = useMemo(() => {
    const excelProducts = data.products_catalog || [];
    const manualProducts = data.manual_products_catalog || [];

    // Create a map by ref, manual takes precedence
    const productMap = new Map<string, ProductCatalogItem>();
    excelProducts.forEach(p => productMap.set(p.ref, p));
    manualProducts.forEach(p => productMap.set(p.ref, { ...productMap.get(p.ref), ...p }));

    return Array.from(productMap.values());
  }, [data.products_catalog, data.manual_products_catalog]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    // Only include non-empty categories from products
    stockInventory.forEach(p => {
        if (p.categoria?.trim()) cats.add(p.categoria.trim());
    });
    // Include categories from settings (variations page)
    if (data.categories) {
        data.categories.forEach(cat => {
            if (cat?.trim()) cats.add(cat.trim());
        });
    }
    return Array.from(cats).sort();
  }, [stockInventory, data.categories]);

  const filteredProducts = useMemo(() => {
    // Index stockInventory for O(1) lookup during filter
    // We use a simple for loop for maximum speed
    const stockMap = new Map();
    for (let i = 0; i < stockInventory.length; i++) {
      stockMap.set(stockInventory[i].ref, stockInventory[i]);
    }

    const term = searchTerm.toLowerCase();
    
    let result = products.filter(p => {
      const matchesSearch = !term || p.nome_artigo.toLowerCase().includes(term) || p.ref.toLowerCase().includes(term);
      const matchesCategory = selectedCategory === '' || p.categoria === selectedCategory;
      
      // Stock Filter
      let matchesStock = true;
      if (stockFilter !== '') {
        const stockInfo = stockMap.get(p.ref);
        if (stockFilter === 'out') matchesStock = stockInfo?.status === 'out' || !stockInfo;
        else if (stockFilter === 'no_control') matchesStock = !stockInfo || stockInfo.total_purchased === 0;
        else if (stockFilter === 'ok') matchesStock = stockInfo?.status === 'ok';
        else if (stockFilter === 'low') matchesStock = stockInfo?.status === 'low' || stockInfo?.status === 'critical';
      }

      return matchesSearch && matchesCategory && matchesStock;
    });

    // Stable sort: Featured first, then Name
    const sorted = [...result].sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      const nameA = a.nome_artigo || '';
      const nameB = b.nome_artigo || '';
      return nameA.localeCompare(nameB);
    });

    return sorted;
  }, [products, searchTerm, selectedCategory, stockFilter, stockInventory]);

  const recentPurchases = useMemo(() => (data.purchases || [])
    .filter(p => p.ref === editingItem?.ref)
    .sort((a, b) => new Date(b.data_compra).getTime() - new Date(a.data_compra).getTime())
    .slice(0, 10), [data.purchases, editingItem?.ref]);


  const formatCurrency = (val: number) => {
    if (val === undefined || val === null) return '-';
    const num = typeof val === 'string' ? parseFloat(String(val).replace(/[^0-9.-]+/g, "")) : val;
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(num);
  };

  const handleEdit = (product: ProductCatalogItem) => {
    setEditingItem({
      ...product,
      sizes: product.sizes || [],
      colors: product.colors || []
    });
  };

  const handleDelete = async (ref: string) => {
    if (!window.confirm(`Tem a certeza que deseja eliminar o item ${ref}?`)) return;

    try {
      await deleteProduct(ref);
    } catch (err) {
      alert('Erro ao eliminar produto');
    }
  };

  const handleMigrate = async () => {
    if (!window.confirm('Isto irá mover todos os itens do Excel para a base de dados centralizada. Continuar?')) return;

    setIsMigrating(true);
    try {
      const excelProducts = data.products_catalog || [];
      const currentManual = data.manual_products_catalog || [];

      // Merge Excel into Manual
      const merged = [...currentManual];
      excelProducts.forEach(ep => {
        if (!merged.find(mp => mp.ref === ep.ref)) {
          merged.push(ep);
        }
      });

      const { error } = await supabase
        .from('loja_app_state')
        .upsert({ key: 'manual_products_catalog', value: merged });

      if (error) throw error;

      setData(prev => ({ ...prev, manual_products_catalog: merged }));
      alert('Migração concluída com sucesso!');
    } catch (err) {
      console.error('Migration error:', err);
      alert('Erro durante a migração');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'edit' | 'new', isMain: boolean = true) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);
      const urls: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const url = await uploadToSupabase(files[i], 'loja_artigos');
        if (url) urls.push(url);
      }

      if (urls.length > 0) {
        if (target === 'edit') {
          setEditingItem(prev => {
            if (!prev) return null;
            if (isMain) {
              return { ...prev, image_url: urls[0], additional_images: [...(prev.additional_images || []), ...urls.slice(1)] };
            } else {
              return { ...prev, additional_images: [...(prev.additional_images || []), ...urls] };
            }
          });
        } else {
          setNewItem(prev => {
            if (isMain) {
              return { ...prev, image_url: urls[0], additional_images: [...(prev.additional_images || []), ...urls.slice(1)] };
            } else {
              return { ...prev, additional_images: [...(prev.additional_images || []), ...urls] };
            }
          });
        }
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Erro ao carregar imagem');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      setIsSubmitting(true);
      await updateProduct(editingItem.ref, {
        ...editingItem,
        sizes: editingItem.sizes || [],
        colors: editingItem.colors || []
      });
      setEditingItem(null);
    } catch (err) {
      alert('Erro ao atualizar produto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.ref) return;

    try {
      setIsSubmitting(true);
      await addProduct({
        ...newItem,
        sizes: newItem.sizes || [],
        colors: newItem.colors || [],
        published: newItem.published !== false
      });
      setIsAddingNew(false);
      setNewItem({
        ref: '',
        nome_artigo: '',
        pvp_cica: 0,
        base_price: 0,
        iva: 0.23,
        lucro_meu_faturado: 0,
        fornecedor: '',
        image_url: '',
        description: '',
        color_images: {},
        additional_images: [],
        sizes: [],
        colors: [],
        published: true
      });
    } catch (err: any) {
      alert(err.message || 'Erro ao adicionar produto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || stockFormData.quantidade <= 0) return;

    try {
      setIsSubmitting(true);
      await addPurchase({
        ref: editingItem.ref,
        quantidade: Number(stockFormData.quantidade),
        data_compra: stockFormData.data_compra,
        size: stockFormData.size || undefined,
        color: stockFormData.color || undefined,
        preco_custo: stockFormData.preco_custo ? Number(stockFormData.preco_custo) : Number(editingItem.base_price || 0)
      });

      // Clear form
      setStockFormData({
        quantidade: 1,
        size: '',
        color: '',
        data_compra: new Date().toISOString().split('T')[0],
        preco_custo: ''
      });
      alert('Stock adicionado com sucesso!');
    } catch (error: any) {
      console.error('Error adding stock:', error);
      alert(`Erro ao adicionar stock: ${JSON.stringify(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePurchase = async (id: number) => {
    if (!confirm('Deseja eliminar este registo de entrada de stock?')) return;
    try {
      setIsSubmitting(true);
      await deletePurchase(id);
    } catch (err) {
      alert('Erro ao eliminar registo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditStock = (purchase: any) => {
    setEditingStockId(purchase.id);
    setEditingStockData({ ...purchase });
  };

  const handleUpdateStock = async () => {
    if (!editingStockId || !editingStockData) return;
    try {
      setIsSubmitting(true);
      await updatePurchase(editingStockId, {
        quantidade: Number(editingStockData.quantidade),
        data_compra: editingStockData.data_compra,
        size: editingStockData.size,
        color: editingStockData.color,
        preco_custo: editingStockData.preco_custo ? Number(editingStockData.preco_custo) : undefined
      });
      setEditingStockId(null);
      setEditingStockData(null);
    } catch (err) {
      alert('Erro ao atualizar stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleVariation = (varId: string, option: string) => {
    const field = varId === 'sizes' ? 'sizes' : (varId === 'colors' ? 'colors' : null);
    if (!field) return;

    if (isAddingNew) {
      const currentValues = newItem[field] || [];
      setNewItem({
        ...newItem,
        [field]: currentValues.includes(option) ? currentValues.filter(v => v !== option) : [...currentValues, option]
      });
    } else if (editingItem) {
      const currentValues = editingItem[field] || [];
      setEditingItem({
        ...editingItem,
        [field]: currentValues.includes(option) ? currentValues.filter(v => v !== option) : [...currentValues, option]
      });
    }
  };

  // Helper logic for auto-calculating profit
  const handlePriceChange = (field: 'pvp_cica' | 'base_price', value: number) => {
    const safeValue = isNaN(value) ? 0 : value;
    if (isAddingNew) {
      const updated = { ...newItem, [field]: safeValue };
      updated.lucro_meu_faturado = Number(((updated.pvp_cica || 0) - (updated.base_price || 0)).toFixed(2));
      setNewItem(updated);
    } else if (editingItem) {
      const updated = { ...editingItem, [field]: safeValue };
      updated.lucro_meu_faturado = Number(((updated.pvp_cica || 0) - (updated.base_price || 0)).toFixed(2));
      setEditingItem(updated);
    }
  };

  // Selection & Bulk Actions
  const toggleSelectAll = () => {
    if (selectedRefs.size === filteredProducts.length) {
      setSelectedRefs(new Set());
    } else {
      setSelectedRefs(new Set(filteredProducts.map(p => p.ref)));
    }
  };

  const toggleSelection = (ref: string) => {
    const newSelection = new Set(selectedRefs);
    if (newSelection.has(ref)) {
      newSelection.delete(ref);
    } else {
      newSelection.add(ref);
    }
    setSelectedRefs(newSelection);
  };

  const handleBulkUpdate = async (updates: Partial<ProductCatalogItem>) => {
    if (selectedRefs.size === 0) return;
    setIsSubmitting(true);
    try {
      const refs = Array.from(selectedRefs);
      await bulkUpdateProducts(refs, updates);
      setSelectedRefs(new Set());
      alert('Ação concluída com sucesso!');
    } catch (err) {
      alert('Erro ao realizar ação em massa');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkCategoryChange = async () => {
    const newCategory = prompt('Introduza a nova categoria para os itens selecionados:');
    if (newCategory) {
      await handleBulkUpdate({ categoria: newCategory });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12 pb-24 max-w-7xl mx-auto"
    >
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div>
          <h1 className="text-xl font-black text-slate-950 dark:text-white tracking-tighter uppercase">Gestão de Itens</h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Cadastro e edição de produtos do catálogo</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <div className="relative group flex-1 sm:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
              <input
                type="text"
                placeholder="Pesquisar por Name ou Ref..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-sm text-slate-900 dark:text-white"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all font-bold text-sm text-slate-900 dark:text-white appearance-none cursor-pointer"
            >
              <option value="">Todas as Categorias</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <div className="relative group">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="pl-11 pr-8 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all font-bold text-sm text-slate-900 dark:text-white appearance-none cursor-pointer min-w-[180px]"
              >
                <option value="">Todos os Stocks</option>
                <option value="out">Sem stock</option>
                <option value="no_control">Sem controlo de stock</option>
                <option value="ok">Stock OK</option>
                <option value="low">Stock Baixo / Mínimo</option>
              </select>
            </div>
          </div>

          {(data.products_catalog?.length || 0) > 0 && (
            <button
              onClick={handleMigrate}
              disabled={isMigrating}
              className="px-5 py-3 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black uppercase tracking-widest text-[10px] hover:bg-amber-500 hover:text-white rounded-2xl transition-all flex items-center gap-2 border border-amber-100 dark:border-amber-500/20"
            >
              {isMigrating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              Migrar Excel
            </button>
          )}

          <button
            onClick={() => setIsAddingNew(true)}
            className="px-6 py-3 bg-primary text-white font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 rounded-2xl transition-all flex items-center gap-2 shadow-xl shadow-primary/20"
          >
            <Plus className="w-4 h-4" /> Novo Artigo
          </button>

          <button
            onClick={async () => {
              if (window.confirm('TEM A CERTEZA? Esta ação irá apagar TODOS os itens do catálogo permanentemente! Esta operação não pode ser desfeita.')) {
                setIsSubmitting(true);
                try {
                  await clearAllItems();
                  alert('Todos os itens foram removidos com sucesso.');
                } catch (err) {
                  alert('Erro ao apagar itens');
                } finally {
                  setIsSubmitting(false);
                }
              }
            }}
            className="px-6 py-3 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-black uppercase tracking-widest text-[10px] hover:bg-rose-500 hover:text-white rounded-2xl transition-all flex items-center gap-2 border border-rose-500/20 shadow-xl shadow-rose-500/5"
          >
            <Trash2 className="w-4 h-4" /> Apagar Tudo
          </button>

          <div className="flex items-center gap-2 border-l border-slate-200 dark:border-white/10 pl-4 ml-2">
            <button
              onClick={() => {
                if (confirm('Deseja colocar TODOS os artigos ONLINE no site?')) {
                  updateAllProductsVisibility(true);
                }
              }}
              className="px-4 py-3 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white font-black uppercase tracking-widest text-[9px] rounded-xl border border-emerald-500/20 transition-all flex items-center gap-2"
            >
              <Globe className="w-3.5 h-3.5" /> Tudo Online
            </button>
            <button
              onClick={() => {
                if (confirm('Deseja retirar TODOS os artigos do site (OFFLINE)?')) {
                  updateAllProductsVisibility(false);
                }
              }}
              className="px-4 py-3 bg-slate-500/10 text-slate-500 hover:bg-slate-500 hover:text-white font-black uppercase tracking-widest text-[9px] rounded-xl border border-slate-500/20 transition-all flex items-center gap-2"
            >
              <GlobeLock className="w-3.5 h-3.5" /> Tudo Offline
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedRefs.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] bg-slate-950/90 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-[2rem] shadow-2xl flex items-center gap-6"
          >
            <div className="flex flex-col border-r border-white/10 pr-6 mr-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selecionados</span>
              <span className="text-sm font-black text-white">{selectedRefs.size} itens</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkCategoryChange}
                className="px-4 py-2 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all flex items-center gap-2"
              >
                Categoria
              </button>
              <button
                onClick={() => handleBulkUpdate({ published: true })}
                className="px-4 py-2 hover:bg-emerald-500/20 hover:text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-500/80 transition-all flex items-center gap-2"
              >
                Publicar
              </button>
              <button
                onClick={() => handleBulkUpdate({ published: false })}
                className="px-4 py-2 hover:bg-slate-500/20 hover:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500/80 transition-all flex items-center gap-2"
              >
                Remover
              </button>
              <button
                onClick={() => handleBulkUpdate({ featured: true })}
                className="px-4 py-2 hover:bg-amber-500/20 hover:text-amber-400 rounded-xl text-[10px] font-black uppercase tracking-widest text-amber-500/80 transition-all flex items-center gap-2"
              >
                Destacar
              </button>
              <button
                onClick={() => handleBulkUpdate({ featured: false })}
                className="px-4 py-2 hover:bg-slate-500/20 hover:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500/80 transition-all flex items-center gap-2"
              >
                Retirar Destaque
              </button>
            </div>

            <button
              onClick={() => setSelectedRefs(new Set())}
              className="ml-4 p-2 hover:bg-white/10 rounded-xl text-slate-400 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass overflow-hidden rounded-[2.5rem] border-purple-100 dark:border-purple-800/20">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
              <tr>
                <th className="px-6 py-3.5 italic text-[10px] text-slate-400">
                  <button onClick={toggleSelectAll} className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                    {selectedRefs.size === filteredProducts.length && filteredProducts.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-primary" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-300" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3.5 italic text-[10px] text-slate-400">Item</th>
                <th className="px-4 py-3.5 text-right italic text-[10px] text-slate-400">PVP</th>
                <th className="px-4 py-3.5 text-right italic text-[10px] text-slate-400">Base</th>
                <th className="px-4 py-3.5 text-right italic text-[10px] text-slate-400">Margem</th>
                <th className="px-4 py-3.5 text-right italic text-[10px] text-slate-400">Categoria</th>
                <th className="px-4 py-3.5 text-right flex-1 italic text-[10px] text-slate-400">Fornecedor</th>
                <th className="px-4 py-3.5 text-center italic text-[10px] text-slate-400">Loja</th>
                <th className="px-4 py-3.5 text-center italic text-[10px] text-slate-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {filteredProducts.map((product, index) => (
                <tr key={`${product.ref}-${index}`} className={`group hover:bg-purple-50/50 dark:hover:bg-white/[0.02] transition-colors ${selectedRefs.has(product.ref) ? 'bg-purple-50/30 dark:bg-purple-500/5' : ''}`}>
                  <td className="px-6 py-2">
                    <button onClick={() => toggleSelection(product.ref)} className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                      {selectedRefs.has(product.ref) ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-white/5 overflow-hidden border border-slate-200 dark:border-white/10 shrink-0 relative group/img cursor-zoom-in" onClick={() => product.image_url && setZoomedProduct(product)}>
                        {product.image_url ? (
                          <>
                            <img src={product.image_url} alt={product.nome_artigo} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Expand className="w-3 h-3" />
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[7px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-tighter bg-slate-50 dark:bg-slate-800">NO IMG</div>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">{product.nome_artigo || '-'}</span>
                          {product.featured && (
                            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          )}
                          {(() => {
                            const now = new Date();
                            const today = now.toISOString().split('T')[0];
                            const start = product.promo_start;
                            const end = product.promo_end;
                            const isActive = product.promo_price && (!start || today >= start) && (!end || today <= end);
                            return isActive ? (
                              <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[8px] font-black uppercase rounded-md animate-pulse">Promo</span>
                            ) : null;
                          })()}
                        </div>
                        <span className="font-black text-[10px] text-primary uppercase tracking-wide">
                          {product.ref}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className="font-black text-sm text-slate-900 dark:text-white">
                      {formatCurrency(product.pvp_cica)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className="font-bold text-xs text-slate-500 dark:text-slate-400">
                      {formatCurrency(product.base_price || 0)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className="font-black text-xs text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(product.lucro_meu_faturado)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className="font-bold text-[10px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-lg">
                      {product.categoria || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className="font-bold text-xs text-slate-500 dark:text-slate-400">
                      {product.fornecedor || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => updateProduct(product.ref, { published: product.published === false })}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all mx-auto ${product.published !== false
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        : 'bg-slate-500/10 text-slate-500 border border-slate-500/20 grayscale'
                        }`}
                    >
                      {product.published !== false ? (
                        <><Globe className="w-3 h-3" /> Online</>
                      ) : (
                        <><GlobeLock className="w-3 h-3" /> Offline</>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => updateProduct(product.ref, { featured: !product.featured })}
                        className={`p-2 rounded-lg transition-colors ${product.featured ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10'}`}
                      >
                        {product.featured ? <Star className="w-3.5 h-3.5" /> : <StarOff className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleEdit(product)}
                        className="p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.ref)}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="py-24 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto border border-slate-100 dark:border-white/5">
              <Tag className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nenhum artigo encontrado</p>
          </div>
        )}
      </div>

      {/* Modals Container */}
      <AnimatePresence>
        {(editingItem || isAddingNew) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setEditingItem(null); setIsAddingNew(false); }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/40 dark:to-indigo-900/40 flex items-center justify-center">
                    <Tag className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      {isAddingNew ? 'Novo Artigo' : 'Editar Artigo'}
                    </h2>
                    <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mt-0.5">
                      {isAddingNew ? 'Cadastrar item no catálogo' : `REF: ${editingItem?.ref}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setEditingItem(null); setIsAddingNew(false); }}
                  className="p-2.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!isAddingNew && (
                <div className="flex px-8 border-b border-slate-200 dark:border-white/5 bg-slate-50/30 dark:bg-white/[0.01]">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`flex items-center gap-2 px-6 py-4 text-xs font-bold transition-all border-b-2 ${activeTab === 'details'
                      ? 'border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-500/5'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                  >
                    <Tag className="w-4 h-4" />
                    Detalhes do Artigo
                  </button>
                  <button
                    onClick={() => setActiveTab('stock')}
                    className={`flex items-center gap-2 px-6 py-4 text-xs font-bold transition-all border-b-2 ${activeTab === 'stock'
                      ? 'border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-500/5'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                  >
                    <Package className="w-4 h-4" />
                    Entrada de Stock
                  </button>
                </div>
              )}

              {activeTab === 'details' || isAddingNew ? (
                <form onSubmit={isAddingNew ? handleAdd : handleUpdate} className="p-6 space-y-6 overflow-y-auto max-h-[80vh] custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column: Image & Promotion */}
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Galeria de Imagens (Até 4)</label>
                        
                        {/* Main Image */}
                        <div className="space-y-2">
                          <div className="relative aspect-video w-full rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-white/10 group cursor-pointer overflow-hidden flex items-center justify-center transition-colors hover:border-purple-400 dark:hover:border-purple-500/50 hover:bg-purple-50 dark:hover:bg-purple-500/5">
                            {(isAddingNew ? newItem.image_url : editingItem?.image_url) ? (
                              <>
                                <img src={isAddingNew ? newItem.image_url : editingItem?.image_url} alt="Main" className="w-full h-full object-cover" />
                                <div className="absolute top-2 left-2 px-2 py-0.5 bg-purple-600 text-white text-[8px] font-black uppercase rounded-lg shadow-xl">Principal</div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isAddingNew) {
                                      setNewItem({ ...newItem, image_url: '' });
                                    } else {
                                      setEditingItem(prev => prev ? ({ ...prev, image_url: '' }) : null);
                                    }
                                  }}
                                  className="absolute top-2 right-2 p-1.5 bg-red-500/90 text-white rounded-lg shadow-xl opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
                                <Camera className="w-5 h-5 text-slate-400" />
                                <span className="text-[9px] font-bold text-slate-400 uppercase text-center">Selecionar<br/>Foto Principal</span>
                              </div>
                            )}
                            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, isAddingNew ? 'new' : 'edit', true)} disabled={isUploading} className="absolute inset-0 opacity-0 cursor-pointer" />
                          </div>
                        </div>

                        {/* Secondary Images Grid */}
                        <Reorder.Group 
                          axis="x" 
                          values={(isAddingNew ? newItem.additional_images : editingItem?.additional_images) || []} 
                          onReorder={(newOrder) => {
                            if (isAddingNew) {
                              setNewItem({ ...newItem, additional_images: newOrder });
                            } else {
                              setEditingItem(prev => prev ? ({ ...prev, additional_images: newOrder }) : null);
                            }
                          }}
                          className="flex flex-wrap gap-3"
                        >
                          {((isAddingNew ? newItem.additional_images : editingItem?.additional_images) || []).map((url, idx) => (
                            <Reorder.Item 
                              key={url} 
                              value={url}
                              className="relative w-20 h-20 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 overflow-hidden cursor-grab active:cursor-grabbing group shrink-0"
                            >
                              <img src={url} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentMain = isAddingNew ? newItem.image_url : editingItem?.image_url;
                                    const currentGallery = (isAddingNew ? newItem.additional_images : editingItem?.additional_images) || [];
                                    const newGallery = currentGallery.filter(u => u !== url);
                                    if (currentMain) newGallery.unshift(currentMain);
                                    
                                    if (isAddingNew) {
                                      setNewItem({ ...newItem, image_url: url, additional_images: newGallery });
                                    } else {
                                      setEditingItem(prev => prev ? ({ ...prev, image_url: url, additional_images: newGallery }) : null);
                                    }
                                  }}
                                  className="p-1 bg-white/20 hover:bg-white/40 text-white rounded-md transition-colors"
                                  title="Tornar Principal"
                                >
                                  <Star className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isAddingNew) {
                                      setNewItem({ ...newItem, additional_images: newItem.additional_images?.filter(u => u !== url) });
                                    } else {
                                      setEditingItem(prev => prev ? ({ ...prev, additional_images: prev.additional_images?.filter(u => u !== url) }) : null);
                                    }
                                  }}
                                  className="p-1 bg-red-500/20 hover:bg-red-500/40 text-red-200 rounded-md transition-colors"
                                  title="Remover"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </Reorder.Item>
                          ))}
                          
                          {/* Add More Spot */}
                          {((isAddingNew ? newItem.additional_images : editingItem?.additional_images) || []).length < 3 && (
                            <div className="relative w-20 h-20 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-white/10 flex items-center justify-center hover:bg-purple-50 dark:hover:bg-purple-500/5 transition-colors cursor-pointer group">
                              <Plus className="w-5 h-5 text-slate-300 group-hover:text-purple-500" />
                              <input type="file" multiple accept="image/*" onChange={(e) => handleFileUpload(e, isAddingNew ? 'new' : 'edit', false)} disabled={isUploading} className="absolute inset-0 opacity-0 cursor-pointer" />
                            </div>
                          )}
                        </Reorder.Group>
                      </div>

                      <div className="p-4 bg-rose-50/50 dark:bg-rose-500/5 rounded-2xl border border-rose-100 dark:border-rose-500/10 space-y-4">
                        <label className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest flex items-center gap-2">
                          <Tag className="w-3 h-3" /> Promoção Temporária
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço Promo</label>
                            <input
                              type="number"
                              step="0.01"
                              value={isAddingNew ? newItem.promo_price : editingItem?.promo_price}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                isAddingNew ? setNewItem({ ...newItem, promo_price: val }) : setEditingItem(prev => prev ? ({ ...prev, promo_price: val }) : null);
                              }}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none transition-all font-bold text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Início / Fim</label>
                            <div className="flex gap-2">
                              <input
                                type="date"
                                value={isAddingNew ? newItem.promo_start : editingItem?.promo_start}
                                onChange={(e) => isAddingNew ? setNewItem({ ...newItem, promo_start: e.target.value }) : setEditingItem(prev => prev ? ({ ...prev, promo_start: e.target.value }) : null)}
                                className="w-1/2 px-2 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg outline-none text-[10px] font-bold"
                              />
                              <input
                                type="date"
                                value={isAddingNew ? newItem.promo_end : editingItem?.promo_end}
                                onChange={(e) => isAddingNew ? setNewItem({ ...newItem, promo_end: e.target.value }) : setEditingItem(prev => prev ? ({ ...prev, promo_end: e.target.value }) : null)}
                                className="w-1/2 px-2 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg outline-none text-[10px] font-bold"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Info & Prices */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Referência</label>
                          <input
                            required
                            disabled={!isAddingNew}
                            type="text"
                            value={isAddingNew ? newItem.ref : editingItem?.ref}
                            onChange={(e) => isAddingNew ? setNewItem({ ...newItem, ref: e.target.value.toUpperCase() }) : null}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl outline-none font-bold text-xs disabled:opacity-50"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria</label>
                            <button
                              type="button"
                              onClick={() => isAddingNew ? setNewItem({ ...newItem, categoria: '' }) : setEditingItem(prev => prev ? ({ ...prev, categoria: '' }) : null)}
                              className="text-[8px] text-red-500 hover:text-red-600 font-bold uppercase transition-colors"
                            >
                              Limpar
                            </button>
                          </div>
                          {(data.categories && data.categories.length > 0) ? (
                            <select
                              value={isAddingNew ? newItem.categoria : editingItem?.categoria}
                              onChange={(e) => isAddingNew ? setNewItem({ ...newItem, categoria: e.target.value }) : setEditingItem(prev => prev ? ({ ...prev, categoria: e.target.value }) : null)}
                              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl outline-none font-bold text-xs appearance-none"
                            >
                              <option value="">Selecionar...</option>
                              {data.categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={isAddingNew ? newItem.categoria : editingItem?.categoria}
                              onChange={(e) => isAddingNew ? setNewItem({ ...newItem, categoria: e.target.value }) : setEditingItem(prev => prev ? ({ ...prev, categoria: e.target.value }) : null)}
                              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl outline-none font-bold text-xs"
                              placeholder="Ex: Tops..."
                            />
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Designação (Nome)</label>
                        <input
                          required
                          type="text"
                          value={isAddingNew ? newItem.nome_artigo : editingItem?.nome_artigo}
                          onChange={(e) => isAddingNew ? setNewItem({ ...newItem, nome_artigo: e.target.value }) : setEditingItem(prev => prev ? ({ ...prev, nome_artigo: e.target.value }) : null)}
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl outline-none font-bold text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fornecedor</label>
                        <input
                          type="text"
                          value={isAddingNew ? newItem.fornecedor : editingItem?.fornecedor}
                          onChange={(e) => isAddingNew ? setNewItem({ ...newItem, fornecedor: e.target.value }) : setEditingItem(prev => prev ? ({ ...prev, fornecedor: e.target.value }) : null)}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl outline-none font-bold text-xs"
                        />
                      </div>

                      <div className="p-4 bg-purple-50/50 dark:bg-purple-500/5 rounded-2xl border border-purple-100 dark:border-purple-500/10 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Custo Base (€)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={isAddingNew ? newItem.base_price : editingItem?.base_price}
                              onChange={(e) => handlePriceChange('base_price', parseFloat(e.target.value))}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl outline-none font-bold text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">PVP Venda (€)</label>
                            <input
                              required
                              type="number"
                              step="0.01"
                              value={isAddingNew ? newItem.pvp_cica : editingItem?.pvp_cica}
                              onChange={(e) => handlePriceChange('pvp_cica', parseFloat(e.target.value))}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-500/30 rounded-xl outline-none font-black text-xs text-purple-600"
                            />
                          </div>
                        </div>

                        <div className="flex justify-between items-center px-4 py-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-purple-100 dark:border-purple-800/30">
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Lucro Calculado</span>
                            <span className="text-[8px] text-slate-400 font-bold">(PVP - Custo)</span>
                          </div>
                          <span className="font-black text-lg text-emerald-600 dark:text-emerald-400">
                            {(() => {
                              const pvp = isAddingNew ? (newItem.pvp_cica || 0) : (editingItem?.pvp_cica || 0);
                              const base = isAddingNew ? (newItem.base_price || 0) : (editingItem?.base_price || 0);
                              return formatCurrency(Number((pvp - base).toFixed(2)));
                            })()}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-white/5 space-y-4">
                        {/* Variações Dinâmicas */}
                        {(data.variations || []).map((variation) => (
                          <div key={variation.id} className={`p-4 rounded-2xl border space-y-4 ${
                            variation.id === 'sizes' ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100/50 dark:border-emerald-800/20' :
                            variation.id === 'colors' ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100/50 dark:border-blue-800/20' :
                            'bg-slate-50/50 dark:bg-slate-800/50 border-slate-100 dark:border-white/5'
                          }`}>
                            <div className="flex items-center gap-2 mb-3">
                              {variation.id === 'sizes' ? <Tag className="w-4 h-4 text-emerald-500" /> : <Tag className="w-4 h-4 text-blue-500" />}
                              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                {variation.name}
                              </h4>
                              <button
                                type="button"
                                onClick={() => {
                                  const field = variation.id === 'sizes' ? 'sizes' : (variation.id === 'colors' ? 'colors' : null);
                                  if (!field) return;
                                  isAddingNew ? setNewItem({ ...newItem, [field]: [] }) : setEditingItem(prev => prev ? ({ ...prev, [field]: [] }) : null);
                                }}
                                className="text-[8px] text-red-500 hover:text-red-600 font-bold uppercase transition-colors ml-2"
                              >
                                Limpar
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {variation.options.map(option => {
                                const field = variation.id === 'sizes' ? 'sizes' : (variation.id === 'colors' ? 'colors' : null);
                                const isSelected = field ? (isAddingNew ? newItem[field]?.includes(option) : editingItem?.[field]?.includes(option)) : false;
                                return (
                                  <button
                                    key={option}
                                    type="button"
                                    onClick={() => handleToggleVariation(variation.id, option)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${isSelected
                                      ? (variation.id === 'sizes' 
                                          ? 'bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/20' 
                                          : 'bg-blue-500 text-white border-blue-600 shadow-md shadow-blue-500/20')
                                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-purple-300'
                                      }`}
                                  >
                                    {option}
                                  </button>
                                );
                              })}
                              {variation.options.length === 0 && (
                                <p className="text-[10px] text-slate-400 italic">Nenhuma opção definida em Variáveis.</p>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* Imagens por Cor */}
                        {((isAddingNew ? newItem.colors : editingItem?.colors)?.length || 0) > 0 && (
                          <div className="p-4 bg-purple-50/30 dark:bg-purple-900/10 rounded-2xl border border-purple-100/50 dark:border-purple-800/20">
                            <div className="flex items-center gap-2 mb-3">
                              <Camera className="w-4 h-4 text-purple-500" />
                              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Imagens por Cor (Opcional)</h4>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {(isAddingNew ? newItem.colors : editingItem?.colors)?.map(color => {
                                const images = isAddingNew ? (newItem.color_images || {}) : (editingItem?.color_images || {});
                                const imageUrl = images[color];
                                return (
                                  <div key={color} className="flex items-center gap-3 p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-white/5">
                                    <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0 relative group/colorimg overflow-hidden">
                                      {imageUrl ? (
                                        <>
                                          <img src={imageUrl} alt={color} className="w-full h-full object-cover" />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const newImages = { ...images };
                                              delete newImages[color];
                                              isAddingNew 
                                                ? setNewItem({ ...newItem, color_images: newImages }) 
                                                : setEditingItem(prev => prev ? ({ ...prev, color_images: newImages }) : null);
                                            }}
                                            className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover/colorimg:opacity-100 transition-opacity"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </>
                                      ) : (
                                        <Camera className="w-4 h-4 text-slate-300" />
                                      )}
                                      {!imageUrl && (
                                        <input
                                          type="file"
                                          accept="image/*"
                                          onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            try {
                                              setIsUploading(true);
                                              const url = await uploadToSupabase(file, 'loja_artigos_cores');
                                              if (url) {
                                                const newImages = { ...images, [color]: url };
                                                isAddingNew 
                                                  ? setNewItem({ ...newItem, color_images: newImages }) 
                                                  : setEditingItem(prev => prev ? ({ ...prev, color_images: newImages }) : null);
                                              }
                                            } finally {
                                              setIsUploading(false);
                                            }
                                          }}
                                          className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                      )}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[10px] font-black uppercase text-slate-500">{color}</span>
                                      <span className="text-[8px] text-slate-400 font-bold">{imageUrl ? 'Foto Definida' : 'Sem Foto'}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => isAddingNew ? setNewItem({ ...newItem, published: !newItem.published }) : setEditingItem(prev => prev ? ({ ...prev, published: !prev.published }) : null)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${(isAddingNew ? newItem.published : editingItem?.published) !== false
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                          : 'bg-slate-200 dark:bg-white/5 text-slate-500'
                          }`}
                      >
                        {(isAddingNew ? newItem.published : editingItem?.published) !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        {(isAddingNew ? newItem.published : editingItem?.published) !== false ? 'Público no Site' : 'Oculto no Site'}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => { setEditingItem(null); setIsAddingNew(false); }}
                      className="flex-1 py-3 bg-slate-100 dark:bg-white/5 text-slate-500 font-black uppercase tracking-widest text-[9px] hover:bg-slate-200 rounded-xl transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-black text-xs shadow-xl shadow-purple-500/20 hover:shadow-purple-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>{isAddingNew ? 'Cadastrar Artigo' : 'Guardar Alterações'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh] custom-scrollbar">
                  <div className="bg-purple-50/50 dark:bg-purple-500/5 p-6 rounded-3xl border border-purple-100 dark:border-purple-500/10">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                      <Plus className="w-4 h-4 text-purple-500" />
                      Registar Nova Entrada
                    </h3>
                    <form onSubmit={handleAddStock} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantidade</label>
                        <input
                          required
                          type="number"
                          min="1"
                          value={stockFormData.quantidade}
                          onChange={(e) => setStockFormData({ ...stockFormData, quantidade: parseInt(e.target.value) })}
                          className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl outline-none font-bold text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Data de Entrada</label>
                        <input
                          required
                          type="date"
                          value={stockFormData.data_compra}
                          onChange={(e) => setStockFormData({ ...stockFormData, data_compra: e.target.value })}
                          className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl outline-none font-bold text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tamanho</label>
                        <select
                          value={stockFormData.size}
                          onChange={(e) => setStockFormData({ ...stockFormData, size: e.target.value })}
                          className="w-full px-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl outline-none font-bold text-xs"
                        >
                          <option value="">Nenhum</option>
                          {(data.variations?.find(v => v.id === 'sizes')?.options || []).map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Cor</label>
                        <select
                          value={stockFormData.color}
                          onChange={(e) => setStockFormData({ ...stockFormData, color: e.target.value })}
                          className="w-full px-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl outline-none font-bold text-xs"
                        >
                          <option value="">Nenhuma</option>
                          {(data.variations?.find(v => v.id === 'colors')?.options || []).map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="md:col-span-2 mt-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-black text-xs hover:bg-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
                      >
                        {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        Registar Entrada de Stock
                      </button>
                    </form>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <History className="w-4 h-4 text-slate-400" />
                      Histórico Recente
                    </h3>
                    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-white/[0.02]">
                          <tr>
                            <th className="px-4 py-3 font-black text-slate-400 uppercase tracking-widest">Data</th>
                            <th className="px-4 py-3 font-black text-slate-400 uppercase tracking-widest">Qt</th>
                            <th className="px-4 py-3 font-black text-slate-400 uppercase tracking-widest">Var.</th>
                            <th className="px-4 py-3 font-black text-slate-400 uppercase tracking-widest text-right">Custo</th>
                            <th className="px-4 py-3 font-black text-slate-400 uppercase tracking-widest text-center">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                          {recentPurchases.map((purchase, idx) => (
                              <tr key={purchase.id || idx} className="hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors">
                                {editingStockId === purchase.id ? (
                                  <>
                                    <td className="px-2 py-2">
                                      <input
                                        type="date"
                                        value={editingStockData.data_compra}
                                        onChange={(e) => setEditingStockData({ ...editingStockData, data_compra: e.target.value })}
                                        className="w-full p-1 text-[10px] bg-white dark:bg-slate-900 border rounded"
                                      />
                                    </td>
                                    <td className="px-2 py-2">
                                      <input
                                        type="number"
                                        value={editingStockData.quantidade}
                                        onChange={(e) => setEditingStockData({ ...editingStockData, quantidade: parseInt(e.target.value) })}
                                        className="w-10 p-1 text-[10px] bg-white dark:bg-slate-900 border rounded"
                                      />
                                    </td>
                                    <td className="px-2 py-2 flex gap-1">
                                      <select
                                        value={editingStockData.size || ''}
                                        onChange={(e) => setEditingStockData({ ...editingStockData, size: e.target.value })}
                                        className="p-1 text-[9px] bg-white dark:bg-slate-900 border rounded"
                                      >
                                        <option value="">-</option>
                                        {(editingItem?.sizes || []).map(s => <option key={s} value={s}>{s}</option>)}
                                      </select>
                                      <select
                                        value={editingStockData.color || ''}
                                        onChange={(e) => setEditingStockData({ ...editingStockData, color: e.target.value })}
                                        className="p-1 text-[9px] bg-white dark:bg-slate-900 border rounded"
                                      >
                                        <option value="">-</option>
                                        {(editingItem?.colors || []).map(c => <option key={c} value={c}>{c}</option>)}
                                      </select>
                                    </td>
                                    <td className="px-2 py-2">
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={editingStockData.preco_custo || ''}
                                        onChange={(e) => setEditingStockData({ ...editingStockData, preco_custo: e.target.value })}
                                        className="w-12 p-1 text-[10px] bg-white dark:bg-slate-900 border rounded text-right"
                                      />
                                    </td>
                                    <td className="px-2 py-2 text-center flex justify-center gap-1">
                                      <button onClick={handleUpdateStock} className="p-1 text-emerald-500 hover:bg-emerald-50 rounded">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400">{new Date(purchase.data_compra).toLocaleDateString('pt-PT')}</td>
                                    <td className="px-4 py-3 font-black text-purple-600 dark:text-purple-400">+{purchase.quantidade}</td>
                                    <td className="px-4 py-3 font-medium text-slate-500">
                                      {purchase.size || '-'}{purchase.color ? ` / ${purchase.color}` : ''}
                                    </td>
                                    <td className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400 text-right">
                                      {formatCurrency(purchase.preco_custo || 0)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <div className="flex items-center justify-center gap-2">
                                        <button
                                          onClick={() => startEditStock(purchase)}
                                          className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeletePurchase(purchase.id)}
                                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </>
                                )}
                              </tr>
                            ))}
                          {(!data.purchases?.some(p => p.ref === editingItem?.ref)) && (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">Sem histórico de entradas.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ImageZoomModal
        isOpen={!!zoomedProduct}
        onClose={() => setZoomedProduct(null)}
        imageUrl={zoomedProduct?.image_url || ''}
        productName={zoomedProduct?.nome_artigo || ''}
      />
    </motion.div >
  );
}
