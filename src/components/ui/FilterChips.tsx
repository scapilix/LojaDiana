interface Chip {
  value: string;
  label: string;
  count?: number;
  dotColor?: string;
}

interface FilterChipsProps {
  chips: Chip[];
  active: string;
  onChange: (value: string) => void;
}

export function FilterChips({ chips, active, onChange }: FilterChipsProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {chips.map(chip => {
        const isActive = chip.value === active;
        return (
          <button key={chip.value} onClick={() => onChange(chip.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
              isActive
                ? 'bg-[hsl(340_72%_45%)] text-white border-[hsl(340_72%_45%)]'
                : 'bg-white text-[hsl(30_8%_40%)] border-[hsl(35_18%_88%)] hover:border-[hsl(340_72%_45%)]'
            }`}>
            {chip.dotColor && (
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: isActive ? 'white' : chip.dotColor }} />
            )}
            {chip.label}
            {chip.count !== undefined && (
              <span className={`text-[10px] font-bold ${isActive ? 'opacity-80' : 'opacity-60'}`}>
                ({chip.count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
