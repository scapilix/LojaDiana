import { ReactNode } from 'react';

type KpiAccent = 'rose' | 'green' | 'blue' | 'amber';

interface KpiCardProps {
  label: string;
  value: string | number;
  change?: string;
  changePositive?: boolean;
  accent?: KpiAccent;
  icon?: ReactNode;
}

const ACCENT_GRADIENTS: Record<KpiAccent, string> = {
  rose:  'linear-gradient(90deg, hsl(340 72% 45%), hsl(340 60% 62%))',
  green: 'linear-gradient(90deg, #10b981, #34d399)',
  blue:  'linear-gradient(90deg, #3b82f6, #60a5fa)',
  amber: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
};

export function KpiCard({ label, value, change, changePositive = true, accent = 'rose', icon }: KpiCardProps) {
  return (
    <div className="relative bg-white rounded-[14px] border border-[hsl(35_18%_90%)] p-4 overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[14px]"
        style={{ background: ACCENT_GRADIENTS[accent] }} />
      <div className="flex items-start justify-between mb-2 mt-1">
        <p className="text-[10px] font-bold text-[hsl(30_8%_55%)] uppercase tracking-[0.06em]">{label}</p>
        {icon && <span className="text-[hsl(30_8%_70%)]">{icon}</span>}
      </div>
      <p className="font-['Playfair_Display'] text-[22px] font-bold text-[hsl(20_15%_8%)] leading-none mb-1.5">
        {value}
      </p>
      {change && (
        <p className={`text-[10px] font-semibold ${changePositive ? 'text-emerald-600' : 'text-rose-500'}`}>
          {changePositive ? '↑' : '↓'} {change}
        </p>
      )}
    </div>
  );
}
