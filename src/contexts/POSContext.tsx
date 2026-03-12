import { createContext, useContext, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useData } from './DataContext';

interface CartItem {
    cartItemId: string; // Composite key: ref-size-color-timestamp (unique for each entry attempt or just unique)
    ref: string;
    nome_artigo: string;
    quantidade: number;
    original_price: number; // The pvp from catalog
    pvp_cica: number;       // The active price (may be manual)
    base_price?: number;
    image_url?: string;
    current_stock: number;
    size?: string;
    color?: string;
    categoria?: string;     // Added for UI needs
    discount?: number;      // Discount value
    discount_type?: 'fixed' | 'percent';
    variations?: any[];     // Added to allow changing variations in cart
}

interface FinalizeOptions {
    paymentMethod: string;
    status: 'Concluída' | 'Draft/Espera';
    nif?: string;
    isGift?: boolean;
    notes?: string;
    discountTotal?: number;
    onSaleComplete?: () => void;
}

interface POSContextType {
    cart: CartItem[];
    addToCart: (item: Omit<CartItem, 'cartItemId'>) => void;
    updateQuantity: (cartItemId: string, change: number) => void;
    updateItemPrice: (cartItemId: string, newPrice: number) => void;
    updateItemDiscount: (cartItemId: string, discount: number, type: 'fixed' | 'percent') => void;
    updateItemVariation: (cartItemId: string, size?: string, color?: string) => void;
    removeFromCart: (cartItemId: string) => void;
    clearCart: () => void;
    cartSubtotal: number;
    cartTotal: number;
    cartDiscount: number;
    setCartDiscount: (discount: number) => void;
    selectedCustomer: { nome: string; instagram?: string; nif?: string } | null;
    setSelectedCustomer: (customer: { nome: string; instagram?: string; nif?: string } | null) => void;
    finalizeSale: (options: FinalizeOptions) => Promise<boolean>;
    isProcessing: boolean;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export function POSProvider({ children }: { children: ReactNode }) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<{ nome: string; instagram?: string; nif?: string } | null>({ nome: 'Cliente Avulso' });
    const [cartDiscount, setCartDiscount] = useState(0);
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
            return [...prev, { ...item, cartItemId, quantidade: item.quantidade || 1 }];
        });
    };

    const updateItemPrice = (cartItemId: string, newPrice: number) => {
        setCart(prev => prev.map(i => i.cartItemId === cartItemId ? { ...i, pvp_cica: newPrice } : i));
    };

    const updateItemDiscount = (cartItemId: string, discount: number, type: 'fixed' | 'percent') => {
        setCart(prev => prev.map(i => i.cartItemId === cartItemId ? { ...i, discount, discount_type: type } : i));
    };

    const updateItemVariation = (cartItemId: string, size?: string, color?: string) => {
        setCart(prev => prev.map(i => {
            if (i.cartItemId === cartItemId) {
                // If the product has variations, find the stock for the new selection
                let newStock = i.current_stock;
                if (i.variations) {
                    const vid = `${String(i.ref).trim().toUpperCase()}|${size || ''}|${color || ''}`;
                    const v = i.variations.find((v: any) => v.variation_id === vid);
                    newStock = v ? v.current_stock : 0;
                }
                return { ...i, size, color, current_stock: newStock };
            }
            return i;
        }));
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
        setCartDiscount(0);
        setSelectedCustomer({ nome: 'Cliente Avulso' });
    };

    const cartSubtotal = cart.reduce((sum, item) => {
        const base = item.pvp_cica * item.quantidade;
        let discount = 0;
        if (item.discount) {
            if (item.discount_type === 'percent') {
                discount = base * (item.discount / 100);
            } else {
                discount = item.discount;
            }
        }
        return sum + (base - discount);
    }, 0);

    const cartTotal = Math.max(0, cartSubtotal - cartDiscount);

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

    const finalizeSale = async (options: FinalizeOptions) => {
        const { paymentMethod, status, nif, isGift, notes, discountTotal, onSaleComplete } = options;
        if (cart.length === 0) return false;

        setIsProcessing(true);
        try {
            // 1. Insert into relational `orders` table
            const orderToInsert = {
                nome_cliente: selectedCustomer?.nome || 'Cliente Avulso',
                instagram: selectedCustomer?.instagram || null,
                nif: nif || selectedCustomer?.nif || null,
                total: cartTotal,
                forma_de_pagamento: paymentMethod,
                status: status,
                sales_channel: 'pos',
                is_gift: isGift || false,
                notes: notes || null,
                discount_total: discountTotal || cartDiscount
            };

            const { data: newOrder, error: orderError } = await supabase
                .from('orders')
                .insert(orderToInsert)
                .select()
                .single();

            if (orderError) {
                // Fallback: If relational tables don't exist yet, push to JSON blob so it doesn't break
                console.warn("Relational tables may not exist, falling back to JSON state:", orderError);
                await finalizeLegacy(paymentMethod, status, nif, notes, discountTotal);
                if (onSaleComplete) onSaleComplete();
                return true;
            }

            // 2. Insert into `order_items`
            const orderItemsToInsert = cart.map(item => {
                const base = item.pvp_cica * item.quantidade;
                let itemDiscount = 0;
                if (item.discount) {
                    if (item.discount_type === 'percent') {
                        itemDiscount = base * (item.discount / 100);
                    } else {
                        itemDiscount = item.discount;
                    }
                }

                return {
                    order_id: newOrder.id,
                    product_ref: item.ref,
                    nome_artigo: formatItemName(item),
                    quantidade: item.quantidade,
                    preco_unitario: item.pvp_cica,
                    desconto_item: itemDiscount,
                    lucro_unitario: (item.pvp_cica - (itemDiscount / item.quantidade)) - (item.base_price || 0)
                };
            });

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
    const finalizeLegacy = async (paymentMethod: string, status = 'Concluída', nif?: string, notes?: string, discountTotal?: number) => {
        const legacyOrderFormat = {
            id_venda: generateShortId(),
            pvp: cartTotal,
            lucro: cart.reduce((sum, item) => {
                const base = item.pvp_cica * item.quantidade;
                let itemDiscount = 0;
                if (item.discount) {
                    if (item.discount_type === 'percent') {
                        itemDiscount = base * (item.discount / 100);
                    } else {
                        itemDiscount = item.discount;
                    }
                }
                const sub = (item.pvp_cica * item.quantidade) - itemDiscount;
                const cost = (item.base_price || 0) * item.quantidade;
                return sum + (sub - cost);
            }, 0) - (discountTotal || cartDiscount),
            nome_cliente: selectedCustomer?.nome || 'Cliente Avulso',
            instagram: selectedCustomer?.instagram || '',
            nif: nif || selectedCustomer?.nif || '',
            notes: notes || '',
            forma_de_pagamento: paymentMethod,
            data_venda: new Date().toISOString(),
            status: status,
            sales_channel: 'pos',
            discount_total: discountTotal || cartDiscount,
            items: cart.map(item => {
                const base = item.pvp_cica * item.quantidade;
                let itemDiscount = 0;
                if (item.discount) {
                    if (item.discount_type === 'percent') {
                        itemDiscount = base * (item.discount / 100);
                    } else {
                        itemDiscount = item.discount;
                    }
                }

                return {
                    ref: item.ref,
                    designacao: formatItemName(item),
                    quantidade: item.quantidade,
                    pvp: item.pvp_cica * item.quantidade,
                    desconto: itemDiscount,
                    base: (item.base_price || 0) * item.quantidade,
                    lucro: ((item.pvp_cica * item.quantidade) - itemDiscount) - ((item.base_price || 0) * item.quantidade),
                    size: item.size,
                    color: item.color
                };
            })
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
            updateItemPrice,
            updateItemDiscount,
            updateItemVariation,
            removeFromCart,
            clearCart,
            cartSubtotal,
            cartTotal,
            cartDiscount,
            setCartDiscount,
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
