import { useMemo } from 'react';

export default function PortfolioMiniChart({ values }: { values: number[] }) {
  const { path, area } = useMemo(() => {
    if (values.length < 2) return { path: '', area: '' };
    const w = 600;
    const h = 120;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const pts = values.map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 16) - 8;
      return `${x},${y}`;
    });
    return {
      path: `M ${pts.join(' L ')}`,
      area: `M 0,${h} L ${pts.join(' L ')} L ${w},${h} Z`,
    };
  }, [values]);

  return (
    <svg viewBox="0 0 600 120" className="w-full h-32" preserveAspectRatio="none">
      <defs>
        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#chartFill)" />
      <path d={path} fill="none" stroke="#10b981" strokeWidth="2.5" />
    </svg>
  );
}
