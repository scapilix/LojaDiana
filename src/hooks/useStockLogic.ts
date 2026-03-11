import { useMemo } from 'react';
import { useData } from '../contexts/DataContext';

export interface VariationStock {
  variation_id: string;
  size?: string;
  color?: string;
  total_purchased: number;
  total_sold: number;
  current_stock: number;
}

export interface StockStatus {
  ref: string;
  name: string;
  total_purchased: number;
  total_sold: number;
  current_stock: number;
  status: 'ok' | 'low' | 'critical' | 'out';
  base_price?: number;
  pvp?: number;
  profit?: number;
  supplier?: string;
  last_purchase_date?: string;
  sizes?: string[];
  colors?: string[];
  variations: VariationStock[];
  image_url?: string;
}

export function useStockLogic() {
  const { data } = useData();

  const stockInventory = useMemo(() => {
    const calculationStart = performance.now();

    const getVariationId = (ref: string, size?: string, color?: string) => {
      return `${String(ref).trim().toUpperCase()}|${size || ''}|${color || ''}`;
    };

    // 1. Map Manual Purchases
    const purchaseMap = new Map<string, { qty: number; lastDate: string }>();
    const purchases = data.purchases || [];

    purchases.forEach((p: any) => {
      const vid = getVariationId(p.ref, p.size, p.color);
      const current = purchaseMap.get(vid) || { qty: 0, lastDate: '' };

      purchaseMap.set(vid, {
        qty: current.qty + Number(p.quantidade),
        lastDate: p.data_compra > current.lastDate ? p.data_compra : current.lastDate
      });
    });

    // 2. Map Sales 
    const salesMap = new Map<string, number>();
    const orders = data.orders || [];

    orders.forEach((order: any) => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          if (item.ref) {
            const refStr = String(item.ref).trim().toUpperCase();
            if (refStr === 'CONTINENTAL' || refStr === 'ILHAS' || refStr === 'PORTES') return;

            const vid = getVariationId(item.ref, item.size, item.color);
            const qty = Number(item.quantidade) || 1;
            const current = salesMap.get(vid) || 0;
            salesMap.set(vid, current + qty);
          }
        });
      }
    });

    // 3. Build Base Products Map
    const baseProductsMap = new Map<string, StockStatus>();

    // Helper to initialize a base product
    const getInitBaseProduct = (ref: string): StockStatus => {
      const baseCatalogItem = data.products_catalog?.find(p => String(p.ref).trim().toUpperCase() === ref);
      const manualCatalogItem = data.manual_products_catalog?.find(p => String(p.ref).trim().toUpperCase() === ref);
      const catalogItem = baseCatalogItem || manualCatalogItem;

      return {
        ref,
        name: catalogItem?.nome_artigo || 'Item Desconhecido',
        total_purchased: 0,
        total_sold: 0,
        current_stock: 0,
        status: 'out',
        base_price: catalogItem?.base_price,
        pvp: catalogItem?.pvp_cica,
        profit: catalogItem?.lucro_meu_faturado,
        supplier: catalogItem?.fornecedor,
        colors: catalogItem?.colors,
        variations: [],
        image_url: catalogItem?.image_url
      };
    };

    // Add all from Base Items Catalog and generate their designated variations explicitly
    const addCatalogToMaster = (catalog: any[]) => {
      catalog.forEach(p => {
        const ref = String(p.ref).trim().toUpperCase();
        if (!baseProductsMap.has(ref)) {
          baseProductsMap.set(ref, getInitBaseProduct(ref));
        }

        const base = baseProductsMap.get(ref)!;
        const hasSizes = p.sizes && p.sizes.length > 0;
        const hasColors = p.colors && p.colors.length > 0;

        // Ensure variations array is pre-populated with all possible catalog combinations
        if (hasSizes && hasColors) {
          p.sizes.forEach((sz: string) => {
            p.colors.forEach((c: string) => {
              base.variations.push({ variation_id: getVariationId(ref, sz, c), size: sz, color: c, total_purchased: 0, total_sold: 0, current_stock: 0 });
            });
          });
        } else if (hasSizes) {
          p.sizes.forEach((sz: string) => {
            base.variations.push({ variation_id: getVariationId(ref, sz), size: sz, total_purchased: 0, total_sold: 0, current_stock: 0 });
          });
        } else if (hasColors) {
          p.colors.forEach((c: string) => {
            base.variations.push({ variation_id: getVariationId(ref, undefined, c), color: c, total_purchased: 0, total_sold: 0, current_stock: 0 });
          });
        } else {
          base.variations.push({ variation_id: getVariationId(ref), total_purchased: 0, total_sold: 0, current_stock: 0 });
        }
      });
    };

    addCatalogToMaster(data.products_catalog || []);
    addCatalogToMaster(data.manual_products_catalog || []);

    // 4. Populate variations with actual data
    // First, compile all unique variation IDs from maps
    const allVariationIds = new Set<string>();
    purchaseMap.forEach((_, vid) => allVariationIds.add(vid));
    salesMap.forEach((_, vid) => allVariationIds.add(vid));

    allVariationIds.forEach(vid => {
      const [ref, sizeStr, colorStr] = vid.split('|');
      const size = sizeStr || undefined;
      const color = colorStr || undefined;

      if (!baseProductsMap.has(ref)) {
        baseProductsMap.set(ref, getInitBaseProduct(ref));
      }

      const base = baseProductsMap.get(ref)!;
      let variation = base.variations.find(v => v.variation_id === vid);

      // If this variation was sold/purchased but isn't strictly in catalog combos, add it ad-hoc
      if (!variation) {
        variation = { variation_id: vid, size, color, total_purchased: 0, total_sold: 0, current_stock: 0 };
        base.variations.push(variation);
      }

      // Apply quantities
      const pQty = purchaseMap.get(vid)?.qty || 0;
      const sQty = salesMap.get(vid) || 0;

      variation.total_purchased += pQty;
      variation.total_sold += sQty;
      variation.current_stock = variation.total_purchased - variation.total_sold;

      // Keep root tracking last purchase date
      const pDate = purchaseMap.get(vid)?.lastDate;
      if (pDate && (!base.last_purchase_date || pDate > base.last_purchase_date)) {
        base.last_purchase_date = pDate;
      }
    });

    // 5. Aggregate base products totals and determine status
    const inventory: StockStatus[] = [];
    baseProductsMap.forEach(base => {
      base.total_purchased = base.variations.reduce((acc, v) => acc + v.total_purchased, 0);
      base.total_sold = base.variations.reduce((acc, v) => acc + v.total_sold, 0);
      // Only sum positive stock toward total availability
      base.current_stock = base.variations.reduce((acc, v) => acc + Math.max(0, v.current_stock), 0);

      if (base.current_stock <= 0) base.status = 'out';
      else if (base.current_stock <= 3) base.status = 'critical';
      else if (base.current_stock <= 10) base.status = 'low';
      else base.status = 'ok';

      inventory.push(base);
    });

    console.log(`Stock calculation took ${performance.now() - calculationStart}ms`);
    return inventory.sort((a, b) => a.current_stock - b.current_stock);
  }, [data.orders, data.purchases, data.products_catalog, data.manual_products_catalog]);

  return stockInventory;
}
