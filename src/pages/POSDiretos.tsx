import { useState, useMemo, useEffect } from 'react';
import { 
    Search, 
    ShoppingCart, 
    Trash2, 
    Plus, 
    Minus, 
    User, 
    CreditCard, 
    Banknote, 
    ChevronRight,
    ArrowRight,
    Tag,
    X,
    Instagram,
    Image as ImageIcon,
    ZoomIn,
    Percent,
    Play,
    Square
} from 'lucide-react';
import { usePOS } from '../contexts/POSContext';
import { useStockLogic } from '../hooks/useStockLogic';
import { useData } from '../contexts/DataContext';
const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);

import { motion, AnimatePresence } from 'framer-motion';

const POSDiretos = () => {
    const { 
        cart, 
        addToCart, 
        removeFromCart, 
        updateQuantity, 
        clearCart,
        selectedCustomer,
        setSelectedCustomer,
        finalizeSale,
        activeSession,
        setActiveSession
    } = usePOS();

    const { 
        data,
        startLiveSession,
        endLiveSession,
        fetchLiveSessions
    } = useData();
    
    const produtos = data.products_catalog || [];
    const categorias = data.categories || [];
    const clientes = data.customers || [];
    
    // @ts-ignore
    const stockInventory = useStockLogic();

    // Estados Locais
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'multibanco' | 'mbway' | 'transferencia'>('multibanco');
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showDiscountModal, setShowDiscountModal] = useState(false);
    const [selectedCartItem, setSelectedCartItem] = useState<any>(null);
    const [discountValue, setDiscountValue] = useState('');
    const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    // Auto-detect Active Session
    useEffect(() => {
        fetchLiveSessions();
    }, []);

    useEffect(() => {
        const active = data.live_sessions?.find((s: any) => s.status === 'active');
        if (active && !activeSession) {
            setActiveSession(active);
        }
    }, [data.live_sessions, activeSession, setActiveSession]);

    // Handlers para Live Sessions
    const handleStartLive = async () => {
        const sessionName = `Direto ${new Date().toLocaleDateString('pt-PT')} ${new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`;
        const session = await startLiveSession(sessionName);
        if (session) {
            setActiveSession(session);
        }
    };

    const handleEndLive = async () => {
        if (activeSession) {
            await endLiveSession(activeSession.id);
            setActiveSession(null);
        }
    };

    // Filtros e Memoized Data
    const filteredProducts = useMemo(() => {
        return produtos.filter((p: any) => {
            const matchesSearch = p.nome_artigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                p.ref?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === 'all' || p.categoria === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [produtos, searchTerm, selectedCategory]);

    const filteredCustomers = useMemo(() => {
        if (!customerSearch) return [];
        return clientes.filter((c: any) => 
            c.nome_cliente?.toLowerCase().includes(customerSearch.toLowerCase()) ||
            c.instagram?.toLowerCase().includes(customerSearch.toLowerCase())
        ).slice(0, 5);
    }, [clientes, customerSearch]);

    const cartTotalAmount = cart.reduce((acc: number, item: any) => {
        const itemPrice = item.pvp_cica;
        const discountAmount = item.discount_type === 'percent' 
            ? (itemPrice * (item.discount || 0)) / 100 
            : (item.discount || 0);
        return acc + (itemPrice - discountAmount) * item.quantidade;
    }, 0);

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setIsProcessing(true);
        try {
            await finalizeSale({ 
                paymentMethod, 
                status: 'Concluída', 
                isDireto: true, 
                liveSessionId: activeSession?.id 
            });

            setShowCheckoutModal(false);
            setCustomerSearch('');
            setSelectedCustomer(null);
        } catch (error) {
            console.error('Erro no checkout:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const updateItemDiscount = (cartItemId: string, value: number, type: 'fixed' | 'percent') => {
        const item = cart.find(i => i.cartItemId === cartItemId);
        if (item) {
            removeFromCart(cartItemId);
            addToCart({
                ...item,
                discount: value,
                discount_type: type
            });
        }
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 overflow-hidden font-sans">
            {/* Main Content - Catálogo */}
            <div className="flex-1 flex flex-col min-w-0 border-r border-slate-800/50">
                {/* Header do Catálogo */}
                <div className="p-4 bg-slate-900/50 backdrop-blur-md border-b border-slate-800/50 space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-rose-500 transition-colors" />
                            <input 
                                type="text"
                                placeholder="Pesquisar produtos ou referência..."
                                className="w-full bg-slate-800/50 border-slate-700/50 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex bg-slate-800/50 rounded-xl p-1 border border-slate-700/50">
                            <button 
                                onClick={() => setViewMode('grid')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === 'grid' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                Grade
                            </button>
                            <button 
                                onClick={() => setViewMode('list')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === 'list' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                Lista
                            </button>
                        </div>
                    </div>

                    {/* Categorias */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                        <button 
                            onClick={() => setSelectedCategory('all')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                                selectedCategory === 'all' 
                                ? 'bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/20' 
                                : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-white'
                            }`}
                        >
                            Todos
                        </button>
                        {categorias.map(cat => (
                            <button 
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                                    selectedCategory === cat 
                                    ? 'bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/20' 
                                    : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-white'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Lista de Produtos */}
                <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-800">
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {filteredProducts.map((produto: any) => (
                                <motion.div 
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    //@ts-ignore
                                    key={produto.id || produto.ref}
                                    onClick={() => addToCart({
                                        ...produto,
                                        quantidade: 1,
                                        original_price: produto.pvp_cica,
                                        current_stock: stockInventory.find((s: any) => s.ref === produto.ref)?.current_stock || 0
                                    })}
                                    className="group bg-slate-900/40 border border-slate-800/50 rounded-2xl overflow-hidden hover:border-rose-500/50 transition-all cursor-pointer flex flex-col"
                                >
                                    <div className="relative aspect-square overflow-hidden bg-slate-950">
                                        {produto.image_url ? (
                                            <>
                                                <img 
                                                    src={produto.image_url} 
                                                    alt={produto.nome_artigo}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                />
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setZoomedImage(produto.image_url);
                                                    }}
                                                    className="absolute top-2 right-2 p-1.5 bg-black/50 backdrop-blur-md rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500"
                                                >
                                                    <ZoomIn className="w-3.5 h-3.5 text-white" />
                                                </button>
                                            </>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <ImageIcon className="w-8 h-8 text-slate-800" />
                                            </div>
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent translate-y-full group-hover:translate-y-0 transition-transform">
                                            <button className="w-full py-1.5 bg-rose-500 text-white text-[10px] font-black rounded-lg uppercase tracking-wider">
                                                Adicionar
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-3 flex-1 flex flex-col justify-between">
                                        <div>
                                            <h3 className="text-xs font-bold text-slate-200 line-clamp-1 group-hover:text-rose-400 transition-colors uppercase tracking-tight">
                                                {produto.nome_artigo}
                                            </h3>
                                            <p className="text-[10px] text-slate-500 mt-1 font-medium">{produto.ref || 'Sem Ref.'}</p>
                                        </div>
                                        <div className="mt-2 flex items-center justify-between">
                                            <span className="text-sm font-black text-rose-500">
                                                {formatCurrency(produto.pvp_cica)}
                                            </span>
                                            <div className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                                (stockInventory.find((s: any) => s.ref === produto.ref)?.current_stock || 0) <= 0 ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'
                                            }`}>
                                                {stockInventory.find((s: any) => s.ref === produto.ref)?.current_stock || 0} un
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredProducts.map((produto: any) => (
                                <motion.div 
                                    layout
                                    //@ts-ignore
                                    key={produto.id || produto.ref}
                                    onClick={() => addToCart({
                                        ...produto,
                                        quantidade: 1,
                                        original_price: produto.pvp_cica,
                                        current_stock: stockInventory.find((s: any) => s.ref === produto.ref)?.current_stock || 0
                                    })}
                                    className="group flex items-center gap-4 p-3 bg-slate-900/40 border border-slate-800/50 rounded-xl hover:border-rose-500/50 transition-all cursor-pointer"
                                >
                                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-950 shrink-0">
                                        {produto.image_url ? (
                                            <img src={produto.image_url} alt={produto.nome_artigo} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <ImageIcon className="w-4 h-4 text-slate-800" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-tight truncate">{produto.nome_artigo}</h3>
                                        <p className="text-[10px] text-slate-500 font-medium">{produto.ref || 'Sem Ref.'}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-sm font-black text-rose-500">{formatCurrency(produto.pvp_cica)}</span>
                                        <span className="text-[10px] text-slate-500 font-bold">{stockInventory.find((s: any) => s.ref === produto.ref)?.current_stock || 0} em stock</span>
                                    </div>
                                    <div className="p-2 rounded-lg bg-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Plus className="w-4 h-4 text-white" />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Sidebar - Carrinho */}
            <div className="w-96 flex flex-col bg-slate-900 border-l border-slate-800 shadow-2xl">
                {/* Header Carrinho */}
                <div className="p-4 border-b border-slate-800">
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-rose-500/10 rounded-xl">
                                    <ShoppingCart className="w-5 h-5 text-rose-500" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black uppercase tracking-widest text-white">Carrinho</h2>
                                    <p className="text-[10px] font-bold text-slate-500">{cart.length} itens no pedido</p>
                                </div>
                            </div>
                            <button 
                                onClick={clearCart}
                                className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                                title="Limpar Carrinho"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Live Session Controls */}
                        <div className="p-3 bg-slate-800/40 rounded-2xl border border-slate-700/50">
                            {activeSession ? (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-rose-500">Direto Ativo</span>
                                            <span className="text-[11px] font-bold text-slate-300 truncate max-w-[140px]">{activeSession.name}</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleEndLive}
                                        className="flex items-center gap-2 px-3 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-all group shadow-lg shadow-rose-500/20"
                                    >
                                        <Square className="w-3.5 h-3.5 fill-current" />
                                        <span className="text-[10px] font-black uppercase tracking-tight">Encerrar</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 bg-slate-600 rounded-full" />
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Sem Direto</span>
                                            <span className="text-[11px] font-bold text-slate-400">Pronto para começar</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleStartLive}
                                        className="flex items-center gap-2 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all group shadow-lg shadow-emerald-500/20"
                                    >
                                        <Play className="w-3.5 h-3.5 fill-current" />
                                        <span className="text-[10px] font-black uppercase tracking-tight">Iniciar Direto</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Área de Cliente */}
                <div className="p-4 bg-slate-800/30 border-b border-slate-800">
                    <div className="relative">
                        {selectedCustomer ? (
                            <div className="flex items-center gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                                <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center shrink-0">
                                    <User className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-xs font-black text-rose-500 uppercase tracking-tight truncate">{selectedCustomer.nome}</h3>
                                    {selectedCustomer.instagram && (
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <Instagram className="w-3 h-3 text-rose-400" />
                                            <span className="text-[10px] font-bold text-rose-400/80">@{selectedCustomer.instagram}</span>
                                        </div>
                                    )}
                                </div>
                                <button 
                                    onClick={() => setSelectedCustomer(null)}
                                    className="p-2 hover:bg-rose-500/20 rounded-lg text-rose-500 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="relative">
                                    <input 
                                        type="text"
                                        placeholder="Pesquisar cliente (Nome ou Instagram)..."
                                        className="w-full bg-slate-900 border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-[11px] font-bold focus:ring-2 focus:ring-rose-500/20 transition-all outline-none text-slate-200 placeholder:text-slate-600"
                                        value={customerSearch}
                                        onChange={(e) => {
                                            setCustomerSearch(e.target.value);
                                            setShowCustomerSuggestions(true);
                                        }}
                                        onFocus={() => setShowCustomerSuggestions(true)}
                                    />
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                                </div>

                                <AnimatePresence>
                                    {showCustomerSuggestions && filteredCustomers.length > 0 && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute inset-x-0 top-full mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
                                        >
                                            {filteredCustomers.map((c: any) => (
                                                <button
                                                    key={c.id}
                                                    onClick={() => {
                                                        setSelectedCustomer(c);
                                                        setCustomerSearch('');
                                                        setShowCustomerSuggestions(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-800 transition-colors text-left border-b border-slate-800 last:border-0"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                                                        <User className="w-4 h-4 text-slate-400" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[11px] font-black text-slate-200 uppercase tracking-tight truncate">{c.nome}</div>
                                                        {c.instagram ? (
                                                            <div className="flex items-center gap-1 mt-0.5">
                                                                 <Instagram className="w-2.5 h-2.5 text-rose-500/70" />
                                                                <span className="text-[9px] font-bold text-slate-500">@{c.instagram}</span>
                                                            </div>
                                                        ) : (
                                                            <div className="text-[9px] font-bold text-slate-600">Sem Instagram</div>
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </div>

                {/* Itens do Carrinho */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-800">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50 space-y-3">
                            <ShoppingCart className="w-12 h-12 stroke-[1.5]" />
                            <p className="text-xs font-black uppercase tracking-widest">Carrinho Vazio</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {cart.map((item) => {
                                const itemPrice = item.pvp_cica;
                                const discountAmount = item.discount_type === 'percent' 
                                    ? (itemPrice * (item.discount || 0)) / 100 
                                    : (item.discount || 0);
                                const itemTotal = (itemPrice - discountAmount) * item.quantidade;

                                return (
                                    <div key={item.cartItemId} className="group relative bg-slate-800/30 border border-slate-800 rounded-2xl p-3 hover:border-slate-700 transition-all">
                                        <div className="flex gap-3">
                                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-slate-800">
                                                {item.image_url ? (
                                                    <img src={item.image_url} alt={item.nome_artigo} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <ImageIcon className="w-4 h-4 text-slate-800" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h3 className="text-[11px] font-black text-slate-200 uppercase tracking-tight truncate leading-tight">
                                                        {item.nome_artigo}
                                                    </h3>
                                                    <button 
                                                        onClick={() => removeFromCart(item.cartItemId)}
                                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                
                                                <div className="flex items-center justify-between mt-2">
                                                    <div className="flex items-center bg-slate-900/80 rounded-lg border border-slate-700/50 p-0.5">
                                                        <button 
                                                            onClick={() => updateQuantity(item.cartItemId, Math.max(1, item.quantidade - 1))}
                                                            className="p-1 hover:text-rose-500 transition-colors"
                                                        >
                                                            <Minus className="w-2.5 h-2.5" />
                                                        </button>
                                                        <span className="w-8 text-center text-[10px] font-black text-white">{item.quantidade}</span>
                                                        <button 
                                                            onClick={() => updateQuantity(item.cartItemId, item.quantidade + 1)}
                                                            className="p-1 hover:text-rose-500 transition-colors"
                                                        >
                                                            <Plus className="w-2.5 h-2.5" />
                                                        </button>
                                                    </div>
                                                    
                                                    <div className="flex flex-col items-end gap-1">
                                                        <button 
                                                            onClick={() => {
                                                                setSelectedCartItem(item);
                                                                setDiscountValue(item.discount?.toString() || '');
                                                                setDiscountType(item.discount_type || 'fixed');
                                                                setShowDiscountModal(true);
                                                            }}
                                                            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all transition-colors"
                                                        >
                                                            <Percent className="w-2 h-2" />
                                                            <span className="text-[8px] font-black uppercase">Desc.</span>
                                                        </button>
                                                        <div className="text-right flex flex-col items-end shrink-0">
                                                            {(item.discount || 0) > 0 && (
                                                                <div className="flex items-center gap-1 group/disc">
                                                                    <span className="text-[7px] font-black text-rose-500/60 line-through tracking-tighter decoration-1">
                                                                        {formatCurrency(item.pvp_cica * item.quantidade)}
                                                                    </span>
                                                                    <button 
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            updateItemDiscount(item.cartItemId, 0, 'fixed');
                                                                        }}
                                                                        className="opacity-0 group-hover/disc:opacity-100 p-0.5 hover:bg-rose-500 hover:text-white text-rose-500 rounded transition-all"
                                                                        title="Remover Desconto"
                                                                    >
                                                                        <X className="w-2 h-2" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                            <span className="text-[10px] font-black text-rose-500 leading-none">
                                                                {formatCurrency(itemTotal)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer do Carrinho */}
                <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                            <span>Subtotal</span>
                            <span>{formatCurrency(cartTotalAmount)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Total a Pagar</span>
                            <span className="text-2xl font-black text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.3)]">
                                {formatCurrency(cartTotalAmount)}
                            </span>
                        </div>
                    </div>

                    <button 
                        disabled={cart.length === 0}
                        onClick={() => setShowCheckoutModal(true)}
                        className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 transition-all font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 ${
                            cart.length === 0 
                            ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
                            : 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20'
                        }`}
                    >
                        <span>Finalizar Pedido</span>
                        <ArrowRight className="w-5 h-5" />
                    </button>
                    {!activeSession && cart.length > 0 && (
                        <p className="text-[9px] text-center font-bold text-amber-500/80 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                            Atenção: Venda fora de Direto Live
                        </p>
                    )}
                </div>
            </div>

            {/* Checkout Modal */}
            <AnimatePresence>
                {showCheckoutModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowCheckoutModal(false)}
                            className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative z-10"
                        >
                            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-rose-500/10 rounded-2xl">
                                        <CreditCard className="w-6 h-6 text-rose-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black uppercase tracking-tight text-white">Pagamento</h3>
                                        <p className="text-xs font-bold text-slate-500">Selecione o método de pagamento</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowCheckoutModal(false)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Resumo */}
                                <div className="p-5 bg-slate-800/50 rounded-3xl border border-slate-700/50 flex items-center justify-between">
                                    <div>
                                        <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Valor Total</span>
                                        <span className="text-3xl font-black text-rose-500">{formatCurrency(cartTotalAmount)}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Cliente</span>
                                        <span className="text-xs font-black text-white uppercase truncate max-w-[150px] inline-block">
                                            {selectedCustomer?.nome || 'Cliente Final'}
                                        </span>
                                    </div>
                                </div>

                                {/* Métodos de Pagamento */}
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { id: 'multibanco', label: 'Multibanco', icon: CreditCard },
                                        { id: 'mbway', label: 'MBWay', icon: ArrowRight },
                                        { id: 'dinheiro', label: 'Dinheiro', icon: Banknote },
                                        { id: 'transferencia', label: 'Transferência', icon: ArrowRight }
                                    ].map((method) => (
                                        <button
                                            key={method.id}
                                            onClick={() => setPaymentMethod(method.id as any)}
                                            className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                                                paymentMethod === method.id 
                                                ? 'bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/20' 
                                                : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:bg-slate-800'
                                            }`}
                                        >
                                            <method.icon className={`w-5 h-5 ${paymentMethod === method.id ? 'text-white' : 'text-slate-500'}`} />
                                            <span className="text-xs font-black uppercase tracking-tight">{method.label}</span>
                                        </button>
                                    ))}
                                </div>

                                <button 
                                    onClick={handleCheckout}
                                    disabled={isProcessing}
                                    className="w-full py-4 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-3"
                                >
                                    {isProcessing ? (
                                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <span>Confirmar Venda</span>
                                            <ChevronRight className="w-5 h-5" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Discount Modal */}
            <AnimatePresence>
                {showDiscountModal && selectedCartItem && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowDiscountModal(false)}
                            className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative z-10"
                        >
                            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-rose-500/10 rounded-2xl">
                                        <Tag className="w-5 h-5 text-rose-500" />
                                    </div>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Desconto</h3>
                                </div>
                                <button onClick={() => setShowDiscountModal(false)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="text-center">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Produto Selecionado</p>
                                    <p className="text-xs font-bold text-white uppercase">{selectedCartItem.nome_artigo}</p>
                                </div>

                                <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                                    <button 
                                        onClick={() => setDiscountType('fixed')}
                                        className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${
                                            discountType === 'fixed' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        Fixo (€)
                                    </button>
                                    <button 
                                        onClick={() => setDiscountType('percent')}
                                        className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${
                                            discountType === 'percent' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        Percentual (%)
                                    </button>
                                </div>

                                <div className="relative">
                                    <input 
                                        type="number"
                                        placeholder="0.00"
                                        className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl p-4 text-center text-2xl font-black text-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all outline-none"
                                        value={discountValue}
                                        onChange={(e) => setDiscountValue(e.target.value)}
                                        autoFocus
                                    />
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                                        {discountType === 'fixed' ? '€' : '%'}
                                    </div>
                                </div>

                                <button 
                                    onClick={() => {
                                        updateItemDiscount(selectedCartItem.cartItemId, parseFloat(discountValue) || 0, discountType);
                                        setShowDiscountModal(false);
                                    }}
                                    className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-rose-500/20 active:scale-95 transition-all"
                                >
                                    Aplicar Desconto
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Image Zoom Modal */}
            <AnimatePresence>
                {zoomedImage && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setZoomedImage(null)}
                            className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative max-w-5xl w-full aspect-square rounded-3xl overflow-hidden shadow-2xl"
                        >
                            <img src={zoomedImage} className="w-full h-full object-contain" alt="Zoom" />
                            <button 
                                onClick={() => setZoomedImage(null)}
                                className="absolute top-6 right-6 p-3 bg-black/50 backdrop-blur-md rounded-2xl text-white hover:bg-rose-500 transition-colors shadow-lg"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default POSDiretos;
