import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ProductCatalogItem {
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
  published?: boolean;
  sizes?: string[];
  colors?: string[];
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
    heroImages?: string[];
  };
  manual_products_catalog?: ProductCatalogItem[]; // Items added manually via UI
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
  addSale: (sale: any) => Promise<void>;
  updateProduct: (ref: string, updates: Partial<ProductCatalogItem>) => Promise<void>;
  updateSaleStatus: (idVenda: string, status: string) => Promise<void>;
  updateCategories: (categories: string[]) => Promise<void>;
  updateSizes: (sizes: string[]) => Promise<void>;
  updateColors: (colors: string[]) => Promise<void>;
  updateAppSettings: (settings: any) => Promise<void>;
  updateAllProductsVisibility: (published: boolean) => Promise<void>;
  refreshPurchases: () => Promise<void>;
  clearAllItems: () => Promise<void>;
  clearAllOrders: () => Promise<void>;
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
        .in('key', ['import_orders', 'import_customers', 'import_stats', 'manual_products_catalog', 'categories', 'sizes', 'colors', 'app_settings']);

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
        });

        if (Object.keys(updates).length > 0) {
          setData(prev => ({ ...prev, ...updates }));
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
      // 1. Clear database tables
      const { error: err1 } = await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      const { error: err2 } = await supabase.from('diana_products').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // 2. Clear state in loja_app_state
      const { error: err3 } = await supabase
        .from('loja_app_state')
        .upsert({ key: 'manual_products_catalog', value: [] });

      if (err1 || err2 || err3) throw (err1 || err2 || err3);

      // 3. Update local state
      setData(prev => ({ ...prev, manual_products_catalog: [], products_catalog: [] }));
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

  const refreshPurchases = fetchPurchases;

  return (
    <DataContext.Provider value={{
      data, setData, isLoading, setIsLoading,
      addPurchase, addProduct, deleteProduct,
      addCustomer, addSale, updateProduct,
      updateSaleStatus, updateCategories, updateSizes, updateColors, updateAppSettings,
      updateAllProductsVisibility,
      refreshPurchases,
      clearAllItems,
      clearAllOrders
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
