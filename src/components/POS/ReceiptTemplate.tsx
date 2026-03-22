import React from 'react';

interface ReceiptProps {
  order: {
    id_venda: string;
    data_venda: string;
    nome_cliente: string;
    items: any[];
    total: number;
    forma_de_pagamento: string;
    nif?: string;
    notes?: string;
    discount_total?: number;
    shipping_cost?: number;
  };
  settings?: {
    storeName?: string;
    storeAddress?: string;
    storeNIF?: string;
    whatsapp?: string;
    instagram?: string;
    receipt_show_logo?: boolean;
    receipt_show_customer?: boolean;
    receipt_header?: string;
    receipt_footer?: string;
    receipt_logo_url?: string;
    printer_paper_width?: '80mm' | '58mm';
  };
}

export const ReceiptTemplate: React.FC<ReceiptProps> = ({ order, settings }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);
  };

  const paperWidth = settings?.printer_paper_width || '80mm';
  const showLogo = settings?.receipt_show_logo ?? true;
  const showCustomer = settings?.receipt_show_customer ?? true;
  const logoUrl = settings?.receipt_logo_url;

  return (
    <div 
      className={`receipt-container bg-white text-black p-4 font-mono text-[10px] leading-tight mx-auto shadow-sm print:shadow-none`}
      style={{ width: paperWidth }}
    >
      <div className="text-center mb-4">
        {showLogo && (
          <div className="mb-2">
            {logoUrl ? (
              <img src={logoUrl} alt="Store Logo" className="w-16 h-16 object-contain mx-auto mb-2" />
            ) : (
              <>
                <h1 className="text-sm font-black uppercase mb-1">{settings?.storeName || 'Loja Diana'}</h1>
                <div className="flex flex-col items-center gap-0.5 opacity-50">
                   <div className="w-8 h-1 bg-black"></div>
                   <div className="w-12 h-1 bg-black"></div>
                </div>
              </>
            )}
          </div>
        )}
        
        {settings?.receipt_header && (
          <p className="text-[8px] whitespace-pre-wrap mb-2 border-b border-black border-dotted pb-2">{settings.receipt_header}</p>
        )}

        <p className="text-[8px]">{settings?.storeAddress || 'Rua das Flores, 123'}</p>
        <p className="text-[8px]">{settings?.storeNIF ? `NIF: ${settings.storeNIF}` : 'NIF: 123 456 789'}</p>
        {settings?.whatsapp && <p className="text-[6px] uppercase tracking-widest opacity-60 mt-1">WA: {settings.whatsapp}</p>}
      </div>

      <div className="border-t border-b border-black border-dashed py-2 mb-2 flex justify-between uppercase font-black">
        <span>Talão de Venda</span>
        <span>{order.id_venda}</span>
      </div>

      <div className="mb-4">
        <div className="flex justify-between">
          <span>Data:</span>
          <span>{new Date(order.data_venda).toLocaleString('pt-PT')}</span>
        </div>
        
        {showCustomer && (
          <>
            <div className="flex justify-between border-t border-black/5 pt-1 mt-1">
              <span>Cliente:</span>
              <span className="truncate max-w-[120px] font-black">{order.nome_cliente}</span>
            </div>
            {order.nif && (
              <div className="flex justify-between text-[8px]">
                <span>NIF Cliente:</span>
                <span>{order.nif}</span>
              </div>
            )}
          </>
        )}
      </div>

      <table className="w-full mb-4">
        <thead className="border-b border-black border-dashed">
          <tr>
            <th className="text-left py-1 uppercase text-[8px]">Artigo</th>
            <th className="text-right py-1 uppercase text-[8px]">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black divide-dashed">
          {order.items.map((item, idx) => (
            <tr key={idx}>
              <td className="py-2">
                <div className="font-black truncate max-w-[150px] uppercase">{item.designacao || item.nome_artigo}</div>
                <div className="text-[8px] opacity-70">
                  {item.quantidade}x {formatCurrency((item.pvp || item.preco_unitario || 0) / (item.quantidade || 1))}
                  {item.size ? ` / ${item.size}` : ''}
                  {item.color ? ` / ${item.color}` : ''}
                </div>
              </td>
              <td className="text-right font-black pt-2">
                {formatCurrency(item.pvp || ((item.preco_unitario || 0) * (item.quantidade || 1)))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-black border-dashed pt-2 space-y-1">
        {(order.shipping_cost || 0) > 0 && (
           <div className="flex justify-between text-[8px]">
            <span className="uppercase">Portes de Envio:</span>
            <span>{formatCurrency(order.shipping_cost || 0)}</span>
          </div>
        )}
        {(order.discount_total || 0) > 0 && (
          <div className="flex justify-between text-[8px] text-rose-600">
            <span className="uppercase font-bold">Desconto Total:</span>
            <span>-{formatCurrency(order.discount_total || 0)}</span>
          </div>
        )}
        <div className="flex justify-between text-xs font-black pt-1 border-t border-black border-dotted mt-1">
          <span className="uppercase">Total Final:</span>
          <span className="text-sm">{formatCurrency(order.total)}</span>
        </div>
      </div>

      <div className="mt-4 pt-2 border-t border-black border-dashed">
        <div className="flex justify-between">
          <span className="uppercase font-bold">Pagamento:</span>
          <span className="uppercase font-black">{order.forma_de_pagamento}</span>
        </div>
      </div>

      {order.notes && (
        <div className="mt-4 p-2 bg-slate-50 border border-black border-dashed text-[8px]">
          <p className="font-bold uppercase mb-0.5">Notas:</p>
          <p className="italic">{order.notes}</p>
        </div>
      )}

      {settings?.receipt_footer && (
        <p className="mt-6 text-center text-[8px] italic whitespace-pre-wrap border-t border-black/10 pt-4">
          {settings.receipt_footer}
        </p>
      )}

      <div className="mt-10 text-center space-y-2 opacity-60">
        {!settings?.receipt_footer && (
          <>
            <p className="uppercase font-black text-[8px]">Obrigado pela sua visita!</p>
            <p className="text-[7px]">Volte Sempre</p>
          </>
        )}
        <div className="pt-4 flex flex-col items-center">
            <div className="w-20 h-1 bg-black mb-0.5 opacity-20"></div>
            <div className="w-16 h-1 bg-black mb-0.5 opacity-10"></div>
            <div className="mt-2 px-3 py-1 bg-black text-white text-[7px] font-black tracking-widest uppercase">
                {order.id_venda}
            </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .receipt-container, .receipt-container * { visibility: visible; }
          .receipt-container { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: ${paperWidth} !important;
            padding: 4mm !important;
            border: none !important;
            box-shadow: none !important;
          }
          @page {
            size: ${paperWidth} auto;
            margin: 0;
          }
        }
      `}} />
    </div>
  );
};
