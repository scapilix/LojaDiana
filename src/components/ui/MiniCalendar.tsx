import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  onSelect?: (date: Date) => void;
  selected?: Date | null;
  /** Dates with activity markers — format YYYY-MM-DD */
  activeDates?: string[];
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

export function MiniCalendar({ onSelect, selected, activeDates = [] }: Props) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth     = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const activeSet = new Set(activeDates);

  const toKey = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const goToday   = () => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));

  const isSelected = (d: number) =>
    selected &&
    selected.getFullYear() === year &&
    selected.getMonth() === month &&
    selected.getDate() === d;

  const isToday = (d: number) =>
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === d;

  // Build cells: prev-month overflow + current month + next-month overflow
  const cells: { day: number; inMonth: boolean; date: Date }[] = [];

  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    cells.push({ day: d, inMonth: false, date: new Date(year, month - 1, d) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, inMonth: true, date: new Date(year, month, d) });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, inMonth: false, date: new Date(year, month + 1, d) });
  }

  return (
    <div className="bg-white rounded-2xl border border-[hsl(35_18%_90%)] shadow-[0_1px_4px_rgba(0,0,0,0.05)] p-4 select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth}
          className="h-7 w-7 rounded-lg hover:bg-[hsl(35_18%_94%)] flex items-center justify-center transition-colors">
          <ChevronLeft className="h-4 w-4 text-[hsl(30_8%_55%)]" />
        </button>

        <button onClick={goToday}
          className="text-[13px] font-bold text-[hsl(20_15%_8%)] hover:text-[hsl(340_72%_45%)] transition-colors">
          {MONTHS[month]} {year}
        </button>

        <button onClick={nextMonth}
          className="h-7 w-7 rounded-lg hover:bg-[hsl(35_18%_94%)] flex items-center justify-center transition-colors">
          <ChevronRight className="h-4 w-4 text-[hsl(30_8%_55%)]" />
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(w => (
          <div key={w} className="text-center text-[10px] font-semibold text-[hsl(30_8%_62%)] uppercase tracking-wide py-1">
            {w}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((cell, i) => {
          const key = toKey(
            cell.date.getFullYear(),
            cell.date.getMonth(),
            cell.date.getDate(),
          );
          const hasActivity = activeSet.has(key);
          const sel = cell.inMonth && isSelected(cell.day);
          const tod = cell.inMonth && isToday(cell.day);

          return (
            <button
              key={i}
              onClick={() => cell.inMonth && onSelect?.(cell.date)}
              className={[
                'relative flex flex-col items-center justify-center h-8 w-full rounded-lg text-[12px] font-semibold transition-all',
                !cell.inMonth
                  ? 'text-[hsl(30_8%_78%)] cursor-default'
                  : sel
                    ? 'bg-[hsl(340_72%_45%)] text-white'
                    : tod
                      ? 'bg-[hsl(340_72%_95%)] text-[hsl(340_72%_40%)]'
                      : 'text-[hsl(20_15%_15%)] hover:bg-[hsl(35_18%_94%)] cursor-pointer',
              ].join(' ')}
            >
              {cell.day}
              {hasActivity && cell.inMonth && !sel && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-[hsl(340_72%_45%)]" />
              )}
              {hasActivity && sel && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-white/60" />
              )}
            </button>
          );
        })}
      </div>

      {/* Today shortcut */}
      <button onClick={() => { goToday(); onSelect?.(today); }}
        className="mt-3 w-full text-[11px] font-semibold text-[hsl(340_72%_45%)] hover:text-[hsl(340_72%_35%)] transition-colors text-center">
        Hoje
      </button>
    </div>
  );
}
