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
  };
}

export const ReceiptTemplate: React.FC<ReceiptProps> = ({ order }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);
  };

  return (
    <div className="receipt-container bg-white text-black p-4 w-[80mm] font-mono text-[10px] leading-tight">
      <div className="text-center mb-4">
        <h1 className="text-sm font-black uppercase mb-1">Loja Diana</h1>
        <p className="text-[8px]">Rua das Flores, 123</p>
        <p className="text-[8px]">Porto, Portugal</p>
        <p className="text-[8px]">NIF: 123 456 789</p>
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
        <div className="flex justify-between">
          <span>Cliente:</span>
          <span className="truncate max-w-[120px]">{order.nome_cliente}</span>
        </div>
        {order.nif && (
          <div className="flex justify-between">
            <span>NIF:</span>
            <span>{order.nif}</span>
          </div>
        )}
      </div>

      <table className="w-full mb-4">
        <thead className="border-b border-black border-dashed">
          <tr>
            <th className="text-left py-1 uppercase">Artigo</th>
            <th className="text-right py-1 uppercase">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black divide-dashed">
          {order.items.map((item, idx) => (
            <tr key={idx}>
              <td className="py-2">
                <div className="font-black truncate max-w-[150px]">{item.designacao || item.nome_artigo}</div>
                <div className="text-[8px] opacity-70">
                  {item.quantidade}x {formatCurrency((item.pvp || item.preco_unitario) / item.quantidade)}
                  {item.size ? ` / ${item.size}` : ''}
                  {item.color ? ` / ${item.color}` : ''}
                </div>
              </td>
              <td className="text-right font-black pt-2">
                {formatCurrency(item.pvp || (item.preco_unitario * item.quantidade))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-black border-dashed pt-2 space-y-1">
        {(order.discount_total || 0) > 0 && (
          <div className="flex justify-between text-[8px]">
            <span className="uppercase">Desconto Total:</span>
            <span>-{formatCurrency(order.discount_total || 0)}</span>
          </div>
        )}
        <div className="flex justify-between text-xs font-black pt-1">
          <span className="uppercase">Total a Pagar:</span>
          <span>{formatCurrency(order.total)}</span>
        </div>
      </div>

      <div className="mt-4 pt-2 border-t border-black border-dashed">
        <div className="flex justify-between">
          <span className="uppercase font-bold">Pagamento:</span>
          <span className="uppercase">{order.forma_de_pagamento}</span>
        </div>
      </div>

      {order.notes && (
        <div className="mt-4 p-2 bg-slate-50 border border-black border-dashed text-[8px]">
          <p className="font-bold uppercase mb-0.5">Notas:</p>
          <p>{order.notes}</p>
        </div>
      )}

      <div className="mt-10 text-center space-y-2 opacity-60">
        <p className="uppercase font-black text-[8px]">Obrigado pela sua visita!</p>
        <p className="text-[7px]">Volte Sempre</p>
        <div className="pt-4 flex flex-col items-center">
            <div className="w-20 h-2 bg-black mb-0.5"></div>
            <div className="w-16 h-2 bg-black mb-0.5"></div>
            <div className="w-24 h-2 bg-black uppercase text-[6px] text-white flex items-center justify-center font-black">
                {order.id_venda}
            </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .receipt-container, .receipt-container * { visibility: visible; }
          .receipt-container { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 80mm;
            padding: 4mm;
          }
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      `}} />
    </div>
  );
};
