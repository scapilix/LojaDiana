import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, Search, X, Package, ChevronRight,
  Minus, Plus, Truck, User,
  CheckCircle2, ArrowLeft, Loader2
} from 'lucide-react';
import { fetchLojaData, submitOnlineOrder, type LojaData, type OnlineOrderItem } from '../lib/lojaPublica';

const PORTES: Record<string, number> = {
  'Levantamento': 0,
  'Continental': 5,
  'Ilhas': 10,
  'Internacional': 15,
};

interface CartItem extends OnlineOrderItem {
  image_url?: string;
}

export default function Loja() {
  const { slug = 'demo' } = useParams<{ slug: string }>();

  const [lojaData, setLojaData] = useState<LojaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [step, setStep] = useState<'catalog' | 'checkout' | 'success'>('catalog');
  const [submitting, setSubmitting] = useState(false);
  const [orderRef, setOrderRef] = useState('');

  const [cart, setCart] = useState<CartItem[]>([]);

  const [form, setForm] = useState({
    nome: '', email: '', telefone: '', morada: '', cidade: '',
    codigo_postal: '', metodo_envio: 'Continental', notas: '',
  });

  useEffect(() => {
    fetchLojaData(slug)
      .then(setLojaData)
      .catch(() => setError('Não foi possível carregar a loja.'))
      .finally(() => setLoading(false));
  }, [slug]);

  const filteredProducts = useMemo(() => {
    if (!lojaData) return [];
    let list = lojaData.products;
    if (selectedCategory) list = list.filter(p => p.categoria === selectedCategory);
    if (searchTerm.trim()) {
      const t = searchTerm.toLowerCase();
      list = list.filter(p =>
        p.nome_artigo?.toLowerCase().includes(t) || p.ref?.toLowerCase().includes(t)
      );
    }
    return list;
  }, [lojaData, selectedCategory, searchTerm]);

  const cartTotal = cart.reduce((s, i) => s + i.pvp_cica * i.quantidade, 0);
  const portes = PORTES[form.metodo_envio] ?? 5;
  const totalComPortes = cartTotal + portes;
  const cartCount = cart.reduce((s, i) => s + i.quantidade, 0);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.ref === product.ref);
      if (existing) {
        return prev.map(i => i.ref === product.ref ? { ...i, quantidade: i.quantidade + 1 } : i);
      }
      return [...prev, {
        ref: product.ref,
        nome_artigo: product.nome_artigo,
        pvp_cica: product.pvp_cica,
        quantidade: 1,
        image_url: product.image_url,
      }];
    });
    setIsCartOpen(true);
  };

  const updateQty = (ref: string, delta: number) => {
    setCart(prev => prev
      .map(i => i.ref === ref ? { ...i, quantidade: i.quantidade + delta } : i)
      .filter(i => i.quantidade > 0)
    );
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const ref = `ONL-${Date.now().toString().slice(-6)}`;
      await submitOnlineOrder({
        ref,
        store_slug: slug,
        store_id: lojaData?.storeId ?? null,
        nome_cliente: form.nome,
        email: form.email,
        telefone: form.telefone,
        morada: form.morada,
        cidade: form.cidade,
        codigo_postal: form.codigo_postal,
        items: cart,
        total: totalComPortes,
        portes,
        metodo_envio: form.metodo_envio,
        notas: form.notas,
        status: 'Aguarda pagamento',
        data_venda: new Date().toISOString().split('T')[0],
      });
      setOrderRef(ref);
      setCart([]);
      setStep('success');
    } catch (err: any) {
      const msg = err?.message || 'Erro desconhecido';
      alert(`Erro ao submeter encomenda: ${msg}\n\nTenta novamente.`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(38_25%_96%)]">
      <Loader2 className="h-8 w-8 animate-spin text-[hsl(340_72%_45%)]" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(38_25%_96%)]">
      <p className="text-muted-foreground">{error}</p>
    </div>
  );

  const storeName = lojaData?.storeName || 'Loja Diana';

  return (
    <div className="min-h-screen bg-[hsl(38_25%_96%)]">

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-[hsl(35_18%_90%)]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, hsl(340 72% 45%), hsl(340 72% 60%))' }}>
              {storeName[0]}
            </div>
            <span className="font-semibold text-[hsl(20_15%_8%)]">{storeName}</span>
          </div>

          {step === 'catalog' && (
            <div className="flex-1 max-w-xs hidden sm:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar produtos..."
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-[hsl(35_18%_88%)] bg-[hsl(38_25%_98%)] outline-none focus:border-[hsl(340_72%_45%)]"
                />
              </div>
            </div>
          )}

          <button
            onClick={() => { setIsCartOpen(true); setStep('catalog'); }}
            className="relative flex items-center gap-2 bg-[hsl(340_72%_45%)] text-white px-4 py-2 rounded-xl text-sm font-semibold"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Carrinho</span>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-[hsl(20_80%_50%)] text-white text-[10px] font-bold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Catalog */}
      {step === 'catalog' && (
        <main className="max-w-6xl mx-auto px-4 py-8">
          {(lojaData?.categories?.length ?? 0) > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  !selectedCategory
                    ? 'bg-[hsl(340_72%_45%)] text-white'
                    : 'bg-white border border-[hsl(35_18%_88%)] text-[hsl(20_15%_30%)]'
                }`}
              >
                Todos
              </button>
              {lojaData?.categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-[hsl(340_72%_45%)] text-white'
                      : 'bg-white border border-[hsl(35_18%_88%)] text-[hsl(20_15%_30%)]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          <div className="sm:hidden mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Pesquisar..."
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-[hsl(35_18%_88%)] bg-white outline-none focus:border-[hsl(340_72%_45%)]"
            />
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum produto encontrado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map(product => (
                <motion.div
                  key={product.ref}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl overflow-hidden border border-[hsl(35_18%_92%)] hover:shadow-md transition-all group"
                >
                  <div className="aspect-[4/5] overflow-hidden bg-[hsl(340_40%_96%)]">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.nome_artigo}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-10 w-10 text-[hsl(340_40%_75%)]" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-[13px] font-semibold text-[hsl(20_15%_8%)] leading-tight mb-1 line-clamp-2">
                      {product.nome_artigo}
                    </p>
                    <p className="text-[15px] font-black text-[hsl(340_72%_45%)] mb-2">
                      {product.pvp_cica?.toFixed(2).replace('.', ',')}€
                    </p>
                    <button
                      onClick={() => addToCart(product)}
                      className="w-full bg-[hsl(340_72%_45%)] hover:bg-[hsl(340_72%_38%)] text-white text-[12px] font-bold py-2 rounded-xl transition-colors"
                    >
                      + Adicionar
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* Checkout */}
      {step === 'checkout' && (
        <main className="max-w-2xl mx-auto px-4 py-8">
          <button
            onClick={() => setStep('catalog')}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar ao catálogo
          </button>

          <h1 className="text-2xl font-bold text-[hsl(20_15%_8%)] mb-6">Finalizar encomenda</h1>

          <div className="bg-white rounded-2xl border border-[hsl(35_18%_92%)] p-4 mb-6">
            <h2 className="text-sm font-semibold text-[hsl(20_15%_30%)] mb-3">Resumo</h2>
            {cart.map(item => (
              <div key={item.ref} className="flex justify-between text-sm py-1.5 border-b border-[hsl(35_18%_96%)] last:border-0">
                <span className="text-[hsl(20_15%_20%)]">{item.nome_artigo} × {item.quantidade}</span>
                <span className="font-semibold">{(item.pvp_cica * item.quantidade).toFixed(2)}€</span>
              </div>
            ))}
            <div className="flex justify-between text-sm mt-2 pt-2 border-t border-[hsl(35_18%_88%)]">
              <span className="text-muted-foreground">Portes ({form.metodo_envio})</span>
              <span>{portes === 0 ? 'Grátis' : `${portes}€`}</span>
            </div>
            <div className="flex justify-between font-bold text-base mt-2">
              <span>Total</span>
              <span className="text-[hsl(340_72%_45%)]">{totalComPortes.toFixed(2)}€</span>
            </div>
          </div>

          <form onSubmit={handleSubmitOrder} className="space-y-4">
            <div className="bg-white rounded-2xl border border-[hsl(35_18%_92%)] p-4 space-y-3">
              <h2 className="text-sm font-semibold text-[hsl(20_15%_30%)] flex items-center gap-1.5">
                <User className="h-4 w-4" /> Dados pessoais
              </h2>
              <input required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Nome completo *" className="w-full px-3 py-2.5 text-sm rounded-xl border border-[hsl(35_18%_88%)] outline-none focus:border-[hsl(340_72%_45%)]" />
              <div className="grid grid-cols-2 gap-3">
                <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="Email *" className="px-3 py-2.5 text-sm rounded-xl border border-[hsl(35_18%_88%)] outline-none focus:border-[hsl(340_72%_45%)]" />
                <input required value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                  placeholder="Telemóvel *" className="px-3 py-2.5 text-sm rounded-xl border border-[hsl(35_18%_88%)] outline-none focus:border-[hsl(340_72%_45%)]" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[hsl(35_18%_92%)] p-4 space-y-3">
              <h2 className="text-sm font-semibold text-[hsl(20_15%_30%)] flex items-center gap-1.5">
                <Truck className="h-4 w-4" /> Entrega
              </h2>
              <select value={form.metodo_envio} onChange={e => setForm(f => ({ ...f, metodo_envio: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-[hsl(35_18%_88%)] outline-none focus:border-[hsl(340_72%_45%)] bg-white">
                <option value="Levantamento">Levantamento (Grátis)</option>
                <option value="Continental">Portugal Continental (5€)</option>
                <option value="Ilhas">Ilhas (10€)</option>
                <option value="Internacional">Internacional (15€)</option>
              </select>
              {form.metodo_envio !== 'Levantamento' && (
                <>
                  <input required value={form.morada} onChange={e => setForm(f => ({ ...f, morada: e.target.value }))}
                    placeholder="Morada *" className="w-full px-3 py-2.5 text-sm rounded-xl border border-[hsl(35_18%_88%)] outline-none focus:border-[hsl(340_72%_45%)]" />
                  <div className="grid grid-cols-2 gap-3">
                    <input value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))}
                      placeholder="Cidade" className="px-3 py-2.5 text-sm rounded-xl border border-[hsl(35_18%_88%)] outline-none focus:border-[hsl(340_72%_45%)]" />
                    <input value={form.codigo_postal} onChange={e => setForm(f => ({ ...f, codigo_postal: e.target.value }))}
                      placeholder="Código Postal" className="px-3 py-2.5 text-sm rounded-xl border border-[hsl(35_18%_88%)] outline-none focus:border-[hsl(340_72%_45%)]" />
                  </div>
                </>
              )}
            </div>

            <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              placeholder="Notas (opcional) — tamanho, cor preferida..."
              rows={2}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-[hsl(35_18%_88%)] outline-none focus:border-[hsl(340_72%_45%)] resize-none bg-white" />

            <p className="text-xs text-center text-muted-foreground">
              Após a encomenda, receberás o contacto da loja para pagamento via MBWay ou transferência.
            </p>

            <button type="submit" disabled={submitting || cart.length === 0}
              className="w-full bg-[hsl(340_72%_45%)] hover:bg-[hsl(340_72%_38%)] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
              {submitting ? 'A enviar...' : `Confirmar encomenda — ${totalComPortes.toFixed(2)}€`}
            </button>
          </form>
        </main>
      )}

      {/* Success */}
      {step === 'success' && (
        <main className="max-w-lg mx-auto px-4 py-16 text-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <div className="h-20 w-20 rounded-full bg-[hsl(340_72%_95%)] flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-[hsl(340_72%_45%)]" />
            </div>
            <h1 className="text-2xl font-bold text-[hsl(20_15%_8%)] mb-2">Encomenda recebida!</h1>
            <p className="text-muted-foreground mb-2">Referência: <strong className="text-foreground">{orderRef}</strong></p>
            <p className="text-muted-foreground text-sm mb-8">
              A {storeName} irá contactar-te em breve para confirmar o pagamento via MBWay ou transferência bancária. 💕
            </p>
            <button
              onClick={() => { setStep('catalog'); setIsCartOpen(false); }}
              className="bg-[hsl(340_72%_45%)] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[hsl(340_72%_38%)] transition-colors"
            >
              Continuar a ver produtos
            </button>
          </motion.div>
        </main>
      )}

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && step === 'catalog' && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/40 z-50"
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white z-50 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-[hsl(35_18%_92%)]">
                <h2 className="font-semibold text-[hsl(20_15%_8%)] flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-[hsl(340_72%_45%)]" />
                  Carrinho {cartCount > 0 && <span className="text-[hsl(340_72%_45%)]">({cartCount})</span>}
                </h2>
                <button onClick={() => setIsCartOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">O carrinho está vazio</p>
                  </div>
                ) : cart.map(item => (
                  <div key={item.ref} className="flex gap-3 bg-[hsl(38_25%_98%)] rounded-xl p-3">
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-[hsl(340_40%_96%)] flex-shrink-0">
                      {item.image_url
                        ? <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                        : <Package className="h-6 w-6 text-[hsl(340_40%_75%)] m-auto mt-4" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[hsl(20_15%_8%)] line-clamp-1">{item.nome_artigo}</p>
                      <p className="text-[13px] font-black text-[hsl(340_72%_45%)]">{item.pvp_cica.toFixed(2)}€</p>
                      <div className="flex items-center gap-2 mt-1">
                        <button onClick={() => updateQty(item.ref, -1)} className="h-6 w-6 rounded-lg border border-[hsl(35_18%_88%)] flex items-center justify-center hover:bg-[hsl(340_72%_95%)]">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-sm font-semibold w-4 text-center">{item.quantidade}</span>
                        <button onClick={() => updateQty(item.ref, 1)} className="h-6 w-6 rounded-lg border border-[hsl(35_18%_88%)] flex items-center justify-center hover:bg-[hsl(340_72%_95%)]">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <button onClick={() => setCart(prev => prev.filter(i => i.ref !== item.ref))} className="text-muted-foreground hover:text-rose-500 self-start">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {cart.length > 0 && (
                <div className="p-4 border-t border-[hsl(35_18%_92%)]">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">{cartTotal.toFixed(2)}€</span>
                  </div>
                  <button
                    onClick={() => { setIsCartOpen(false); setStep('checkout'); }}
                    className="w-full bg-[hsl(340_72%_45%)] hover:bg-[hsl(340_72%_38%)] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    Finalizar encomenda <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <footer className="mt-16 border-t border-[hsl(35_18%_90%)] bg-white py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p className="font-semibold text-[hsl(20_15%_20%)] mb-1">{storeName}</p>
          {lojaData?.instagram && <p>{lojaData.instagram}</p>}
          <p className="mt-2 text-xs">© {new Date().getFullYear()} — Powered by Loja Diana</p>
        </div>
      </footer>
    </div>
  );
}
