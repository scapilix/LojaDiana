import { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, X, Search, MessageCircle, Copy } from 'lucide-react';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};


function Produtos() {
  const { data } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  // Quote Modal State
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [selectedQuoteProduct, setSelectedQuoteProduct] = useState<any>(null);

  const formatCurrency = (val: number) =>
    val?.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }) || '0,00 €';

  // 1. Combine regular catalog and manual overrides
  const allProducts = useMemo(() => {
    const catalog = data.products_catalog || [];
    const manual = data.manual_products_catalog || [];
    const merged = [...manual];
    const manualRefs = new Set(manual.map(p => p.ref));
    catalog.forEach(p => {
      if (!manualRefs.has(p.ref)) merged.push(p);
    });
    return merged;
  }, [data]);

  // 2. Categories
  const categories = useMemo(() => {
    const cats = new Set(['Todos']);
    allProducts.forEach(p => { if (p.categoria) cats.add(p.categoria); });
    return Array.from(cats);
  }, [allProducts]);

  // 3. Filter products
  const filteredProductsList = useMemo(() => {
    return allProducts.filter(p => {
      const matchesSearch = !searchTerm || 
        p.ref.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.nome_artigo?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Todos' || p.categoria === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [allProducts, searchTerm, selectedCategory]);


  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.4 }}
      className="space-y-12"
    >
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-950 dark:text-white tracking-tighter uppercase">Produtos</h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest opacity-60">Catálogo e Stock em Tempo Real</p>
        </div>

        {/* Categories & Search Bar */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Category Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    selectedCategory === cat 
                      ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' 
                      : 'bg-white dark:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-white border border-slate-100 dark:border-white/5'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full md:w-80 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Pesquisar por nome ou ref..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl py-3 pl-11 pr-12 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        {filteredProductsList.map((product) => (
          <motion.div
            layout
            key={product.ref}
            className="glass flex flex-col group border-slate-200/50 hover:border-primary/50 transition-all duration-500 overflow-hidden"
          >
            {/* Image Container */}
            <div className="relative aspect-[4/5] overflow-hidden bg-slate-50 dark:bg-slate-900">
              {product.image_url ? (
                <img 
                  src={product.image_url} 
                  alt={product.nome_artigo}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-8 h-8 text-slate-200" />
                </div>
              )}
              
              {/* Badge */}
              <div className="absolute top-3 left-3 px-2 py-0.5 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest rounded-md shadow-lg">
                Em Estoque
              </div>

              {/* Hover Actions */}
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex gap-2">
                <button 
                  onClick={() => {
                    setSelectedQuoteProduct({
                      ...product,
                      name: product.nome_artigo,
                      avgPrice: product.pvp_cica,
                      quantity: Math.floor(Math.random() * 50) + 10 // placeholder for quantity
                    });
                    setShowQuoteModal(true);
                  }}
                  className="flex-1 bg-primary hover:bg-primary-hover text-white py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors shadow-lg shadow-primary/20"
                >
                  Mensagem
                </button>
              </div>
            </div>

            {/* Info */}
            <div className="p-4 flex flex-col gap-1">
              <h3 className="text-xs font-black text-slate-900 dark:text-white truncate">{product.nome_artigo || product.ref}</h3>
              <div className="flex items-center justify-between mt-1">
                <p className="text-sm font-black text-primary">{formatCurrency(product.pvp_cica)}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">6 UNIDADES</p>
              </div>
            </div>
          </motion.div>
        ))}
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
