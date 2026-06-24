import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, ChevronDown, X } from 'lucide-react';

interface FilterState {
  year: string;
  month: string;
  days: string[];
  [key: string]: any;
}

interface SmartDateFilterProps<T extends FilterState> {
  filters: T;
  setFilters: React.Dispatch<React.SetStateAction<T>>;
  availableFilters: {
    years: string[];
    months: string[];
    days: string[];
  };
  counts: {
    years: Record<string, number>;
    months: Record<string, number>;
    days: Record<string, number>;
  };
  itemLabel?: string;
}

const monthNames = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const SmartDateFilter = <T extends FilterState>({
  filters,
  setFilters,
  availableFilters,
  counts,
  itemLabel = 'vendas'
}: SmartDateFilterProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleYearSelect = (year: string) => {
    setFilters(prev => ({
      ...prev,
      year: prev.year === year ? '' : year,
      month: '',
      days: []
    } as T));
  };

  const handleMonthSelect = (month: string) => {
    if (!filters.year) return;
    setFilters(prev => ({
      ...prev,
      month: prev.month === month ? '' : month,
      days: []
    }));
  };

  const handleDaySelect = (day: string, event: React.MouseEvent) => {
    if (!filters.month) return;

    const isMultiSelect = event.ctrlKey || event.metaKey;
    setFilters(prev => {
      const currentDays = prev.days || [];

      if (isMultiSelect) {
        return {
          ...prev,
          days: currentDays.includes(day)
            ? currentDays.filter(value => value !== day)
            : [...currentDays, day].sort()
        };
      }

      return {
        ...prev,
        days: currentDays.includes(day) && currentDays.length === 1 ? [] : [day]
      };
    });
  };

  const clearFilters = (event: React.MouseEvent) => {
    event.stopPropagation();
    setFilters(prev => ({ ...prev, year: '', month: '', days: [] } as T));
    setIsOpen(false);
  };

  const getActiveLabel = () => {
    const parts = [];
    if (filters.year) parts.push(filters.year);
    if (filters.month) parts.push(monthNames[parseInt(filters.month, 10) - 1]);
    if (filters.days?.length === 1) parts.push(`Dia ${filters.days[0]}`);
    if (filters.days?.length > 1) parts.push(`${filters.days.length} dias`);

    return parts.length > 0 ? parts.join(' / ') : 'Filtrar por data';
  };

  return (
    <div className="relative z-50" ref={containerRef}>
      <button
        onClick={() => setIsOpen(value => !value)}
        className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 transition-colors ${
          isOpen || filters.year
            ? 'border-primary bg-primary text-white'
            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
        }`}
      >
        <Calendar className="h-4 w-4" />
        <span className="text-sm font-semibold">{getActiveLabel()}</span>
        {filters.year ? (
          <span onClick={clearFilters} className="ml-1 rounded-full bg-white/20 p-1 hover:bg-white/30">
            <X className="h-3 w-3" />
          </span>
        ) : (
          <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute left-0 top-full z-50 mt-3 flex w-[340px] flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-black/10 dark:border-white/10 dark:bg-card"
          >
            <section>
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Ano</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableFilters.years.map(year => (
                  <button
                    key={year}
                    onClick={() => handleYearSelect(year)}
                    className={`flex-1 rounded-xl border px-3 py-1.5 text-sm font-semibold transition-colors ${
                      filters.year === year
                        ? 'border-primary bg-primary text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                    }`}
                  >
                    {year}
                    <span className={`mt-0.5 block text-[11px] font-medium ${filters.year === year ? 'text-white/80' : 'text-slate-400'}`}>
                      {counts.years[year] || 0} {itemLabel}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className={`transition-opacity ${!filters.year ? 'pointer-events-none opacity-40' : ''}`}>
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Mes</span>
                {!filters.year && <span className="text-xs font-medium text-rose-500">Selecione um ano</span>}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {monthNames.map((month, index) => {
                  const monthNum = (index + 1).toString().padStart(2, '0');
                  const isAvailable = availableFilters.months.includes(monthNum);

                  return (
                    <button
                      key={month}
                      disabled={!isAvailable}
                      onClick={() => handleMonthSelect(monthNum)}
                      className={`rounded-lg border py-1.5 text-xs font-semibold transition-colors ${
                        filters.month === monthNum
                          ? 'border-primary bg-primary text-white'
                          : isAvailable
                            ? 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                            : 'cursor-not-allowed border-transparent bg-transparent text-slate-300 dark:text-slate-700'
                      }`}
                    >
                      {month.slice(0, 3)}
                      {isAvailable && (
                        <span className={`mt-0.5 block text-[10px] font-medium ${filters.month === monthNum ? 'text-white/80' : 'text-slate-400'}`}>
                          {counts.months[monthNum] || 0}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className={`transition-opacity ${!filters.month ? 'pointer-events-none opacity-40' : ''}`}>
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Dia</span>
              </div>
              <div className="mb-1 grid grid-cols-7 gap-1">
                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map(dayName => (
                  <div key={dayName} className="flex h-5 w-7 items-center justify-center text-[9px] font-semibold text-slate-500">
                    {dayName}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 31 }, (_, index) => {
                  const day = (index + 1).toString().padStart(2, '0');
                  const isSelected = filters.days?.includes(day) || false;
                  const dayCount = counts.days[day] || 0;

                  return (
                    <button
                      key={day}
                      onClick={event => handleDaySelect(day, event)}
                      className={`relative flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                      }`}
                    >
                      {index + 1}
                      {dayCount > 0 && (
                        <span className={`absolute -right-0.5 -top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-1 text-[8px] font-semibold ${
                          isSelected ? 'bg-white text-primary' : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        }`}>
                          {dayCount > 99 ? '+' : dayCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
