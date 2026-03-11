import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Minus, X, CreditCard, Banknote, Smartphone, ShoppingCart, User, Package, Loader2 } from 'lucide-react';
import { usePOS } from '../contexts/POSContext';
import { useStockLogic } from '../hooks/useStockLogic';

export default function POS() {
    const {
        cart, addToCart, updateQuantity, removeFromCart, clearCart,
        cartTotal, selectedCustomer, setSelectedCustomer, finalizeSale, isProcessing
    } = usePOS();

    const stockInventory = useStockLogic();
    const [searchTerm, setSearchTerm] = useState('');
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

    // Variation Modal State
    const [selectedProductForVariation, setSelectedProductForVariation] = useState<any | null>(null);
    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [variationQuantity, setVariationQuantity] = useState(1);

    const currentVariationStock = useMemo(() => {
        if (!selectedProductForVariation || !selectedProductForVariation.variations) return 0;
        const getVariationId = (ref: string, size?: string | null, color?: string | null) => {
            return `${String(ref).trim().toUpperCase()}|${size || ''}|${color || ''}`;
        };
        const exactVar = selectedProductForVariation.variations.find((v: any) =>
            v.variation_id === getVariationId(selectedProductForVariation.ref, selectedSize, selectedColor)
        );
        return exactVar ? exactVar.current_stock : 0;
    }, [selectedProductForVariation, selectedSize, selectedColor]);

    // Filter products based on search
    const filteredProducts = useMemo(() => {
        if (!searchTerm) return stockInventory.slice(0, 50); // Limit initial render
        const term = searchTerm.toLowerCase();
        return stockInventory.filter(p =>
            (p.name?.toLowerCase().includes(term) || p.ref.toLowerCase().includes(term))
        );
    }, [stockInventory, searchTerm]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);
    };

    const handleProductClick = (product: any) => {
        if (product.current_stock <= 0) return;

        // Check if product has variations
        const hasSizes = product.sizes && product.sizes.length > 0;
        const hasColors = product.colors && product.colors.length > 0;

        if (hasSizes || hasColors) {
            setSelectedProductForVariation(product);

            const firstInStock = product.variations?.find((v: any) => v.current_stock > 0);
            setSelectedSize(firstInStock?.size || (hasSizes ? product.sizes[0] : null));
            setSelectedColor(firstInStock?.color || (hasColors ? product.colors[0] : null));

            setVariationQuantity(1);
            return;
        }

        // Add directly if no variations
        addToCart({
            ref: product.ref,
            nome_artigo: product.name,
            quantidade: 1,
            pvp_cica: product.pvp || 0,
            base_price: product.base_price || 0,
            current_stock: product.current_stock
        });
    };

    const handleConfirmVariation = () => {
        if (!selectedProductForVariation) return;

        if (currentVariationStock < variationQuantity) {
            alert(`Apenas ${currentVariationStock} em stock para esta variação.`);
            return;
        }

        addToCart({
            ref: selectedProductForVariation.ref,
            nome_artigo: selectedProductForVariation.name,
            quantidade: variationQuantity,
            pvp_cica: selectedProductForVariation.pvp || 0,
            base_price: selectedProductForVariation.base_price || 0,
            current_stock: currentVariationStock,
            size: selectedSize || undefined,
            color: selectedColor || undefined
        });

        setSelectedProductForVariation(null);
    };

    const handleCheckout = async (method: string) => {
        const success = await finalizeSale(method, () => {
            setIsCheckoutModalOpen(false);
            // Optional: Show a custom toast here
        });
        if (success) {
            alert('Venda realizada com sucesso!');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-[calc(100vh-6rem)] flex flex-col lg:flex-row gap-6"
        >
            {/* Left Column - Product Catalog */}
            <div className="flex-1 flex flex-col bg-white/40 dark:bg-slate-900/40 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Pesquisar por Nome ou SKU..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-bold text-slate-900 dark:text-white"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filteredProducts.map((product) => (
                            <button
                                key={product.ref}
                                onClick={() => handleProductClick(product)}
                                disabled={product.current_stock <= 0}
                                className={`relative flex flex-col items-start p-4 rounded-2xl border text-left transition-all ${product.current_stock <= 0
                                    ? 'opacity-50 cursor-not-allowed border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5'
                                    : 'border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 hover:border-purple-400 hover:shadow-lg hover:-translate-y-1'
                                    }`}
                            >
                                <div className="w-full aspect-square bg-slate-100 dark:bg-slate-900 rounded-xl mb-3 flex items-center justify-center overflow-hidden">
                                    {/* Placeholder for image, using icon for now */}
                                    <Package className="w-8 h-8 text-slate-400" />
                                </div>
                                <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest truncate w-full">
                                    {product.ref}
                                </span>
                                <span className="text-sm font-bold text-slate-900 dark:text-white leading-tight line-clamp-2 mt-1 w-full">
                                    {product.name}
                                </span>
                                <div className="mt-auto pt-3 flex items-center justify-between w-full">
                                    <span className="font-black text-lg text-emerald-600 dark:text-emerald-400">
                                        {formatCurrency(product.pvp || 0)}
                                    </span>
                                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${product.current_stock <= 0 ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30' :
                                        product.current_stock <= 3 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30' :
                                            'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                        }`}>
                                        {product.current_stock} un
                                    </span>
                                </div>
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
            <div className="w-full lg:w-96 flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-2xl shrink-0">
                <div className="p-5 border-b border-slate-200 dark:border-white/10 bg-purple-50 dark:bg-purple-900/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400">
                            <ShoppingCart className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="font-black text-slate-900 dark:text-white leading-tight">Carrinho</h2>
                            <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">{cart.length} itens</p>
                        </div>
                    </div>
                    {cart.length > 0 && (
                        <button onClick={clearCart} className="text-xs font-bold text-slate-500 hover:text-rose-500 transition-colors">
                            Limpar
                        </button>
                    )}
                </div>

                {/* Customer Selector */}
                <div className="p-4 border-b border-slate-200 dark:border-white/10">
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500">
                            <User className="w-3 h-3" />
                        </div>
                        <input
                            type="text"
                            value={selectedCustomer?.nome || ''}
                            onChange={(e) => setSelectedCustomer({ ...selectedCustomer, nome: e.target.value })}
                            placeholder="Nome do Cliente (Opcional)"
                            className="w-full py-2.5 pl-11 pr-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500 transition-colors"
                        />
                    </div>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                            <ShoppingCart className="w-16 h-16 opacity-10" />
                            <span className="font-bold text-sm tracking-wide">O carrinho está vazio</span>
                        </div>
                    ) : (
                        cart.map((item) => (
                            <div key={item.ref} className="flex gap-3 p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 group relative">
                                <div className="flex-1">
                                    <span className="text-[9px] font-black text-purple-500 uppercase tracking-widest">{item.ref}</span>
                                    <p className="font-bold text-xs text-slate-900 dark:text-white leading-tight mt-0.5 line-clamp-1">{item.nome_artigo}</p>
                                    <p className="font-black text-sm text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(item.pvp_cica * item.quantidade)}</p>
                                </div>
                                <button onClick={() => removeFromCart(item.cartItemId)} className="absolute -top-2 -right-2 p-1.5 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                                    <X className="w-3 h-3" />
                                </button>
                                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-white/10">
                                    <button onClick={() => updateQuantity(item.cartItemId, -1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"><Minus className="w-3 h-3" /></button>
                                    <span className="font-black text-xs w-4 text-center">{item.quantidade}</span>
                                    <button onClick={() => updateQuantity(item.cartItemId, 1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"><Plus className="w-3 h-3" /></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Totals & Checkout Button */}
                <div className="p-5 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center justify-between mb-4">
                        <span className="font-bold text-slate-500 uppercase tracking-widest text-[10px]">Total a Pagar</span>
                        <span className="font-black text-3xl text-slate-900 dark:text-white">{formatCurrency(cartTotal)}</span>
                    </div>
                    <button
                        onClick={() => setIsCheckoutModalOpen(true)}
                        disabled={cart.length === 0}
                        className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:dark:bg-slate-700 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition-all"
                    >
                        Finalizar Venda
                    </button>
                </div>
            </div>

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
                            className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-slate-200 dark:border-white/10"
                        >
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 mx-auto rounded-3xl flex items-center justify-center mb-4">
                                    <Banknote className="w-8 h-8" />
                                </div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Pagamento</h2>
                                <p className="text-slate-500 font-bold mt-1">Selecione o método para <span className="text-emerald-500">{formatCurrency(cartTotal)}</span></p>
                            </div>

                            <div className="space-y-3">
                                <button
                                    disabled={isProcessing}
                                    onClick={() => handleCheckout('Dinheiro')}
                                    className="w-full flex items-center gap-4 p-4 border-2 border-slate-200 dark:border-white/10 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl transition-all group"
                                >
                                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 text-slate-500 group-hover:text-emerald-600 rounded-xl flex items-center justify-center transition-colors">
                                        <Banknote className="w-6 h-6" />
                                    </div>
                                    <div className="text-left">
                                        <span className="block font-black text-lg text-slate-900 dark:text-white">Dinheiro</span>
                                        <span className="text-xs font-bold text-slate-500">Pagamento em espécie</span>
                                    </div>
                                </button>

                                <button
                                    disabled={isProcessing}
                                    onClick={() => handleCheckout('Pix/MBWay')}
                                    className="w-full flex items-center gap-4 p-4 border-2 border-slate-200 dark:border-white/10 hover:border-teal-500 dark:hover:border-teal-500 rounded-2xl transition-all group"
                                >
                                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 group-hover:bg-teal-100 dark:group-hover:bg-teal-900/40 text-slate-500 group-hover:text-teal-600 rounded-xl flex items-center justify-center transition-colors">
                                        <Smartphone className="w-6 h-6" />
                                    </div>
                                    <div className="text-left">
                                        <span className="block font-black text-lg text-slate-900 dark:text-white">MB Way / Pix</span>
                                        <span className="text-xs font-bold text-slate-500">Transferência digital</span>
                                    </div>
                                </button>

                                <button
                                    disabled={isProcessing}
                                    onClick={() => handleCheckout('Cartão')}
                                    className="w-full flex items-center gap-4 p-4 border-2 border-slate-200 dark:border-white/10 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl transition-all group"
                                >
                                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 text-slate-500 group-hover:text-blue-600 rounded-xl flex items-center justify-center transition-colors">
                                        <CreditCard className="w-6 h-6" />
                                    </div>
                                    <div className="text-left">
                                        <span className="block font-black text-lg text-slate-900 dark:text-white">Cartão</span>
                                        <span className="text-xs font-bold text-slate-500">Maquininha (TPA)</span>
                                    </div>
                                </button>
                            </div>

                            {isProcessing && (
                                <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-[2.5rem] flex flex-col items-center justify-center gap-4 z-10">
                                    <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                                    <span className="font-black text-slate-900 dark:text-white tracking-widest uppercase text-xs animate-pulse">Processando Venda...</span>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Variation Selection Modal */}
            <AnimatePresence>
                {selectedProductForVariation && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={() => setSelectedProductForVariation(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl border border-slate-200 dark:border-white/10"
                        >
                            <button
                                onClick={() => setSelectedProductForVariation(null)}
                                className="absolute right-6 top-6 p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <div className="mb-6">
                                <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">{selectedProductForVariation.ref}</span>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight mt-1">{selectedProductForVariation.name}</h2>
                                <p className="font-black text-lg text-emerald-600 dark:text-emerald-400 mt-2">{formatCurrency(selectedProductForVariation.pvp || 0)}</p>
                            </div>

                            <div className="space-y-6">
                                {/* Sizes */}
                                {selectedProductForVariation.sizes && selectedProductForVariation.sizes.length > 0 && (
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Tamanho</label>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedProductForVariation.sizes.map((sz: string) => (
                                                <button
                                                    key={sz}
                                                    onClick={() => setSelectedSize(sz)}
                                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${selectedSize === sz
                                                        ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20'
                                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-300'
                                                        }`}
                                                >
                                                    {sz}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Colors */}
                                {selectedProductForVariation.colors && selectedProductForVariation.colors.length > 0 && (
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Cor</label>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedProductForVariation.colors.map((c: string) => (
                                                <button
                                                    key={c}
                                                    onClick={() => setSelectedColor(c)}
                                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border capitalize ${selectedColor === c
                                                        ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20'
                                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-300'
                                                        }`}
                                                >
                                                    {c}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Quantity */}
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Quantidade</label>
                                    <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-white/10 w-fit">
                                        <button
                                            onClick={() => setVariationQuantity(Math.max(1, variationQuantity - 1))}
                                            className="p-3 bg-white dark:bg-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <span className="font-black text-lg w-8 text-center">{variationQuantity}</span>
                                        <button
                                            onClick={() => setVariationQuantity(Math.min(currentVariationStock, variationQuantity + 1))}
                                            className="p-3 bg-white dark:bg-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className={`text-[10px] font-bold mt-2 ml-1 ${currentVariationStock <= 0 ? 'text-rose-500' : 'text-slate-500'}`}>Estoque disponível: {currentVariationStock}</p>
                                </div>
                            </div>

                            <button
                                onClick={handleConfirmVariation}
                                className="w-full mt-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-purple-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                <ShoppingCart className="w-5 h-5" />
                                Adicionar
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div >
    );
}
