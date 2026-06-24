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

function MiniSparkBar({ data, color = '#C2185B' }: { data: { value: number }[], color?: string }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map((d: any) => d.value), 1);
  return (
    <div className="flex items-end gap-0.5 mt-3 h-7">
      {data.map((d: any, i: number) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all"
          style={{
            height: `${Math.max((d.value / max) * 100, 10)}%`,
            backgroundColor: color,
            opacity: 0.3 + (i / data.length) * 0.7
          }}
        />
      ))}
    </div>
  );
}

const accentConfig: Record<string, { bar: string; iconBg: string; iconText: string; sparkColor: string }> = {
  blue:    { bar: '#3B82F6', iconBg: 'rgb(239 246 255)', iconText: '#2563EB', sparkColor: '#3B82F6' },
  indigo:  { bar: '#3B82F6', iconBg: 'rgb(239 246 255)', iconText: '#2563EB', sparkColor: '#3B82F6' },
  emerald: { bar: '#10B981', iconBg: 'rgb(236 253 245)', iconText: '#059669', sparkColor: '#10B981' },
  rose:    { bar: '#C2185B', iconBg: 'rgb(255 241 242)', iconText: '#C2185B', sparkColor: '#C2185B' },
  amber:   { bar: '#F59E0B', iconBg: 'rgb(255 251 235)', iconText: '#D97706', sparkColor: '#F59E0B' },
  violet:  { bar: '#8B5CF6', iconBg: 'rgb(245 243 255)', iconText: '#7C3AED', sparkColor: '#8B5CF6' },
  purple:  { bar: '#C2185B', iconBg: 'rgb(255 241 242)', iconText: '#C2185B', sparkColor: '#C2185B' },
  slate:   { bar: '#64748B', iconBg: 'rgb(248 250 252)', iconText: '#475569', sparkColor: '#64748B' },
  teal:    { bar: '#14B8A6', iconBg: 'rgb(240 253 250)', iconText: '#0D9488', sparkColor: '#14B8A6' },
};

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  sub,
  trend,
  icon: Icon,
  sparkData,
  sparkColor,
  accent = 'blue'
}) => {
  const config = accentConfig[accent] || accentConfig.blue;
  const isNumericTrend = typeof trend === 'number';
  const isUp = isNumericTrend ? (trend as number) >= 0 : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-xl border border-border bg-card flex flex-col transition-shadow hover:shadow-md"
    >
      {/* Top accent bar */}
      <div className="h-[3px] w-full" style={{ backgroundColor: config.bar }} />

      <div className="flex flex-col flex-1 p-5">
        {/* Label + icon row */}
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide leading-tight">
            {label}
          </p>
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: config.iconBg, color: config.iconText }}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>

        {/* Main value */}
        <div
          className="text-[1.75rem] font-bold leading-none text-foreground"
          style={{ fontFamily: '"Playfair Display", Georgia, serif', letterSpacing: '-0.02em' }}
        >
          {value}
        </div>

        {/* Trend / sub */}
        <div className="mt-3 flex items-center gap-2">
          {trend !== undefined && (
            isNumericTrend ? (
              <span
                className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  isUp
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                    : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                }`}
              >
                {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(trend as number).toFixed(1)}%
              </span>
            ) : (
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                {trend}
              </span>
            )
          )}
          {sub && (
            <span className="text-xs text-muted-foreground">{sub}</span>
          )}
        </div>

        {/* Sparkbar */}
        {sparkData && (
          <MiniSparkBar data={sparkData} color={sparkColor || config.sparkColor} />
        )}
      </div>
    </motion.div>
  );
};
