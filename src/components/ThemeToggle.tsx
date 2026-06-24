import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

interface ThemeToggleProps {
  isDark: boolean;
  toggle: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ isDark, toggle }) => {
  return (
    <button
      onClick={toggle}
      className="h-9 w-9 rounded-full bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 relative overflow-hidden transition-colors active:scale-95"
      title={isDark ? "Mudar para Modo Dia" : "Mudar para Modo Noite"}
    >
      <motion.div
        initial={false}
        animate={{ rotate: isDark ? 0 : 90, opacity: isDark ? 0 : 1 }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <Sun className="w-4 h-4 text-amber-500" />
      </motion.div>
      <motion.div
        initial={false}
        animate={{ rotate: isDark ? 0 : -90, opacity: isDark ? 1 : 0 }}
        className="flex items-center justify-center"
      >
        <Moon className="w-4 h-4 text-blue-300" />
      </motion.div>
    </button>
  );
};
