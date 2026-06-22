interface StatusBadgeProps {
  status: string;
  map?: Record<string, { bg: string; text: string; label?: string }>;
}

const DEFAULT_MAP: Record<string, { bg: string; text: string }> = {
  'Pago':       { bg: '#ecfdf5', text: '#059669' },
  'Activo':     { bg: '#ecfdf5', text: '#059669' },
  'Pendente':   { bg: '#fffbeb', text: '#d97706' },
  'Trial':      { bg: '#fffbeb', text: '#d97706' },
  'Enviado':    { bg: '#eff6ff', text: '#2563eb' },
  'Em curso':   { bg: '#eff6ff', text: '#2563eb' },
  'Cancelado':  { bg: '#fef2f2', text: '#dc2626' },
  'Erro':       { bg: '#fef2f2', text: '#dc2626' },
  'Devolvido':  { bg: '#f5f0ff', text: '#7c3aed' },
};

export function StatusBadge({ status, map }: StatusBadgeProps) {
  const lookup = map ?? DEFAULT_MAP;
  const style  = lookup[status] ?? { bg: '#f5f5f5', text: '#666' };
  return (
    <span style={{ background: style.bg, color: style.text }}
      className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold">
      {status}
    </span>
  );
}
