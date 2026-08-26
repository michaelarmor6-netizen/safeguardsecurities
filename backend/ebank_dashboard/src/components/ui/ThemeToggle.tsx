import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={`inline-flex items-center gap-2 rounded-[10px] border px-3 py-2 text-sm transition ${className}`}
      style={{
        borderColor: 'var(--sg-border-ghost)',
        color: 'var(--sg-muted)',
        background: 'var(--sg-surface)',
        fontFamily: 'var(--sg-font-display)',
      }}
    >
      {isDark ? <Sun className="h-4 w-4" style={{ color: 'var(--sg-gold)' }} /> : <Moon className="h-4 w-4" style={{ color: 'var(--sg-indigo)' }} />}
      <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
    </button>
  );
}
