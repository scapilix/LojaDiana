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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="relative overflow-hidden p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:shadow-lg transition-all duration-300 group shadow-sm"
    >
      <div className={`absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity duration-500`}>
        <Icon className={`w-16 h-16 text-slate-900 dark:text-white transform rotate-12 group-hover:rotate-6 transition-transform duration-500`} />
      </div>

      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start mb-3">
          <div className={`p-2 rounded-xl bg-${color}-500/10 text-${color}-600 dark:text-${color}-400 ring-1 ring-${color}-500/20`}>
            <Icon className="w-4 h-4" />
          </div>
          {trend && (
            <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10">
              {trend}
            </span>
          )}
        </div>

        <div>
           <p className="text-[9px] font-black text-slate-600 dark:text-slate-400 mb-0.5 uppercase tracking-widest">{label}</p>
           <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{value}</h3>
        </div>
      </div>
    </motion.div>
  );
};
