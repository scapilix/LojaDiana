import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Minus, X, CreditCard, Banknote, Smartphone, ShoppingCart, User, Package, Loader2, ChevronRight, CheckCircle2, LayoutGrid, List, FilePlus, Gift, Calculator, Receipt, Expand, Truck, Tag, Percent } from 'lucide-react';
import { usePOS } from '../contexts/POSContext';
import { useStockLogic } from '../hooks/useStockLogic';
import { useData } from '../contexts/DataContext';
import { useDashboardData } from '../hooks/useDashboardData';
import { ImageZoomModal } from '../components/Loja/ImageZoomModal';

export default function POS() {
    const {
        cart, addToCart, updateQuantity, updateItemPrice, updateItemDiscount, updateItemVariation, removeFromCart, clearCart,
        cartTotal, cartDiscount, cartDiscountType, cartActualDiscount, cartSubtotal, setCartDiscount, selectedCustomer, setSelectedCustomer, finalizeSale, isProcessing,
        shippingType, shippingCost, setShippingType
    } = usePOS();

    const { addProduct } = useData();
    const stockInventory = useStockLogic();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    
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
    const [manualItem, setManualItem] = useState({ name: '', price: '', category: '', registerProduct: false });

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
        return Array.from(cats).sort();
    }, [stockInventory]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);
    };

    // Calculate available stock based on items already in cart
    const stockWithCart = useMemo(() => {
        return stockInventory.map(product => {
            // Get all cart items for this product ref
            const productRef = String(product.ref).trim().toUpperCase();
            const itemsInCart = cart.filter(item => String(item.ref).trim().toUpperCase() === productRef);
            
            if (itemsInCart.length === 0) return product;

            // Deep clone product to avoid mutation if needed (stockInventory is already a calculation)
            const updatedProduct = { ...product };
            
            // Adjust variations stock
            const updatedVariations = product.variations.map(v => {
                const cartQty = itemsInCart
                    .filter(item => {
                        const vid = `${productRef}|${item.size || ''}|${item.color || ''}`;
                        return v.variation_id === vid;
                    })
                    .reduce((sum, item) => sum + item.quantidade, 0);
                
                return {
                    ...v,
                    absolute_stock: v.current_stock, // Preserve real total stock
                    current_stock: Math.max(0, v.current_stock - cartQty)
                };
            });

            updatedProduct.variations = updatedVariations;
            updatedProduct.absolute_stock = product.current_stock;
            // Recalculate total product stock (sum of positive variation stocks)
            updatedProduct.current_stock = updatedVariations.reduce((acc, v) => acc + Math.max(0, v.current_stock), 0);
            
            return updatedProduct;
        });
    }, [stockInventory, cart]);

    // Filter products based on search and category (using stockWithCart)
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

        return filtered.slice(0, 100); // Limit render for performance
    }, [stockWithCart, searchTerm, selectedCategory]);

    const handleProductClick = (item: any) => {
        if (item.current_stock <= 0) return;

        // Add to cart directly. If it has variations, it will be added with default/none 
        // and the user can pick in the side cart.
        
        // Use absolute_stock if available, otherwise use original stockInventory lookup 
        // to get the true limit before cart subtraction
        const firstInStock = item.variations?.find((v: any) => v.current_stock > 0);
        const limitToRemove = firstInStock ? (firstInStock.absolute_stock ?? firstInStock.current_stock) : (item.absolute_stock ?? item.current_stock);
        
        const selectedColor = firstInStock?.color;
        let finalImageUrl = item.image_url;
        if (selectedColor && item.color_images && item.color_images[selectedColor]) {
            finalImageUrl = item.color_images[selectedColor];
        }

        addToCart({
            ref: item.ref,
            nome_artigo: item.name,
            quantidade: 1,
            original_price: item.pvp || 0,
            pvp_cica: item.pvp || 0,
            base_price: item.base_price || 0,
            current_stock: limitToRemove,
            size: firstInStock?.size || undefined,
            color: selectedColor || undefined,
            categoria: item.categoria,
            image_url: finalImageUrl,
            variations: item.variations.map((v: any) => ({
                ...v,
                current_stock: v.absolute_stock ?? v.current_stock // Pass the real stock to cart for variation changes
            })),
            color_images: item.color_images
        });
    };

    const handleFinalizeSale = async () => {
        const success = await finalizeSale({
            paymentMethod,
            status: saleStatus,
            nif: nif || selectedCustomer?.nif,
            isGift,
            notes: saleNotes,
            onSaleComplete: () => {
                setIsCheckoutModalOpen(false);
                setCheckoutStep(1);
                setPaymentMethod('');
                setCashReceived('');
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
            <div className="flex-1 flex flex-col bg-white/40 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-xl">
                <div className="p-2.5 border-b border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 space-y-2">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Pesquisar por Nome ou SKU..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-bold text-slate-900 dark:text-white text-xs"
                            />
                        </div>
                        <button
                            onClick={() => setIsManualItemModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl hover:border-purple-500 text-slate-600 dark:text-slate-400 font-bold text-xs transition-all whitespace-nowrap"
                        >
                            <FilePlus className="w-4 h-4" />
                            <span className="hidden md:inline">Item Solto</span>
                        </button>
                    </div>

                    {/* Category Filter & View Mode */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar flex-1">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${!selectedCategory 
                                ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-600/20' 
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-500 hover:border-purple-400'}`}
                        >
                            Todos
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${selectedCategory === cat 
                                    ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-600/20' 
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-500 hover:border-purple-400'}`}
                            >
                                {cat}
                            </button>
                        ))}
                        </div>

                        <div className="flex items-center gap-1 bg-white dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-white/10 shadow-sm shrink-0">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2.5 custom-scrollbar">
                    <div className={viewMode === 'grid' 
                        ? "grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2"
                        : "flex flex-col gap-1.5"
                    }>
                        {filteredProducts.map((product) => (
                            <button
                                key={product.ref}
                                onClick={() => handleProductClick(product)}
                                disabled={product.current_stock <= 0}
                                className={viewMode === 'grid' 
                                    ? `relative flex flex-col items-start p-2 rounded-lg border text-left transition-all ${product.current_stock <= 0
                                        ? 'opacity-50 cursor-not-allowed border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5'
                                        : 'border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 hover:border-purple-400 hover:shadow-lg'
                                        }`
                                    : `relative flex items-center gap-2.5 p-2 rounded-lg border text-left transition-all ${product.current_stock <= 0
                                        ? 'opacity-50 cursor-not-allowed border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5'
                                        : 'border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 hover:border-purple-400 hover:shadow-md'
                                        }`
                                }
                            >
                                {viewMode === 'grid' ? (
                                    <>
                                        <div 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setZoomedProduct({ ...product, nome_artigo: product.name });
                                            }}
                                            className="w-full aspect-square bg-white dark:bg-slate-900 rounded-lg mb-2 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-white/5 relative group/img cursor-zoom-in"
                                        >
                                            {product.image_url ? (
                                                <>
                                                    <img 
                                                        src={product.image_url} 
                                                        alt={product.name}
                                                        className="w-full h-full object-cover transition-transform group-hover/img:scale-110"
                                                    />
                                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Expand className="w-5 h-5 text-white" />
                                                    </div>
                                                </>
                                            ) : (
                                                <Package className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-0.5 w-full">
                                            <div className="flex items-center justify-between gap-1">
                                                <span className="text-[7px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest truncate">
                                                    {product.ref}
                                                </span>
                                                <span className="text-[6px] font-bold text-slate-400 uppercase truncate">
                                                    {product.categoria || 'S/ Categoria'}
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-900 dark:text-white leading-tight line-clamp-1 mt-0.5">
                                                {product.name}
                                            </span>
                                            <div className="mt-1 flex items-center justify-between w-full">
                                                <span className="font-black text-xs text-emerald-600 dark:text-emerald-400">
                                                    {formatCurrency(product.pvp || 0)}
                                                </span>
                                                <span className={`text-[7px] font-black px-1 py-0.5 rounded-md ${product.current_stock <= 0 ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30' :
                                                    product.current_stock <= 3 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30' :
                                                        'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                                    }`}>
                                                    {product.current_stock}
                                                </span>
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
                                            className="w-12 h-12 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center overflow-hidden border border-slate-100 dark:border-white/5 shrink-0 relative group/img cursor-zoom-in"
                                        >
                                            {product.image_url ? (
                                                <>
                                                    <img 
                                                        src={product.image_url} 
                                                        alt={product.name}
                                                        className="w-full h-full object-cover transition-transform group-hover/img:scale-110"
                                                    />
                                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Expand className="w-3.5 h-3.5 text-white" />
                                                    </div>
                                                </>
                                            ) : (
                                                <Package className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">{product.ref}</span>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase">{product.categoria}</span>
                                            </div>
                                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">{product.name}</span>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="font-black text-sm text-emerald-600 dark:text-emerald-400">{formatCurrency(product.pvp || 0)}</div>
                                            <div className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{product.current_stock} un em stock</div>
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

            {/* Right Column - Cart & Checkout */}
            <motion.div 
                animate={{ width: isCartCollapsed ? '48px' : '360px' }}
                transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                className="flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-2xl shrink-0 relative"
            >
                {/* Collapse Toggle - Redesigned as a vertical bar */}
                <div 
                    onClick={() => setIsCartCollapsed(!isCartCollapsed)}
                    className="absolute left-0 top-0 bottom-0 w-2 hover:bg-purple-500/10 cursor-pointer group/toggle z-20 flex items-center justify-center transition-colors border-r border-transparent hover:border-purple-500/20"
                >
                    <div className="w-1 h-8 bg-slate-300 dark:bg-slate-700 rounded-full group-hover/toggle:bg-purple-500 transition-colors" />
                </div>

                <div className={`p-3 border-b border-slate-200 dark:border-white/10 bg-purple-50/50 dark:bg-purple-900/10 flex items-center ${isCartCollapsed ? 'flex-col gap-4' : 'justify-between'}`}>
                    <div className={`flex items-center gap-2 ${isCartCollapsed ? 'mt-8' : ''}`}>
                        <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                            <ShoppingCart className="w-3.5 h-3.5" />
                        </div>
                        {!isCartCollapsed && (
                            <div>
                                <h2 className="font-black text-xs text-slate-900 dark:text-white leading-tight">Carrinho</h2>
                                <p className="text-[8px] font-bold text-purple-600 uppercase tracking-widest">{cart.length} itens</p>
                            </div>
                        )}
                    </div>
                    {!isCartCollapsed && cart.length > 0 && (
                        <button onClick={clearCart} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors">
                            Limpar
                        </button>
                    )}
                </div>

                {!isCartCollapsed ? (
                    <>
                        {/* Customer Selector */}
                        <div className="p-3 border-b border-slate-200 dark:border-white/10">
                            <div className="relative group/search">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 z-10">
                                    <User className="w-2.5 h-2.5" />
                                </div>
                                <input
                                    type="text"
                                    value={customerSearchTerm || selectedCustomer?.nome || ''}
                                    onChange={(e) => {
                                        setCustomerSearchTerm(e.target.value);
                                        setShowCustomerSuggestions(true);
                                        if (!e.target.value) {
                                            setSelectedCustomer({ nome: '' });
                                        } else {
                                            setSelectedCustomer({ ...selectedCustomer, nome: e.target.value });
                                        }
                                    }}
                                    onFocus={() => setShowCustomerSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 200)}
                                    placeholder="Nome do Cliente (Opcional)"
                                    className="w-full py-2 pl-10 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500 transition-colors"
                                />

                                {(customerSearchTerm || (selectedCustomer && selectedCustomer.nome)) && (
                                    <button 
                                        onClick={() => {
                                            setSelectedCustomer({ nome: '' });
                                            setCustomerSearchTerm('');
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors p-1 z-10"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}

                                {/* Suggestions Dropdown */}
                                <AnimatePresence>
                                    {showCustomerSuggestions && filteredCustomers.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-50 overflow-hidden"
                                        >
                                            {filteredCustomers.map((c, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedCustomer({ 
                                                            nome: c.name, 
                                                            instagram: c.instagram !== '-' ? c.instagram : undefined
                                                        });
                                                        setCustomerSearchTerm(c.name);
                                                        setShowCustomerSuggestions(false);
                                                    }}
                                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b last:border-0 border-slate-100 dark:border-white/5"
                                                >
                                                    <div className="font-bold text-xs text-slate-900 dark:text-white">{c.name}</div>
                                                    <div className="flex items-center justify-between mt-1">
                                                        {c.instagram !== '-' && (
                                                            <div className="text-[10px] text-purple-500 font-bold">{c.instagram}</div>
                                                        )}
                                                        <div className="text-[9px] text-slate-400 uppercase font-bold">{c.city}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Cart Items */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                            {cart.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 opacity-30">
                                    <ShoppingCart className="w-12 h-12" />
                                    <span className="font-bold text-[10px] uppercase tracking-widest text-center px-8">O carrinho está vazio</span>
                                </div>
                            ) : (
                                cart.map((item) => (
                                    <div key={item.cartItemId} className="flex flex-col gap-3 p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 group relative">
                                        <div className="flex gap-3">
                                            <div 
                                                onClick={() => setZoomedProduct(item)}
                                                className="w-12 h-12 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center overflow-hidden border border-slate-100 dark:border-white/5 shrink-0 relative group/cartimg cursor-zoom-in"
                                            >
                                                {item.image_url ? (
                                                    <>
                                                        <img src={item.image_url} alt={item.nome_artigo} className="w-full h-full object-cover transition-transform group-hover/cartimg:scale-110" />
                                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/cartimg:opacity-100 transition-opacity flex items-center justify-center">
                                                            <Expand className="w-4 h-4 text-white" />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <Package className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-1">
                                                    <span className="text-[8px] font-black text-purple-500 uppercase tracking-widest">{item.ref}</span>
                                                    <button onClick={() => removeFromCart(item.cartItemId)} className="p-1 hover:text-rose-500 transition-colors">
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                <p className="font-bold text-[11px] text-slate-900 dark:text-white leading-tight truncate">{item.nome_artigo}</p>
                                            </div>
                                        </div>

                                        {/* Variant Selectors in Cart */}
                                        {item.variations && item.variations.length > 0 && (
                                            <div className="flex flex-wrap gap-2 pt-1">
                                                {/* Size Selector */}
                                                {Array.from(new Set(item.variations.map(v => v.size).filter(Boolean))).length > 0 && (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-0.5">Tam</span>
                                                        <select 
                                                            value={item.size || ''}
                                                            onChange={(e) => updateItemVariation(item.cartItemId, e.target.value, item.color)}
                                                            className="px-2 py-1 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-white/10 text-[9px] font-bold outline-none focus:border-purple-500 appearance-none min-w-[40px]"
                                                        >
                                                            {Array.from(new Set(item.variations.map(v => v.size).filter(Boolean))).sort().map(sz => (
                                                                <option key={sz as string} value={sz as string}>{sz as string}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                                {/* Color Selector */}
                                                {Array.from(new Set(item.variations.map(v => v.color).filter(Boolean))).length > 0 && (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-0.5">Cor</span>
                                                        <select 
                                                            value={item.color || ''}
                                                            onChange={(e) => updateItemVariation(item.cartItemId, item.size, e.target.value)}
                                                            className="px-2 py-1 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-white/10 text-[9px] font-bold outline-none focus:border-purple-500 capitalize appearance-none min-w-[40px]"
                                                        >
                                                            {Array.from(new Set(item.variations.map(v => v.color).filter(Boolean))).sort().map(c => (
                                                                <option key={c as string} value={c as string}>{c as string}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        
                                        <div className="flex flex-wrap gap-2">
                                            
                                            <div className="flex flex-col gap-1 flex-1">
                                                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-0.5">Preço Unit.</span>
                                                <div className="flex items-center gap-1">
                                                    <input 
                                                        type="number"
                                                        value={item.pvp_cica}
                                                        onChange={(e) => updateItemPrice(item.cartItemId, parseFloat(e.target.value) || 0)}
                                                        className="w-full px-2 py-1 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-white/10 text-[9px] font-bold outline-none focus:border-purple-500"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-1 flex-1">
                                                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-0.5">Desc.</span>
                                                <input 
                                                    type="number"
                                                    value={item.discount || ''}
                                                    placeholder="0"
                                                    onChange={(e) => updateItemDiscount(item.cartItemId, parseFloat(e.target.value) || 0, 'fixed')}
                                                    className="w-full px-2 py-1 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-white/10 text-[9px] font-bold outline-none focus:border-purple-500"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-1">
                                            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-white/10 scale-90 origin-left">
                                                <button onClick={() => updateQuantity(item.cartItemId, -1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"><Minus className="w-2.5 h-2.5" /></button>
                                                <span className="font-black text-[10px] w-4 text-center">{item.quantidade}</span>
                                                <button onClick={() => updateQuantity(item.cartItemId, 1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"><Plus className="w-2.5 h-2.5" /></button>
                                            </div>
                                            <button 
                                                onClick={() => setDiscountModalConfig({
                                                    isOpen: true,
                                                    type: 'item',
                                                    cartItemId: item.cartItemId,
                                                    baseValue: item.pvp_cica * item.quantidade,
                                                    title: `Desconto: ${item.nome_artigo}`
                                                })}
                                                className="text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest hover:text-purple-700 transition-colors flex items-center gap-1"
                                            >
                                                <Tag className="w-2.5 h-2.5" />
                                                {item.discount && item.discount > 0 ? `-${formatCurrency(item.discount_type === 'percent' ? (item.pvp_cica * item.quantidade * (item.discount / 100)) : item.discount)}` : 'Dar Desconto'}
                                            </button>
                                            <p className="font-black text-xs text-emerald-600 dark:text-emerald-400">
                                                {formatCurrency((item.pvp_cica * item.quantidade) - (item.discount_type === 'percent' ? (item.pvp_cica * item.quantidade * ((item.discount || 0) / 100)) : (item.discount || 0)))}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Totals & Checkout Button */}
                        <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50 space-y-3">
                            <div className="flex items-center justify-between group cursor-pointer" 
                                 onClick={() => setDiscountModalConfig({
                                     isOpen: true,
                                     type: 'total',
                                     baseValue: cartSubtotal,
                                     title: 'Desconto no Carrinho'
                                 })}>
                                <div className="flex items-center gap-1.5">
                                    <Tag className="w-3 h-3 text-slate-400 group-hover:text-purple-500 transition-colors" />
                                    <span className="font-bold text-slate-400 uppercase tracking-widest text-[8px] group-hover:text-purple-500 transition-colors">Desconto Total</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-black text-slate-900 dark:text-white">
                                        {formatCurrency(cartActualDiscount)}
                                    </span>
                                    <ChevronRight className="w-2.5 h-2.5 text-slate-300 group-hover:text-purple-500" />
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <Truck className="w-3 h-3 text-slate-400" />
                                    <span className="font-bold text-slate-400 uppercase tracking-widest text-[8px]">Entrega</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <select 
                                        value={shippingType}
                                        onChange={(e) => setShippingType(e.target.value)}
                                        className="px-2 py-1 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-white/10 text-[9px] font-black outline-none focus:border-purple-500 appearance-none text-right cursor-pointer"
                                    >
                                        <option value="Sem entrega">Sem entrega</option>
                                        <option value="Entrega em mão">Entrega em mão</option>
                                        <option value="Continental">Continental (5€)</option>
                                        <option value="Ilhas">Ilhas (10€)</option>
                                        <option value="Estrangeiro">Estrangeiro (15€)</option>
                                    </select>
                                    {shippingCost > 0 && (
                                        <span className="text-[9px] font-black text-slate-900 dark:text-white">
                                            {formatCurrency(shippingCost)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-white/5">
                                <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Total a Pagar</span>
                                <span className="font-black text-2xl text-slate-900 dark:text-white">{formatCurrency(cartTotal)}</span>
                            </div>
                            <button
                                onClick={() => {
                                    setCheckoutStep(1);
                                    setIsCheckoutModalOpen(true);
                                }}
                                disabled={cart.length === 0}
                                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:dark:bg-slate-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition-all"
                            >
                                Finalizar Venda
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center py-8 gap-6">
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] font-black text-purple-600 -rotate-90 origin-center whitespace-nowrap mt-4">CARRINHO</span>
                            <div className="w-8 h-[2px] bg-purple-200 dark:bg-purple-900/40 rounded-full" />
                        </div>
                        <div className="mt-auto p-4 flex flex-col items-center gap-4">
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Checkout Modal Overhaul */}
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
                            className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
                        >
                            {/* Steps Indicator */}
                            <div className="flex items-center justify-center gap-2 mb-8">
                                {[1, 2, 3].map((step) => (
                                    <div 
                                        key={step}
                                        className={`h-1.5 rounded-full transition-all ${checkoutStep >= step ? 'w-8 bg-emerald-500' : 'w-4 bg-slate-200 dark:bg-slate-800'}`}
                                    />
                                ))}
                            </div>

                            {checkoutStep === 1 && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 text-blue-600 mx-auto rounded-3xl flex items-center justify-center mb-4">
                                            <ShoppingCart className="w-8 h-8" />
                                        </div>
                                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Tipo de Operação</h2>
                                        <p className="text-slate-500 font-bold mt-1">Como deseja prosseguir com este carrinho?</p>
                                    </div>

                                    <div className="space-y-3">
                                        <button
                                            onClick={() => {
                                                setSaleStatus('Concluída');
                                                setCheckoutStep(2);
                                            }}
                                            className="w-full flex items-center gap-4 p-4 border-2 border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-500/10 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                                        >
                                            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                                                <CheckCircle2 className="w-6 h-6" />
                                            </div>
                                            <div className="text-left">
                                                <span className="block font-black text-lg text-slate-900 dark:text-white">Finalizar Agora</span>
                                                <span className="text-xs font-bold text-slate-500">Proceder para o pagamento</span>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => {
                                                setSaleStatus('Draft/Espera');
                                                setCheckoutStep(2);
                                            }}
                                            className="w-full flex items-center gap-4 p-4 border-2 border-slate-200 dark:border-white/10 rounded-2xl transition-all hover:border-slate-400 dark:hover:border-slate-600"
                                        >
                                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl flex items-center justify-center shrink-0">
                                                <Receipt className="w-6 h-6" />
                                            </div>
                                            <div className="text-left">
                                                <span className="block font-black text-lg text-slate-900 dark:text-white">Salvar Pedido</span>
                                                <span className="text-xs font-bold text-slate-500">Em espera / Draft</span>
                                            </div>
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {checkoutStep === 2 && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                    <div className="text-center">
                                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Detalhes do Recibo</h2>
                                        <p className="text-slate-500 font-bold mt-1">Informações adicionais para a venda</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10">
                                            <div className="flex items-center gap-3">
                                                <Gift className="w-5 h-5 text-pink-500" />
                                                <span className="font-bold text-sm">Talhão de Oferta?</span>
                                            </div>
                                            <button 
                                                onClick={() => setIsGift(!isGift)}
                                                className={`w-12 h-6 rounded-full transition-all relative ${isGift ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isGift ? 'left-7' : 'left-1'}`} />
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contribuinte / NIF (Opcional)</label>
                                            <input 
                                                type="text"
                                                placeholder="Ex: 123456789"
                                                value={nif}
                                                onChange={(e) => setNif(e.target.value)}
                                                className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observações</label>
                                            <textarea 
                                                placeholder="Alguma nota importante?"
                                                rows={2}
                                                value={saleNotes}
                                                onChange={(e) => setSaleNotes(e.target.value)}
                                                className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button onClick={() => setCheckoutStep(1)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 font-black text-xs uppercase tracking-widest rounded-2xl">Voltar</button>
                                        <button onClick={() => setCheckoutStep(3)} className="flex-[2] py-4 bg-purple-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-purple-500/20">Avançar</button>
                                    </div>
                                </motion.div>
                            )}

                            {checkoutStep === 3 && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                    <div className="text-center">
                                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Pagamento</h2>
                                        <p className="text-slate-500 font-bold mt-1">Valor a pagar: <span className="text-emerald-500">{formatCurrency(cartTotal)}</span></p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { id: 'Dinheiro', icon: Banknote, color: 'emerald' },
                                            { id: 'Multibanco', icon: CreditCard, color: 'blue' },
                                            { id: 'MB Way', icon: Smartphone, color: 'teal' },
                                            { id: 'Pix', icon: Smartphone, color: 'cyan' },
                                        ].map((method) => (
                                            <button
                                                key={method.id}
                                                onClick={() => setPaymentMethod(method.id)}
                                                className={`flex flex-col items-center gap-3 p-4 border-2 rounded-2xl transition-all ${paymentMethod === method.id 
                                                    ? `border-${method.color}-500 bg-${method.color}-50/30 dark:bg-${method.color}-500/10` 
                                                    : 'border-slate-100 dark:border-white/5 hover:border-slate-300'}`}
                                            >
                                                <method.icon className={`w-6 h-6 ${paymentMethod === method.id ? `text-${method.color}-500` : 'text-slate-400'}`} />
                                                <span className={`font-black text-xs uppercase tracking-widest ${paymentMethod === method.id ? `text-${method.color}-600` : 'text-slate-500'}`}>{method.id}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {paymentMethod === 'Dinheiro' && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor Recebido</label>
                                                <span className="text-[10px] font-black text-emerald-500 uppercase">Troco: {formatCurrency(Math.max(0, (parseFloat(cashReceived) || 0) - cartTotal))}</span>
                                            </div>
                                            <div className="relative">
                                                <Calculator className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input 
                                                    type="number"
                                                    value={cashReceived}
                                                    onChange={(e) => setCashReceived(e.target.value)}
                                                    className="w-full p-4 pl-12 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl text-xl font-black text-emerald-500 outline-none"
                                                    placeholder="0.00"
                                                    autoFocus
                                                />
                                            </div>
                                        </motion.div>
                                    )}

                                    <div className="flex gap-3">
                                        <button onClick={() => setCheckoutStep(2)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 font-black text-xs uppercase tracking-widest rounded-2xl">Voltar</button>
                                        <button 
                                            disabled={!paymentMethod || isProcessing}
                                            onClick={handleFinalizeSale}
                                            className="flex-[2] py-4 bg-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
                                        >
                                            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" />Confirmar Venda</>}
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
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={() => setIsManualItemModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border border-slate-200 dark:border-white/10"
                        >
                            <h2 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                <FilePlus className="w-5 h-5 text-purple-600" />
                                Artigo não Cadastrado
                            </h2>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                                    <input 
                                        type="text"
                                        value={manualItem.name}
                                        onChange={(e) => setManualItem({ ...manualItem, name: e.target.value })}
                                        className="w-full p-3 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                                        placeholder="Ex: Ajuste ou Item Especial"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço (€)</label>
                                    <input 
                                        type="number"
                                        value={manualItem.price}
                                        onChange={(e) => setManualItem({ ...manualItem, price: e.target.value })}
                                        className="w-full p-3 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                                        placeholder="0.00"
                                    />
                                </div>

                                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Registar como novo produto?</span>
                                    <button 
                                        onClick={() => setManualItem({ ...manualItem, registerProduct: !manualItem.registerProduct })}
                                        className={`w-10 h-5 rounded-full transition-all relative ${manualItem.registerProduct ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${manualItem.registerProduct ? 'left-5.5' : 'left-0.5'}`} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button onClick={() => setIsManualItemModalOpen(false)} className="flex-1 py-3 text-slate-500 font-black text-[10px] uppercase tracking-widest">Cancelar</button>
                                <button 
                                    onClick={async () => {
                                        if (!manualItem.name || !manualItem.price) return;
                                        const price = parseFloat(manualItem.price);
                                        
                                        if (manualItem.registerProduct) {
                                            try {
                                                await addProduct({
                                                    ref: `AV-${Date.now().toString().slice(-6)}`,
                                                    nome_artigo: manualItem.name,
                                                    pvp_cica: price,
                                                    iva: 23, // Default
                                                    lucro_meu_faturado: 0,
                                                    fornecedor: 'Manual POS',
                                                    published: true
                                                });
                                            } catch (err) {
                                                console.error("Error registering product:", err);
                                            }
                                        }

                                        addToCart({
                                            ref: manualItem.registerProduct ? `AV-${Date.now().toString().slice(-6)}` : 'AVULSO',
                                            nome_artigo: manualItem.name,
                                            quantidade: 1,
                                            original_price: price,
                                            pvp_cica: price,
                                            current_stock: 999
                                        });
                                        setIsManualItemModalOpen(false);
                                        setManualItem({ name: '', price: '', category: '', registerProduct: false });
                                    }}
                                    className="flex-[2] py-3 bg-purple-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl"
                                >
                                    Adicionar ao Carrinho
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>


            <AnimatePresence>
                {discountModalConfig.isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-white/10 p-6 shadow-2xl w-full max-w-sm"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400">
                                        <Tag className="w-5 h-5" />
                                    </div>
                                    <h2 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tight">{discountModalConfig.title}</h2>
                                </div>
                                <button onClick={() => setDiscountModalConfig(prev => ({ ...prev, isOpen: false }))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-white/5 space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor Base</p>
                                    <p className="font-black text-xl text-slate-900 dark:text-white">{formatCurrency(discountModalConfig.baseValue)}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                                            <Banknote className="w-2.5 h-2.5" /> Desconto (€)
                                        </label>
                                        <input 
                                            type="number"
                                            autoFocus
                                            value={discountModalConfig.type === 'total' 
                                                ? (cartDiscountType === 'fixed' ? cartDiscount : (discountModalConfig.baseValue * (cartDiscount / 100)))
                                                : (cart.find(i => i.cartItemId === discountModalConfig.cartItemId)?.discount_type === 'fixed' 
                                                    ? cart.find(i => i.cartItemId === discountModalConfig.cartItemId)?.discount 
                                                    : (discountModalConfig.baseValue * ((cart.find(i => i.cartItemId === discountModalConfig.cartItemId)?.discount || 0) / 100))
                                                  ) || ''
                                            }
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                if (discountModalConfig.type === 'total') {
                                                    setCartDiscount(val, 'fixed');
                                                } else {
                                                    updateItemDiscount(discountModalConfig.cartItemId!, val, 'fixed');
                                                }
                                            }}
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-black text-slate-900 dark:text-white text-lg"
                                            placeholder="0.00"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                                            <Percent className="w-2.5 h-2.5" /> Desconto (%)
                                        </label>
                                        <input 
                                            type="number"
                                            value={discountModalConfig.type === 'total'
                                                ? (cartDiscountType === 'percent' ? cartDiscount : (cartDiscount / discountModalConfig.baseValue * 100))
                                                : (cart.find(i => i.cartItemId === discountModalConfig.cartItemId)?.discount_type === 'percent'
                                                    ? cart.find(i => i.cartItemId === discountModalConfig.cartItemId)?.discount
                                                    : ((cart.find(i => i.cartItemId === discountModalConfig.cartItemId)?.discount || 0) / discountModalConfig.baseValue * 100)
                                                  ) || ''
                                            }
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                if (discountModalConfig.type === 'total') {
                                                    setCartDiscount(val, 'percent');
                                                } else {
                                                    updateItemDiscount(discountModalConfig.cartItemId!, val, 'percent');
                                                }
                                            }}
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-black text-slate-900 dark:text-white text-lg"
                                            placeholder="0%"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-200 dark:border-white/5 flex items-center justify-between bg-emerald-50/50 dark:bg-emerald-500/5 p-4 rounded-2xl">
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Novo Valor Final</p>
                                        <p className="font-black text-2xl text-emerald-600 dark:text-emerald-400 truncate">
                                            {formatCurrency(
                                                discountModalConfig.type === 'total' 
                                                ? Math.max(0, discountModalConfig.baseValue - cartActualDiscount)
                                                : Math.max(0, discountModalConfig.baseValue - (
                                                    cart.find(i => i.cartItemId === discountModalConfig.cartItemId)?.discount_type === 'percent'
                                                    ? (discountModalConfig.baseValue * ((cart.find(i => i.cartItemId === discountModalConfig.cartItemId)?.discount || 0) / 100))
                                                    : (cart.find(i => i.cartItemId === discountModalConfig.cartItemId)?.discount || 0)
                                                  ))
                                            )}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => setDiscountModalConfig(prev => ({ ...prev, isOpen: false }))}
                                        className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
                                    >
                                        Confirmar
                                    </button>
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
                productName={zoomedProduct?.nome_artigo || ''}
            />
        </motion.div >
    );
}
