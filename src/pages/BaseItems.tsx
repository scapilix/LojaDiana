import { useState, useMemo } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Database,
  Search,
  Plus,
  Package,
  Tag,
  Loader2,
  Trash2,
  CheckCircle2,
  X,
  Pencil,
  Camera,
  Expand,
  Square,
  Filter,
  Star,
  StarOff,
  Globe,
  GlobeLock,
  CheckSquare,
  GripVertical
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
  const { data, addPurchase, addProduct, deleteProduct, updateProduct, bulkUpdateProducts, updateAllProductsVisibility, clearAllItems, isLoading, setData } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<ProductCatalogItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
    const [zoomedProduct, setZoomedProduct] = useState<any>(null);
    const [isMigrating, setIsMigrating] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedRefs, setSelectedRefs] = useState<Set<string>>(new Set());
    const [stockFilter, setStockFilter] = useState<string>('');
    const stockInventory = useStockLogic();

    // Image Upload Flow State
    const [uploadPending, setUploadPending] = useState<{ file: File, target: 'edit' | 'new' } | null>(null);
    const [showAspectRatioModal, setShowAspectRatioModal] = useState(false);

    // Initial Stock State (New Product Only)
    const [initialStock, setInitialStock] = useState({
        enabled: false,
        quantidade: 1,
        size: '',
        color: ''
    });

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

    const handleFileUpload = async (file: File, target: 'edit' | 'new', aspect: '1:1' | '4:5') => {
        try {
            console.log('Uploading image with aspect ratio:', aspect);
            setIsUploading(true);
            const url = await uploadToSupabase(file, 'loja_artigos');
            if (url) {
                // Add aspect ratio suffix or metadata if needed, for now we just store the URL
                // In a real scenario we might crop here, but for now we follow the "size standard" logic
                if (target === 'edit') {
                    setEditingItem(prev => {
                        if (!prev) return null;
                        const allImages = [prev.image_url, ...(prev.additional_images || [])].filter(Boolean);
                        if (allImages.length === 0) {
                            return { ...prev, image_url: url };
                        } else {
                            return { ...prev, additional_images: [...(prev.additional_images || []), url] };
                        }
                    });
                } else {
                    setNewItem(prev => {
                        const allImages = [prev.image_url, ...(prev.additional_images || [])].filter(Boolean);
                        if (allImages.length === 0) {
                            return { ...prev, image_url: url };
                        } else {
                            return { ...prev, additional_images: [...(prev.additional_images || []), url] };
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Erro ao carregar imagem');
        } finally {
            setIsUploading(false);
            setUploadPending(null);
            setShowAspectRatioModal(false);
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
            const productRef = newItem.ref;
            await addProduct({
                ...newItem,
                sizes: newItem.sizes || [],
                colors: newItem.colors || [],
                published: newItem.published !== false
            });

            // Handle Initial Stock if enabled
            if (initialStock.enabled && initialStock.quantidade > 0) {
                await addPurchase({
                    ref: productRef,
                    quantidade: initialStock.quantidade,
                    data_compra: new Date().toISOString().split('T')[0],
                    size: initialStock.size || undefined,
                    color: initialStock.color || undefined,
                    preco_custo: Number(newItem.base_price || 0)
                });
            }

            setIsAddingNew(false);
            setInitialStock({ enabled: false, quantidade: 1, size: '', color: '' });
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

  const handleBulkCategoryChange = async (newCategory: string) => {
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
          <h1 className="text-xl font-black text-slate-950 dark:text-white tracking-tighter uppercase">Produtos</h1>
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
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 px-6 py-4 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 mb-8 mx-auto w-full"
          >
            <div className="flex items-center gap-6">
              <div className="flex flex-col border-r border-slate-200 dark:border-white/10 pr-6 mr-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selecionados</span>
                <span className="text-sm font-black text-slate-900 dark:text-white">{selectedRefs.size} itens</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative group/category">
                  <button
                    className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 transition-all flex items-center gap-2"
                  >
                    Categoria
                  </button>
                  <div className="absolute top-full left-0 mt-2 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover/category:opacity-100 group-hover/category:visible transition-all z-[70] min-w-[200px] max-h-[300px] overflow-y-auto custom-scrollbar">
                    {data.categories?.map(cat => (
                      <button
                        key={cat}
                        onClick={() => handleBulkCategoryChange(cat)}
                        className="w-full text-left px-3 py-2 hover:bg-purple-50 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors"
                      >
                        {cat}
                      </button>
                    ))}
                    {(data.categories?.length || 0) === 0 && (
                      <div className="px-3 py-2 text-[10px] text-slate-400 italic">Nenhuma categoria definida</div>
                    )}
                  </div>
                </div>
                
                <div className="relative group/catalog">
                  <button
                    className="px-4 py-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                  >
                    Catálogo
                  </button>
                  <div className="absolute top-full left-0 mt-2 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover/catalog:opacity-100 group-hover/catalog:visible transition-all z-[70] min-w-[140px]">
                    <button
                      onClick={() => handleBulkUpdate({ published: true })}
                      className="w-full text-left px-3 py-2 hover:bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2"
                    >
                      <Globe className="w-3.5 h-3.5" /> Online
                    </button>
                    <button
                      onClick={() => handleBulkUpdate({ published: false })}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2"
                    >
                      <GlobeLock className="w-3.5 h-3.5" /> Offline
                    </button>
                  </div>
                </div>

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
            </div>

            <button
              onClick={() => setSelectedRefs(new Set())}
              className="p-2.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-slate-400 transition-all"
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
                    <div className="relative group/btn-catalog inline-block">
                      <button
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
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover/btn-catalog:opacity-100 group-hover/btn-catalog:visible transition-all z-10 min-w-[100px]">
                        <button
                          onClick={() => updateProduct(product.ref, { published: true })}
                          className="w-full text-left px-2 py-1.5 hover:bg-emerald-50 text-emerald-600 rounded-md text-[8px] font-black uppercase tracking-widest transition-colors flex items-center gap-2"
                        >
                          <Globe className="w-3 h-3" /> Online
                        </button>
                        <button
                          onClick={() => updateProduct(product.ref, { published: false })}
                          className="w-full text-left px-2 py-1.5 hover:bg-slate-50 text-slate-500 rounded-md text-[8px] font-black uppercase tracking-widest transition-colors flex items-center gap-2"
                        >
                          <GlobeLock className="w-3 h-3" /> Offline
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => updateProduct(product.ref, { featured: !product.featured })}
                        className={`p-2 rounded-lg transition-colors ${product.featured ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10'}`}
                      >
                        {product.featured ? <Star className="w-3.5 h-3.5" /> : <StarOff className="w-3.5 h-3.5" />}
                      </button>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="p-2 rounded-xl text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-all"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <div className="relative group/catmenu">
                        <button
                          className="p-2 rounded-xl text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-all flex items-center gap-1"
                          title="Catálogo"
                        >
                          <Globe className="w-3.5 h-3.5" />
                        </button>
                        <div className="absolute right-0 top-full mt-1 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover/catmenu:opacity-100 group-hover/catmenu:visible transition-all z-[80] min-w-[140px]">
                          <button
                            onClick={() => updateProduct(product.ref, { published: true })}
                            className="w-full text-left px-3 py-2 hover:bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors flex items-center gap-2"
                          >
                            <Globe className="w-3 h-3" /> Online
                          </button>
                          <button
                            onClick={() => updateProduct(product.ref, { published: false })}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors flex items-center gap-2"
                          >
                            <GlobeLock className="w-3 h-3" /> Offline
                          </button>
                          <div className="h-px bg-slate-100 dark:bg-white/5 my-1" />
                          <button
                            onClick={() => handleDelete(product.ref)}
                            className="w-full text-left px-3 py-2 hover:bg-rose-50 text-rose-500 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors flex items-center gap-2"
                          >
                            <Trash2 className="w-3 h-3" /> Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
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

              <div className="flex px-8 border-b border-slate-200 dark:border-white/5 bg-slate-50/30 dark:bg-white/[0.01]">
                <div className="flex items-center gap-2 px-6 py-4 text-xs font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 bg-purple-500/5 border-b-2 border-purple-500">
                  <Tag className="w-4 h-4" />
                  Detalhes do Artigo
                </div>
              </div>

              <form onSubmit={isAddingNew ? handleAdd : handleUpdate} className="p-6 space-y-6 overflow-y-auto max-h-[80vh] custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column: Image & Promotion */}
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Galeria de Fotos (Mín. 7)</label>
                          <span className="text-[8px] font-bold text-purple-500 uppercase tracking-widest">Arraste para ordenar</span>
                        </div>
                        
                        {/* Unified Reorder Gallery */}
                        <div className="space-y-4">
                          {(() => {
                            const mainImg = isAddingNew ? newItem.image_url : editingItem?.image_url;
                            const gallery = (isAddingNew ? newItem.additional_images : editingItem?.additional_images) || [];
                            const allImages: string[] = [mainImg, ...gallery].filter((url): url is string => !!url);

                            const handleReorder = (newOrder: string[]) => {
                              const newMain = newOrder[0] || '';
                              const newGallery = newOrder.slice(1);
                              if (isAddingNew) {
                                setNewItem({ ...newItem, image_url: newMain, additional_images: newGallery });
                              } else {
                                setEditingItem(prev => prev ? ({ ...prev, image_url: newMain, additional_images: newGallery }) : null);
                              }
                            };

                            return (
                              <div className="space-y-4">
                                {/* Main Image Placeholder/Slot */}
                                <div className="relative aspect-video w-full rounded-3xl bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-white/10 group overflow-hidden flex items-center justify-center transition-all hover:border-purple-400">
                                  {allImages.length > 0 ? (
                                    <div className="w-full h-full relative cursor-move">
                                      <img src={allImages[0]} alt="Main" className="w-full h-full object-cover" />
                                      <div className="absolute top-4 left-4 px-3 py-1 bg-purple-600 text-white text-[9px] font-black uppercase rounded-full shadow-xl z-10">Principal</div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newOrder = allImages.slice(1);
                                          handleReorder(newOrder);
                                        }}
                                        className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-xl shadow-xl opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all z-10"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                                      <Camera className="w-8 h-8 text-slate-300" />
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selecione a primeira foto</span>
                                    </div>
                                  )}
                                  {!isUploading && (
                                    <input 
                                      type="file" 
                                      accept="image/*" 
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          setUploadPending({ file, target: isAddingNew ? 'new' : 'edit' });
                                          setShowAspectRatioModal(true);
                                        }
                                      }} 
                                      className="absolute inset-0 opacity-0 cursor-pointer" 
                                    />
                                  )}
                                  {isUploading && (
                                    <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-20">
                                      <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                                    </div>
                                  )}
                                </div>

                                {/* Secondary Images Reorder List */}
                                <Reorder.Group 
                                  axis="x" 
                                  values={allImages} 
                                  onReorder={handleReorder}
                                  className="grid grid-cols-4 sm:grid-cols-5 gap-3"
                                >
                                  {allImages.map((url, idx) => (
                                    <Reorder.Item 
                                      key={url} 
                                      value={url}
                                      className="relative aspect-square rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 overflow-hidden cursor-move group shrink-0"
                                    >
                                      <img src={url} alt={`Photo ${idx}`} className="w-full h-full object-cover" />
                                      <div className="absolute top-2 right-2 p-1 bg-white/20 dark:bg-black/20 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                        <GripVertical className="w-3 h-3" />
                                      </div>
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newOrder = allImages.filter(u => u !== url);
                                            handleReorder(newOrder);
                                          }}
                                          className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                      {idx === 0 && <div className="absolute top-1 left-1 w-2 h-2 bg-purple-500 rounded-full border border-white" />}
                                    </Reorder.Item>
                                  ))}
                                  
                                  {/* Add Button Placeholder */}
                                  {allImages.length < 10 && (
                                    <div className="relative aspect-square rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-white/10 flex items-center justify-center hover:bg-purple-50 dark:hover:bg-purple-500/5 transition-colors cursor-pointer group">
                                      <Plus className="w-6 h-6 text-slate-300 group-hover:text-purple-500" />
                                      <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            setUploadPending({ file, target: isAddingNew ? 'new' : 'edit' });
                                            setShowAspectRatioModal(true);
                                          }
                                        }} 
                                        className="absolute inset-0 opacity-0 cursor-pointer" 
                                      />
                                    </div>
                                  )}
                                </Reorder.Group>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {isAddingNew && (
                        <div className="p-4 bg-purple-50/50 dark:bg-purple-500/5 rounded-2xl border border-purple-100 dark:border-purple-500/10 space-y-4">
                          <div className="flex items-center justify-between">
                            <label className="text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest flex items-center gap-2">
                              <Package className="w-3 h-3" /> Gerenciar Stock Inicial
                            </label>
                            <button
                                type="button"
                                onClick={() => setInitialStock(prev => ({ ...prev, enabled: !prev.enabled }))}
                                className={`w-10 h-5 rounded-full transition-all relative ${initialStock.enabled ? 'bg-purple-600' : 'bg-slate-300'}`}
                            >
                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${initialStock.enabled ? 'left-5.5' : 'left-0.5'}`} />
                            </button>
                          </div>
                          
                          {initialStock.enabled && (
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Qt</label>
                                    <input
                                        type="number"
                                        value={initialStock.quantidade}
                                        onChange={(e) => setInitialStock({ ...initialStock, quantidade: parseInt(e.target.value) })}
                                        className="w-full px-2 py-2 bg-white dark:bg-slate-900 border appearance-none border-slate-200 dark:border-white/10 rounded-xl outline-none font-black text-xs"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Tam.</label>
                                    <select
                                        value={initialStock.size}
                                        onChange={(e) => setInitialStock({ ...initialStock, size: e.target.value })}
                                        className="w-full px-2 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl outline-none font-bold text-xs"
                                    >
                                        <option value="">-</option>
                                        {(data.variations?.find(v => v.id === 'sizes')?.options || []).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Cor</label>
                                    <select
                                        value={initialStock.color}
                                        onChange={(e) => setInitialStock({ ...initialStock, color: e.target.value })}
                                        className="w-full px-2 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl outline-none font-bold text-xs"
                                    >
                                        <option value="">-</option>
                                        {(data.variations?.find(v => v.id === 'colors')?.options || []).map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                          )}
                        </div>
                      )}

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
                          <select
                            value={isAddingNew ? newItem.categoria : editingItem?.categoria}
                            onChange={(e) => isAddingNew ? setNewItem({ ...newItem, categoria: e.target.value }) : setEditingItem(prev => prev ? ({ ...prev, categoria: e.target.value }) : null)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl outline-none font-bold text-xs appearance-none"
                          >
                            <option value="">Selecionar...</option>
                            {(data.categories || []).map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
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
                        {(isAddingNew ? newItem.published : editingItem?.published) !== false ? <Globe className="w-4 h-4" /> : <GlobeLock className="w-4 h-4" />}
                        {(isAddingNew ? newItem.published : editingItem?.published) !== false ? 'Online' : 'Offline'}
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

      {/* Aspect Ratio Selection Modal */}
      <AnimatePresence>
        {showAspectRatioModal && uploadPending && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAspectRatioModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 p-8 text-center overflow-hidden"
            >
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/40 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Camera className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-2 uppercase">Formato da Imagem</h3>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-8">Escolha como a imagem deve ser exibida no site</p>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleFileUpload(uploadPending.file, uploadPending.target, '1:1')}
                  className="group relative flex flex-col items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-white/5 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-all"
                >
                  <div className="w-12 h-12 border-2 border-slate-300 dark:border-slate-600 group-hover:border-purple-500 rounded-lg transition-colors flex items-center justify-center">
                    <span className="text-[10px] font-black group-hover:text-purple-600">1:1</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-purple-600">Quadrado</span>
                </button>

                <button
                  onClick={() => handleFileUpload(uploadPending.file, uploadPending.target, '4:5')}
                  className="group relative flex flex-col items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-white/5 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-all"
                >
                  <div className="w-12 h-15 border-2 border-slate-300 dark:border-slate-600 group-hover:border-purple-500 rounded-lg transition-colors flex items-center justify-center overflow-hidden">
                    <span className="text-[10px] font-black group-hover:text-purple-600">4:5</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-purple-600">Retrato</span>
                </button>
              </div>

              <button
                onClick={() => setShowAspectRatioModal(false)}
                className="mt-8 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
                type="button"
              >
                Cancelar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div >
  );
}
