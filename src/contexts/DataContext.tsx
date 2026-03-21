import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
    theme?: 'light' | 'dark' | 'glass';
    themeId?: 'clean' | 'colorido' | 'dark';
    heroImages?: string[];
  };
  manual_products_catalog?: ProductCatalogItem[]; // Items added manually via UI
  variations?: Variation[];
  order_statuses?: { name: string; color: string }[];
  transfer_banks?: { name: string; color: string }[];
  timestamp?: string;
}

import { supabase } from '../lib/supabase';

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
  updateSaleStatus: (idVenda: string, status: string) => Promise<void>;
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
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children, initialData }: { children: ReactNode; initialData: ExcelData }) {
  const [data, setData] = useState<ExcelData>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  // Sync state with initialData if it changes
  useEffect(() => {
    setData((prev) => ({ ...prev, ...initialData }));
  }, [initialData]);

  // Fetch Purchases and Imported State from Supabase on Mount
  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      await Promise.all([fetchPurchases(), fetchImportedState()]);
      setIsLoading(false);
    };
    initData();
  }, []);

  const fetchImportedState = async () => {
    try {
      const { data: stateData, error } = await supabase
        .from('loja_app_state')
        .select('key, value')
        .in('key', ['import_orders', 'import_customers', 'import_stats', 'manual_products_catalog', 'categories', 'sizes', 'colors', 'app_settings', 'variations', 'order_statuses', 'transfer_banks']);

      if (stateData && !error) {
        const updates: Partial<ExcelData> = {};
        stateData.forEach(item => {
          if (item.key === 'import_orders') updates.orders = item.value;
          if (item.key === 'import_customers') updates.customers = item.value;
          if (item.key === 'import_stats') updates.stats = item.value;
          if (item.key === 'manual_products_catalog') updates.manual_products_catalog = item.value;
          if (item.key === 'categories') updates.categories = item.value;
          if (item.key === 'sizes') updates.sizes = item.value;
          if (item.key === 'colors') updates.colors = item.value;
          if (item.key === 'app_settings') updates.appSettings = item.value;
          if (item.key === 'variations') updates.variations = item.value;
          if (item.key === 'order_statuses') updates.order_statuses = item.value;
          if (item.key === 'transfer_banks') updates.transfer_banks = item.value;
        });

        // Migration logic: If variations don't exist but sizes/colors do
        if (!updates.variations && (updates.sizes || updates.colors)) {
          console.log('Migrating sizes/colors to variations...');
          const migratedVariations: Variation[] = [];
          if (updates.sizes && updates.sizes.length > 0) {
            migratedVariations.push({ id: 'sizes', name: 'Tamanhos', options: updates.sizes });
          }
          if (updates.colors && updates.colors.length > 0) {
            migratedVariations.push({ id: 'colors', name: 'Cores', options: updates.colors });
          }
          if (migratedVariations.length > 0) {
            updates.variations = migratedVariations;
            // Optionally persist back to Supabase here or let the first update save it
            supabase.from('loja_app_state').upsert({ key: 'variations', value: migratedVariations }).then(({ error }) => {
                if (error) console.error('Migration persistence error:', error);
            });
          }
        }

        if (Object.keys(updates).length > 0) {
          setData(prev => {
            const newData = { ...prev, ...updates };
            // Default statuses if not set
            if (!newData.order_statuses) {
              newData.order_statuses = [
                { name: 'Pendente', color: 'slate' },
                { name: 'Pago', color: 'blue' },
                { name: 'Enviado', color: 'purple' },
                { name: 'Entregue', color: 'emerald' }
              ];
            }
            return newData;
          });
        }
      }
    } catch (err) {
      console.error('Error fetching imported state:', err);
    }
  };

  const fetchPurchases = async () => {
    try {
      const { data: purchases, error } = await supabase
        .from('loja_compras')
        .select('*')
        .order('data_compra', { ascending: false });

      if (error) throw error;

      if (purchases) {
        setData(prev => ({ ...prev, purchases }));
      }
    } catch (err) {
      console.error('Error fetching purchases:', err);
    }
  };

  const addProduct = async (product: ProductCatalogItem) => {
    try {
      const currentManual = data.manual_products_catalog || [];
      // Check if exists
      if (currentManual.find(p => p.ref === product.ref)) {
        throw new Error('Produto com esta referência já existe');
      }

      const newManual = [product, ...currentManual];

      // Persist to Supabase State
      const { error } = await supabase
        .from('loja_app_state')
        .upsert({ key: 'manual_products_catalog', value: newManual });

      if (error) throw error;

      // Update local state
      setData(prev => ({ ...prev, manual_products_catalog: newManual }));
    } catch (err) {
      console.error('Error adding product:', err);
      throw err;
    }
  };

  const deleteProduct = async (ref: string) => {
    try {
      const currentManual = (data.manual_products_catalog || []).filter(p => p.ref !== ref);

      // Persist to Supabase State
      const { error } = await supabase
        .from('loja_app_state')
        .upsert({ key: 'manual_products_catalog', value: currentManual });

      if (error) throw error;

      // Update local state
      setData(prev => ({ ...prev, manual_products_catalog: currentManual }));
    } catch (err) {
      console.error('Error deleting product:', err);
      throw err;
    }
  };

  const addPurchase = async (purchase: Omit<Purchase, 'id' | 'created_at'>) => {
    try {
      const { error } = await supabase.from('loja_compras').insert([purchase]);
      if (error) throw error;
      await fetchPurchases(); // Refresh local state
    } catch (err) {
      console.error('Error adding purchase:', err);
      throw err;
    }
  };

  const deletePurchase = async (id: number) => {
    try {
      const { error } = await supabase.from('loja_compras').delete().eq('id', id);
      if (error) throw error;
      await fetchPurchases();
    } catch (err) {
      console.error('Error deleting purchase:', err);
      throw err;
    }
  };

  const updatePurchase = async (id: number, updates: Partial<Purchase>) => {
    try {
      const { error } = await supabase.from('loja_compras').update(updates).eq('id', id);
      if (error) throw error;
      await fetchPurchases();
    } catch (err) {
      console.error('Error updating purchase:', err);
      throw err;
    }
  };

  const addCustomer = async (customer: any) => {
    try {
      const currentCustomers = data.customers || [];
      const newCustomers = [customer, ...currentCustomers];

      const { error } = await supabase
        .from('loja_app_state')
        .upsert({ key: 'import_customers', value: newCustomers });

      if (error) throw error;
      setData(prev => ({ ...prev, customers: newCustomers }));
    } catch (err) {
      console.error('Error adding customer:', err);
      throw err;
    }
  };

  const updateCustomer = async (customerName: string, updates: any) => {
    try {
      const currentCustomers = data.customers || [];
      const newCustomers = currentCustomers.map(c => 
        c.nome_cliente === customerName ? { ...c, ...updates } : c
      );

      const { error } = await supabase
        .from('loja_app_state')
        .upsert({ key: 'import_customers', value: newCustomers });

      if (error) throw error;
      setData(prev => ({ ...prev, customers: newCustomers }));
    } catch (err) {
      console.error('Error updating customer:', err);
      throw err;
    }
  };

  const addSale = async (sale: any) => {
    try {
      const currentOrders = data.orders || [];
      const saleWithHistory = {
        ...sale,
        status: sale.status || 'Pendente',
        status_history: [
          { status: sale.status || 'Pendente', timestamp: new Date().toISOString() }
        ]
      };
      const newOrders = [saleWithHistory, ...currentOrders];

      // Persist to Supabase State
      const { error } = await supabase
        .from('loja_app_state')
        .upsert({ key: 'import_orders', value: newOrders });

      if (error) throw error;

      // Update local state
      setData(prev => ({ ...prev, orders: newOrders }));
    } catch (err) {
      console.error('Error adding sale:', err);
      throw err;
    }
  };

  const updateProduct = async (ref: string, updates: Partial<ProductCatalogItem>) => {
    try {
      const currentManual = [...(data.manual_products_catalog || [])];
      const existingManualIdx = currentManual.findIndex(p => p.ref === ref);

      let newManual;
      if (existingManualIdx > -1) {
        // Update existing manual product
        const updatedProduct = { ...currentManual[existingManualIdx], ...updates };
        currentManual[existingManualIdx] = updatedProduct;
        newManual = currentManual;
      } else {
        // Check in Excel catalog
        const excelProduct = (data.products_catalog || []).find(p => p.ref === ref);
        if (excelProduct) {
          // If editing an Excel product for the first time, add it to manual catalog as an override
          const newProduct = { ...excelProduct, ...updates };
          newManual = [newProduct, ...currentManual];
        } else {
          throw new Error('Produto não encontrado');
        }
      }

      const { error } = await supabase
        .from('loja_app_state')
        .upsert({ key: 'manual_products_catalog', value: newManual });

      if (error) throw error;
      setData(prev => ({ ...prev, manual_products_catalog: newManual }));
    } catch (err) {
      console.error('Error updating product:', err);
      throw err;
    }
  };

  const bulkUpdateProducts = async (refs: string[], updates: Partial<ProductCatalogItem>) => {
    try {
      const currentManual = [...(data.manual_products_catalog || [])];
      const excelProducts = data.products_catalog || [];
      const updatedManualItems = [...currentManual];
      const refsNotInManual = new Set(refs);

      // 1. Update items already in manual catalog
      updatedManualItems.forEach((p, idx) => {
        if (refsNotInManual.has(p.ref)) {
          updatedManualItems[idx] = { ...p, ...updates };
          refsNotInManual.delete(p.ref);
        }
      });

      // 2. For refs still in the set, check excel catalog and add to manual
      if (refsNotInManual.size > 0) {
        excelProducts.forEach(ep => {
          if (refsNotInManual.has(ep.ref)) {
            updatedManualItems.unshift({ ...ep, ...updates });
          }
        });
      }

      const { error } = await supabase
        .from('loja_app_state')
        .upsert({ key: 'manual_products_catalog', value: updatedManualItems });

      if (error) throw error;
      setData(prev => ({ ...prev, manual_products_catalog: updatedManualItems }));
    } catch (err) {
      console.error('Error in bulk update:', err);
      throw err;
    }
  };

  const updateSaleStatus = async (idVenda: string, status: string) => {
    try {
      const currentOrders = [...(data.orders || [])];
      const orderIdx = currentOrders.findIndex(o => o.id_venda === idVenda);

      if (orderIdx === -1) throw new Error('Encomenda não encontrada');

      const newStatus = status;
      const historyEntry = { status: newStatus, timestamp: new Date().toISOString() };

      currentOrders[orderIdx] = {
        ...currentOrders[orderIdx],
        status: newStatus,
        status_history: [...(currentOrders[orderIdx].status_history || []), historyEntry]
      };

      const { error } = await supabase
        .from('loja_app_state')
        .upsert({ key: 'import_orders', value: currentOrders });

      if (error) throw error;
      setData(prev => ({ ...prev, orders: currentOrders }));
    } catch (err) {
      console.error('Error updating sale status:', err);
      throw err;
    }
  };

  const updateCategories = async (categories: string[]) => {
    try {
      const { error } = await supabase
        .from('loja_app_state')
        .upsert({ key: 'categories', value: categories });

      if (error) throw error;
      setData(prev => ({ ...prev, categories }));
    } catch (err) {
      console.error('Error updating categories:', err);
      throw err;
    }
  };

  const updateSizes = async (sizes: string[]) => {
    try {
      const { error } = await supabase
        .from('loja_app_state')
        .upsert({ key: 'sizes', value: sizes });

      if (error) throw error;
      setData(prev => ({ ...prev, sizes }));
    } catch (err) {
      console.error('Error updating sizes:', err);
      throw err;
    }
  };

  const updateColors = async (colors: string[]) => {
    try {
      const { error } = await supabase
        .from('loja_app_state')
        .upsert({ key: 'colors', value: colors });

      if (error) throw error;
      setData(prev => ({ ...prev, colors }));
    } catch (err) {
      console.error('Error updating colors:', err);
      throw err;
    }
  };

  const updateAppSettings = async (settings: any) => {
    try {
      const { error } = await supabase
        .from('loja_app_state')
        .upsert({ key: 'app_settings', value: settings });

      if (error) throw error;
      setData(prev => ({ ...prev, appSettings: settings }));
    } catch (err) {
      console.error('Error updating app settings:', err);
      throw err;
    }
  };

  const updateAllProductsVisibility = async (published: boolean) => {
    try {
      const excelCatalog = data.products_catalog || [];
      const currentManual = data.manual_products_catalog || [];

      // Create a map of existing manual overrides
      const manualMap = new Map();
      currentManual.forEach(p => manualMap.set(p.ref, p));

      // 1. All manual items get updated
      const updatedManualItems = currentManual.map(p => ({ ...p, published }));

      // 2. All excel items that are NOT in manual items yet need to be added as overrides
      const newOverrides = excelCatalog
        .filter(p => !manualMap.has(p.ref))
        .map(p => ({ ...p, published }));

      const newManualCatalog = [...updatedManualItems, ...newOverrides];

      const { error } = await supabase
        .from('loja_app_state')
        .upsert({ key: 'manual_products_catalog', value: newManualCatalog });

      if (error) throw error;
      setData(prev => ({ ...prev, manual_products_catalog: newManualCatalog }));
    } catch (err) {
      console.error('Error updating all products visibility:', err);
      throw err;
    }
  };

  const clearAllItems = async () => {
    try {
      // 1. Clear local state immediately (works even if DB operations fail)
      setData(prev => ({ ...prev, manual_products_catalog: [], products_catalog: [] }));

      // 2. Update loja_app_state: delete old entry, then insert fresh one
      await supabase.from('loja_app_state').delete().eq('key', 'manual_products_catalog');
      await supabase.from('loja_app_state').insert({ key: 'manual_products_catalog', value: [] });

      // 3. Best-effort clear of product tables (ignore errors)
      try { await supabase.from('diana_products').delete().gte('created_at', '1970-01-01'); } catch (_) { }
      try { await supabase.from('products').delete().gte('created_at', '1970-01-01'); } catch (_) { }
    } catch (err) {
      console.error('Error clearing all items:', err);
      throw err;
    }
  };

  const clearAllOrders = async () => {
    try {
      // 1. Clear database tables
      await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('diana_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // 2. Clear state in loja_app_state
      await supabase
        .from('loja_app_state')
        .upsert([
          { key: 'import_orders', value: [] },
          { key: 'import_stats', value: [] }
        ]);

      // 3. Update local state
      setData(prev => ({ ...prev, orders: [], stats: [] }));
    } catch (err) {
      console.error('Error clearing all orders:', err);
      throw err;
    }
  };

  const updateVariations = async (variations: Variation[]) => {
    try {
      const { error } = await supabase
        .from('loja_app_state')
        .upsert({ key: 'variations', value: variations });

      if (error) throw error;
      setData(prev => ({ ...prev, variations }));
    } catch (err) {
      console.error('Error updating variations:', err);
      throw err;
    }
  };

  const updateOrderStatuses = async (statuses: { name: string; color: string }[]) => {
    try {
      const { error } = await supabase
        .from('loja_app_state')
        .upsert({ key: 'order_statuses', value: statuses });

      if (error) throw error;
      setData(prev => ({ ...prev, order_statuses: statuses }));
    } catch (err) {
      console.error('Error updating order statuses:', err);
      throw err;
    }
  };

  const updateTransferBanks = async (banks: { name: string; color: string }[]) => {
    try {
      const { error } = await supabase
        .from('loja_app_state')
        .upsert({ key: 'transfer_banks', value: banks });

      if (error) throw error;
      setData(prev => ({ ...prev, transfer_banks: banks }));
    } catch (err) {
      console.error('Error updating transfer banks:', err);
      throw err;
    }
  };

  const updateSaleVerification = async (idVenda: string, updates: { bank_color?: string, is_caiu?: boolean, is_retificado?: boolean }) => {
    try {
      const currentOrders = [...(data.orders || [])];
      const orderIdx = currentOrders.findIndex(o => o.id_venda === idVenda);

      if (orderIdx === -1) throw new Error('Encomenda não encontrada');

      currentOrders[orderIdx] = {
        ...currentOrders[orderIdx],
        ...updates
      };

      const { error } = await supabase
        .from('loja_app_state')
        .upsert({ key: 'import_orders', value: currentOrders });

      if (error) throw error;
      setData(prev => ({ ...prev, orders: currentOrders }));
    } catch (err) {
      console.error('Error updating sale verification:', err);
      throw err;
    }
  };

  const refreshPurchases = fetchPurchases;

  return (
    <DataContext.Provider value={{
      data, setData, isLoading, setIsLoading,
      addPurchase, addProduct, deleteProduct,
      addCustomer, updateCustomer, addSale, updateProduct,
      updateSaleStatus, updateCategories, updateSizes, updateColors, updateAppSettings,
      updateAllProductsVisibility,
      refreshPurchases,
      deletePurchase,
      updatePurchase,
      clearAllItems,
      clearAllOrders,
      bulkUpdateProducts,
      updateVariations,
      updateOrderStatuses,
      updateTransferBanks,
      updateSaleVerification
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
