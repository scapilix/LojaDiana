import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, CreditCard, Banknote, Smartphone, ShoppingCart,
  Package, Loader2, CheckCircle2, FilePlus, Gift,
  Truck, Tag, Percent, Delete,
  ArrowRightLeft, Wallet, Hash, Ticket,
  User, Receipt, Video
} from 'lucide-react';
import { usePOS } from '../contexts/POSContext';
import { useStockLogic } from '../hooks/useStockLogic';
import { useData } from '../contexts/DataContext';
import { useDashboardData } from '../hooks/useDashboardData';
import { ImageZoomModal } from '../components/Loja/ImageZoomModal';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';

const PAYMENT_METHODS = [
  { id: 'Dinheiro',       icon: Banknote,        label: 'Dinheiro' },
  { id: 'MBWay',          icon: Smartphone,       label: 'MBWay' },
  { id: 'Multibanco',     icon: CreditCard,       label: 'Multibanco' },
  { id: 'TransferÃªncia',  icon: ArrowRightLeft,   label: 'Transf.' },
  { id: 'Ref. Entidade',  icon: Hash,             label: 'ReferÃªncia' },
  { id: 'Saldo Cliente',  icon: Wallet,           label: 'Saldo' },
];

export default function POS() {
  const navigate = useNavigate();
  const {
    cart, addToCart, updateItemDiscount, updateItemVariation, updateQuantity,
    cartTotal, cartDiscount, cartDiscountType,
    cartActualDiscount, setCartDiscount, selectedCustomer, setSelectedCustomer,
    finalizeSale, isProcessing, shippingType, setShippingType,
    appliedVoucher, setAppliedVoucher,
  } = usePOS();

  const { addProduct, data } = useData();
  const stockInventory = useStockLogic();
  const { allCustomers } = useDashboardData();

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory] = useState<string | null>(null);
  const [configuringProduct, setConfiguringProduct] = useState<any>(null);
  const [selectedColorForConfig, setSelectedColorForConfig] = useState<string | null>(null);
  const [zoomedProduct, setZoomedProduct] = useState<any>(null);

  // Customer search
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);

  // Change variation modal (cart item)
  const [changingVariationItem, setChangingVariationItem] = useState<any>(null);
  const [changeVariationColor, setChangeVariationColor] = useState<string | null>(null);

  // Modals
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false);
  const [isManualItemModalOpen, setIsManualItemModalOpen] = useState(false);
  const [discountModalConfig, setDiscountModalConfig] = useState<{
    isOpen: boolean; type: 'item' | 'total'; cartItemId?: string; baseValue: number; title: string;
  }>({ isOpen: false, type: 'total', baseValue: 0, title: '' });

  // Checkout / Advanced options state
  const [paymentMethod, setPaymentMethod] = useState('');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [nif, setNif] = useState('');
  const [isGift, setIsGift] = useState(false);
  const [isDiretoSale, setIsDiretoSale] = useState(false);
  const [voucherInput, setVoucherInput] = useState('');
  const [voucherError, setVoucherError] = useState('');
  const [saleNotes, setSaleNotes] = useState('');
  const [saleStatus, setSaleStatus] = useState<'Concluída' | 'Draft/Espera'>('Concluída');
  const [balanceUsed, setBalanceUsed] = useState<number>(0);

  // Manual item
  const [manualItem, setManualItem] = useState({
    name: '', price: '', category: '', ref: `MV-${Date.now().toString().slice(-6)}`, cost: '', registerProduct: false,
  });

  // â”€â”€ Derived data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const categories = useMemo(() => {
    const cats = new Set<string>();
    if (data.categories) data.categories.forEach(c => { if (c?.trim()) cats.add(c.trim()); });
    stockInventory.forEach(p => { if (p.categoria?.trim()) cats.add(p.categoria.trim()); });
    return Array.from(cats).sort();
  }, [stockInventory, data.categories]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearchTerm) return [];
    const t = customerSearchTerm.toLowerCase();
    return allCustomers
      .filter(c => c.name?.toLowerCase().startsWith(t) || c.instagram?.toLowerCase().startsWith(t))
      .sort((a, b) => (b.name?.toLowerCase().startsWith(t) ? 1 : 0) - (a.name?.toLowerCase().startsWith(t) ? 1 : 0))
      .slice(0, 6);
  }, [allCustomers, customerSearchTerm]);

  const stockWithCart = useMemo(() => {
    return stockInventory.map(product => {
      const ref = String(product.ref).trim().toUpperCase();
      const inCart = cart.filter(i => String(i.ref).trim().toUpperCase() === ref);
      if (!inCart.length) return product;
      const updated = { ...product };
      updated.variations = product.variations.map(v => {
        const qty = inCart.filter(i => v.variation_id === `${ref}|${i.size || ''}|${i.color || ''}`).reduce((s, i) => s + i.quantidade, 0);
        return { ...v, absolute_stock: v.current_stock, current_stock: Math.max(0, v.current_stock - qty) };
      });
      updated.absolute_stock = product.current_stock;
      updated.current_stock = updated.variations.reduce((s, v) => s + Math.max(0, v.current_stock), 0);
      return updated;
    });
  }, [stockInventory, cart]);

  const filteredProducts = useMemo(() => {
    let list = stockWithCart;
    if (selectedCategory) list = list.filter(p => p.categoria === selectedCategory);
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      list = list.filter(p => p.name?.toLowerCase().includes(t) || p.ref.toLowerCase().includes(t));
    }
    return list.slice(0, 120);
  }, [stockWithCart, searchTerm, selectedCategory]);

  // â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fmt = (v: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

  const handleProductClick = (item: any) => {
    if (item.variations?.length > 1) { setConfiguringProduct(item); setSelectedColorForConfig(null); return; }
    const v = item.variations?.[0];
    addToCart({
      ref: item.ref, nome_artigo: item.name, quantidade: 1,
      original_price: item.pvp || 0, pvp_cica: item.pvp || 0,
      base_price: item.base_price || 0, current_stock: v ? (v.absolute_stock ?? v.current_stock) : (item.absolute_stock ?? item.current_stock),
      size: v?.size || '', color: v?.color || '', categoria: item.categoria,
      image_url: (v?.color && item.color_images?.[v.color]) ? item.color_images[v.color] : item.image_url,
      variations: (item.variations || []).map((vv: any) => ({ ...vv, current_stock: vv.absolute_stock ?? vv.current_stock })),
      color_images: item.color_images,
    });
  };

  const handleApplyVoucher = () => {
    setVoucherError('');
    if (!voucherInput.trim()) return;
    const v = data.vouchers?.find(v => v.number.toUpperCase() === voucherInput.toUpperCase().trim());
    if (!v) { setVoucherError('Vale nÃ£o encontrado'); return; }
    if (v.status !== 'active') { setVoucherError(`Vale jÃ¡ ${v.status}`); return; }
    if (new Date(v.valid_until) < new Date()) { setVoucherError('Vale expirado'); return; }
    setAppliedVoucher({ number: v.number, value: v.value });
    setVoucherInput('');
  };

  const handleFinalizeSale = async () => {
    if (!paymentMethod) return;
    const success = await finalizeSale({
      paymentMethod, status: saleStatus, nif: nif || selectedCustomer?.nif,
      isGift, notes: saleNotes, balanceUsed, isDireto: isDiretoSale,
      onSaleComplete: () => {
        setIsAdvancedModalOpen(false);
        setPaymentMethod(''); setCashReceived(''); setBalanceUsed(0);
        setSelectedCustomer({ nome: 'Cliente Avulso', saldo: 0 });
        setCustomerSearchTerm(''); setVoucherInput(''); setVoucherError('');
        setNif(''); setIsGift(false); setIsDiretoSale(false); setSaleNotes('');
        setSaleStatus('Concluída');
        if (saleStatus === 'Draft/Espera') navigate('/encomendas');
      },
    });
    if (success) alert(saleStatus === 'Concluída' ? 'Venda realizada com sucesso!' : 'Pedido guardado!');
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Ponto de Venda"
        actions={
          <button
            onClick={() => navigate('/encomendas')}
            className="text-[12px] font-semibold text-[hsl(30_8%_40%)] border border-[hsl(35_18%_88%)] px-3 py-1.5 rounded-[10px] hover:border-[hsl(340_72%_45%)] transition-colors"
          >
            HistÃ³rico
          </button>
        }
      />

      <div className="flex-1 overflow-hidden flex gap-4 p-4 bg-[hsl(38_25%_96%)]">

        {/* â”€â”€ Products â”€â”€ */}
        <div className="flex-1 flex flex-col bg-white rounded-[14px] border border-[hsl(35_18%_90%)] shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="p-3 border-b border-[hsl(35_18%_92%)]">
            <div className="flex items-center gap-2 bg-[hsl(38_25%_97%)] border border-[hsl(35_18%_88%)] rounded-[10px] px-3 py-2">
              <Search className="h-4 w-4 text-[hsl(30_8%_60%)]" />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Pesquisar produto ou referÃªncia..."
                className="flex-1 bg-transparent text-[12px] outline-none text-[hsl(20_15%_8%)] placeholder:text-[hsl(30_8%_65%)]"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="text-[hsl(30_8%_60%)] hover:text-[hsl(20_15%_8%)]">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Product grid */}
          {filteredProducts.length === 0 ? (
            <EmptyState title="Sem produtos" description="Importe o catÃ¡logo de produtos para comeÃ§ar a vender" />
          ) : (
            <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 content-start">
              {filteredProducts.map(product => (
                <button
                  key={product.ref}
                  onClick={() => handleProductClick(product)}
                  className="text-left bg-[hsl(38_25%_98%)] border-2 border-transparent hover:border-[hsl(340_72%_45%)] rounded-[12px] p-3 transition-all"
                >
                  <div className="w-full h-16 rounded-[8px] mb-2 overflow-hidden bg-gradient-to-br from-[hsl(340_40%_92%)] to-[hsl(340_40%_85%)] flex items-center justify-center">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="h-6 w-6 text-[hsl(340_40%_65%)]" />
                    )}
                  </div>
                  <p className="text-[11px] font-bold text-[hsl(20_15%_8%)] leading-tight mb-0.5 truncate">{product.name}</p>
                  <p className="text-[12px] font-black text-[hsl(340_72%_45%)]">â‚¬{(product.pvp || 0).toFixed(2)}</p>
                  <p className="text-[9px] text-[hsl(30_8%_60%)]">{product.ref}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* â”€â”€ Cart â”€â”€ */}
        <div className="w-72 flex flex-col bg-white rounded-[14px] border border-[hsl(35_18%_90%)] shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(35_18%_92%)]">
            <h2 className="text-[13px] font-bold text-[hsl(20_15%_8%)]">Carrinho</h2>
            {cart.length > 0 && (
              <span className="text-[10px] font-bold bg-[hsl(340_72%_45%)] text-white px-2 py-0.5 rounded-full">
                {cart.length}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <ShoppingCart className="h-8 w-8 text-[hsl(35_18%_80%)] mb-2" />
                <p className="text-[12px] text-[hsl(30_8%_55%)]">Carrinho vazio</p>
                <p className="text-[10px] text-[hsl(30_8%_65%)]">Clica num produto para adicionar</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.cartItemId} className="flex items-center gap-2 bg-[hsl(38_25%_97%)] rounded-[10px] p-2">
                  <div className="w-8 h-8 rounded-[6px] bg-gradient-to-br from-[hsl(340_40%_92%)] to-[hsl(340_40%_85%)] flex-shrink-0 overflow-hidden">
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-[hsl(20_15%_8%)] truncate">{item.nome_artigo}</p>
                    <p className="text-[9px] text-[hsl(30_8%_55%)]">{[item.size, item.color].filter(Boolean).join(' ')}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQuantity(item.cartItemId, -1)} className="w-5 h-5 rounded-[5px] bg-white border border-[hsl(35_18%_88%)] text-[11px] font-bold flex items-center justify-center">âˆ’</button>
                    <span className="text-[11px] font-bold w-4 text-center">{item.quantidade}</span>
                    <button onClick={() => updateQuantity(item.cartItemId, 1)} className="w-5 h-5 rounded-[5px] bg-white border border-[hsl(35_18%_88%)] text-[11px] font-bold flex items-center justify-center">+</button>
                  </div>
                  <span className="text-[11px] font-black text-[hsl(20_15%_8%)] w-10 text-right">â‚¬{(item.pvp_cica * item.quantidade).toFixed(0)}</span>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-[hsl(35_18%_92%)] p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[12px] text-[hsl(30_8%_55%)] font-medium">Total</span>
              <span className="font-['Playfair_Display'] text-[22px] font-bold text-[hsl(20_15%_8%)]">
                â‚¬{cartTotal.toFixed(2)}
              </span>
            </div>
            <button
              onClick={() => setIsAdvancedModalOpen(true)}
              disabled={cart.length === 0}
              className="w-full bg-[hsl(340_72%_45%)] hover:bg-[hsl(340_72%_38%)] disabled:opacity-50 text-white text-[13px] font-bold py-3 rounded-[10px] transition-colors"
            >
              ðŸ’³ Finalizar Venda
            </button>
          </div>
        </div>

      </div>

      {/* â”€â”€ Keep ALL existing modals exactly as they are â”€â”€ */}
      <>
      <AnimatePresence>
        {configuringProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={() => setConfiguringProduct(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border p-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{configuringProduct.name}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">Escolha as variaÃ§Ãµes</p>
                </div>
                <button onClick={() => setConfiguringProduct(null)} className="rounded-lg p-1.5 transition-colors hover:bg-secondary">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div className="p-4 space-y-5">
                {/* Color selection */}
                {!selectedColorForConfig ? (
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Escolha a cor</p>
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from(new Set(configuringProduct.variations.map((v: any) => v.color))).map((color: any) => (
                        <button
                          key={color}
                          onClick={() => setSelectedColorForConfig(color)}
                          className="flex flex-col items-center gap-2 rounded-xl border-2 border-transparent bg-secondary p-2 transition-all hover:border-primary"
                        >
                          <div className="aspect-square w-full overflow-hidden rounded-lg bg-background">
                            {configuringProduct.color_images?.[color] ? (
                              <img src={configuringProduct.color_images[color]} alt={color} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Package className="h-6 w-6 text-muted-foreground/30" />
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] font-semibold text-foreground">{color}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Selected color + change */}
                    <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/20 p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded-lg">
                          <img src={configuringProduct.color_images?.[selectedColorForConfig] || configuringProduct.image_url} alt="" className="h-full w-full object-cover" />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Cor selecionada</p>
                          <p className="text-sm font-semibold text-primary">{selectedColorForConfig}</p>
                        </div>
                      </div>
                      <button onClick={() => setSelectedColorForConfig(null)} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors">
                        Trocar
                      </button>
                    </div>

                    {/* Size selection */}
                    <div>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Escolha o tamanho</p>
                      <div className="grid grid-cols-4 gap-2">
                        {configuringProduct.variations
                          .filter((v: any) => v.color === selectedColorForConfig)
                          .map((v: any) => (
                            <button
                              key={v.size}
                              onClick={() => {
                                const img = (v.color && configuringProduct.color_images?.[v.color]) ? configuringProduct.color_images[v.color] : configuringProduct.image_url;
                                addToCart({
                                  ref: configuringProduct.ref, nome_artigo: configuringProduct.name,
                                  quantidade: 1, original_price: configuringProduct.pvp || 0,
                                  pvp_cica: configuringProduct.pvp || 0, base_price: configuringProduct.base_price || 0,
                                  current_stock: v.absolute_stock ?? v.current_stock,
                                  size: v.size, color: v.color, categoria: configuringProduct.categoria,
                                  image_url: img,
                                  variations: configuringProduct.variations.map((vv: any) => ({ ...vv, current_stock: vv.absolute_stock ?? vv.current_stock })),
                                  color_images: configuringProduct.color_images,
                                });
                                setConfiguringProduct(null); setSelectedColorForConfig(null);
                              }}
                              disabled={v.current_stock <= 0}
                              className="flex flex-col items-center gap-1 rounded-xl border-2 border-border bg-secondary py-3 transition-all hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <span className="text-base font-bold text-foreground">{v.size}</span>
                              <span className={`text-[9px] font-semibold ${v.current_stock <= 0 ? 'text-rose-500' : v.current_stock <= 2 ? 'text-amber-500' : 'text-emerald-600'}`}>
                                {v.current_stock <= 0 ? 'Esgotado' : `${v.current_stock} un`}
                              </span>
                            </button>
                          ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAdvancedModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={() => setIsAdvancedModalOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-border p-5">
                <div>
                  <h3 className="text-base font-semibold text-foreground">OpÃ§Ãµes da venda</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">NIF, presente, voucher e mais</p>
                </div>
                <button onClick={() => setIsAdvancedModalOpen(false)} className="rounded-lg p-1.5 hover:bg-secondary transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Payment methods grid */}
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">MÃ©todo de pagamento</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {PAYMENT_METHODS.map(method => (
                      <button
                        key={method.id}
                        onClick={() => setPaymentMethod(paymentMethod === method.id ? '' : method.id)}
                        className={`flex flex-col items-center gap-1 rounded-lg border py-2 transition-all ${
                          paymentMethod === method.id
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                        }`}
                      >
                        <method.icon className="h-4 w-4" />
                        <span className="text-[9px] font-semibold leading-none">{method.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cash numpad (when Dinheiro selected) */}
                <AnimatePresence>
                  {paymentMethod === 'Dinheiro' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-lg border border-border bg-background p-2">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-semibold text-muted-foreground">Valor recebido</span>
                          <div className="flex-1 rounded border border-emerald-300 bg-emerald-50 px-2 py-1 dark:bg-emerald-500/10">
                            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                              {cashReceived || '0'} â‚¬
                            </span>
                          </div>
                        </div>
                        {parseFloat(cashReceived) > cartTotal && (
                          <div className="mb-2 rounded bg-emerald-50 px-2 py-1 dark:bg-emerald-500/10">
                            <span className="text-xs font-bold text-emerald-600">Troco: {fmt(parseFloat(cashReceived) - cartTotal)}</span>
                          </div>
                        )}
                        <div className="flex gap-1 mb-2">
                          {[5, 10, 20, 50].map(amt => (
                            <button key={amt} onClick={() => setCashReceived(amt.toString())}
                              className="flex-1 rounded border border-border bg-secondary py-1 text-[10px] font-bold text-foreground hover:bg-primary hover:text-white transition-colors">
                              {amt}â‚¬
                            </button>
                          ))}
                          <button onClick={() => setCashReceived(cartTotal.toFixed(2))}
                            className="flex-1 rounded border border-primary/40 bg-primary/10 py-1 text-[10px] font-bold text-primary hover:bg-primary hover:text-white transition-colors">
                            Exato
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          {[1,2,3,4,5,6,7,8,9,'.','0'].map(d => (
                            <button key={d} onClick={() => { if (d === '.' && cashReceived.includes('.')) return; setCashReceived(p => p === '0' && d !== '.' ? String(d) : p + String(d)); }}
                              className="rounded border border-border bg-card py-1.5 text-sm font-bold text-foreground hover:bg-secondary transition-colors active:scale-95">
                              {d}
                            </button>
                          ))}
                          <button onClick={() => setCashReceived(p => p.slice(0, -1) || '0')}
                            className="rounded border border-border bg-card py-1.5 flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors active:scale-95">
                            <Delete className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setCashReceived('0')}
                            className="col-span-1 rounded border border-rose-200 bg-rose-50 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 transition-colors active:scale-95 dark:bg-rose-500/10 dark:border-rose-500/20">
                            C
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Sale type */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo de operaÃ§Ã£o</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSaleStatus('Concluída')}
                      className={`flex items-center gap-2.5 rounded-xl border-2 p-3 transition-all ${saleStatus === 'Concluída' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-border bg-secondary'}`}
                    >
                      <CheckCircle2 className={`h-5 w-5 ${saleStatus === 'Concluída' ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                      <div className="text-left">
                        <p className={`text-xs font-semibold ${saleStatus === 'Concluída' ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'}`}>Finalizar</p>
                        <p className="text-[10px] text-muted-foreground">Venda imediata</p>
                      </div>
                    </button>
                    <button
                      onClick={() => setSaleStatus('Draft/Espera')}
                      className={`flex items-center gap-2.5 rounded-xl border-2 p-3 transition-all ${saleStatus === 'Draft/Espera' ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10' : 'border-border bg-secondary'}`}
                    >
                      <Receipt className={`h-5 w-5 ${saleStatus === 'Draft/Espera' ? 'text-amber-600' : 'text-muted-foreground'}`} />
                      <div className="text-left">
                        <p className={`text-xs font-semibold ${saleStatus === 'Draft/Espera' ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'}`}>Guardar</p>
                        <p className="text-[10px] text-muted-foreground">Pedido pendente</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Customer field */}
                <div className="relative">
                  <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Cliente</label>
                  <div className="relative flex items-center gap-2 rounded-xl border border-input bg-background px-4 py-2.5">
                    <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <input
                      type="text"
                      value={customerSearchTerm || (selectedCustomer?.nome === 'Cliente Avulso' ? '' : (selectedCustomer?.instagram ? `@${selectedCustomer.instagram}` : selectedCustomer?.nome)) || ''}
                      onChange={e => {
                        setCustomerSearchTerm(e.target.value);
                        setShowCustomerSuggestions(true);
                        setSelectedCustomer({ ...selectedCustomer, nome: e.target.value || 'Cliente Avulso' });
                      }}
                      onFocus={e => { setShowCustomerSuggestions(true); e.target.select(); }}
                      onBlur={() => setTimeout(() => { setShowCustomerSuggestions(false); if (!customerSearchTerm && !selectedCustomer?.nome) setSelectedCustomer({ ...selectedCustomer, nome: 'Cliente Avulso' }); }, 200)}
                      placeholder="Cliente (nome ou @instagram)"
                      className="flex-1 bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/60"
                    />
                    {selectedCustomer?.nome && selectedCustomer.nome !== 'Cliente Avulso' && (
                      <button onClick={() => { setSelectedCustomer({ nome: 'Cliente Avulso', saldo: 0 }); setCustomerSearchTerm(''); }} className="text-muted-foreground hover:text-foreground">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <AnimatePresence>
                      {showCustomerSuggestions && filteredCustomers.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-xl"
                        >
                          {filteredCustomers.map((c, i) => (
                            <button
                              key={i}
                              onClick={() => { setSelectedCustomer({ nome: c.name, instagram: c.instagram !== '-' ? c.instagram : undefined, nif: c.nif, saldo: c.saldo || 0 }); setCustomerSearchTerm(''); setShowCustomerSuggestions(false); }}
                              className="flex w-full items-center gap-3 border-b border-border px-3 py-2.5 text-left last:border-0 hover:bg-secondary transition-colors"
                            >
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                                {c.name?.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                                {c.instagram && c.instagram !== '-' && <p className="text-xs text-muted-foreground">@{c.instagram}</p>}
                              </div>
                              {c.saldo > 0 && <span className="shrink-0 text-xs font-semibold text-emerald-600">{fmt(c.saldo)}</span>}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  {selectedCustomer?.nome !== 'Cliente Avulso' && (selectedCustomer?.saldo || 0) > 0 && (
                    <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-1.5 dark:bg-emerald-500/10">
                      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Saldo disponÃ­vel</span>
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{fmt(selectedCustomer?.saldo || 0)}</span>
                    </div>
                  )}
                </div>

                {/* NIF */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">NIF (opcional)</label>
                  <input
                    type="text" value={nif} onChange={e => setNif(e.target.value)} placeholder="NÃºmero de contribuinte"
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Notas da venda</label>
                  <textarea
                    value={saleNotes} onChange={e => setSaleNotes(e.target.value)} rows={2} placeholder="InstruÃ§Ãµes especiais, observaÃ§Ãµes..."
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none"
                  />
                </div>

                {/* Shipping */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Entrega</label>
                  <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-4 py-2.5">
                    <Truck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <select
                      value={shippingType}
                      onChange={e => setShippingType(e.target.value)}
                      className="flex-1 bg-transparent text-sm font-medium text-foreground outline-none cursor-pointer"
                    >
                      <option value="Sem entrega">Sem entrega</option>
                      <option value="Entrega em mÃ£o">Entrega em mÃ£o</option>
                      <option value="Continental">Portugal Continental (5â‚¬)</option>
                      <option value="Ilhas">Ilhas (10â‚¬)</option>
                      <option value="Estrangeiro">Internacional (15â‚¬)</option>
                    </select>
                  </div>
                </div>

                {/* Voucher */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Vale de troca</label>
                  {appliedVoucher ? (
                    <div className="flex items-center justify-between rounded-xl bg-purple-50 border border-purple-200 p-3 dark:bg-purple-500/10 dark:border-purple-500/20">
                      <div className="flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-purple-600" />
                        <div>
                          <p className="text-xs font-semibold text-purple-700 dark:text-purple-400">{appliedVoucher.number}</p>
                          <p className="text-xs text-purple-600">-{fmt(appliedVoucher.value)}</p>
                        </div>
                      </div>
                      <button onClick={() => setAppliedVoucher(null)} className="rounded-lg p-1.5 hover:bg-purple-100 transition-colors dark:hover:bg-purple-500/20">
                        <X className="h-3.5 w-3.5 text-purple-600" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          type="text" placeholder="NÃºmero do vale..." value={voucherInput}
                          onChange={e => { setVoucherInput(e.target.value); setVoucherError(''); }}
                          onKeyDown={e => e.key === 'Enter' && handleApplyVoucher()}
                          className={`w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm outline-none transition focus:ring-2 ${voucherError ? 'border-rose-400 focus:ring-rose-500/15' : 'border-input bg-background focus:border-primary focus:ring-primary/15'}`}
                        />
                      </div>
                      <button onClick={handleApplyVoucher} className="btn-primary rounded-xl px-4 text-sm font-semibold">
                        Aplicar
                      </button>
                    </div>
                  )}
                  {voucherError && <p className="mt-1 text-xs text-rose-500">{voucherError}</p>}
                </div>

                {/* Customer balance */}
                {selectedCustomer?.nome !== 'Cliente Avulso' && (selectedCustomer?.saldo || 0) > 0 && (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Saldo do cliente ({fmt(selectedCustomer?.saldo || 0)})</label>
                    <div className="flex gap-2">
                      <input
                        type="number" max={selectedCustomer?.saldo} value={balanceUsed || ''} placeholder="0"
                        onChange={e => setBalanceUsed(Math.min(selectedCustomer?.saldo || 0, parseFloat(e.target.value) || 0))}
                        className="flex-1 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500/20 dark:bg-emerald-500/10 dark:border-emerald-500/30"
                      />
                      {balanceUsed > 0 && (
                        <button onClick={() => setBalanceUsed(0)} className="rounded-xl border border-border bg-secondary px-3 text-xs font-medium text-muted-foreground hover:bg-border transition-colors">
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Toggles */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setIsGift(!isGift)}
                    className={`flex items-center justify-between rounded-xl border-2 p-3 transition-all ${isGift ? 'border-primary bg-primary/5' : 'border-border bg-secondary'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Gift className={`h-4 w-4 ${isGift ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`text-sm font-medium ${isGift ? 'text-primary' : 'text-foreground'}`}>Marcar como presente</span>
                    </div>
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${isGift ? 'border-primary bg-primary' : 'border-border'}`}>
                      {isGift && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                    </div>
                  </button>
                  <button
                    onClick={() => setIsDiretoSale(!isDiretoSale)}
                    className={`flex items-center justify-between rounded-xl border-2 p-3 transition-all ${isDiretoSale ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-border bg-secondary'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Video className={`h-4 w-4 ${isDiretoSale ? 'text-blue-600' : 'text-muted-foreground'}`} />
                      <span className={`text-sm font-medium ${isDiretoSale ? 'text-blue-700 dark:text-blue-400' : 'text-foreground'}`}>Venda em direto</span>
                    </div>
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${isDiretoSale ? 'border-blue-500 bg-blue-500' : 'border-border'}`}>
                      {isDiretoSale && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                    </div>
                  </button>
                </div>

                {/* Total */}
                <div className="flex items-baseline justify-between rounded-xl bg-secondary p-3">
                  <span className="text-sm font-medium text-muted-foreground">Total a pagar</span>
                  <span className="font-display text-2xl font-bold text-foreground" style={{ fontFamily: '"Playfair Display", serif' }}>
                    {fmt(cartTotal)}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setSaleStatus('Draft/Espera'); setIsAdvancedModalOpen(false); handleFinalizeSale(); }}
                    disabled={cart.length === 0 || isProcessing}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary px-3 text-xs font-semibold text-foreground transition-all hover:bg-border disabled:cursor-not-allowed disabled:opacity-40"
                    title="Guardar como pedido pendente"
                  >
                    <Receipt className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => { setSaleStatus('Concluída'); setIsAdvancedModalOpen(false); handleFinalizeSale(); }}
                    disabled={cart.length === 0 || !paymentMethod || isProcessing}
                    className="flex flex-1 h-10 items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-bold text-white shadow-sm transition-all hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Finalizar Venda
                  </button>
                </div>
                {!paymentMethod && cart.length > 0 && (
                  <p className="text-center text-[10px] text-muted-foreground">Selecione um mÃ©todo de pagamento</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isManualItemModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={() => setIsManualItemModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
              <div className="flex items-center justify-between border-b border-border p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <FilePlus className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Item manual</h3>
                    <p className="text-xs text-muted-foreground">Produto personalizado</p>
                  </div>
                </div>
                <button onClick={() => setIsManualItemModalOpen(false)} className="rounded-lg p-1.5 hover:bg-secondary transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Nome do item</label>
                  <input type="text" value={manualItem.name} onChange={e => setManualItem({ ...manualItem, name: e.target.value })} placeholder="Ex: Vestido de festa" className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">ReferÃªncia</label>
                    <input type="text" value={manualItem.ref} onChange={e => setManualItem({ ...manualItem, ref: e.target.value })} className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary transition" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Categoria</label>
                    <input type="text" list="categoryList" value={manualItem.category} onChange={e => setManualItem({ ...manualItem, category: e.target.value })} placeholder="Opcional" className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary transition" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">PreÃ§o de venda (â‚¬)</label>
                    <input type="number" value={manualItem.price} onChange={e => setManualItem({ ...manualItem, price: e.target.value })} placeholder="0.00" className="w-full rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500/20 dark:bg-emerald-500/10" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Custo (â‚¬)</label>
                    <input type="number" value={manualItem.cost} onChange={e => setManualItem({ ...manualItem, cost: e.target.value })} placeholder="0.00" className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary transition" />
                  </div>
                </div>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={manualItem.registerProduct} onChange={e => setManualItem({ ...manualItem, registerProduct: e.target.checked })} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
                  <span className="text-xs font-medium text-muted-foreground">Registar permanentemente no catÃ¡logo</span>
                </label>
                <button
                  onClick={async () => {
                    if (!manualItem.name || !manualItem.price) return;
                    if (manualItem.registerProduct) await addProduct({ nome_artigo: manualItem.name, ref: manualItem.ref, categoria: manualItem.category, pvp_cica: parseFloat(manualItem.price), iva: 23, lucro_meu_faturado: 0, fornecedor: 'Manual' });
                    addToCart({ ref: manualItem.ref, nome_artigo: manualItem.name, quantidade: 1, original_price: parseFloat(manualItem.price), pvp_cica: parseFloat(manualItem.price), base_price: parseFloat(manualItem.price), current_stock: 999, categoria: manualItem.category, image_url: '', variations: [] });
                    setIsManualItemModalOpen(false);
                    setManualItem({ name: '', price: '', category: '', ref: `MV-${Date.now().toString().slice(-6)}`, cost: '', registerProduct: false });
                  }}
                  className="btn-primary w-full rounded-xl py-3 text-sm font-semibold"
                >
                  Adicionar ao carrinho
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {discountModalConfig.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={() => setDiscountModalConfig(p => ({ ...p, isOpen: false }))} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl">
              <div className="flex items-center justify-between border-b border-border p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-500/10">
                    <Tag className="h-4 w-4 text-rose-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{discountModalConfig.title}</h3>
                </div>
                <button onClick={() => setDiscountModalConfig(p => ({ ...p, isOpen: false }))} className="rounded-lg p-1.5 hover:bg-secondary transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="rounded-xl bg-secondary p-3">
                  <p className="text-xs text-muted-foreground">Valor base</p>
                  <p className="text-xl font-bold text-foreground" style={{ fontFamily: '"Playfair Display", serif' }}>{fmt(discountModalConfig.baseValue)}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-muted-foreground"><Banknote className="h-3 w-3" /> Desconto (â‚¬)</label>
                    <input type="number" autoFocus
                      value={discountModalConfig.type === 'total' ? (cartDiscountType === 'fixed' ? cartDiscount : Number((discountModalConfig.baseValue * (cartDiscount / 100)).toFixed(2))) : (cart.find(i => i.cartItemId === discountModalConfig.cartItemId)?.discount_type === 'fixed' ? cart.find(i => i.cartItemId === discountModalConfig.cartItemId)?.discount : Number((discountModalConfig.baseValue * ((cart.find(i => i.cartItemId === discountModalConfig.cartItemId)?.discount || 0) / 100)).toFixed(2))) || ''}
                      onChange={e => { const v = parseFloat(e.target.value) || 0; discountModalConfig.type === 'total' ? setCartDiscount(v, 'fixed') : updateItemDiscount(discountModalConfig.cartItemId!, v, 'fixed'); }}
                      className="w-full rounded-xl border border-input bg-background px-4 py-3 text-lg font-bold text-foreground outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-500/15"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-muted-foreground"><Percent className="h-3 w-3" /> Desconto (%)</label>
                    <input type="number"
                      value={discountModalConfig.type === 'total' ? (cartDiscountType === 'percent' ? cartDiscount : Number((cartDiscount / discountModalConfig.baseValue * 100).toFixed(2))) : (cart.find(i => i.cartItemId === discountModalConfig.cartItemId)?.discount_type === 'percent' ? cart.find(i => i.cartItemId === discountModalConfig.cartItemId)?.discount : Number(((cart.find(i => i.cartItemId === discountModalConfig.cartItemId)?.discount || 0) / discountModalConfig.baseValue * 100).toFixed(2))) || ''}
                      onChange={e => { const v = parseFloat(e.target.value) || 0; discountModalConfig.type === 'total' ? setCartDiscount(v, 'percent') : updateItemDiscount(discountModalConfig.cartItemId!, v, 'percent'); }}
                      className="w-full rounded-xl border border-input bg-background px-4 py-3 text-lg font-bold text-foreground outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-500/15"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-4 dark:bg-emerald-500/10">
                  <div>
                    <p className="text-xs text-muted-foreground">Novo valor</p>
                    <p className="text-2xl font-bold text-emerald-600" style={{ fontFamily: '"Playfair Display", serif' }}>
                      {fmt(discountModalConfig.type === 'total'
                        ? Math.max(0, discountModalConfig.baseValue - cartActualDiscount)
                        : (() => { const it = cart?.find(i => i.cartItemId === discountModalConfig.cartItemId); if (!it) return discountModalConfig.baseValue; const d = it.discount_type === 'percent' ? discountModalConfig.baseValue * ((it.discount || 0) / 100) : (it.discount || 0); return Math.max(0, discountModalConfig.baseValue - d); })()
                      )}
                    </p>
                  </div>
                  <button onClick={() => setDiscountModalConfig(p => ({ ...p, isOpen: false }))} className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors">
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
        productName={zoomedProduct?.nome_artigo || zoomedProduct?.name || ''}
      />

      <AnimatePresence>
        {changingVariationItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={() => { setChangingVariationItem(null); setChangeVariationColor(null); }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-border p-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Trocar variaÃ§Ã£o</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{changingVariationItem.nome_artigo}</p>
                </div>
                <button onClick={() => { setChangingVariationItem(null); setChangeVariationColor(null); }} className="rounded-lg p-1.5 hover:bg-secondary transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {!changeVariationColor ? (
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Escolha a nova cor</p>
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from(new Set((changingVariationItem.variations || []).map((v: any) => v.color))).map((color: any) => (
                        <button
                          key={color}
                          onClick={() => setChangeVariationColor(color)}
                          className={`flex flex-col items-center gap-2 rounded-xl border-2 p-2 transition-all hover:border-primary ${color === changingVariationItem.color ? 'border-primary bg-primary/5' : 'border-transparent bg-secondary'}`}
                        >
                          <div className="aspect-square w-full overflow-hidden rounded-lg bg-background">
                            {changingVariationItem.color_images?.[color] ? (
                              <img src={changingVariationItem.color_images[color]} alt={color} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center"><Package className="h-5 w-5 text-muted-foreground/30" /></div>
                            )}
                          </div>
                          <span className="text-[10px] font-semibold text-foreground">{color}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/20 p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 overflow-hidden rounded-lg">
                          <img src={changingVariationItem.color_images?.[changeVariationColor] || changingVariationItem.image_url} alt="" className="h-full w-full object-cover" />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Cor</p>
                          <p className="text-sm font-semibold text-primary">{changeVariationColor}</p>
                        </div>
                      </div>
                      <button onClick={() => setChangeVariationColor(null)} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors">
                        Trocar
                      </button>
                    </div>

                    <div>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Escolha o novo tamanho</p>
                      <div className="grid grid-cols-4 gap-2">
                        {(changingVariationItem.variations || [])
                          .filter((v: any) => v.color === changeVariationColor)
                          .map((v: any) => {
                            const stockInCart = cart.filter(i => i.cartItemId !== changingVariationItem.cartItemId && `${changingVariationItem.ref}-${v.size}-${v.color}` === i.cartItemId).reduce((s: number, i: any) => s + i.quantidade, 0);
                            const available = Math.max(0, (v.current_stock ?? 0) - stockInCart);
                            const isCurrent = v.size === changingVariationItem.size && v.color === changingVariationItem.color;
                            return (
                              <button
                                key={v.size}
                                onClick={() => {
                                  updateItemVariation(changingVariationItem.cartItemId, v.size, v.color);
                                  setChangingVariationItem(null);
                                  setChangeVariationColor(null);
                                }}
                                disabled={available <= 0 && !isCurrent}
                                className={`flex flex-col items-center gap-1 rounded-xl border-2 py-3 transition-all ${
                                  isCurrent ? 'border-primary bg-primary/10' : 'border-border bg-secondary hover:border-primary/50'
                                } disabled:cursor-not-allowed disabled:opacity-40`}
                              >
                                <span className="text-base font-bold text-foreground">{v.size}</span>
                                <span className={`text-[9px] font-semibold ${available <= 0 && !isCurrent ? 'text-rose-500' : available <= 2 ? 'text-amber-500' : 'text-emerald-600'}`}>
                                  {isCurrent ? 'atual' : available <= 0 ? 'esgot.' : `${available} un`}
                                </span>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <datalist id="categoryList">
        {categories.map(cat => <option key={cat} value={cat} />)}
      </datalist>
      </>
    </div>
  );
}
