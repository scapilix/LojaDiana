import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon ? (
        <div className="mb-4 h-16 w-16 rounded-2xl bg-[hsl(340_40%_95%)] flex items-center justify-center text-[hsl(340_72%_45%)]">
          {icon}
        </div>
      ) : (
        <svg className="mb-4 w-16 h-16 text-[hsl(35_18%_85%)]" viewBox="0 0 64 64" fill="none">
          <rect x="8" y="16" width="48" height="36" rx="6" stroke="currentColor" strokeWidth="2"/>
          <path d="M8 26h48" stroke="currentColor" strokeWidth="2"/>
          <path d="M20 36h8M20 42h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )}
      <h3 className="font-['Playfair_Display'] text-lg font-bold text-[hsl(20_15%_8%)] mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-[hsl(30_8%_55%)] max-w-xs mb-5">{description}</p>
      )}
      {action && (
        <button onClick={action.onClick}
          className="bg-[hsl(340_72%_45%)] text-white text-sm font-semibold px-5 py-2.5 rounded-[10px] hover:bg-[hsl(340_72%_38%)] transition-colors">
          {action.label}
        </button>
      )}
    </div>
  );
}
