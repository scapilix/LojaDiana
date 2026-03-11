import { createContext, useContext, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useData } from './DataContext';

interface CartItem {
    cartItemId: string; // Composite key: ref-size-color
    ref: string;
    nome_artigo: string;
    quantidade: number;
    pvp_cica: number;
    base_price?: number;
    image_url?: string;
    current_stock: number;
    size?: string;
    color?: string;
}

interface POSContextType {
    cart: CartItem[];
    addToCart: (item: Omit<CartItem, 'cartItemId'>) => void;
    updateQuantity: (cartItemId: string, change: number) => void;
    removeFromCart: (cartItemId: string) => void;
    clearCart: () => void;
    cartTotal: number;
    selectedCustomer: { nome: string; instagram?: string } | null;
    setSelectedCustomer: (customer: { nome: string; instagram?: string } | null) => void;
    finalizeSale: (paymentMethod: string, onSaleComplete?: () => void) => Promise<boolean>;
    isProcessing: boolean;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export function POSProvider({ children }: { children: ReactNode }) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<{ nome: string; instagram?: string } | null>({ nome: 'Cliente Avulso' });
    const [isProcessing, setIsProcessing] = useState(false);

    // We need to refresh the main data context after a successful sale so the dashboard and stock update
    const { data, setData } = useData();

    const generateShortId = () => {
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let result = '';
        for (let i = 0; i < 5; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    const addToCart = (item: Omit<CartItem, 'cartItemId'>) => {
        const cartItemId = `${item.ref}${item.size ? `-${item.size}` : ''}${item.color ? `-${item.color}` : ''}`;

        setCart((prev) => {
            const existing = prev.find((i) => i.cartItemId === cartItemId);
            if (existing) {
                // Obey stock limits
                if (existing.quantidade + 1 > item.current_stock) {
                    alert('Estoque insuficiente para adicionar mais.');
                    return prev;
                }
                return prev.map((i) =>
                    i.cartItemId === cartItemId ? { ...i, quantidade: i.quantidade + 1 } : i
                );
            }
            return [...prev, { ...item, cartItemId, quantidade: 1 }];
        });
    };

    const updateQuantity = (cartItemId: string, change: number) => {
        setCart((prev) =>
            prev.map((i) => {
                if (i.cartItemId === cartItemId) {
                    const newQty = i.quantidade + change;
                    if (newQty < 1) return i; // Use remove instead
                    if (change > 0 && newQty > i.current_stock) {
                        alert('Estoque máximo alcançado para este item.');
                        return i;
                    }
                    return { ...i, quantidade: newQty };
                }
                return i;
            })
        );
    };

    const removeFromCart = (cartItemId: string) => {
        setCart((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
    };

    const clearCart = () => {
        setCart([]);
        setSelectedCustomer({ nome: 'Cliente Avulso' });
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.pvp_cica * item.quantidade), 0);

    const formatItemName = (item: CartItem) => {
        let name = item.nome_artigo;
        const extras = [];
        if (item.size) extras.push(item.size);
        if (item.color) extras.push(item.color);
        if (extras.length > 0) {
            name += ` (${extras.join(' / ')})`;
        }
        return name;
    };

    const finalizeSale = async (paymentMethod: string, onSaleComplete?: () => void) => {
        if (cart.length === 0) return false;

        setIsProcessing(true);
        try {
            // 1. Insert into relational `orders` table
            const orderToInsert = {
                nome_cliente: selectedCustomer?.nome || 'Cliente Avulso',
                instagram: selectedCustomer?.instagram || null,
                total: cartTotal,
                forma_de_pagamento: paymentMethod,
                status: 'Concluída',
                sales_channel: 'pos'
            };

            const { data: newOrder, error: orderError } = await supabase
                .from('orders')
                .insert(orderToInsert)
                .select()
                .single();

            if (orderError) {
                // Fallback: If relational tables don't exist yet, push to JSON blob so it doesn't break
                console.warn("Relational tables may not exist, falling back to JSON state:", orderError);
                await finalizeLegacy(paymentMethod);
                if (onSaleComplete) onSaleComplete();
                return true;
            }

            // 2. Insert into `order_items`
            const orderItemsToInsert = cart.map(item => ({
                order_id: newOrder.id,
                product_ref: item.ref,
                nome_artigo: formatItemName(item),
                quantidade: item.quantidade,
                preco_unitario: item.pvp_cica,
                lucro_unitario: item.pvp_cica - (item.base_price || 0)
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItemsToInsert);

            if (itemsError) throw itemsError;

            // 3. Update global JSON state (legacy compatibility for dashboard)
            // We need to inject this order into `data.orders` for Dashboard/Stock metrics to recalculate without refreshing the page

            const legacyOrderFormat = {
                id_venda: newOrder.id_venda || generateShortId(),
                pvp: cartTotal,
                lucro: cart.reduce((sum, item) => sum + ((item.pvp_cica - (item.base_price || 0)) * item.quantidade), 0),
                nome_cliente: orderToInsert.nome_cliente,
                instagram: orderToInsert.instagram,
                forma_de_pagamento: paymentMethod,
                data_venda: new Date().toISOString(),
                status: 'Concluída',
                sales_channel: 'pos',
                items: cart.map(item => ({
                    ref: item.ref,
                    designacao: formatItemName(item),
                    quantidade: item.quantidade,
                    pvp: item.pvp_cica * item.quantidade,
                    base: (item.base_price || 0) * item.quantidade,
                    lucro: (item.pvp_cica - (item.base_price || 0)) * item.quantidade,
                    size: item.size,
                    color: item.color
                }))
            };

            const currentOrders = data.orders || [];
            const newOrders = [legacyOrderFormat, ...currentOrders];

            // Upsert JSON state explicitly to keep sync with legacy components
            await supabase
                .from('loja_app_state')
                .upsert({ key: 'import_orders', value: newOrders });

            setData(prev => ({ ...prev, orders: newOrders }));

            clearCart();
            if (onSaleComplete) onSaleComplete();
            return true;

        } catch (err) {
            console.error('Failure finalizing sale:', err);
            alert('Erro inesperado ao finalizar venda. Verifique a console.');
            return false;
        } finally {
            setIsProcessing(false);
        }
    };

    // Legacy fallback if `orders` table doesn't exist yet
    const finalizeLegacy = async (paymentMethod: string) => {
        const legacyOrderFormat = {
            id_venda: generateShortId(),
            pvp: cartTotal,
            lucro: cart.reduce((sum, item) => sum + ((item.pvp_cica - (item.base_price || 0)) * item.quantidade), 0),
            nome_cliente: selectedCustomer?.nome || 'Cliente Avulso',
            instagram: selectedCustomer?.instagram || '',
            forma_de_pagamento: paymentMethod,
            data_venda: new Date().toISOString(),
            status: 'Concluída',
            sales_channel: 'pos',
            items: cart.map(item => ({
                ref: item.ref,
                designacao: formatItemName(item),
                quantidade: item.quantidade,
                pvp: item.pvp_cica * item.quantidade,
                base: (item.base_price || 0) * item.quantidade,
                lucro: (item.pvp_cica - (item.base_price || 0)) * item.quantidade,
                size: item.size,
                color: item.color
            }))
        };

        const currentOrders = data.orders || [];
        const newOrders = [legacyOrderFormat, ...currentOrders];

        await supabase
            .from('loja_app_state')
            .upsert({ key: 'import_orders', value: newOrders });

        setData(prev => ({ ...prev, orders: newOrders }));
        clearCart();
    };

    return (
        <POSContext.Provider value={{
            cart,
            addToCart,
            updateQuantity,
            removeFromCart,
            clearCart,
            cartTotal,
            selectedCustomer,
            setSelectedCustomer,
            finalizeSale,
            isProcessing
        }}>
            {children}
        </POSContext.Provider>
    );
}

export function usePOS() {
    const context = useContext(POSContext);
    if (context === undefined) {
        throw new Error('usePOS must be used within a POSProvider');
    }
    return context;
}
