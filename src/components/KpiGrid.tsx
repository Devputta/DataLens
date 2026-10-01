import React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { KpiCardConfig } from '../types/analytics';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';

interface KpiGridProps {
  kpis: KpiCardConfig[];
}

export const KpiGrid: React.FC<KpiGridProps> = ({ kpis }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { formatAmount } = useCurrency();

  if (!kpis || kpis.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => {
        const isUp = kpi.trend?.direction === 'up';
        const isDown = kpi.trend?.direction === 'down';
        const isNeutral = !isUp && !isDown;

        // Dynamic formatting based on global Currency ($ / ₹) and 'k' unit preference
        const displayValue =
          kpi.format === 'currency'
            ? formatAmount(kpi.value, 'currency')
            : kpi.format === 'percentage'
            ? `${kpi.value.toFixed(1)}%`
            : kpi.format === 'integer'
            ? formatAmount(kpi.value, 'integer')
            : formatAmount(kpi.value, 'number');

        return (
          <div
            key={kpi.id}
            className={`p-5 border rounded-xl transition-all flex flex-col justify-between card-print ${
              isDark
                ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700/80 shadow-xs'
                : 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
            }`}
          >
            {/* Header: Title + Aggregation Tag */}
            <div className={`flex items-center justify-between text-xs ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              <span className="font-medium tracking-wide truncate">{kpi.title}</span>
              <span className={`text-[11px] font-mono uppercase font-semibold ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                {kpi.aggregation}
              </span>
            </div>

            {/* Metric Value & Visual Trend Indicator */}
            <div className="mt-3 flex items-baseline justify-between gap-2">
              <div className={`text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                {displayValue}
              </div>

              {/* Visual Trend Indicator (Up/Down arrow with percentage change) */}
              {kpi.trend && (
                <div
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold transition-colors shrink-0 ${
                    isUp
                      ? isDark
                        ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-600/40 shadow-sm'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : isDown
                      ? isDark
                        ? 'bg-rose-950/70 text-rose-400 border border-rose-600/40 shadow-sm'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                      : isDark
                      ? 'bg-slate-800 text-slate-400 border border-slate-700'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                  title={kpi.trend.label}
                >
                  {isUp && <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />}
                  {isDown && <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />}
                  {isNeutral && <Minus className="w-3.5 h-3.5 stroke-[2.5]" />}
                  <span>
                    {isUp ? '+' : isDown ? '-' : ''}
                    {kpi.trend.percentage}%
                  </span>
                </div>
              )}
            </div>

            {/* Mini Trajectory Sparkline Visual */}
            {kpi.sparkline && kpi.sparkline.length >= 2 && (
              <div className="mt-2.5 h-5 w-full">
                <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                  <polyline
                    fill="none"
                    stroke={isUp ? '#10b981' : isDown ? '#f43f5e' : '#3b82f6'}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.85}
                    points={(() => {
                      const vals = kpi.sparkline!;
                      const min = Math.min(...vals);
                      const max = Math.max(...vals);
                      const range = max - min || 1;
                      return vals
                        .map((v, i) => {
                          const x = (i / (vals.length - 1)) * 100;
                          const y = 18 - ((v - min) / range) * 16;
                          return `${x.toFixed(1)},${y.toFixed(1)}`;
                        })
                        .join(' ');
                    })()}
                  />
                </svg>
              </div>
            )}

            {/* Subtitle & Growth vs Previous Period label */}
            <div className={`mt-3 pt-2 border-t flex items-center justify-between text-xs ${
              isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-100 text-slate-500'
            }`}>
              <span className="truncate pr-1 text-[11px]">
                {kpi.subtitle || `${kpi.metricColumn} metric`}
              </span>
              {kpi.trend && (
                <span className={`text-[10px] font-mono shrink-0 uppercase tracking-wider ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  vs prev period
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
