// src/lib/lojaPublica.ts
import { supabase } from './supabase';

export interface LojaData {
  storeName: string;
  storeSlug: string;
  storeId: string | null;
  whatsapp: string;
  instagram: string;
  products: any[];
  categories: string[];
  settings: Record<string, any>;
}

export interface OnlineOrderItem {
  ref: string;
  nome_artigo: string;
  pvp_cica: number;
  quantidade: number;
  tamanho?: string;
  cor?: string;
  image_url?: string;
}

export interface OnlineOrder {
  ref: string;
  store_slug: string;
  store_id: string | null;
  nome_cliente: string;
  email: string;
  telefone: string;
  morada: string;
  cidade: string;
  codigo_postal: string;
  items: OnlineOrderItem[];
  total: number;
  portes: number;
  metodo_envio: string;
  notas?: string;
  status: 'Aguarda pagamento';
  data_venda: string;
}

export async function fetchLojaData(slug: string): Promise<LojaData> {
  // 1. Look up store by slug (might not exist for legacy test user)
  const { data: store } = await supabase
    .from('stores')
    .select('id, name, settings')
    .eq('slug', slug)
    .maybeSingle();

  const storeId = store?.id ?? null;

  // 2. Fetch product catalog and settings from loja_app_state
  let query = supabase
    .from('loja_app_state')
    .select('key, value')
    .in('key', ['manual_products_catalog', 'app_settings', 'categories', 'products_catalog']);

  if (storeId) {
    query = query.eq('store_id', storeId);
  } else {
    query = query.is('store_id', null);
  }

  const { data: stateRows } = await query;

  let products: any[] = [];
  let settings: Record<string, any> = {};
  let categories: string[] = [];
  let excelCatalog: any[] = [];

  stateRows?.forEach(row => {
    if (row.key === 'manual_products_catalog') products = row.value || [];
    if (row.key === 'products_catalog')        excelCatalog = row.value || [];
    if (row.key === 'app_settings')            settings = row.value || {};
    if (row.key === 'categories')              categories = row.value || [];
  });

  // Merge manual overrides on top of excel catalog
  const productMap = new Map<string, any>();
  excelCatalog.forEach((p: any) => productMap.set(p.ref, p));
  products.forEach((p: any) => productMap.set(p.ref, { ...productMap.get(p.ref), ...p }));
  const allProducts = Array.from(productMap.values()).filter(p => p.published !== false);

  return {
    storeName: settings.storeName || store?.name || 'Loja Diana',
    storeSlug: slug,
    storeId,
    whatsapp: settings.whatsapp || '',
    instagram: settings.instagram || '',
    products: allProducts,
    categories,
    settings,
  };
}

export async function submitOnlineOrder(order: OnlineOrder): Promise<string> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), 10000)
  );

  const insert = supabase
    .from('online_orders')
    .insert([order])
    .select('id')
    .single();

  const { data, error } = await Promise.race([insert, timeout]) as any;

  if (error) throw new Error(error.message);
  return data.id;
}

export function buildWhatsAppUrl(order: OnlineOrder, settings: Record<string, any>): string {
  const phone = (settings.whatsapp || '').replace(/\D/g, '');
  const itemsList = order.items
    .map(i => `  • ${i.nome_artigo}${i.tamanho ? ` (${i.tamanho})` : ''}${i.cor ? ` ${i.cor}` : ''} — ${i.pvp_cica.toFixed(2)}€`)
    .join('\n');

  const portesLine = order.portes > 0 ? `\nPortes: ${order.portes.toFixed(2)}€` : '';
  const mbwayLine = settings.mbway ? `\n💳 *MBWay:* ${settings.mbway}` : '';
  const ibanLine = settings.iban ? `\n🏦 *IBAN:* ${settings.iban}` : '';

  const msg = encodeURIComponent(
    `Olá ${order.nome_cliente}! 😊\n\n` +
    `A tua encomenda *${order.ref}* está confirmada!\n\n` +
    `*Artigos:*\n${itemsList}\n` +
    `${portesLine}\n` +
    `*Total: ${order.total.toFixed(2)}€*\n\n` +
    `Podes pagar via:${mbwayLine}${ibanLine}\n\n` +
    `Assim que confirmarmos o pagamento, enviamos de imediato! 💕\n` +
    `${order.nome_cliente.split(' ')[0]}, qualquer dúvida estamos aqui! 🌸`
  );

  return `https://wa.me/${phone}?text=${msg}`;
}
