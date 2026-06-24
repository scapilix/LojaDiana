import React from 'react';
import { motion } from 'framer-motion';
import { Expand, ShoppingBag } from 'lucide-react';

interface Product {
  ref: string;
  nome_artigo: string;
  pvp_cica: number;
  image_url?: string;
  description?: string;
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onExpand?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart, onExpand }) => {
  const formatCurrency = (value: number) =>
    value?.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.28 }}
      className="group flex flex-col gap-3"
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-slate-100 dark:bg-white/5">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.nome_artigo}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-medium text-slate-400">
            Sem imagem
          </div>
        )}

        <button
          onClick={(event) => {
            event.stopPropagation();
            onExpand?.(product);
          }}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-900 opacity-0 shadow-sm transition-opacity hover:bg-white group-hover:opacity-100 dark:bg-slate-950/80 dark:text-white"
          aria-label="Ver imagem"
        >
          <Expand className="h-4 w-4" />
        </button>

        <div className="absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onAddToCart(product);
            }}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
          >
            <ShoppingBag className="h-4 w-4" />
            Adicionar
          </button>
        </div>
      </div>

      <div className="px-1">
        <p className="mb-1 text-xs font-medium text-slate-500">{product.ref}</p>
        <h3 className="line-clamp-2 min-h-[40px] text-sm font-semibold leading-5 text-slate-950 dark:text-white">
          {product.nome_artigo}
        </h3>
        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-200">
          {formatCurrency(product.pvp_cica)}
        </p>
      </div>
    </motion.article>
  );
};
