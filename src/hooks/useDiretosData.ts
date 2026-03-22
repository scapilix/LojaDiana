import { useMemo } from 'react';
import { useData } from '../contexts/DataContext';

export interface DiretosMetrics {
  totalRevenue: number;
  orderCount: number;
  avgTicket: number;
  salesByDate: { date: string; revenue: number; count: number }[];
  topProducts: { ref: string; name: string; quantity: number; revenue: number }[];
  topCustomers: { name: string; instagram: string; revenue: number; orders: number }[];
  bestLive: { date: string; revenue: number; count: number } | null;
}

export const useDiretosData = (): DiretosMetrics => {
  const { data: rawData } = useData();

  return useMemo(() => {
    const allOrders = rawData.orders || [];
    const diretosOrders = allOrders.filter((o: any) => o.is_direto === true);

    let totalRevenue = 0;
    const dateMap: Record<string, { revenue: number; count: number }> = {};
    const productMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    const customerMap: Record<string, { name: string; instagram: string; revenue: number; orders: number }> = {};

    diretosOrders.forEach((order: any) => {
      const pvp = parseFloat(String(order.pvp)) || 0;
      totalRevenue += pvp;

      // Group by Date for Live Analysis
      const date = order.data_venda ? new Date(order.data_venda).toISOString().split('T')[0] : 'N/A';
      if (date !== 'N/A') {
        if (!dateMap[date]) dateMap[date] = { revenue: 0, count: 0 };
        dateMap[date].revenue += pvp;
        dateMap[date].count += 1;
      }

      // Group by Product
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const ref = String(item.ref || 'SV');
          const isShipping = ref === 'CONTINENTAL' || ref === 'ILHAS' || ref === 'PORTES' || ref === 'ESTRANGEIRO';
          if (isShipping) return;

          if (!productMap[ref]) {
            productMap[ref] = { name: item.designacao || 'Produto Desconhecido', quantity: 0, revenue: 0 };
          }
          productMap[ref].quantity += Number(item.quantidade) || 1;
          productMap[ref].revenue += Number(item.pvp) || 0;
        });
      }

      // Group by Customer
      const customerName = order.nome_cliente || 'Cliente Avulso';
      const instagram = order.instagram || 'N/A';
      const customerKey = instagram !== 'N/A' ? instagram : customerName;

      if (!customerMap[customerKey]) {
        customerMap[customerKey] = { name: customerName, instagram, revenue: 0, orders: 0 };
      }
      customerMap[customerKey].revenue += pvp;
      customerMap[customerKey].orders += 1;
    });

    const salesByDate = Object.entries(dateMap)
      .map(([date, metrics]) => ({ date, ...metrics }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const topProducts = Object.entries(productMap)
      .map(([ref, data]) => ({ ref, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const topCustomers = Object.values(customerMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const bestLive = salesByDate.length > 0 
      ? [...salesByDate].sort((a, b) => b.revenue - a.revenue)[0] 
      : null;

    return {
      totalRevenue,
      orderCount: diretosOrders.length,
      avgTicket: diretosOrders.length > 0 ? totalRevenue / diretosOrders.length : 0,
      salesByDate,
      topProducts,
      topCustomers,
      bestLive
    };
  }, [rawData]);
};
