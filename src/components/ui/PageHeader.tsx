import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  filters?: ReactNode;
}

export function PageHeader({ title, subtitle, actions, filters }: PageHeaderProps) {
  return (
    <div className="bg-white border-b border-[hsl(35_18%_90%)] px-6 py-3 flex-shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h1 className="font-['Playfair_Display'] text-[17px] font-bold text-[hsl(20_15%_8%)] leading-tight">
              {title}
            </h1>
            {subtitle && (
              <span className="text-[11px] text-[hsl(30_8%_55%)]">{subtitle}</span>
            )}
          </div>
        </div>
        {filters && <div className="flex items-center gap-2">{filters}</div>}
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
