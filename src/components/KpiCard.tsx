import React from 'react';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: string | number;
  icon: LucideIcon;
  sparkData?: { value: number }[];
  sparkColor?: string;
  accent?: 'indigo' | 'emerald' | 'violet' | 'amber' | 'rose' | 'slate' | 'blue' | 'purple' | 'teal';
}

function MiniSparkBar({ data, color = '#6366f1' }: { data: { value: number }[], color?: string }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map((d: any) => d.value), 1);
  return (
    <div className="h-8 flex items-end gap-0.5 mt-4">
      {data.map((d: any, i: number) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all"
          style={{ 
            height: `${Math.max((d.value / max) * 100, 10)}%`, 
            backgroundColor: color, 
            opacity: 0.4 + (i / data.length) * 0.6 
          }}
        />
      ))}
    </div>
  );
}

const accentMap: Record<string, string> = {
  indigo: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-500/20',
  emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-500/20',
  violet: 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200/50 dark:border-violet-500/20',
  amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-500/20',
  rose: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200/50 dark:border-rose-500/20',
  slate: 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200/50 dark:border-white/10',
  blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-500/20',
  purple: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200/50 dark:border-purple-500/20',
  teal: 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200/50 dark:border-teal-500/20',
};

export const KpiCard: React.FC<KpiCardProps> = ({ 
  label, 
  value, 
  sub, 
  trend, 
  icon: Icon, 
  sparkData, 
  sparkColor, 
  accent = 'indigo' 
}) => {
  const isNumericTrend = typeof trend === 'number';
  const isUp = isNumericTrend ? (trend as number) >= 0 : null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 rounded-2xl p-5 flex flex-col hover:border-primary/20 transition-all hover:shadow-xl group relative overflow-hidden"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${accentMap[accent]}`}>
          <Icon className="w-4 h-4" />
        </div>
        
        {trend !== undefined && (
          <div className="flex items-center gap-1">
            {isNumericTrend ? (
              <span className={`flex items-center gap-0.5 text-[10px] font-black uppercase tracking-wider ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(trend as number).toFixed(1)}%
              </span>
            ) : (
              <span className="px-2 py-1 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200 dark:border-white/10">
                {trend}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="relative z-10">
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
          {label}
        </p>
        <h3 className="text-2xl font-black text-slate-950 dark:text-white leading-none tracking-tight">
          {value}
        </h3>
        {sub && (
          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-2 uppercase tracking-tighter">
            {sub}
          </p>
        )}
      </div>

      {sparkData && <MiniSparkBar data={sparkData} color={sparkColor} />}
      
      {/* Decorative accent line */}
      <div className={`absolute bottom-0 left-0 h-1 w-full scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500 ${accentMap[accent].split(' ')[2].replace('text-', 'bg-')}`} />
    </motion.div>
  );
};
