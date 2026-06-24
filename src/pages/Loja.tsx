import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, Search, X, Package, ChevronRight,
  Minus, Plus, Truck, User, CheckCircle2, ArrowLeft,
  Loader2, Instagram, Heart, Settings2
} from 'lucide-react';
import { fetchLojaData, submitOnlineOrder, type LojaData, type OnlineOrderItem } from '../lib/lojaPublica';

const PORTES: Record<string, number> = {
  'Levantamento': 0,
  'Continental': 5,
  'Ilhas': 10,
  'Internacional': 15,
};

// Produtos de demonstração quando não há dados na BD
const DEMO_PRODUCTS = [
  { ref: 'LD-001', nome_artigo: 'Vestido Midi Floral', pvp_cica: 49.90, categoria: 'Vestidos', image_url: '/assets/fashion/fashion_1.png' },
  { ref: 'LD-002', nome_artigo: 'Blusa Linho Off-White', pvp_cica: 29.90, categoria: 'Blusas', image_url: '/assets/fashion/fashion_2.png' },
  { ref: 'LD-003', nome_artigo: 'Calças Wide Leg Bege', pvp_cica: 39.90, categoria: 'Calças', image_url: '/assets/fashion/fashion_3.png' },
  { ref: 'LD-004', nome_artigo: 'Trench Coat Camel', pvp_cica: 89.90, categoria: 'Casacos', image_url: '/assets/fashion/fashion_1.png' },
  { ref: 'LD-005', nome_artigo: 'Saia Plissada Rosa', pvp_cica: 34.90, categoria: 'Saias', image_url: '/assets/fashion/fashion_2.png' },
  { ref: 'LD-006', nome_artigo: 'Top Crochet Branco', pvp_cica: 22.90, categoria: 'Tops', image_url: '/assets/fashion/fashion_3.png' },
  { ref: 'LD-007', nome_artigo: 'Cardigan Knit Nude', pvp_cica: 44.90, categoria: 'Casacos', image_url: '/assets/fashion/fashion_1.png' },
  { ref: 'LD-008', nome_artigo: 'Conjunto Alfaiataria Taupe', pvp_cica: 69.90, categoria: 'Conjuntos', image_url: '/assets/fashion/fashion_2.png' },
];

interface CartItem extends OnlineOrderItem {
  image_url?: string;
}

export default function Loja() {
  const { slug = 'demo' } = useParams<{ slug: string }>();

  const [lojaData, setLojaData] = useState<LojaData | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [step, setStep] = useState<'catalog' | 'checkout' | 'success'>('catalog');
  const [submitting, setSubmitting] = useState(false);
  const [orderRef, setOrderRef] = useState('');
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());

  const [cart, setCart] = useState<CartItem[]>([]);
  const [form, setForm] = useState({
    nome: '', email: '', telefone: '', morada: '', cidade: '',
    codigo_postal: '', metodo_envio: 'Continental', notas: '',
  });

  useEffect(() => {
    fetchLojaData(slug)
      .then(setLojaData)
      .catch(() => setLojaData(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const allProducts = useMemo(() => {
    const dbProducts = lojaData?.products ?? [];
    return dbProducts.length > 0 ? dbProducts : DEMO_PRODUCTS as any[];
  }, [lojaData]);

  const categories = useMemo(() => {
    const cats = lojaData?.categories ?? [];
    return cats.length > 0 ? cats : [...new Set(DEMO_PRODUCTS.map(p => p.categoria))];
  }, [lojaData]);

  const filteredProducts = useMemo(() => {
    let list = allProducts;
    if (selectedCategory) list = list.filter((p: any) => p.categoria === selectedCategory);
    if (searchTerm.trim()) {
      const t = searchTerm.toLowerCase();
      list = list.filter((p: any) =>
        p.nome_artigo?.toLowerCase().includes(t) || p.ref?.toLowerCase().includes(t)
      );
    }
    return list;
  }, [allProducts, selectedCategory, searchTerm]);

  const cartTotal = cart.reduce((s, i) => s + i.pvp_cica * i.quantidade, 0);
  const portes = PORTES[form.metodo_envio] ?? 5;
  const totalComPortes = cartTotal + portes;
  const cartCount = cart.reduce((s, i) => s + i.quantidade, 0);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.ref === product.ref);
      if (existing) return prev.map(i => i.ref === product.ref ? { ...i, quantidade: i.quantidade + 1 } : i);
      return [...prev, { ref: product.ref, nome_artigo: product.nome_artigo, pvp_cica: product.pvp_cica, quantidade: 1, image_url: product.image_url }];
    });
    setIsCartOpen(true);
  };

  const updateQty = (ref: string, delta: number) => {
    setCart(prev => prev.map(i => i.ref === ref ? { ...i, quantidade: i.quantidade + delta } : i).filter(i => i.quantidade > 0));
  };

  const toggleWishlist = (ref: string) => {
    setWishlist(prev => { const s = new Set(prev); s.has(ref) ? s.delete(ref) : s.add(ref); return s; });
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const ref = `ONL-${Date.now().toString().slice(-6)}`;
      await submitOnlineOrder({
        ref, store_slug: slug, store_id: lojaData?.storeId ?? null,
        nome_cliente: form.nome, email: form.email, telefone: form.telefone,
        morada: form.morada, cidade: form.cidade, codigo_postal: form.codigo_postal,
        items: cart, total: totalComPortes, portes, metodo_envio: form.metodo_envio,
        notas: form.notas, status: 'Aguarda pagamento', data_venda: new Date().toISOString().split('T')[0],
      });
      setOrderRef(ref);
      setCart([]);
      setStep('success');
    } catch (err: any) {
      alert(`Erro ao submeter encomenda: ${err?.message ?? 'Erro desconhecido'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const storeName = lojaData?.storeName || 'Diana';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="h-6 w-6 animate-spin text-black" />
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-black font-sans">

      {/* Top banner */}
      <div className="bg-black text-white text-center text-[11px] tracking-[0.15em] uppercase py-2.5 font-medium">
        Envio gratuito em Portugal a partir de 75€ — Novidades todas as semanas
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-4">

            {/* Logo */}
            <div className="flex-shrink-0">
              <span className="text-2xl font-black tracking-[-0.05em] text-black uppercase">{storeName}</span>
            </div>

            {/* Nav categories - desktop */}
            {step === 'catalog' && (
              <nav className="hidden md:flex items-center gap-6">
                <button onClick={() => setSelectedCategory(null)}
                  className={`text-[12px] uppercase tracking-widest font-semibold transition-colors ${!selectedCategory ? 'text-black border-b-2 border-black pb-0.5' : 'text-gray-400 hover:text-black'}`}>
                  Tudo
                </button>
                {categories.map((cat: string) => (
                  <button key={cat} onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                    className={`text-[12px] uppercase tracking-widest font-semibold transition-colors whitespace-nowrap ${selectedCategory === cat ? 'text-black border-b-2 border-black pb-0.5' : 'text-gray-400 hover:text-black'}`}>
                    {cat}
                  </button>
                ))}
              </nav>
            )}

            {/* Right actions */}
            <div className="flex items-center gap-3">
              {step === 'catalog' && (
                <div className="hidden sm:flex relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Pesquisar..."
                    className="pl-8 pr-4 py-2 text-[12px] bg-gray-50 border border-gray-200 rounded-full w-48 outline-none focus:border-black transition-colors" />
                </div>
              )}

              {/* Cart button */}
              <button onClick={() => { setIsCartOpen(true); setStep('catalog'); }}
                className="relative flex items-center gap-1.5 bg-black text-white px-4 py-2 rounded-full text-[12px] font-semibold tracking-wide hover:bg-gray-800 transition-colors">
                <ShoppingBag className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Carrinho</span>
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* ADM button */}
              <Link to="/login"
                title="Área de Gestão"
                className="flex items-center justify-center h-8 w-8 rounded-full border border-gray-200 hover:border-black hover:bg-black hover:text-white transition-all text-gray-400 group">
                <Settings2 className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Mobile categories */}
          {step === 'catalog' && (
            <div className="md:hidden flex gap-3 overflow-x-auto pb-3 pt-1 scrollbar-hide">
              <button onClick={() => setSelectedCategory(null)}
                className={`flex-shrink-0 text-[11px] uppercase tracking-widest font-semibold px-3 py-1 rounded-full transition-colors ${!selectedCategory ? 'bg-black text-white' : 'text-gray-500 hover:text-black'}`}>
                Tudo
              </button>
              {categories.map((cat: string) => (
                <button key={cat} onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                  className={`flex-shrink-0 text-[11px] uppercase tracking-widest font-semibold px-3 py-1 rounded-full transition-colors ${selectedCategory === cat ? 'bg-black text-white' : 'text-gray-500 hover:text-black'}`}>
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* CATALOG */}
      {step === 'catalog' && (
        <main>
          {/* Hero */}
          <section className="relative bg-[#f5f0ea] overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 flex flex-col sm:flex-row items-center gap-10">
              <div className="flex-1 text-center sm:text-left">
                <p className="text-[11px] uppercase tracking-[0.25em] text-gray-500 font-semibold mb-4">Nova Coleção · Verão 2025</p>
                <h1 className="text-5xl sm:text-7xl font-black tracking-[-0.04em] leading-none mb-6 text-black">
                  Elegância<br/>
                  <span className="text-rose-400">Natural</span>
                </h1>
                <p className="text-gray-500 text-sm max-w-sm mb-8 leading-relaxed">
                  Peças cuidadosamente selecionadas para mulheres que valorizam o estilo sem abrir mão do conforto.
                </p>
                <button onClick={() => document.getElementById('produtos')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center gap-2 bg-black text-white text-[12px] uppercase tracking-widest font-bold px-8 py-4 hover:bg-gray-800 transition-colors">
                  Ver Coleção <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 flex gap-3 max-w-lg">
                <div className="flex-1 rounded-2xl overflow-hidden aspect-[3/4] mt-8">
                  <img src="https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=600&q=80" alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 rounded-2xl overflow-hidden aspect-[3/4] mb-8">
                  <img src="https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&q=80" alt="" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </section>

          {/* Trust bar */}
          <div className="border-y border-gray-100 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap justify-center gap-8">
              {[
                { icon: '✦', text: 'Envio em 24-48h' },
                { icon: '♡', text: 'Devoluções em 30 dias' },
                { icon: '◎', text: 'Pagamento seguro' },
                { icon: '☎', text: 'Apoio via WhatsApp' },
              ].map(item => (
                <div key={item.text} className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-gray-500 font-semibold">
                  <span className="text-rose-400">{item.icon}</span> {item.text}
                </div>
              ))}
            </div>
          </div>

          {/* Products grid */}
          <section id="produtos" className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-[11px] uppercase tracking-[0.2em] text-gray-400 font-semibold mb-1">Coleção</h2>
                <p className="text-2xl font-black tracking-tight">
                  {selectedCategory || 'Todas as Peças'}
                  <span className="ml-2 text-sm font-normal text-gray-400">({filteredProducts.length})</span>
                </p>
              </div>
              {/* Mobile search */}
              <div className="sm:hidden relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar..."
                  className="pl-8 pr-4 py-2 text-[12px] bg-gray-50 border border-gray-200 rounded-full w-36 outline-none" />
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-24">
                <Package className="h-10 w-10 mx-auto mb-4 text-gray-200" />
                <p className="text-gray-400 text-sm">Nenhum produto encontrado.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-px bg-gray-100">
                {filteredProducts.map((product: any, index: number) => (
                  <motion.div
                    key={product.ref}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.04 }}
                    className="bg-white group"
                  >
                    {/* Image */}
                    <div className="relative aspect-[3/4] overflow-hidden bg-gray-50">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.nome_artigo}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-10 w-10 text-gray-200" />
                        </div>
                      )}
                      {/* Badges */}
                      {index < 3 && (
                        <span className="absolute top-3 left-3 bg-black text-white text-[9px] uppercase tracking-widest font-bold px-2 py-1">
                          Novo
                        </span>
                      )}
                      {/* Wishlist */}
                      <button onClick={() => toggleWishlist(product.ref)}
                        className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110">
                        <Heart className={`h-4 w-4 ${wishlist.has(product.ref) ? 'fill-rose-500 text-rose-500' : 'text-gray-600'}`} />
                      </button>
                      {/* Quick add */}
                      <div className="absolute inset-x-0 bottom-0 bg-black/90 text-white text-[11px] uppercase tracking-widest font-bold text-center py-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 cursor-pointer"
                        onClick={() => addToCart(product)}>
                        + Adicionar ao carrinho
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      {product.categoria && (
                        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">{product.categoria}</p>
                      )}
                      <p className="text-[13px] font-semibold text-black leading-tight line-clamp-2 mb-2">{product.nome_artigo}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-[15px] font-black text-black">{product.pvp_cica?.toFixed(2).replace('.', ',')}€</p>
                        <button onClick={() => addToCart(product)}
                          className="sm:hidden text-[10px] uppercase tracking-widest font-bold bg-black text-white px-3 py-1.5 hover:bg-gray-700 transition-colors">
                          + Add
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          {/* Instagram strip */}
          <section className="bg-[#f9f7f4] py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
              <p className="text-[11px] uppercase tracking-[0.25em] text-gray-400 font-semibold mb-2">Siga-nos</p>
              <h3 className="text-3xl font-black tracking-tight mb-2">@{lojaData?.instagram?.replace('@','') || storeName.toLowerCase().replace(' ','')}</h3>
              <p className="text-gray-400 text-sm mb-8">Partilhe o seu look e inspire outras mulheres</p>
              <div className="flex gap-1 overflow-hidden rounded-2xl">
                {['photo-1490481651871-ab68de25d43d','photo-1496747611176-843222e1e57c','photo-1434389677669-e08b4cac3105','photo-1469334031218-e382a71b716b'].map((id, i) => (
                  <div key={i} className="flex-1 aspect-square overflow-hidden">
                    <img src={`https://images.unsplash.com/${id}?w=400&q=80`} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      )}

      {/* CHECKOUT */}
      {step === 'checkout' && (
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
          <button onClick={() => setStep('catalog')} className="flex items-center gap-1 text-[12px] uppercase tracking-widest font-semibold text-gray-400 hover:text-black mb-8 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>

          <h1 className="text-3xl font-black tracking-tight mb-8">Finalizar Encomenda</h1>

          <div className="border border-gray-100 p-5 mb-6">
            <h2 className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 mb-4">Resumo</h2>
            {cart.map(item => (
              <div key={item.ref} className="flex justify-between text-sm py-2.5 border-b border-gray-50 last:border-0">
                <span className="text-gray-700">{item.nome_artigo} <span className="text-gray-400">× {item.quantidade}</span></span>
                <span className="font-semibold">{(item.pvp_cica * item.quantidade).toFixed(2)}€</span>
              </div>
            ))}
            <div className="flex justify-between text-sm mt-3 pt-3 border-t border-gray-100">
              <span className="text-gray-400">Portes ({form.metodo_envio})</span>
              <span>{portes === 0 ? 'Grátis' : `${portes}€`}</span>
            </div>
            <div className="flex justify-between font-black text-lg mt-3 pt-3 border-t border-black">
              <span>Total</span>
              <span>{totalComPortes.toFixed(2)}€</span>
            </div>
          </div>

          <form onSubmit={handleSubmitOrder} className="space-y-5">
            <div className="border border-gray-100 p-5 space-y-3">
              <h2 className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 flex items-center gap-2">
                <User className="h-3.5 w-3.5" /> Dados pessoais
              </h2>
              <input required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Nome completo *"
                className="w-full px-4 py-3 text-sm border border-gray-200 outline-none focus:border-black transition-colors" />
              <div className="grid grid-cols-2 gap-3">
                <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="Email *"
                  className="px-4 py-3 text-sm border border-gray-200 outline-none focus:border-black transition-colors" />
                <input required value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                  placeholder="Telemóvel *"
                  className="px-4 py-3 text-sm border border-gray-200 outline-none focus:border-black transition-colors" />
              </div>
            </div>

            <div className="border border-gray-100 p-5 space-y-3">
              <h2 className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 flex items-center gap-2">
                <Truck className="h-3.5 w-3.5" /> Entrega
              </h2>
              <select value={form.metodo_envio} onChange={e => setForm(f => ({ ...f, metodo_envio: e.target.value }))}
                className="w-full px-4 py-3 text-sm border border-gray-200 outline-none focus:border-black bg-white transition-colors">
                <option value="Levantamento">Levantamento (Grátis)</option>
                <option value="Continental">Portugal Continental (5€)</option>
                <option value="Ilhas">Ilhas (10€)</option>
                <option value="Internacional">Internacional (15€)</option>
              </select>
              {form.metodo_envio !== 'Levantamento' && (
                <>
                  <input required value={form.morada} onChange={e => setForm(f => ({ ...f, morada: e.target.value }))}
                    placeholder="Morada *"
                    className="w-full px-4 py-3 text-sm border border-gray-200 outline-none focus:border-black transition-colors" />
                  <div className="grid grid-cols-2 gap-3">
                    <input value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))}
                      placeholder="Cidade"
                      className="px-4 py-3 text-sm border border-gray-200 outline-none focus:border-black transition-colors" />
                    <input value={form.codigo_postal} onChange={e => setForm(f => ({ ...f, codigo_postal: e.target.value }))}
                      placeholder="Código Postal"
                      className="px-4 py-3 text-sm border border-gray-200 outline-none focus:border-black transition-colors" />
                  </div>
                </>
              )}
            </div>

            <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              placeholder="Notas (opcional) — tamanho, cor, indicações especiais..."
              rows={3}
              className="w-full px-4 py-3 text-sm border border-gray-200 outline-none focus:border-black resize-none transition-colors" />

            <p className="text-[11px] text-center text-gray-400 leading-relaxed">
              Após confirmação, a {storeName} entrará em contacto para pagamento via MBWay ou transferência bancária.
            </p>

            <button type="submit" disabled={submitting || cart.length === 0}
              className="w-full bg-black hover:bg-gray-800 disabled:opacity-40 text-white font-bold py-4 flex items-center justify-center gap-2 uppercase tracking-widest text-[12px] transition-colors">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
              {submitting ? 'A enviar...' : `Confirmar — ${totalComPortes.toFixed(2)}€`}
            </button>
          </form>
        </main>
      )}

      {/* SUCCESS */}
      {step === 'success' && (
        <main className="max-w-lg mx-auto px-4 py-24 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="h-20 w-20 rounded-full bg-black flex items-center justify-center mx-auto mb-8">
              <CheckCircle2 className="h-10 w-10 text-white" />
            </div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-gray-400 font-semibold mb-3">Encomenda Confirmada</p>
            <h1 className="text-4xl font-black tracking-tight mb-3">Obrigada! 💕</h1>
            <p className="text-gray-500 text-sm mb-2">Referência: <strong className="text-black font-black">{orderRef}</strong></p>
            <p className="text-gray-400 text-sm mb-10 leading-relaxed">
              A {storeName} irá contactar-te em breve para confirmar o pagamento e o envio.
            </p>
            <button onClick={() => { setStep('catalog'); setIsCartOpen(false); }}
              className="bg-black text-white px-10 py-4 font-bold uppercase tracking-widest text-[12px] hover:bg-gray-800 transition-colors">
              Continuar a Comprar
            </button>
          </motion.div>
        </main>
      )}

      {/* CART DRAWER */}
      <AnimatePresence>
        {isCartOpen && step === 'catalog' && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/50 z-50" />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white z-50 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Carrinho {cartCount > 0 && <span className="font-normal text-gray-400">({cartCount})</span>}
                </h2>
                <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-black transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {cart.length === 0 ? (
                  <div className="text-center py-16">
                    <ShoppingBag className="h-8 w-8 mx-auto mb-3 text-gray-200" />
                    <p className="text-sm text-gray-400">O carrinho está vazio</p>
                  </div>
                ) : cart.map(item => (
                  <div key={item.ref} className="flex gap-3">
                    <div className="w-16 h-20 overflow-hidden bg-gray-50 flex-shrink-0">
                      {item.image_url
                        ? <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                        : <Package className="h-6 w-6 text-gray-200 m-auto mt-7" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-black line-clamp-2 leading-tight">{item.nome_artigo}</p>
                      <p className="text-[13px] font-black mt-1">{item.pvp_cica.toFixed(2)}€</p>
                      <div className="flex items-center gap-2 mt-2">
                        <button onClick={() => updateQty(item.ref, -1)} className="h-6 w-6 border border-gray-200 flex items-center justify-center hover:border-black transition-colors">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-sm font-bold w-4 text-center">{item.quantidade}</span>
                        <button onClick={() => updateQty(item.ref, 1)} className="h-6 w-6 border border-gray-200 flex items-center justify-center hover:border-black transition-colors">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <button onClick={() => setCart(prev => prev.filter(i => i.ref !== item.ref))}
                      className="text-gray-300 hover:text-black self-start transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {cart.length > 0 && (
                <div className="p-5 border-t border-gray-100">
                  <div className="flex justify-between text-sm mb-4">
                    <span className="text-gray-400">Subtotal</span>
                    <span className="font-black">{cartTotal.toFixed(2)}€</span>
                  </div>
                  <button onClick={() => { setIsCartOpen(false); setStep('checkout'); }}
                    className="w-full bg-black hover:bg-gray-800 text-white font-bold py-4 flex items-center justify-center gap-2 uppercase tracking-widest text-[12px] transition-colors">
                    Finalizar Encomenda <ChevronRight className="h-4 w-4" />
                  </button>
                  <p className="text-[10px] text-center text-gray-400 mt-3">Envio e portes calculados no checkout</p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-12 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-10">
            <div>
              <p className="text-xl font-black tracking-tight mb-3">{storeName}</p>
              <p className="text-sm text-gray-400 leading-relaxed">Moda feminina com alma. Peças únicas para mulheres extraordinárias.</p>
              {lojaData?.instagram && (
                <a href={`https://instagram.com/${lojaData.instagram.replace('@','')}`} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 text-[12px] font-semibold text-gray-500 hover:text-black transition-colors">
                  <Instagram className="h-4 w-4" /> {lojaData.instagram}
                </a>
              )}
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-widest font-semibold mb-4">Ajuda</p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Trocas & Devoluções</li>
                <li>Envios & Portes</li>
                <li>Pagamentos</li>
                <li>Contacto</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-widest font-semibold mb-4">Newsletter</p>
              <p className="text-sm text-gray-400 mb-3">Novidades e promoções exclusivas.</p>
              <div className="flex gap-2">
                <input type="email" placeholder="O teu email"
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 outline-none focus:border-black transition-colors" />
                <button className="bg-black text-white text-[11px] uppercase tracking-widest font-bold px-4 py-2 hover:bg-gray-800 transition-colors">
                  OK
                </button>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-gray-400">© {new Date().getFullYear()} {storeName} · Todos os direitos reservados</p>
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-gray-300 uppercase tracking-widest">Powered by Loja Diana</span>
              <Link to="/login" className="text-[10px] text-gray-300 uppercase tracking-widest hover:text-black transition-colors flex items-center gap-1">
                <Settings2 className="h-3 w-3" /> ADM
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
