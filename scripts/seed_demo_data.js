/**
 * seed_demo_data.js
 * Popula a conta de teste com dados de demonstração realistas.
 * Uso: node scripts/seed_demo_data.js
 */

const SUPABASE_URL = 'https://ebdcmiuzrrtmmphwxynw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViZGNtaXV6cnJ0bW1waHd4eW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNzAyMjksImV4cCI6MjA4NDg0NjIyOX0.QNInacY_9ZhDUhNmiYTXVccYNxc0kk71EsdME9AKJW0';
const EMAIL = 'teste@teste.pt';
const PASSWORD = 'teste0912';

// ── helpers ────────────────────────────────────────────────────────────────────

async function login() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Login failed: ' + JSON.stringify(data));
  console.log('✓ Logged in as', EMAIL);
  return data.access_token;
}

async function upsert(token, key, value) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/loja_app_state`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ key, value }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`upsert(${key}) failed: ${err}`);
  }
  console.log(`  ✓ ${key}`);
}

// ── data ───────────────────────────────────────────────────────────────────────

const products = [
  { ref: 'BLS-001', nome_artigo: 'Blusa Floral Rosa', pvp_cica: 34.99, base_price: 14, iva: 23, lucro_meu_faturado: 20.99, fornecedor: 'Moda Lisboa', categoria: 'Blusas', published: true, featured: true },
  { ref: 'BLS-002', nome_artigo: 'Blusa Linho Branco', pvp_cica: 29.99, base_price: 11, iva: 23, lucro_meu_faturado: 18.99, fornecedor: 'Moda Lisboa', categoria: 'Blusas', published: true },
  { ref: 'CAL-001', nome_artigo: 'Calças Wide Leg Camel', pvp_cica: 49.99, base_price: 18, iva: 23, lucro_meu_faturado: 31.99, fornecedor: 'Porto Style', categoria: 'Calças', published: true, featured: true },
  { ref: 'CAL-002', nome_artigo: 'Calças Ganga Cintura Alta', pvp_cica: 44.99, base_price: 16, iva: 23, lucro_meu_faturado: 28.99, fornecedor: 'Porto Style', categoria: 'Calças', published: true },
  { ref: 'VES-001', nome_artigo: 'Vestido Midi Floral', pvp_cica: 59.99, base_price: 22, iva: 23, lucro_meu_faturado: 37.99, fornecedor: 'Braga Couture', categoria: 'Vestidos', published: true, featured: true },
  { ref: 'VES-002', nome_artigo: 'Vestido Malha Preto', pvp_cica: 39.99, base_price: 14, iva: 23, lucro_meu_faturado: 25.99, fornecedor: 'Braga Couture', categoria: 'Vestidos', published: true },
  { ref: 'CAR-001', nome_artigo: 'Cardigan Oversized Bege', pvp_cica: 42.99, base_price: 16, iva: 23, lucro_meu_faturado: 26.99, fornecedor: 'Moda Lisboa', categoria: 'Casacos', published: true },
  { ref: 'SAI-001', nome_artigo: 'Saia Midi Plissada Verde', pvp_cica: 37.99, base_price: 13, iva: 23, lucro_meu_faturado: 24.99, fornecedor: 'Porto Style', categoria: 'Saias', published: true },
  { ref: 'TUC-001', nome_artigo: 'T-shirt Básica Branca', pvp_cica: 19.99, base_price: 6, iva: 23, lucro_meu_faturado: 13.99, fornecedor: 'Moda Lisboa', categoria: 'T-shirts', published: true },
  { ref: 'TUC-002', nome_artigo: 'T-shirt Crop Rosa', pvp_cica: 22.99, base_price: 7, iva: 23, lucro_meu_faturado: 15.99, fornecedor: 'Braga Couture', categoria: 'T-shirts', published: true },
];

const statuses = ['Pendente', 'Pago', 'Enviado', 'Pago', 'Pago', 'Cancelado', 'Enviado', 'Pago'];
const nomes = ['Ana Ferreira', 'Maria Santos', 'Sofia Almeida', 'Inês Costa', 'Catarina Lopes', 'Beatriz Oliveira', 'Rita Pereira', 'Joana Martins', 'Filipa Rodrigues', 'Cláudia Carvalho', 'Marta Sousa', 'Daniela Cunha', 'Sara Fonseca', 'Andreia Pinto', 'Liliana Monteiro', 'Paula Gomes', 'Susana Ferreira', 'Helena Dias', 'Vera Neves', 'Cristina Azevedo'];
const localidades = ['Lisboa', 'Porto', 'Braga', 'Coimbra', 'Aveiro', 'Faro', 'Setúbal', 'Leiria', 'Viseu', 'Évora', 'Viana do Castelo', 'Beja', 'Guarda', 'Castelo Branco', 'Santarém'];
const metodos = ['MBWay', 'Transferência', 'Cartão', 'MBWay', 'Transferência', 'MBWay', 'Cartão'];

function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rndInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// Generate 60 orders spread across last 90 days
const orders = Array.from({ length: 60 }, (_, i) => {
  const prod = products[rndInt(0, products.length - 1)];
  const qtd = rndInt(1, 3);
  const nome = rnd(nomes);
  const portes = rndInt(0, 1) === 0 ? 0 : 4.5;
  return {
    id_venda: `V${String(1000 + i).padStart(4, '0')}`,
    nome_cliente: nome,
    localidade: rnd(localidades),
    data_venda: dateOffset(rndInt(0, 89)),
    ref: prod.ref,
    nome_artigo: prod.nome_artigo,
    quantidade: qtd,
    pvp: parseFloat((prod.pvp_cica * qtd + portes).toFixed(2)),
    portes,
    metodo_pagamento: rnd(metodos),
    status: rnd(statuses),
    email: `${nome.split(' ')[0].toLowerCase()}@email.pt`,
    telefone: `9${rndInt(10000000, 99999999)}`,
  };
});

// Generate customers from orders (unique names)
const seenNames = new Set();
const customers = [];
orders.forEach(o => {
  if (!seenNames.has(o.nome_cliente)) {
    seenNames.add(o.nome_cliente);
    const orderCount = orders.filter(x => x.nome_cliente === o.nome_cliente).length;
    customers.push({
      nome_cliente: o.nome_cliente,
      localidade: o.localidade,
      email: o.email,
      telefone: o.telefone,
      numero_compras: orderCount,
      total_gasto: parseFloat(orders.filter(x => x.nome_cliente === o.nome_cliente && x.status !== 'Cancelado').reduce((s, x) => s + x.pvp, 0).toFixed(2)),
    });
  }
});

const categories = ['Blusas', 'Calças', 'Vestidos', 'Casacos', 'Saias', 'T-shirts', 'Acessórios'];

const variations = [
  { id: 'sizes', name: 'Tamanhos', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
  { id: 'colors', name: 'Cores', options: ['Preto', 'Branco', 'Rosa', 'Bege', 'Verde', 'Azul', 'Vermelho', 'Castanho', 'Cinza', 'Lilás'] },
];

const order_statuses = [
  { name: 'Pendente',  color: 'amber' },
  { name: 'Pago',      color: 'emerald' },
  { name: 'Enviado',   color: 'blue' },
  { name: 'Cancelado', color: 'rose' },
];

const appSettings = {
  storeName: 'Loja Diana',
  whatsapp: '351912345678',
  instagram: 'lojadiana.pt',
  iban: 'PT50 0010 0000 1234 5678 9015 4',
  mbway: '912345678',
  storeAddress: 'Rua da Moda, 15 — Lisboa',
  loja_slug: 'lojadiana',
  onboarding_complete: true,
};

// ── main ───────────────────────────────────────────────────────────────────────

(async () => {
  try {
    const token = await login();

    console.log('\nA inserir dados de demonstração...');
    await upsert(token, 'app_settings',           appSettings);
    await upsert(token, 'import_orders',           orders);
    await upsert(token, 'import_customers',        customers);
    await upsert(token, 'manual_products_catalog', products);
    await upsert(token, 'categories',              categories);
    await upsert(token, 'variations',              variations);
    await upsert(token, 'order_statuses',          order_statuses);

    console.log(`\n✅ Seed completo!`);
    console.log(`   ${orders.length} encomendas`);
    console.log(`   ${customers.length} clientes`);
    console.log(`   ${products.length} produtos`);
    console.log('\nRefresca o browser para ver os dados.');
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
})();
