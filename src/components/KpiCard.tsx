import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  color?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({ label, value, icon: Icon, trend, color = 'blue' }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden p-4 rounded-2xl glass transition-all duration-300 group"
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          {label}
        </span>
        <div className={`p-1.5 rounded-lg bg-primary/5 text-primary border border-primary/10`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>

      <div className="relative z-10">
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
            {value}
          </h3>
          {trend && (
            <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-0.5">
              {trend.startsWith('+') || trend.includes('%') ? '↑' : ''} {trend}
            </span>
          )}
        </div>
        
        {/* stitch Decoration Line */}
        <div className="kpi-accent-line" />
      </div>
    </motion.div>
  );
}
;
