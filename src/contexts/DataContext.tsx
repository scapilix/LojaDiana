import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface Variation {
  id: string;
  name: string;
  options: string[];
}

export interface ProductCatalogItem {
  ref: string;
  nome_artigo: string;
  pvp_cica: number;
  base_price?: number;
  iva: number;
  lucro_meu_faturado: number;
  fornecedor: string;
  image_url?: string;
  description?: string;
  categoria?: string;
  promo_price?: number;
  promo_start?: string;
  promo_end?: string;
  sizes?: string[];
  colors?: string[];
  color_images?: { [color: string]: string };
  published?: boolean;
  featured?: boolean;
  additional_images?: string[];
}

interface ExcelData {
  orders: any[];
  customers: any[];
  purchases?: any[];
  products_catalog?: ProductCatalogItem[];
  stats?: any[];
  categories?: string[];
  sizes?: string[];
  colors?: string[];
  appSettings?: {
    storeName?: string;
    whatsapp?: string;
    instagram?: string;
    iban?: string;
    mbway?: string;
    theme?: 'light' | 'dark' | 'glass';
    themeId?: 'clean' | 'colorido' | 'dark';
    heroImages?: string[];
    cancellationReasons?: string[];
    storeAddress?: string;
    storeNIF?: string;
    receipt_show_logo?: boolean;
    receipt_show_customer?: boolean;
    receipt_header?: string;
    receipt_footer?: string;
    receipt_logo_url?: string;
    receipt_exchange_policy?: string;
    printer_paper_width?: '80mm' | '58mm';
    printer_double_print?: boolean;
    printer_bluetooth?: boolean;
    onboarding_complete?: boolean;
  };
  manual_products_catalog?: ProductCatalogItem[];
  variations?: Variation[];
  order_statuses?: { name: string; color: string }[];
  transfer_banks?: { name: string; color: string }[];
  order_exchanges?: any[];
  vouchers?: any[];
  live_sessions?: any[];
  onlineOrders?: any[];
  timestamp?: string;
}

interface Purchase {
  id: number;
  ref: string;
  data_compra: string;
  quantidade: number;
  preco_custo?: number;
  fornecedor?: string;
  notas?: string;
  created_at?: string;
  size?: string;
  color?: string;
}

interface DataContextType {
  data: ExcelData;
  setData: React.Dispatch<React.SetStateAction<ExcelData>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  addPurchase: (purchase: Omit<Purchase, 'id' | 'created_at'>) => Promise<void>;
  addProduct: (product: ProductCatalogItem) => Promise<void>;
  deleteProduct: (ref: string) => Promise<void>;
  addCustomer: (customer: any) => Promise<void>;
  updateCustomer: (customerName: string, updates: any) => Promise<void>;
  addSale: (sale: any) => Promise<void>;
  updateProduct: (ref: string, updates: Partial<ProductCatalogItem>) => Promise<void>;
  updateSaleStatus: (idVenda: string, status: string, metadata?: { reason?: string, collaborator?: string }) => Promise<void>;
  updateCategories: (categories: string[]) => Promise<void>;
  updateSizes: (sizes: string[]) => Promise<void>;
  updateColors: (colors: string[]) => Promise<void>;
  updateAppSettings: (settings: any) => Promise<void>;
  updateAllProductsVisibility: (published: boolean) => Promise<void>;
  refreshPurchases: () => Promise<void>;
  deletePurchase: (id: number) => Promise<void>;
  updatePurchase: (id: number, updates: Partial<Purchase>) => Promise<void>;
  clearAllItems: () => Promise<void>;
  clearAllOrders: () => Promise<void>;
  bulkUpdateProducts: (refs: string[], updates: Partial<ProductCatalogItem>) => Promise<void>;
  updateVariations: (variations: Variation[]) => Promise<void>;
  updateOrderStatuses: (statuses: { name: string; color: string }[]) => Promise<void>;
  updateTransferBanks: (banks: { name: string; color: string }[]) => Promise<void>;
  updateSaleVerification: (idVenda: string, updates: { bank_color?: string, is_caiu?: boolean, is_retificado?: boolean }) => Promise<void>;
  addExchange: (exchange: any, voucher?: any) => Promise<void>;
  redeemVoucher: (voucherNumber: string, orderId: string) => Promise<any>;
  startLiveSession: (name: string) => Promise<any>;
  endLiveSession: (id: number) => Promise<void>;
  fetchLiveSessions: () => Promise<void>;
  updateOnlineOrderStatus: (id: string, status: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const DEFAULT_ORDER_STATUSES = [
  { name: 'Pendente', color: 'slate' },
  { name: 'Pago', color: 'blue' },
  { name: 'Enviado', color: 'purple' },
  { name: 'Entregue', color: 'emerald' },
  { name: 'Cancelado', color: 'rose' }
];

export function DataProvider({ children, initialData }: { children: ReactNode; initialData: ExcelData }) {
  const { user } = useAuth();
  const storeId = user?.storeId ?? null;

  const [data, setData] = useState<ExcelData>({
    ...initialData,
    appSettings: {
      ...initialData.appSettings,
      receipt_logo_url: initialData.appSettings?.receipt_logo_url || '',
      receipt_exchange_policy: initialData.appSettings?.receipt_exchange_policy || 'Os artigos podem ser trocados no prazo de 14 dias, acompanhados pelo respetivo talão.'
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  // Re-fetch when user/store changes
  useEffect(() => {
    if (!user?.id) return;
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchPurchases(), fetchImportedState(), fetchLiveSessions(), fetchOnlineOrders()]);
      setIsLoading(false);
    };
    init();
  }, [user?.id]);

  // ── app_state helpers ──────────────────────────────────────────────────────

  const upsertState = async (key: string, value: any) => {
    const row: any = { key, value };
    if (storeId) row.store_id = storeId;

    const query = supabase.from('loja_app_state').upsert(row, { onConflict: storeId ? 'store_id,key' : 'key' });
    const { error } = await query;
    if (error) throw error;
  };

  const fetchImportedState = async () => {
    try {
      let query = supabase
        .from('loja_app_state')
        .select('key, value')
        .in('key', ['import_orders', 'import_customers', 'import_stats', 'manual_products_catalog',
          'categories', 'sizes', 'colors', 'app_settings', 'variations',
          'order_statuses', 'transfer_banks', 'order_exchanges', 'vouchers']);

      if (storeId) query = query.eq('store_id', storeId);

      const { data: stateData, error } = await query;
      if (!stateData || error) return;

      const updates: Partial<ExcelData> = {};
      stateData.forEach(item => {
        if (item.key === 'import_orders')            updates.orders = item.value;
        if (item.key === 'import_customers')         updates.customers = item.value;
        if (item.key === 'import_stats')             updates.stats = item.value;
        if (item.key === 'manual_products_catalog')  updates.manual_products_catalog = item.value;
        if (item.key === 'categories')               updates.categories = item.value;
        if (item.key === 'sizes')                    updates.sizes = item.value;
        if (item.key === 'colors')                   updates.colors = item.value;
        if (item.key === 'app_settings')             updates.appSettings = item.value;
        if (item.key === 'variations')               updates.variations = item.value;
        if (item.key === 'order_statuses')           updates.order_statuses = item.value;
        if (item.key === 'transfer_banks')           updates.transfer_banks = item.value;
        if (item.key === 'order_exchanges')          updates.order_exchanges = item.value;
        if (item.key === 'vouchers')                 updates.vouchers = item.value;
      });

      // Migrate sizes/colors → variations if needed
      if (!updates.variations && (updates.sizes || updates.colors)) {
        const migrated: Variation[] = [];
        if (updates.sizes?.length)  migrated.push({ id: 'sizes',  name: 'Tamanhos', options: updates.sizes });
        if (updates.colors?.length) migrated.push({ id: 'colors', name: 'Cores',    options: updates.colors });
        if (migrated.length) {
          updates.variations = migrated;
          upsertState('variations', migrated).catch(console.error);
        }
      }

      if (Object.keys(updates).length > 0) {
        setData(prev => {
          const next = { ...prev, ...updates };
          if (!next.order_statuses) next.order_statuses = DEFAULT_ORDER_STATUSES;
          else if (!next.order_statuses.find(s => s.name === 'Cancelado'))
            next.order_statuses.push({ name: 'Cancelado', color: 'rose' });
          return next;
        });
      }
    } catch (err) {
      console.error('Error fetching imported state:', err);
    }
  };

  // ── purchases ──────────────────────────────────────────────────────────────

  const fetchPurchases = async () => {
    try {
      let query = supabase.from('loja_compras').select('*').order('data_compra', { ascending: false });
      if (storeId) query = query.eq('store_id', storeId);
      const { data: purchases, error } = await query;
      if (error) throw error;
      if (purchases) setData(prev => ({ ...prev, purchases }));
    } catch (err) {
      console.error('Error fetching purchases:', err);
    }
  };

  const addPurchase = async (purchase: Omit<Purchase, 'id' | 'created_at'>) => {
    const row: any = { ...purchase };
    if (storeId) row.store_id = storeId;
    const { error } = await supabase.from('loja_compras').insert([row]);
    if (error) throw error;
    await fetchPurchases();
  };

  const deletePurchase = async (id: number) => {
    const { error } = await supabase.from('loja_compras').delete().eq('id', id);
    if (error) throw error;
    await fetchPurchases();
  };

  const updatePurchase = async (id: number, updates: Partial<Purchase>) => {
    const { error } = await supabase.from('loja_compras').update(updates).eq('id', id);
    if (error) throw error;
    await fetchPurchases();
  };

  // ── products ───────────────────────────────────────────────────────────────

  const addProduct = async (product: ProductCatalogItem) => {
    const currentManual = data.manual_products_catalog || [];
    if (currentManual.find(p => p.ref === product.ref)) throw new Error('Produto com esta referência já existe');
    const newManual = [product, ...currentManual];
    await upsertState('manual_products_catalog', newManual);
    setData(prev => ({ ...prev, manual_products_catalog: newManual }));
  };

  const deleteProduct = async (ref: string) => {
    const newManual = (data.manual_products_catalog || []).filter(p => p.ref !== ref);
    await upsertState('manual_products_catalog', newManual);
    setData(prev => ({ ...prev, manual_products_catalog: newManual }));
  };

  const updateProduct = async (ref: string, updates: Partial<ProductCatalogItem>) => {
    const currentManual = [...(data.manual_products_catalog || [])];
    const idx = currentManual.findIndex(p => p.ref === ref);
    let newManual;
    if (idx > -1) {
      currentManual[idx] = { ...currentManual[idx], ...updates };
      newManual = currentManual;
    } else {
      const excelProduct = (data.products_catalog || []).find(p => p.ref === ref);
      if (!excelProduct) throw new Error('Produto não encontrado');
      newManual = [{ ...excelProduct, ...updates }, ...currentManual];
    }
    await upsertState('manual_products_catalog', newManual);
    setData(prev => ({ ...prev, manual_products_catalog: newManual }));
  };

  const bulkUpdateProducts = async (refs: string[], updates: Partial<ProductCatalogItem>) => {
    const currentManual = [...(data.manual_products_catalog || [])];
    const refsLeft = new Set(refs);
    currentManual.forEach((p, i) => {
      if (refsLeft.has(p.ref)) { currentManual[i] = { ...p, ...updates }; refsLeft.delete(p.ref); }
    });
    (data.products_catalog || []).forEach(ep => {
      if (refsLeft.has(ep.ref)) currentManual.unshift({ ...ep, ...updates });
    });
    await upsertState('manual_products_catalog', currentManual);
    setData(prev => ({ ...prev, manual_products_catalog: currentManual }));
  };

  const updateAllProductsVisibility = async (published: boolean) => {
    const excelCatalog = data.products_catalog || [];
    const currentManual = data.manual_products_catalog || [];
    const manualMap = new Map(currentManual.map(p => [p.ref, p]));
    const updatedManual = currentManual.map(p => ({ ...p, published }));
    const newOverrides = excelCatalog.filter(p => !manualMap.has(p.ref)).map(p => ({ ...p, published }));
    const newManual = [...updatedManual, ...newOverrides];
    await upsertState('manual_products_catalog', newManual);
    setData(prev => ({ ...prev, manual_products_catalog: newManual }));
  };

  // ── customers ──────────────────────────────────────────────────────────────

  const addCustomer = async (customer: any) => {
    const newCustomers = [customer, ...(data.customers || [])];
    await upsertState('import_customers', newCustomers);
    setData(prev => ({ ...prev, customers: newCustomers }));
  };

  const updateCustomer = async (customerName: string, updates: any) => {
    const newCustomers = (data.customers || []).map(c =>
      c.nome_cliente === customerName ? { ...c, ...updates } : c
    );
    await upsertState('import_customers', newCustomers);
    setData(prev => ({ ...prev, customers: newCustomers }));
  };

  // ── sales / orders ─────────────────────────────────────────────────────────

  const addSale = async (sale: any) => {
    const saleWithHistory = {
      ...sale,
      status: sale.status || 'Pendente',
      status_history: [{ status: sale.status || 'Pendente', timestamp: new Date().toISOString() }]
    };
    const newOrders = [saleWithHistory, ...(data.orders || [])];
    await upsertState('import_orders', newOrders);
    setData(prev => ({ ...prev, orders: newOrders }));
  };

  const updateSaleStatus = async (idVenda: string, status: string, metadata?: { reason?: string, collaborator?: string }) => {
    const currentOrders = [...(data.orders || [])];
    const idx = currentOrders.findIndex(o => o.id_venda === idVenda);
    if (idx === -1) throw new Error('Encomenda não encontrada');
    currentOrders[idx] = {
      ...currentOrders[idx],
      status,
      status_history: [...(currentOrders[idx].status_history || []), { status, timestamp: new Date().toISOString(), ...metadata }]
    };
    await upsertState('import_orders', currentOrders);
    setData(prev => ({ ...prev, orders: currentOrders }));
  };

  const updateSaleVerification = async (idVenda: string, updates: { bank_color?: string, is_caiu?: boolean, is_retificado?: boolean }) => {
    const currentOrders = [...(data.orders || [])];
    const idx = currentOrders.findIndex(o => o.id_venda === idVenda);
    if (idx === -1) throw new Error('Encomenda não encontrada');
    currentOrders[idx] = { ...currentOrders[idx], ...updates };
    await upsertState('import_orders', currentOrders);
    setData(prev => ({ ...prev, orders: currentOrders }));
  };

  const clearAllOrders = async () => {
    await upsertState('import_orders', []);
    await upsertState('import_stats', []);
    setData(prev => ({ ...prev, orders: [], stats: [] }));
  };

  const clearAllItems = async () => {
    setData(prev => ({ ...prev, manual_products_catalog: [], products_catalog: [] }));
    await upsertState('manual_products_catalog', []);
  };

  // ── settings ───────────────────────────────────────────────────────────────

  const updateCategories      = async (categories: string[])                          => { await upsertState('categories', categories);         setData(prev => ({ ...prev, categories })); };
  const updateSizes           = async (sizes: string[])                               => { await upsertState('sizes', sizes);                   setData(prev => ({ ...prev, sizes })); };
  const updateColors          = async (colors: string[])                              => { await upsertState('colors', colors);                 setData(prev => ({ ...prev, colors })); };
  const updateVariations      = async (variations: Variation[])                       => { await upsertState('variations', variations);         setData(prev => ({ ...prev, variations })); };
  const updateOrderStatuses   = async (statuses: { name: string; color: string }[])  => { await upsertState('order_statuses', statuses);       setData(prev => ({ ...prev, order_statuses: statuses })); };
  const updateTransferBanks   = async (banks: { name: string; color: string }[])     => { await upsertState('transfer_banks', banks);          setData(prev => ({ ...prev, transfer_banks: banks })); };
  const updateAppSettings     = async (settings: any)                                 => { await upsertState('app_settings', settings);         setData(prev => ({ ...prev, appSettings: settings })); };

  // ── exchanges & vouchers ───────────────────────────────────────────────────

  const addExchange = async (exchange: any, voucher?: any) => {
    const newExchanges = [exchange, ...(data.order_exchanges || [])];
    const currentCustomers = [...(data.customers || [])];
    const currentOrders = [...(data.orders || [])];

    if (voucher?.value > 0) {
      const idx = currentCustomers.findIndex(c =>
        c.nome_cliente?.trim().toUpperCase() === voucher.customer_name?.trim().toUpperCase()
      );
      if (idx > -1) currentCustomers[idx] = { ...currentCustomers[idx], saldo: (parseFloat(currentCustomers[idx].saldo) || 0) + voucher.value };
    }

    const orderIdx = currentOrders.findIndex(o => o.id_venda === exchange.order_id);
    if (orderIdx > -1) {
      const order = currentOrders[orderIdx];
      let totalPVP = 0, totalLucro = 0, totalCusto = 0;
      const updatedItems = order.items.map((item: any) => {
        const ei = exchange.items.find((e: any) => e.ref === item.ref);
        if (ei) {
          totalPVP += Number(item.pvp) || 0;
          totalLucro += Number(item.lucro) || 0;
          totalCusto += Number(item.custo) || 0;
          return { ...item, is_exchanged: true, return_to_stock: exchange.return_to_stock, exchange_id: exchange.id };
        }
        return item;
      });
      currentOrders[orderIdx] = { ...order, items: updatedItems, pvp: (Number(order.pvp) || 0) - totalPVP, lucro: (Number(order.lucro) || 0) - totalLucro, custo: (Number(order.custo) || 0) - totalCusto };
    }

    const updates: any[] = [
      { key: 'order_exchanges', value: newExchanges, ...(storeId ? { store_id: storeId } : {}) },
      { key: 'import_orders', value: currentOrders, ...(storeId ? { store_id: storeId } : {}) },
      { key: 'import_customers', value: currentCustomers, ...(storeId ? { store_id: storeId } : {}) },
    ];
    if (voucher) updates.push({ key: 'vouchers', value: [voucher, ...(data.vouchers || [])], ...(storeId ? { store_id: storeId } : {}) });

    const { error } = await supabase.from('loja_app_state').upsert(updates);
    if (error) throw error;

    setData(prev => ({
      ...prev,
      order_exchanges: newExchanges,
      vouchers: voucher ? [voucher, ...(prev.vouchers || [])] : prev.vouchers,
      orders: currentOrders,
      customers: currentCustomers
    }));
  };

  const redeemVoucher = async (voucherNumber: string, orderId: string) => {
    const currentVouchers = [...(data.vouchers || [])];
    const idx = currentVouchers.findIndex(v => v.number === voucherNumber);
    if (idx === -1) throw new Error('Vale não encontrado');
    const voucher = currentVouchers[idx];
    if (voucher.status !== 'active') throw new Error(`Vale já está ${voucher.status}`);
    if (new Date(voucher.valid_until) < new Date()) throw new Error('Vale expirado');
    const updated = { ...voucher, status: 'used', used_at: new Date().toISOString(), used_in_order: orderId };
    currentVouchers[idx] = updated;
    await upsertState('vouchers', currentVouchers);
    setData(prev => ({ ...prev, vouchers: currentVouchers }));
    return updated;
  };

  // ── online orders ──────────────────────────────────────────────────────────

  const fetchOnlineOrders = async () => {
    try {
      const { data: orders, error } = await supabase
        .from('online_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (orders && !error) {
        setData(prev => ({ ...prev, onlineOrders: orders }));
      }
    } catch {
      // silently fail — table may not exist yet
    }
  };

  const updateOnlineOrderStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('online_orders')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
    setData(prev => ({
      ...prev,
      onlineOrders: (prev.onlineOrders || []).map(o => o.id === id ? { ...o, status } : o),
    }));
  };

  // ── live sessions ──────────────────────────────────────────────────────────

  const fetchLiveSessions = async () => {
    try {
      let query = supabase.from('live_sessions').select('*').order('start_time', { ascending: false });
      if (storeId) query = query.eq('store_id', storeId);
      const { data: sessions, error } = await query;
      if (error) throw error;
      setData(prev => ({ ...prev, live_sessions: sessions }));
    } catch (err) {
      console.error('Error fetching live sessions:', err);
    }
  };

  const startLiveSession = async (name: string) => {
    const row: any = { name, status: 'active', start_time: new Date().toISOString() };
    if (storeId) row.store_id = storeId;
    const { data: session, error } = await supabase.from('live_sessions').insert([row]).select().single();
    if (error) throw error;
    await fetchLiveSessions();
    return session;
  };

  const endLiveSession = async (id: number) => {
    const { error } = await supabase.from('live_sessions').update({ status: 'finished', end_time: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    await fetchLiveSessions();
  };

  return (
    <DataContext.Provider value={{
      data, setData, isLoading, setIsLoading,
      addPurchase, addProduct, deleteProduct,
      addCustomer, updateCustomer, addSale, updateProduct,
      updateSaleStatus, updateCategories, updateSizes, updateColors, updateAppSettings,
      updateAllProductsVisibility, refreshPurchases: fetchPurchases,
      deletePurchase, updatePurchase, clearAllItems, clearAllOrders,
      bulkUpdateProducts, updateVariations, updateOrderStatuses, updateTransferBanks,
      updateSaleVerification, addExchange, redeemVoucher,
      startLiveSession, endLiveSession, fetchLiveSessions,
      updateOnlineOrderStatus,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
}
