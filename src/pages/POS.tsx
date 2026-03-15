import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, CreditCard, Banknote, Smartphone, ShoppingCart, User, Package, Loader2, CheckCircle2, FilePlus, Gift, Receipt, Truck, Tag, Percent, LayoutGrid, List, AlertTriangle, Delete, ArrowRightLeft, Wallet, Hash } from 'lucide-react';
import { usePOS } from '../contexts/POSContext';
import { useStockLogic } from '../hooks/useStockLogic';
import { useData } from '../contexts/DataContext';
import { useDashboardData } from '../hooks/useDashboardData';
import { ImageZoomModal } from '../components/Loja/ImageZoomModal';

export default function POS() {
    const {
        cart, addToCart, updateItemDiscount, updateItemPrice, updateQuantity, removeFromCart, clearCart,
        cartTotal, cartDiscount, cartDiscountType, cartActualDiscount, setCartDiscount, selectedCustomer, setSelectedCustomer, finalizeSale, isProcessing,
        shippingType, setShippingType
    } = usePOS();

    const { addProduct, data } = useData();
    const stockInventory = useStockLogic();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [configuringProduct, setConfiguringProduct] = useState<any>(null);
    const [selectedColorForConfig, setSelectedColorForConfig] = useState<string | null>(null);
    
    // Modals
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [checkoutStep, setCheckoutStep] = useState<1 | 2 | 3>(1);
    const [isCartCollapsed, setIsCartCollapsed] = useState(false);
    const [isManualItemModalOpen, setIsManualItemModalOpen] = useState(false);

    // Checkout Details
    const [paymentMethod, setPaymentMethod] = useState('');
    const [cashReceived, setCashReceived] = useState<string>('');
    const [nif, setNif] = useState('');
    const [isGift, setIsGift] = useState(false);
    const [saleNotes, setSaleNotes] = useState('');
    const [saleStatus, setSaleStatus] = useState<'Concluída' | 'Draft/Espera'>('Concluída');

    // Manual Item State
    const [manualItem, setManualItem] = useState({ 
        name: '', 
        price: '', 
        category: '', 
        ref: `MV-${Date.now().toString().slice(-6)}`,
        cost: '',
        registerProduct: false 
    });

    const [balanceUsed, setBalanceUsed] = useState<number>(0);

    // Customer Search State
    const { allCustomers } = useDashboardData();
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
    const [zoomedProduct, setZoomedProduct] = useState<any>(null);
    const [discountModalConfig, setDiscountModalConfig] = useState<{
        isOpen: boolean;
        type: 'item' | 'total';
        cartItemId?: string;
        baseValue: number;
        title: string;
    }>({ isOpen: false, type: 'total', baseValue: 0, title: '' });

    const filteredCustomers = useMemo(() => {
        if (!customerSearchTerm) return [];
        const term = customerSearchTerm.toLowerCase();
        return allCustomers.filter(c => 
            (c.name && c.name.toLowerCase().includes(term)) || 
            (c.instagram && c.instagram.toLowerCase().includes(term))
        ).slice(0, 5);
    }, [allCustomers, customerSearchTerm]);

    const categories = useMemo(() => {
        const cats = new Set<string>();
        stockInventory.forEach(p => {
            if (p.categoria) cats.add(p.categoria);
        });
        // Include categories from settings
        if (data.categories) {
            data.categories.forEach(cat => cats.add(cat));
        }
        return Array.from(cats).sort();
    }, [stockInventory, data.categories]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);
    };

    // Calculate available stock based on items already in cart
    const stockWithCart = useMemo(() => {
        return stockInventory.map(product => {
            const productRef = String(product.ref).trim().toUpperCase();
            const itemsInCart = cart.filter(item => String(item.ref).trim().toUpperCase() === productRef);
            
            if (itemsInCart.length === 0) return product;

            const updatedProduct = { ...product };
            const updatedVariations = product.variations.map(v => {
                const cartQty = itemsInCart
                    .filter(item => {
                        const vid = `${productRef}|${item.size || ''}|${item.color || ''}`;
                        return v.variation_id === vid;
                    })
                    .reduce((sum, item) => sum + item.quantidade, 0);
                
                return {
                    ...v,
                    absolute_stock: v.current_stock,
                    current_stock: Math.max(0, v.current_stock - cartQty)
                };
            });

            updatedProduct.variations = updatedVariations;
            updatedProduct.absolute_stock = product.current_stock;
            updatedProduct.current_stock = updatedVariations.reduce((acc, v) => acc + Math.max(0, v.current_stock), 0);
            
            return updatedProduct;
        });
    }, [stockInventory, cart]);

    const filteredProducts = useMemo(() => {
        let filtered = stockWithCart;

        if (selectedCategory) {
            filtered = filtered.filter(p => p.categoria === selectedCategory);
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(p =>
                (p.name?.toLowerCase().includes(term) || p.ref.toLowerCase().includes(term))
            );
        }

        return filtered.slice(0, 100);
    }, [stockWithCart, searchTerm, selectedCategory]);

    const handleProductClick = (item: any) => {
        // If it has multiple variations, show the config view
        if (item.variations && item.variations.length > 1) {
            setConfiguringProduct(item);
            setSelectedColorForConfig(null);
            return;
        }

        // If it has exactly 1 variation, add it directly with variation details
        if (item.variations && item.variations.length === 1) {
            const v = item.variations[0];
            let finalImageUrl = item.image_url;
            if (v.color && item.color_images && item.color_images[v.color]) {
                finalImageUrl = item.color_images[v.color];
            }

            addToCart({
                ref: item.ref,
                nome_artigo: item.name,
                quantidade: 1,
                original_price: item.pvp || 0,
                pvp_cica: item.pvp || 0,
                base_price: item.base_price || 0,
                current_stock: v.absolute_stock ?? v.current_stock,
                size: v.size,
                color: v.color,
                categoria: item.categoria,
                image_url: finalImageUrl,
                variations: item.variations.map((v: any) => ({
                    ...v,
                    current_stock: v.absolute_stock ?? v.current_stock
                })),
                color_images: item.color_images
            });
            setIsCartCollapsed(false);
            return;
        }

        // Else (0 variations), add simple item
        addToCart({
            ref: item.ref,
            nome_artigo: item.name,
            quantidade: 1,
            original_price: item.pvp || 0,
            pvp_cica: item.pvp || 0,
            base_price: item.base_price || 0,
            current_stock: item.absolute_stock ?? item.current_stock,
            size: '',
            color: '',
            categoria: item.categoria,
            image_url: item.image_url,
            variations: [],
            color_images: item.color_images
        });
        setIsCartCollapsed(false);
    };

    const handleFinalizeSale = async () => {
        const success = await finalizeSale({
            paymentMethod,
            status: saleStatus,
            nif: nif || selectedCustomer?.nif,
            isGift,
            notes: saleNotes,
            balanceUsed: balanceUsed,
            onSaleComplete: () => {
                setIsCheckoutModalOpen(false);
                setCheckoutStep(1);
                setPaymentMethod('');
                setCashReceived('');
                setBalanceUsed(0);
            }
        });
        if (success) {
            alert(saleStatus === 'Concluída' ? 'Venda realizada com sucesso!' : 'Pedido guardado com sucesso!');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-[calc(100vh-6rem)] flex flex-col lg:flex-row gap-4"
        >
            {/* Left Column - Product Catalog */}
            <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] border border-slate-200/60 dark:border-white/10 overflow-hidden shadow-2xl">
                <div className="p-3 border-b border-slate-100 dark:border-white/5 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex-1 max-w-xl relative group">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-400 group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Ref / Nome / Instagram..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-lg py-1 pl-7 pr-8 text-[9px] font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all shadow-sm"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex bg-white dark:bg-white/5 p-0.5 rounded-xl border border-slate-100 dark:border-white/10 shadow-sm">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
                                >
                                    <List className="w-4 h-4" />
                                </button>
                            </div>
                            <button
                                onClick={() => setIsManualItemModalOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl font-black text-[8px] uppercase tracking-widest transition-all shadow-lg shadow-primary/20"
                            >
                                <FilePlus className="w-3.5 h-3.5" />
                                <span>Adicionar Manual</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${!selectedCategory 
                                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                                : 'bg-white dark:bg-white/5 text-slate-400 border border-slate-100 dark:border-white/5 hover:text-slate-600 dark:hover:text-white'}`}
                        >
                            Todos
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedCategory === cat 
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                                    : 'bg-white dark:bg-white/5 text-slate-400 border border-slate-100 dark:border-white/5 hover:text-slate-600 dark:hover:text-white'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                    {viewMode === 'list' && filteredProducts.length > 0 && (
                        <div className="mx-2 mb-3 px-4 py-2 grid grid-cols-[32px_2fr_1fr_1fr_1fr] items-center gap-4 bg-slate-100/80 dark:bg-white/10 rounded-xl border border-slate-200 dark:border-white/10 sticky top-0 z-10 backdrop-blur-xl shadow-sm">
                            <div className="w-8 h-8 opacity-0" />
                            <span className="text-[9px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest">Artigo / Referência</span>
                            <span className="text-[9px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest text-center">Stock</span>
                            <span className="text-[9px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest text-center">Custo</span>
                            <span className="text-[9px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest text-right">Venda</span>
                        </div>
                    )}
                    <div className={viewMode === 'grid' 
                        ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3"
                        : "flex flex-col gap-2 px-2"
                    }>
                        {filteredProducts.map((product) => (
                            <button
                                key={product.ref}
                                onClick={() => handleProductClick(product)}
                                className={viewMode === 'grid' 
                                    ? `relative flex flex-col items-start p-2 rounded-[1.5rem] border text-left transition-all ${product.current_stock <= 0
                                        ? 'border-amber-200 dark:border-amber-500/20 bg-amber-50/30 dark:bg-amber-500/5'
                                        : 'border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 hover:border-primary/40 hover:shadow-xl hover:-translate-y-1'
                                        }`
                                    : `relative flex items-center gap-4 p-3 rounded-2xl border text-left transition-all ${product.current_stock <= 0
                                        ? 'border-amber-200 dark:border-amber-500/20 bg-amber-50/30 dark:bg-amber-500/5'
                                        : 'border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 hover:border-primary/40 hover:shadow-md'
                                        }`
                                }
                            >
                                {product.current_stock <= 0 && (
                                    <div className="absolute top-2 right-2 z-10 p-1 bg-amber-500 rounded-full shadow-lg animate-pulse">
                                        <AlertTriangle className="w-2.5 h-2.5 text-white" />
                                    </div>
                                )}
                                {viewMode === 'grid' ? (
                                    <>
                                        <div 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setZoomedProduct({ ...product, nome_artigo: product.name });
                                            }}
                                            className="w-full aspect-square bg-slate-50 dark:bg-slate-900 rounded-[1rem] flex items-center justify-center overflow-hidden border border-slate-100 dark:border-white/5 relative group/img cursor-zoom-in"
                                        >
                                            {product.image_url ? (
                                                <img 
                                                    src={product.image_url} 
                                                    alt={product.name} 
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110" 
                                                />
                                            ) : (
                                                <Package className="w-6 h-6 text-slate-200 dark:text-slate-700" />
                                            )}
                                        </div>
                                        <div className="mt-2 w-full px-0.5 flex flex-col justify-between">
                                            <div className="space-y-0.5">
                                                <span className="text-[10px] font-black text-slate-900 dark:text-white leading-tight block uppercase truncate">
                                                    {product.name}
                                                </span>
                                                <span className="font-black text-sm text-primary block">
                                                    {formatCurrency(product.pvp || 0)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-end gap-2 mt-2 pt-1 border-t border-slate-100 dark:border-white/5">
                                                <span className="text-[7px] font-black text-purple-500 uppercase tracking-tighter">{product.categoria}</span>
                                                <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">REF: {product.ref}</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setZoomedProduct({ ...product, nome_artigo: product.name });
                                            }}
                                            className="w-8 h-8 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center overflow-hidden border border-slate-100 dark:border-white/5 shrink-0 cursor-zoom-in"
                                        >
                                            {product.image_url ? (
                                                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <Package className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 grid grid-cols-[2fr_1fr_1fr_1fr] items-center gap-4">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <span className="text-[8px] font-black text-primary truncate uppercase tracking-tighter">
                                                        {product.ref}
                                                    </span>
                                                    <span className="text-[7px] font-black text-purple-600 bg-purple-50 dark:bg-purple-900/30 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                                                        {product.categoria}
                                                    </span>
                                                </div>
                                                <h3 className="text-[9px] font-black text-slate-900 dark:text-white truncate uppercase leading-tight">
                                                    {product.name}
                                                </h3>
                                            </div>
                                            <div className="text-center group-hover:bg-slate-50 dark:group-hover:bg-white/5 rounded-lg py-1 transition-colors">
                                                <div className="text-[9px] font-black text-slate-900 dark:text-white">{product.current_stock}</div>
                                            </div>
                                            <div className="text-center group-hover:bg-slate-50 dark:group-hover:bg-white/5 rounded-lg py-1 transition-colors">
                                                <div className="text-[9px] font-black text-slate-600 dark:text-slate-400 font-mono tracking-tighter">
                                                    {formatCurrency(product.base_price || 0)}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] font-black text-primary">
                                                    {formatCurrency(product.pvp || 0)}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </button>
                        ))}

                        {filteredProducts.length === 0 && (
                            <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400">
                                <Search className="w-12 h-12 mb-4 opacity-20" />
                                <p className="font-bold text-sm">Nenhum produto encontrado</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Column - Sidebar */}
            <motion.div 
                animate={{ width: isCartCollapsed ? '60px' : '320px' }}
                transition={{ type: 'spring', damping: 25, stiffness: 120 }}
                className="flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-2xl shrink-0 relative"
            >
                {/* Sidebar Contexts */}
                <div className="flex-1 flex flex-col overflow-hidden relative border-l border-slate-100 dark:border-white/5">
                    {/* Compact Integrated Header */}
                    {!configuringProduct && (
                        <div className="px-3 py-2 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <ShoppingCart className="w-2.5 h-2.5 text-primary" />
                                <h2 className="font-black text-[9px] text-slate-900 dark:text-white uppercase tracking-tighter truncate">Resumo</h2>
                                <span className="bg-primary/10 text-primary text-[7px] font-black px-1 rounded-full">{cart.length}</span>
                            </div>
                            <div className="flex-1 flex items-center gap-1.5 transition-all">
                                <User className="w-2.5 h-2.5 text-slate-400" />
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        value={customerSearchTerm || (selectedCustomer?.nome === 'Cliente Avulso' ? '' : selectedCustomer?.nome) || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setCustomerSearchTerm(val);
                                            setShowCustomerSuggestions(true);
                                            setSelectedCustomer({ ...selectedCustomer, nome: val || 'Cliente Avulso' });
                                        }}
                                        onFocus={(e) => {
                                            if (selectedCustomer?.nome === 'Cliente Avulso' && !customerSearchTerm) {
                                                setCustomerSearchTerm('');
                                            }
                                            setShowCustomerSuggestions(true);
                                            e.target.select();
                                        }}
                                        onBlur={() => {
                                            setTimeout(() => {
                                                setShowCustomerSuggestions(false);
                                                if (!customerSearchTerm && (!selectedCustomer?.nome || selectedCustomer?.nome === '')) {
                                                    setSelectedCustomer({ ...selectedCustomer, nome: 'Cliente Avulso' });
                                                }
                                            }, 200);
                                        }}
                                        placeholder="Cliente Avulso"
                                        className="w-full py-1 bg-transparent border-0 text-[10px] font-black text-slate-900 dark:text-white outline-none placeholder:text-slate-400 placeholder:opacity-50"
                                    />
                                    <AnimatePresence>
                                        {showCustomerSuggestions && filteredCustomers.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                                                className="absolute left-[-20px] right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden"
                                            >
                                                {filteredCustomers.map((c, i) => (
                                                    <button key={i} type="button" onClick={() => { setSelectedCustomer({ nome: c.name, instagram: c.instagram !== '-' ? c.instagram : undefined, nif: c.nif, saldo: c.saldo || 0 }); setCustomerSearchTerm(c.name); setShowCustomerSuggestions(false); }}
                                                            className="w-full text-left px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b last:border-0 border-slate-100 dark:border-white/5">
                                                        <div className="font-black text-[9px] text-slate-900 dark:text-white truncate">{c.name}</div>
                                                        {c.saldo > 0 && <div className="text-[7px] font-black text-emerald-500 uppercase tracking-tighter">Saldo: {formatCurrency(c.saldo)}</div>}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                            {cart.length > 0 && (
                                <button onClick={clearCart} className="p-1 hover:bg-rose-500/10 rounded-lg transition-colors group">
                                    <X className="w-2.5 h-2.5 text-rose-500" />
                                </button>
                            )}
                        </div>
                    )}
                    {configuringProduct ? (
                        /* Context A: Variation Selection */
                        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
                            <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-purple-50/50 dark:bg-purple-900/10">
                                <div className="min-w-0">
                                    <h3 className="font-black text-[11px] text-slate-900 dark:text-white truncate uppercase">{configuringProduct.name}</h3>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">ESCOLHA AS VARIAÇÕES</p>
                                </div>
                                <button 
                                    onClick={() => setConfiguringProduct(null)}
                                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-3.5 h-3.5 text-slate-400" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                                {!selectedColorForConfig ? (
                                    <div className="space-y-3">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                            Escolha a Cor
                                        </p>
                                        <div className="grid grid-cols-2 gap-3">
                                            {Array.from(new Set(configuringProduct.variations.map((v: any) => v.color))).map((color: any) => (
                                                <button
                                                    key={color}
                                                    onClick={() => setSelectedColorForConfig(color)}
                                                    className={`group relative flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${selectedColorForConfig === color ? 'border-primary bg-primary/5' : 'border-transparent bg-slate-50 dark:bg-white/5 hover:border-slate-200 dark:hover:border-white/10'}`}
                                                >
                                                    {configuringProduct.color_images?.[color] ? (
                                                        <img 
                                                            src={configuringProduct.color_images[color]} 
                                                            className="w-full aspect-square rounded-xl object-cover shadow-md"
                                                            alt={color}
                                                        />
                                                    ) : (
                                                        <div className="w-full aspect-square rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                                            <Package className="w-6 h-6 text-slate-400" />
                                                        </div>
                                                    )}
                                                    <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tighter truncate w-full text-center">{color}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-3 bg-primary/5 rounded-2xl border border-primary/20">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl overflow-hidden border border-primary/20">
                                                <img src={configuringProduct.color_images?.[selectedColorForConfig] || configuringProduct.image_url} className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Cor Selecionada</p>
                                                <p className="font-black text-xs text-primary uppercase">{selectedColorForConfig}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setSelectedColorForConfig(null)}
                                            className="px-3 py-1.5 bg-white dark:bg-slate-800 text-[9px] font-black text-slate-500 uppercase rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-50 transition-all"
                                        >
                                            Trocar
                                        </button>
                                    </div>
                                )}

                                {selectedColorForConfig && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                            Escolha o Tamanho
                                        </p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {configuringProduct.variations
                                                .filter((v: any) => v.color === selectedColorForConfig)
                                                .map((v: any) => (
                                                    <button
                                                        key={v.size}
                                                        onClick={() => {
                                                            let finalImageUrl = configuringProduct.image_url;
                                                            if (v.color && configuringProduct.color_images && configuringProduct.color_images[v.color]) {
                                                                finalImageUrl = configuringProduct.color_images[v.color];
                                                            }

                                                            addToCart({
                                                                ref: configuringProduct.ref,
                                                                nome_artigo: configuringProduct.name,
                                                                quantidade: 1,
                                                                original_price: configuringProduct.pvp || 0,
                                                                pvp_cica: configuringProduct.pvp || 0,
                                                                base_price: configuringProduct.base_price || 0,
                                                                current_stock: v.absolute_stock ?? v.current_stock,
                                                                size: v.size,
                                                                color: v.color,
                                                                categoria: configuringProduct.categoria,
                                                                image_url: finalImageUrl,
                                                                variations: configuringProduct.variations.map((v: any) => ({
                                                                    ...v,
                                                                    current_stock: v.absolute_stock ?? v.current_stock
                                                                })),
                                                                color_images: configuringProduct.color_images
                                                            });
                                                            setConfiguringProduct(null);
                                                            setSelectedColorForConfig(null);
                                                            setIsCartCollapsed(false);
                                                        }}
                                                        className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border-2 border-transparent hover:border-primary transition-all group lg:min-h-[60px]"
                                                    >
                                                        <span className="text-sm font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors">{v.size}</span>
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 tracking-tighter">STK: {v.current_stock}</span>
                                                    </button>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Context B: Normal Sidebar */
                        <>

                            <div className="flex-1 overflow-hidden flex flex-col">
                                <div className="px-3 py-2 flex items-center justify-between border-b border-slate-100 dark:border-white/5 relative">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Itens / Resumo</span>
                                </div>

                                <div className={`flex-1 overflow-y-auto px-3 py-2 space-y-1.5 custom-scrollbar transition-all duration-300 ${isCartCollapsed ? 'opacity-0' : 'opacity-100'}`}>
                                    {cart.length === 0 ? (
                                        <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2 opacity-30">
                                            <ShoppingCart className="w-8 h-8" />
                                            <span className="font-bold text-[8px] uppercase tracking-widest text-center">CARRINHO VAZIO</span>
                                        </div>
                                    ) : (
                                        cart.map((item) => {
                                            const itemTotal = (item.pvp_cica * item.quantidade) - (
                                                item.discount_type === 'percent' 
                                                    ? (item.pvp_cica * item.quantidade * ((item.discount || 0) / 100)) 
                                                    : (item.discount || 0)
                                            );
                                            return (
                                                <div key={item.cartItemId} className="flex flex-col p-1.5 bg-slate-50/50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 group transition-colors hover:border-primary/20">
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <div 
                                                            onClick={() => setZoomedProduct(item)}
                                                            className="w-6 h-6 bg-white dark:bg-slate-900 rounded flex items-center justify-center overflow-hidden border border-slate-100 dark:border-white/5 shrink-0 relative cursor-zoom-in"
                                                        >
                                                            {item.image_url ? (
                                                                <img src={item.image_url} alt={item.nome_artigo} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Package className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                                                            )}
                                                        </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <p className="font-black text-[9px] text-slate-900 dark:text-white leading-tight truncate uppercase">
                                                                        {item.nome_artigo}
                                                                    </p>
                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                        <button 
                                                                            onClick={() => setDiscountModalConfig({
                                                                                isOpen: true,
                                                                                type: 'item',
                                                                                cartItemId: item.cartItemId,
                                                                                baseValue: item.pvp_cica * item.quantidade,
                                                                                title: 'Desconto no Item'
                                                                            })}
                                                                            className={`p-2 rounded-xl transition-all ${(item.discount || 0) > 0 ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-500/5'}`}
                                                                            title="Aplicar Desconto"
                                                                        >
                                                                            <Tag className="w-4 h-4" />
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => removeFromCart(item.cartItemId)} 
                                                                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/5 rounded-xl transition-all"
                                                                            title="Remover item"
                                                                        >
                                                                            <X className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    {(item.current_stock <= 0 || item.ref.startsWith('MV-')) && (
                                                                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 rounded-full animate-pulse border border-amber-500/20">
                                                                            <AlertTriangle className="w-2 h-2 text-amber-500" />
                                                                            <span className="text-[6px] font-black text-amber-500 uppercase">Atenção</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                    <div className="flex items-center gap-1.5 justify-between">
                                                        <div className="flex items-center gap-1 bg-white/50 dark:bg-black/20 px-1 rounded-md shrink-0">
                                                            <span className="text-[7px] font-black text-purple-500 uppercase tracking-tighter">
                                                                {item.size && `${item.size} / `}{item.color}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-1">
                                                            <button onClick={() => updateQuantity(item.cartItemId, -1)} className="w-4 h-4 flex items-center justify-center rounded bg-slate-200 dark:bg-white/10 text-[10px]">-</button>
                                                            <span className="text-[8px] font-black w-3 text-center">{item.quantidade}</span>
                                                            <button onClick={() => updateQuantity(item.cartItemId, 1)} className="w-4 h-4 flex items-center justify-center rounded bg-slate-200 dark:bg-white/10 text-[10px]">+</button>
                                                        </div>

                                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                                            <div className="relative flex-1">
                                                                <input 
                                                                    type="number" 
                                                                    value={item.pvp_cica}
                                                                    onChange={(e) => updateItemPrice(item.cartItemId, parseFloat(e.target.value) || 0)}
                                                                    className="w-full bg-transparent border-b border-slate-200 dark:border-white/10 text-[9px] font-black text-slate-900 dark:text-white focus:border-primary outline-none px-0.5"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="text-right flex flex-col items-end shrink-0">
                                                            {(item.discount || 0) > 0 && (
                                                                <span className="text-[7px] font-black text-rose-500/60 line-through tracking-tighter decoration-1">
                                                                    {formatCurrency(item.pvp_cica * item.quantidade)}
                                                                </span>
                                                            )}
                                                            <span className="text-[10px] font-black text-primary leading-none">
                                                                {formatCurrency(itemTotal)}
                                                            </span>
                                                        </div>

                                                        <div className="text-right shrink-0 min-w-[40px]">
                                                            <span className="text-[9px] font-black text-primary">{formatCurrency(itemTotal)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="px-2 py-2 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                    <div className="p-2 bg-slate-100/50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 group-hover:border-primary/20 transition-all font-black">
                        <div className="flex items-center gap-1.5 shrink-0">
                            <Truck className="w-3.5 h-3.5 text-primary" />
                            <span className="text-[8px] text-slate-500">Envio</span>
                        </div>
                        <select 
                            value={shippingType}
                            onChange={(e) => setShippingType(e.target.value)}
                            className="flex-1 bg-transparent text-[9px] outline-none cursor-pointer text-slate-900 dark:text-white text-right appearance-none"
                        >
                            <option value="Sem entrega">Sem entrega</option>
                            <option value="Entrega em mão">Em Mão</option>
                            <option value="Continental">Portugal (5€)</option>
                            <option value="Ilhas">Ilhas (10€)</option>
                            <option value="Estrangeiro">Inter (15€)</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-auto px-2 pb-2">
                    <button
                        onClick={() => {
                            setCheckoutStep(1);
                            setIsCheckoutModalOpen(true);
                        }}
                        disabled={cart.length === 0}
                        className="flex-1 py-2.5 bg-emerald-500 text-white disabled:opacity-20 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 group shadow-lg shadow-emerald-500/10 hover:bg-emerald-600"
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Avançar</span>
                    </button>

                    <div className="bg-primary px-3 py-2 rounded-xl flex flex-col items-end min-w-[100px] shadow-lg shadow-primary/20">
                        <span className="font-black text-white/70 uppercase tracking-tighter text-[7px] leading-none mb-1">TOTAL</span>
                        <span className="font-black text-xs text-white leading-none whitespace-nowrap">{formatCurrency(cartTotal)}</span>
                    </div>
                </div>
            </motion.div>

            {/* Checkout Modal */}
            <AnimatePresence>
                {isCheckoutModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={() => !isProcessing && setIsCheckoutModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
                        >
                            <div className="flex items-center justify-center gap-2 mb-2">
                                {[1, 2, 3].map((step) => (
                                    <div key={step} className={`h-1.5 rounded-full transition-all ${checkoutStep >= step ? 'w-8 bg-emerald-500' : 'w-4 bg-slate-200 dark:bg-slate-800'}`} />
                                ))}
                            </div>

                            {checkoutStep === 1 && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                    <div className="text-center">
                                        <div className="w-10 h-10 bg-primary/10 text-primary mx-auto rounded-xl flex items-center justify-center mb-3">
                                            <ShoppingCart className="w-5 h-5" />
                                        </div>
                                        <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase">Operação</h2>
                                        <p className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-tight">Como deseja prosseguir?</p>
                                    </div>
                                    <div className="space-y-2">
                                        <button
                                            onClick={() => { setSaleStatus('Concluída'); setCheckoutStep(2); }}
                                            className="w-full flex items-center gap-3 p-3 border-2 border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-500/10 rounded-xl transition-all hover:scale-[1.01]"
                                        >
                                            <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                                                <CheckCircle2 className="w-5 h-5" />
                                            </div>
                                            <div className="text-left">
                                                <span className="block font-black text-sm text-slate-900 dark:text-white uppercase">Finalizar Agora</span>
                                                <span className="text-[9px] font-bold text-slate-500">PROCEDER PAGAMENTO</span>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => { setSaleStatus('Draft/Espera'); setCheckoutStep(2); }}
                                            className="w-full flex items-center gap-3 p-3 border-2 border-slate-200 dark:border-white/10 rounded-xl transition-all hover:border-slate-400"
                                        >
                                            <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg flex items-center justify-center shrink-0">
                                                <Receipt className="w-5 h-5" />
                                            </div>
                                            <div className="text-left">
                                                <span className="block font-black text-sm text-slate-900 dark:text-white uppercase">Salvar Pedido</span>
                                                <span className="text-[9px] font-bold text-slate-500">PENDENTE / ESPERA</span>
                                            </div>
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {checkoutStep === 2 && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                                    <div className="text-center">
                                        <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase">Detalhes Adicionais</h2>
                                        <p className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-tight">NIF E OPÇÕES DE PRESENTE</p>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">NIF (Opcional)</label>
                                            <input
                                                type="text"
                                                value={nif}
                                                onChange={(e) => setNif(e.target.value)}
                                                placeholder="Contribuinte..."
                                                className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-bold text-slate-900 dark:text-white outline-none transition-all"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Notas da Venda</label>
                                            <textarea
                                                value={saleNotes}
                                                onChange={(e) => setSaleNotes(e.target.value)}
                                                rows={2}
                                                className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-bold text-slate-900 dark:text-white outline-none transition-all resize-none"
                                            />
                                        </div>

                                        <button
                                            onClick={() => setIsGift(!isGift)}
                                            className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${isGift ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-800/40'}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isGift ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                                                    <Gift className="w-4 h-4" />
                                                </div>
                                                <span className="font-black text-[10px] text-slate-900 dark:text-white uppercase">Marcar como Presente</span>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isGift ? 'border-primary bg-primary' : 'border-slate-300'}`}>
                                                {isGift && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                            </div>
                                        </button>
                                    </div>
                                    <div className="flex gap-4 pt-2">
                                        <button onClick={() => setCheckoutStep(1)} className="flex-1 py-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all">Voltar</button>
                                        <button onClick={() => setCheckoutStep(3)} className="flex-1 py-3 bg-primary text-white font-black text-[9px] uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">Próximo</button>
                                    </div>
                                </motion.div>
                            )}

                                    {checkoutStep === 3 && (
                                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-2">
                                            <div className="text-center relative">
                                                <h2 className="text-[8px] font-black text-slate-900 dark:text-white uppercase leading-none">Pagamento</h2>
                                                <div className="mt-1 p-1 bg-primary/5 rounded-lg border border-primary/10 flex items-center justify-between gap-2">
                                                    <div className="text-left">
                                                        <span className="block text-[5px] font-black text-primary uppercase tracking-widest opacity-60">Total a Pagar</span>
                                                        <span className="text-base font-black text-primary leading-none">{formatCurrency(cartTotal)}</span>
                                                    </div>
                                                    {parseFloat(cashReceived) > (cartTotal - balanceUsed) && (
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-[5px] font-black text-emerald-500 uppercase tracking-widest leading-none">Troco</span>
                                                            <span className="text-sm font-black text-emerald-600 leading-none">{formatCurrency(parseFloat(cashReceived) - (cartTotal - balanceUsed))}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {selectedCustomer && selectedCustomer.nome !== 'Cliente Avulso' && (selectedCustomer.saldo || 0) > 0 && (
                                                <div className="p-1.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[7px] font-black text-emerald-600 uppercase tracking-widest">Saldo Disponível: {formatCurrency(selectedCustomer.saldo || 0)}</span>
                                                        <button 
                                                            onClick={() => setBalanceUsed(balanceUsed > 0 ? 0 : Math.min(selectedCustomer.saldo || 0, cartTotal))}
                                                            className="text-[7px] font-black text-emerald-600 uppercase underline"
                                                        >
                                                            {balanceUsed > 0 ? 'Remover' : 'Usar Saldo'}
                                                        </button>
                                                    </div>
                                                    {balanceUsed > 0 && (
                                                        <div className="relative">
                                                            <Wallet className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-emerald-500" />
                                                            <input
                                                                type="number"
                                                                max={selectedCustomer.saldo}
                                                                value={balanceUsed}
                                                                onChange={(e) => setBalanceUsed(Math.min(selectedCustomer.saldo || 0, parseFloat(e.target.value) || 0))}
                                                                className="w-full py-1 pl-6 pr-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[10px] font-black text-emerald-600 outline-none"
                                                                placeholder="Quanto usar?"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="grid grid-cols-3 gap-1">
                                                {[
                                                    { id: 'Dinheiro', icon: Banknote },
                                                    { id: 'Transferência', icon: ArrowRightLeft },
                                                    { id: 'MBWay', icon: Smartphone },
                                                    { id: 'Saldo Cliente', icon: Wallet },
                                                    { id: 'Ref. Entidade', icon: Hash },
                                                    { id: 'Multibanco', icon: CreditCard }
                                                ].map((method) => (
                                                    <button
                                                        key={method.id}
                                                        onClick={() => setPaymentMethod(method.id)}
                                                        className={`p-1.5 rounded-lg border-2 transition-all flex flex-col items-center gap-0.5 ${paymentMethod === method.id ? `border-primary bg-primary/10` : 'border-slate-100 dark:border-white/5 bg-white dark:bg-white/5'}`}
                                                    >
                                                        <method.icon className={`w-3 h-3 ${paymentMethod === method.id ? `text-primary` : 'text-slate-400'}`} />
                                                        <span className={`text-[6px] font-black uppercase tracking-tighter text-center leading-none ${paymentMethod === method.id ? `text-primary` : 'text-slate-500'}`}>{method.id}</span>
                                                    </button>
                                                ))}
                                            </div>

                                            {paymentMethod === 'Dinheiro' && (
                                                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="space-y-1.5">
                                                    <div className="relative">
                                                        <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-500" />
                                                        <input
                                                            type="number"
                                                            value={cashReceived}
                                                            onChange={(e) => setCashReceived(e.target.value)}
                                                            placeholder="Valor recebido..."
                                                            className="w-full py-1 pl-8 pr-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-xs font-black text-emerald-600 outline-none focus:ring-2 focus:ring-emerald-500/10"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-4 gap-1 bg-slate-50 dark:bg-white/5 p-1.5 rounded-xl border border-slate-200 dark:border-white/10">
                                                        <div className="col-span-3 grid grid-cols-3 gap-1">
                                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0].map(digit => (
                                                                <button
                                                                    key={digit}
                                                                    onClick={() => {
                                                                        if (digit === '.' && cashReceived.includes('.')) return;
                                                                        setCashReceived(prev => (prev === '0' && digit !== '.' ? digit.toString() : prev + digit.toString()));
                                                                    }}
                                                                    className="py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg font-black text-sm text-slate-900 dark:text-white hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                                                                >
                                                                    {digit}
                                                                </button>
                                                            ))}
                                                            <button
                                                                onClick={() => setCashReceived('')}
                                                                className="py-1.5 bg-rose-500 text-white rounded-lg font-black text-sm hover:bg-rose-600 transition-all active:scale-95"
                                                            >
                                                                C
                                                            </button>
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <button
                                                                onClick={() => setCashReceived(prev => prev.slice(0, -1))}
                                                                className="flex-1 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg flex items-center justify-center hover:bg-slate-300 transition-all active:scale-95"
                                                            >
                                                                <Delete className="w-4 h-4" />
                                                            </button>
                                                            <div className="grid grid-cols-1 gap-1">
                                                                {[5, 10, 20].map(amt => (
                                                                    <button
                                                                        key={amt}
                                                                        onClick={() => setCashReceived(amt.toString())}
                                                                        className="py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-lg font-black text-[8px] hover:bg-emerald-500/20 transition-all active:scale-95"
                                                                    >
                                                                        {amt}€
                                                                    </button>
                                                                ))}
                                                                <button
                                                                    onClick={() => setCashReceived((cartTotal - balanceUsed).toString())}
                                                                    className="py-1 bg-primary text-white rounded-lg font-black text-[8px] uppercase tracking-tighter hover:bg-primary/90 transition-all active:scale-95"
                                                                >
                                                                    Total
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}

                                    <div className="flex gap-4 pt-2">
                                        <button onClick={() => setCheckoutStep(2)} className="flex-1 py-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 font-black text-[9px] uppercase tracking-widest rounded-xl transition-all">Anterior</button>
                                        <button
                                            disabled={!paymentMethod || isProcessing}
                                            onClick={handleFinalizeSale}
                                            className="flex-2 flex-[2] py-3 bg-emerald-500 text-white font-black text-[9px] uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                            {saleStatus === 'Concluída' ? 'Concluir Venda' : 'Salvar Pedido'}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Manual Item Modal */}
            <AnimatePresence>
                {isManualItemModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsManualItemModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center"><FilePlus className="w-6 h-6" /></div>
                                    <div><h2 className="text-xl font-black text-slate-900 dark:text-white uppercase">Item Avulso</h2><p className="text-xs font-bold text-slate-500">Adicionar produto personalizado</p></div>
                                </div>
                                <button onClick={() => setIsManualItemModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
                            </div>
                            <div className="p-4 space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Nome do Item</label>
                                    <input type="text" value={manualItem.name} onChange={(e) => setManualItem({ ...manualItem, name: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-primary/10" placeholder="..." />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Ref</label><input type="text" value={manualItem.ref} onChange={(e) => setManualItem({ ...manualItem, ref: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-bold outline-none" /></div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Categoria</label>
                                        <input 
                                            type="text" 
                                            list="categoryList"
                                            value={manualItem.category} 
                                            onChange={(e) => setManualItem({ ...manualItem, category: e.target.value })} 
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-bold outline-none" 
                                            placeholder="..." 
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Valor Unitário (€)</label>
                                        <div className="relative"><Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-500" /><input type="number" value={manualItem.price} onChange={(e) => setManualItem({ ...manualItem, price: e.target.value })} className="w-full py-2 pl-9 pr-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-sm font-black text-emerald-600 outline-none" placeholder="0.00" /></div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Custo (€)</label>
                                        <input type="number" value={manualItem.cost} onChange={(e) => setManualItem({ ...manualItem, cost: e.target.value })} className="w-full py-2 px-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-bold outline-none" placeholder="0.00" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 p-1 pt-2">
                                    <input type="checkbox" id="regProd" checked={manualItem.registerProduct} onChange={(e) => setManualItem({ ...manualItem, registerProduct: e.target.checked })} className="w-3.5 h-3.5 rounded border-slate-300 text-primary focus:ring-primary" />
                                    <label htmlFor="regProd" className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tight">Registar permanentemente na base de itens</label>
                                </div>
                                <button
                                    onClick={async () => {
                                        if (!manualItem.name || !manualItem.price) return;
                                        if (manualItem.registerProduct) {
                                            await addProduct({ 
                                                nome_artigo: manualItem.name, 
                                                ref: manualItem.ref, 
                                                categoria: manualItem.category, 
                                                pvp_cica: parseFloat(manualItem.price), 
                                                iva: 23,
                                                lucro_meu_faturado: 0,
                                                fornecedor: 'Manual'
                                            });
                                        }
                                        addToCart({ ref: manualItem.ref, nome_artigo: manualItem.name, quantidade: 1, original_price: parseFloat(manualItem.price), pvp_cica: parseFloat(manualItem.price), base_price: parseFloat(manualItem.price), current_stock: 999, categoria: manualItem.category, image_url: '', variations: [] });
                                        setIsManualItemModalOpen(false);
                                        setManualItem({ name: '', price: '', category: '', ref: `MV-${Date.now().toString().slice(-6)}`, cost: '', registerProduct: false });
                                    } }
                                    className="w-full py-3.5 bg-primary text-white font-black text-[9px] uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.01] transition-all mt-2"
                                >
                                    Confirmar Adição
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Discount Modal */}
            <AnimatePresence>
                {discountModalConfig.isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDiscountModalConfig(prev => ({ ...prev, isOpen: false }))} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-xl flex items-center justify-center text-purple-600"><Tag className="w-5 h-5" /></div>
                                    <h2 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tight">{discountModalConfig.title}</h2>
                                </div>
                                <button onClick={() => setDiscountModalConfig(prev => ({ ...prev, isOpen: false }))} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
                            </div>
                            <div className="space-y-6">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor Base</p>
                                    <p className="font-black text-xl text-slate-900 dark:text-white">{formatCurrency(discountModalConfig.baseValue)}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Banknote className="w-2.5 h-2.5" /> Desconto (€)</label>
                                        <input 
                                            type="number" 
                                            autoFocus 
                                            value={discountModalConfig.type === 'total' 
                                                ? (cartDiscountType === 'fixed' ? cartDiscount : Number((discountModalConfig.baseValue * (cartDiscount / 100)).toFixed(2))) 
                                                : (cart.find(i => i.cartItemId === discountModalConfig.cartItemId)?.discount_type === 'fixed' 
                                                    ? cart.find(i => i.cartItemId === discountModalConfig.cartItemId)?.discount 
                                                    : Number((discountModalConfig.baseValue * ((cart.find(i => i.cartItemId === discountModalConfig.cartItemId)?.discount || 0) / 100)).toFixed(2))) || ''
                                            } 
                                            onChange={(e) => { 
                                                const val = parseFloat(e.target.value) || 0; 
                                                if (discountModalConfig.type === 'total') { 
                                                    setCartDiscount(val, 'fixed'); 
                                                } else { 
                                                    updateItemDiscount(discountModalConfig.cartItemId!, val, 'fixed'); 
                                                } 
                                            }} 
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-black text-slate-900 dark:text-white text-lg" 
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Percent className="w-2.5 h-2.5" /> Desconto (%)</label>
                                        <input 
                                            type="number" 
                                            value={discountModalConfig.type === 'total' 
                                                ? (cartDiscountType === 'percent' ? cartDiscount : Number((cartDiscount / discountModalConfig.baseValue * 100).toFixed(2))) 
                                                : (cart.find(i => i.cartItemId === discountModalConfig.cartItemId)?.discount_type === 'percent' 
                                                    ? cart.find(i => i.cartItemId === discountModalConfig.cartItemId)?.discount 
                                                    : Number(((cart.find(i => i.cartItemId === discountModalConfig.cartItemId)?.discount || 0) / discountModalConfig.baseValue * 100).toFixed(2))) || ''
                                            } 
                                            onChange={(e) => { 
                                                const val = parseFloat(e.target.value) || 0; 
                                                if (discountModalConfig.type === 'total') { 
                                                    setCartDiscount(val, 'percent'); 
                                                } else { 
                                                    updateItemDiscount(discountModalConfig.cartItemId!, val, 'percent'); 
                                                } 
                                            }} 
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-black text-slate-900 dark:text-white text-lg" 
                                        />
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-slate-200 flex items-center justify-between bg-emerald-50/50 p-4 rounded-2xl">
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Novo Valor Final</p>
                                        <p className="font-black text-2xl text-emerald-600">
                                            {formatCurrency(discountModalConfig.type === 'total' 
                                                ? Math.max(0, discountModalConfig.baseValue - cartActualDiscount) 
                                                : (() => {
                                                    const currentItem = cart?.find(i => i.cartItemId === discountModalConfig.cartItemId);
                                                    if (!currentItem) return discountModalConfig.baseValue;
                                                    const disc = currentItem.discount_type === 'percent' 
                                                        ? (discountModalConfig.baseValue * ((currentItem.discount || 0) / 100))
                                                        : (currentItem.discount || 0);
                                                    return Math.max(0, discountModalConfig.baseValue - (disc || 0));
                                                })()
                                            )}
                                        </p>
                                    </div>
                                    <button onClick={() => setDiscountModalConfig(prev => ({ ...prev, isOpen: false }))} className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all">Confirmar</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ImageZoomModal
                isOpen={!!zoomedProduct}
                onClose={() => setZoomedProduct(null)}
                imageUrl={zoomedProduct?.image_url || ''}
                productName={zoomedProduct?.nome_artigo || zoomedProduct?.name || ''}
            />
        </motion.div>
    );
}
