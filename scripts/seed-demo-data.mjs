/**
 * Script de dados de demonstração — LojaDiana
 * Popula a loja de teste com 10 produtos, 20 encomendas, clientes e compras fictícias.
 * Corre: node scripts/seed-demo-data.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = 'https://ebdcmiuzrrtmmphwxynw.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViZGNtaXV6cnJ0bW1waHd4eW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNzAyMjksImV4cCI6MjA4NDg0NjIyOX0.QNInacY_9ZhDUhNmiYTXVccYNxc0kk71EsdME9AKJW0';
const TEST_EMAIL    = 'teste@lojadiana.pt';
const TEST_PASSWORD = 'teste123';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── 1. Autenticar e obter store_id via store_members ─────────────────────────

const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
  email: TEST_EMAIL,
  password: TEST_PASSWORD,
});

if (authErr || !authData.user) {
  console.error('❌ Erro de autenticação:', authErr?.message);
  process.exit(1);
}

console.log(`✅ Autenticado como ${TEST_EMAIL}`);

// Try to find store_id from store_members; if none, use null (legacy mode)
const { data: members } = await supabase
  .from('store_members')
  .select('store_id, stores(name)')
  .eq('user_id', authData.user.id);

const STORE_ID = members?.[0]?.store_id ?? null;
const storeName = (members?.[0]?.stores)?.name ?? 'Loja de Teste (store_id=null)';
console.log(`✅ Loja: "${storeName}" (store_id=${STORE_ID ?? 'null — modo legado'})`);

// ── 2. Produtos de demonstração ───────────────────────────────────────────────

const PRODUCTS = [
  {
    ref: 'BLS-001',
    nome_artigo: 'Blusa Floral Verão',
    pvp_cica: 29.99,
    base_price: 12.00,
    iva: 23,
    lucro_meu_faturado: 17.99,
    fornecedor: 'Moda Lisboa',
    categoria: 'Blusas',
    colors: ['Rosa', 'Branco', 'Azul Céu'],
    sizes: ['XS', 'S', 'M', 'L'],
    published: true,
    featured: true,
    image_url: 'https://placehold.co/400x500/fce4ec/c2185b?text=BLS-001&font=montserrat',
    color_images: {
      'Rosa': 'https://placehold.co/400x500/fce4ec/c2185b?text=Rosa&font=montserrat',
      'Branco': 'https://placehold.co/400x500/f5f5f5/757575?text=Branco&font=montserrat',
      'Azul Céu': 'https://placehold.co/400x500/e3f2fd/1565c0?text=Azul&font=montserrat',
    },
  },
  {
    ref: 'VST-002',
    nome_artigo: 'Vestido Midi Bordeaux',
    pvp_cica: 54.90,
    base_price: 22.00,
    iva: 23,
    lucro_meu_faturado: 32.90,
    fornecedor: 'Porto Fashion',
    categoria: 'Vestidos',
    colors: ['Bordeaux', 'Verde Oliva', 'Preto'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    published: true,
    featured: true,
    image_url: 'https://placehold.co/400x500/4a0000/fce4ec?text=VST-002&font=montserrat',
    color_images: {
      'Bordeaux': 'https://placehold.co/400x500/4a0000/fce4ec?text=Bordeaux&font=montserrat',
      'Verde Oliva': 'https://placehold.co/400x500/33691e/f1f8e9?text=Verde&font=montserrat',
      'Preto': 'https://placehold.co/400x500/212121/ffffff?text=Preto&font=montserrat',
    },
  },
  {
    ref: 'CLT-003',
    nome_artigo: 'Calças Linho Bege',
    pvp_cica: 39.90,
    base_price: 16.00,
    iva: 23,
    lucro_meu_faturado: 23.90,
    fornecedor: 'Moda Lisboa',
    categoria: 'Calças',
    colors: ['Bege', 'Branco', 'Camel'],
    sizes: ['34', '36', '38', '40', '42'],
    published: true,
    image_url: 'https://placehold.co/400x500/efebe9/5d4037?text=CLT-003&font=montserrat',
  },
  {
    ref: 'JKT-004',
    nome_artigo: 'Casaco Tweed Clássico',
    pvp_cica: 89.90,
    base_price: 38.00,
    iva: 23,
    lucro_meu_faturado: 51.90,
    fornecedor: 'Elegance Porto',
    categoria: 'Casacos',
    colors: ['Cinzento', 'Creme', 'Preto'],
    sizes: ['XS', 'S', 'M', 'L'],
    published: true,
    featured: true,
    image_url: 'https://placehold.co/400x500/eceff1/455a64?text=JKT-004&font=montserrat',
  },
  {
    ref: 'SKT-005',
    nome_artigo: 'Saia Plissada Rosa',
    pvp_cica: 34.90,
    base_price: 14.00,
    iva: 23,
    lucro_meu_faturado: 20.90,
    fornecedor: 'Moda Lisboa',
    categoria: 'Saias',
    colors: ['Rosa Claro', 'Lilás', 'Bege'],
    sizes: ['XS', 'S', 'M', 'L'],
    published: true,
    image_url: 'https://placehold.co/400x500/f8bbd0/880e4f?text=SKT-005&font=montserrat',
  },
  {
    ref: 'TOP-006',
    nome_artigo: 'Top Cropped Cetim',
    pvp_cica: 22.90,
    base_price: 9.00,
    iva: 23,
    lucro_meu_faturado: 13.90,
    fornecedor: 'Porto Fashion',
    categoria: 'Tops',
    colors: ['Champanhe', 'Preto', 'Coral'],
    sizes: ['XS', 'S', 'M', 'L'],
    published: true,
    image_url: 'https://placehold.co/400x500/fff8e1/f57f17?text=TOP-006&font=montserrat',
  },
  {
    ref: 'MCC-007',
    nome_artigo: 'Macação Curto Jeans',
    pvp_cica: 44.90,
    base_price: 18.00,
    iva: 23,
    lucro_meu_faturado: 26.90,
    fornecedor: 'Moda Lisboa',
    categoria: 'Macacões',
    colors: ['Azul Lavado', 'Preto', 'Branco'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    published: true,
    image_url: 'https://placehold.co/400x500/e3f2fd/0d47a1?text=MCC-007&font=montserrat',
  },
  {
    ref: 'VSD-008',
    nome_artigo: 'Vestido Longo Boho',
    pvp_cica: 64.90,
    base_price: 26.00,
    iva: 23,
    lucro_meu_faturado: 38.90,
    fornecedor: 'Elegance Porto',
    categoria: 'Vestidos',
    colors: ['Terracota', 'Azul Índigo', 'Areia'],
    sizes: ['XS', 'S', 'M', 'L'],
    published: true,
    featured: true,
    image_url: 'https://placehold.co/400x500/fbe9e7/bf360c?text=VSD-008&font=montserrat',
  },
  {
    ref: 'CAM-009',
    nome_artigo: 'Camisa Linho Oversize',
    pvp_cica: 37.90,
    base_price: 15.00,
    iva: 23,
    lucro_meu_faturado: 22.90,
    fornecedor: 'Porto Fashion',
    categoria: 'Camisas',
    colors: ['Branco', 'Azul Pálido', 'Cru'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    published: true,
    image_url: 'https://placehold.co/400x500/f5f5f5/424242?text=CAM-009&font=montserrat',
  },
  {
    ref: 'TRP-010',
    nome_artigo: 'Trench Coat Camel',
    pvp_cica: 119.90,
    base_price: 52.00,
    iva: 23,
    lucro_meu_faturado: 67.90,
    fornecedor: 'Elegance Porto',
    categoria: 'Casacos',
    colors: ['Camel', 'Preto', 'Bege'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    published: true,
    featured: true,
    image_url: 'https://placehold.co/400x500/fff9c4/f57f17?text=TRP-010&font=montserrat',
  },
];

// ── 3. Clientes fictícios ─────────────────────────────────────────────────────

const CLIENTES = [
  { nome_cliente: 'Ana Ferreira',     instagram: '@ana.ferreira',     address: 'Rua das Flores 12, Porto',         city: 'Porto',   email: 'ana@email.pt',    phone: '912345678', saldo: 0 },
  { nome_cliente: 'Beatriz Santos',   instagram: '@bea.santos',       address: 'Av. da República 45, Lisboa',      city: 'Lisboa',  email: 'bea@email.pt',    phone: '913456789', saldo: 15 },
  { nome_cliente: 'Carla Oliveira',   instagram: '@carla.oliv',       address: 'Rua do Comercio 8, Braga',         city: 'Braga',   email: 'carla@email.pt',  phone: '914567890', saldo: 0 },
  { nome_cliente: 'Diana Costa',      instagram: '@diana.costa_',     address: 'Rua Direita 3, Coimbra',           city: 'Coimbra', email: 'diana@email.pt',  phone: '915678901', saldo: 30 },
  { nome_cliente: 'Érica Marques',    instagram: '@ericamq',          address: 'Rua das Laranjeiras 7, Faro',      city: 'Faro',    email: 'erica@email.pt',  phone: '916789012', saldo: 0 },
  { nome_cliente: 'Filipa Rodrigues', instagram: '@filipa.rodrigues', address: 'Travessa do Sol 2, Aveiro',        city: 'Aveiro',  email: 'filipa@email.pt', phone: '917890123', saldo: 0 },
  { nome_cliente: 'Graça Pereira',    instagram: '@graca.p',          address: 'Rua Nova 15, Setúbal',             city: 'Setúbal', email: 'graca@email.pt',  phone: '918901234', saldo: 10 },
  { nome_cliente: 'Helena Sousa',     instagram: '@helena_sousa',     address: 'Rua do Castelo 22, Évora',         city: 'Évora',   email: 'helena@email.pt', phone: '919012345', saldo: 0 },
];

// ── 4. Encomendas fictícias ───────────────────────────────────────────────────

const STATUSES = ['Pago', 'Pago', 'Pago', 'Enviado', 'Enviado', 'Pendente', 'Pendente', 'Cancelado'];

function randomDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysAgo));
  return d.toISOString().split('T')[0];
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const ORDERS = Array.from({ length: 20 }, (_, i) => {
  const product = pick(PRODUCTS);
  const cliente = pick(CLIENTES);
  const status  = pick(STATUSES);
  const size    = product.sizes ? pick(product.sizes) : 'M';
  const color   = product.colors ? pick(product.colors) : 'Único';
  const data    = randomDate(60);
  return {
    id:               `ENC-${String(i + 1).padStart(3, '0')}`,
    ref:              `ENC-${String(i + 1).padStart(3, '0')}`,
    nome_cliente:     cliente.nome_cliente,
    instagram:        cliente.instagram,
    morada:           cliente.address,
    cidade:           cliente.city,
    email:            cliente.email,
    telefone:         cliente.phone,
    nome_artigo:      product.nome_artigo,
    ref_artigo:       product.ref,
    pvp:              product.pvp_cica,
    tamanho:          size,
    cor:              color,
    status:           status,
    data_venda:       data,
    data_envio:       status === 'Enviado' ? randomDate(10) : null,
    metodo_pagamento: pick(['MBWay', 'Transferência', 'Numerário', 'MB']),
    notas:            i % 4 === 0 ? 'Cliente habitual — embalar com cuidado 💕' : '',
    items: [
      {
        ref:        product.ref,
        designacao: product.nome_artigo,
        pvp_cica:   product.pvp_cica,
        quantidade: 1,
        size:       size,
        color:      color,
      }
    ]
  };
});

// ── 5. Upsert para loja_app_state ─────────────────────────────────────────────

async function upsertKey(key, value) {
  // Try with store_id first; fall back to null (legacy single-tenant mode)
  if (STORE_ID) {
    const { error } = await supabase
      .from('loja_app_state')
      .upsert({ store_id: STORE_ID, key, value }, { onConflict: 'store_id,key' });
    if (!error) { console.log(`  ✅ ${key}`); return; }
  }
  // Fallback: store_id = null (matches existing data for this test user)
  const { error } = await supabase
    .from('loja_app_state')
    .upsert({ store_id: null, key, value }, { onConflict: 'key' });
  if (error) throw new Error(`Erro ao gravar "${key}": ${error.message}`);
  console.log(`  ✅ ${key} (store_id=null)`);
}

console.log('\n📦 A gravar dados de demonstração...\n');

await upsertKey('manual_products_catalog', PRODUCTS);
await upsertKey('import_orders', ORDERS);
await upsertKey('import_customers', CLIENTES);
await upsertKey('categories', ['Blusas', 'Vestidos', 'Calças', 'Casacos', 'Saias', 'Tops', 'Macacões', 'Camisas']);
await upsertKey('sizes', ['XS', 'S', 'M', 'L', 'XL', '34', '36', '38', '40', '42']);
await upsertKey('colors', ['Rosa', 'Branco', 'Azul Céu', 'Bordeaux', 'Verde Oliva', 'Preto', 'Bege', 'Camel', 'Cinzento', 'Coral', 'Champanhe', 'Terracota', 'Cru', 'Lilás']);
await upsertKey('app_settings', {
  storeName: 'Loja Diana',
  instagram: '@lojadiana',
  whatsapp: '351912345678',
  storeAddress: 'Rua das Flores 45, 4000-001 Porto',
  onboarding_complete: true,
  receipt_header: 'Obrigada pela tua compra! 💕',
  receipt_footer: 'Trocas e devoluções em 14 dias com talão.',
  receipt_exchange_policy: 'Os artigos podem ser trocados no prazo de 14 dias, acompanhados pelo respetivo talão.',
});

console.log('\n🎉 Dados de demonstração inseridos com sucesso!');
console.log('   Recarrega a app em http://localhost:5173/#/app para ver os dados.\n');
