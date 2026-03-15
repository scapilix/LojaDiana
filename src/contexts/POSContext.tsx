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
    color_images?: { [color: string]: string };
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
    cartActualDiscount: number;
    cartDiscount: number;
    cartDiscountType: 'fixed' | 'percent';
    setCartDiscount: (discount: number, type: 'fixed' | 'percent') => void;
    selectedCustomer: { nome: string; instagram?: string; nif?: string; saldo?: number } | null;
    setSelectedCustomer: (customer: { nome: string; instagram?: string; nif?: string; saldo?: number } | null) => void;
    finalizeSale: (options: FinalizeOptions & { balanceUsed?: number }) => Promise<boolean>;
    isProcessing: boolean;
    shippingType: string;
    shippingCost: number;
    setShippingType: (type: string) => void;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export function POSProvider({ children }: { children: ReactNode }) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<{ nome: string; instagram?: string; nif?: string; saldo?: number } | null>({ nome: 'Cliente Avulso', saldo: 0 });
    const [cartDiscount, setCartDiscount] = useState(0);
    const [cartDiscountType, setCartDiscountType] = useState<'fixed' | 'percent'>('fixed');
    const [isProcessing, setIsProcessing] = useState(false);
    const [shippingType, setShippingTypeState] = useState('Sem entrega');
    const [shippingCost, setShippingCost] = useState(0);

    // We need to refresh the main data context after a successful sale so the dashboard and stock update
    const { data, setData } = useData();


    const addToCart = (item: Omit<CartItem, 'cartItemId'>) => {
        const cartItemId = `${item.ref}${item.size ? `-${item.size}` : ''}${item.color ? `-${item.color}` : ''}`;

        setCart((prev) => {
            const existing = prev.find((i) => i.cartItemId === cartItemId);
            if (existing) {
                // Obey stock limits
                if (existing.quantidade + 1 > item.current_stock) {
                    console.warn(`Estoque insuficiente. Disponível para este item: ${item.current_stock}`);
                    // Allow addition as per user request, just log it or alert if we want visibility
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
        setCart(prev => {
            const itemIndex = prev.findIndex(i => i.cartItemId === cartItemId);
            if (itemIndex === -1) return prev;

            const item = prev[itemIndex];
            
            // 1. Calculate new stock for the requested variation
            let newStock = item.current_stock;
            if (item.variations) {
                const vid = `${String(item.ref).trim().toUpperCase()}|${size || ''}|${color || ''}`;
                const v = item.variations.find((v: any) => v.variation_id === vid);
                newStock = v ? v.current_stock : 0;
            }

            // 2. Adjust quantity if it exceeds new stock
            const newQty = Math.min(item.quantidade, Math.max(1, newStock));
            if (newQty < item.quantidade) {
                console.warn(`Quantidade excedeu o limite de stock da nova variação.`);
            }

            // 3. Calculate new cartItemId
            const newId = `${item.ref}${size ? `-${size}` : ''}${color ? `-${color}` : ''}`;

            // 4. Check for collision (if another item with this variation already exists)
            const collisionIndex = prev.findIndex((i, idx) => i.cartItemId === newId && idx !== itemIndex);
            
            const newCart = [...prev];
            
            if (collisionIndex !== -1) {
                // Merge quantities
                const target = newCart[collisionIndex];
                const totalQty = Math.min(target.quantidade + newQty, newStock);
                
                // Update image for the merged item if needed
                let finalImageUrl = target.image_url;
                if (color && target.color_images && target.color_images[color]) {
                    finalImageUrl = target.color_images[color];
                }

                newCart[collisionIndex] = { ...target, quantidade: totalQty, current_stock: newStock, image_url: finalImageUrl };
                newCart.splice(itemIndex, 1);
            } else {
                // Update current item
                let finalImageUrl = item.image_url;
                if (color && item.color_images && item.color_images[color]) {
                    finalImageUrl = item.color_images[color];
                }
                newCart[itemIndex] = { ...item, cartItemId: newId, size, color, current_stock: newStock, quantidade: newQty, image_url: finalImageUrl };
            }

            return newCart;
        });
    };

    const updateQuantity = (cartItemId: string, change: number) => {
        setCart((prev) =>
            prev.map((i) => {
                if (i.cartItemId === cartItemId) {
                    const newQty = i.quantidade + change;
                    if (newQty < 1) return i; // Use remove instead
                    if (change > 0 && newQty > i.current_stock) {
                        console.warn(`Estoque ultrapassado para este item: ${i.current_stock}`);
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

    const setShippingType = (type: string) => {
        setShippingTypeState(type);
        switch (type) {
            case 'Continental': setShippingCost(5.00); break;
            case 'Ilhas': setShippingCost(10.00); break;
            case 'Estrangeiro': setShippingCost(15.00); break;
            default: setShippingCost(0);
        }
    };

    const clearCart = () => {
        setCart([]);
        setCartDiscount(0);
        setCartDiscountType('fixed');
        setShippingTypeState('Sem entrega');
        setShippingCost(0);
        setSelectedCustomer({ nome: 'Cliente Avulso', saldo: 0 });
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

    const cartActualDiscount = cartDiscountType === 'percent' 
        ? cartSubtotal * (cartDiscount / 100) 
        : cartDiscount;

    const cartTotal = Math.max(0, cartSubtotal - cartActualDiscount + shippingCost);

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

    const finalizeSale = async (options: FinalizeOptions & { balanceUsed?: number }) => {
        const { paymentMethod, status, nif, isGift, notes, discountTotal, onSaleComplete, balanceUsed = 0 } = options;
        if (cart.length === 0) return false;

        setIsProcessing(true);
        try {
            // Update customer balance if used
            if (balanceUsed > 0 && selectedCustomer && selectedCustomer.nome !== 'Cliente Avulso') {
                const updatedCustomers = (data.customers || []).map(c => {
                    if (c.name === selectedCustomer.nome) {
                        return { ...c, saldo: Math.max(0, (c.saldo || 0) - balanceUsed) };
                    }
                    return c;
                });

                await supabase
                    .from('loja_app_state')
                    .upsert({ key: 'import_customers', value: updatedCustomers });
                
                setData(prev => ({ ...prev, customers: updatedCustomers }));
            }

            // 1. Insert into relational `orders` table
            const orderToInsert = {
                nome_cliente: selectedCustomer?.nome || 'Cliente Avulso',
                instagram: selectedCustomer?.instagram || null,
                nif: nif || selectedCustomer?.nif || null,
                total: cartTotal - balanceUsed,
                forma_de_pagamento: balanceUsed > 0 ? `${paymentMethod} + Saldo` : paymentMethod,
                status: status,
                sales_channel: 'pos',
                is_gift: isGift || false,
                notes: notes || null,
                discount_total: (discountTotal || cartActualDiscount) + balanceUsed,
                shipping_type: shippingType,
                shipping_cost: shippingCost
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
                id_venda: `#${data.orders?.length || 0}`,
                pvp: cartTotal,
                lucro: cart.reduce((sum, item) => sum + ((item.pvp_cica - (item.base_price || 0)) * item.quantidade), 0),
                nome_cliente: orderToInsert.nome_cliente,
                instagram: orderToInsert.instagram,
                forma_de_pagamento: paymentMethod,
                data_venda: new Date().toISOString(),
                status: 'Concluída',
                sales_channel: 'pos',
                shipping_type: shippingType,
                shipping_cost: shippingCost,
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
            id_venda: `#${data.orders?.length || 0}`,
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
            }, 0) - (discountTotal || cartActualDiscount),
            nome_cliente: selectedCustomer?.nome || 'Cliente Avulso',
            instagram: selectedCustomer?.instagram || '',
            nif: nif || selectedCustomer?.nif || '',
            notes: notes || '',
            forma_de_pagamento: paymentMethod,
            data_venda: new Date().toISOString(),
            status: status,
            sales_channel: 'pos',
            discount_total: discountTotal || cartActualDiscount,
            shipping_type: shippingType,
            shipping_cost: shippingCost,
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
            cartActualDiscount,
            cartDiscount,
            cartDiscountType,
            setCartDiscount: (discount: number, type: 'fixed' | 'percent') => {
                setCartDiscount(discount);
                setCartDiscountType(type);
            },
            selectedCustomer,
            setSelectedCustomer,
            finalizeSale,
            isProcessing,
            shippingType,
            shippingCost,
            setShippingType
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
