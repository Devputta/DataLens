import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Database, FileSpreadsheet, Info, ShieldCheck } from 'lucide-react';
import { ColumnProfile, DataQualityReport, Dataset } from '../types/analytics';
import { formatMetric } from '../utils/visualizationEngine';
import { useTheme } from '../context/ThemeContext';

interface DataQualityViewProps {
  dataset: Dataset;
}

export const DataQualityView: React.FC<DataQualityViewProps> = ({ dataset }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { qualityReport, columns, activeSheet, name } = dataset;
  const { totalRows, totalColumns, duplicateRowsCount, overallHealthScore, warnings } = qualityReport;

  const getScoreColor = (score: number) => {
    if (score >= 85) return isDark ? 'text-emerald-400 border-emerald-500/40 bg-emerald-950/20' : 'text-emerald-700 border-emerald-300 bg-emerald-50';
    if (score >= 65) return isDark ? 'text-amber-400 border-amber-500/40 bg-amber-950/20' : 'text-amber-700 border-amber-300 bg-amber-50';
    return isDark ? 'text-rose-400 border-rose-500/40 bg-rose-950/20' : 'text-rose-700 border-rose-300 bg-rose-50';
  };

  return (
    <div className="space-y-6">
      
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Health Score */}
        <div className={`p-5 border rounded-xl flex items-center justify-between transition-colors ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div>
            <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Dataset Health Score</span>
            <div className={`mt-1.5 text-3xl font-bold font-mono tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {overallHealthScore}<span className={`text-sm font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>/100</span>
            </div>
            <span className={`text-[11px] mt-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {overallHealthScore >= 85 ? 'Optimal structural integrity' : overallHealthScore >= 65 ? 'Minor anomalies flagged' : 'Significant issues detected'}
            </span>
          </div>
          <div className={`p-3 rounded-full border ${getScoreColor(overallHealthScore)}`}>
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Total Records */}
        <div className={`p-5 border rounded-xl transition-colors ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Rows</span>
          <div className={`mt-1.5 text-3xl font-bold font-mono tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {totalRows.toLocaleString()}
          </div>
          <span className={`text-[11px] mt-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Active sheet: {activeSheet}</span>
        </div>

        {/* Total Columns */}
        <div className={`p-5 border rounded-xl transition-colors ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Profiled Columns</span>
          <div className={`mt-1.5 text-3xl font-bold font-mono tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {totalColumns}
          </div>
          <span className={`text-[11px] mt-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {columns.filter((c) => c.type === 'numeric').length} numeric · {columns.filter((c) => c.type === 'category').length} category
          </span>
        </div>

        {/* Duplicate Rows */}
        <div className={`p-5 border rounded-xl transition-colors ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Duplicate Rows</span>
          <div className={`mt-1.5 text-3xl font-bold font-mono tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {duplicateRowsCount.toLocaleString()}
          </div>
          <span className={`text-[11px] mt-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {duplicateRowsCount === 0 ? 'Zero duplicates found' : 'May inflate aggregated totals'}
          </span>
        </div>

      </div>

      {/* Warnings & Suggestions list */}
      {warnings.length > 0 && (
        <div className={`p-5 border rounded-xl space-y-3 transition-colors ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <h3 className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Quality Audit Warnings ({warnings.length})</span>
          </h3>

          <div className="space-y-2">
            {warnings.map((warn, i) => (
              <div
                key={i}
                className={`p-3.5 rounded-lg border flex items-start gap-3 text-xs ${
                  warn.level === 'critical'
                    ? isDark ? 'bg-rose-950/20 border-rose-800 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800'
                    : warn.level === 'warning'
                    ? isDark ? 'bg-amber-950/20 border-amber-800 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
                    : isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {warn.level === 'critical' ? (
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                  ) : warn.level === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Info className="w-4 h-4 text-blue-500" />
                  )}
                </div>
                <div>
                  <div className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {warn.column ? `Column [${warn.column}]: ` : ''}
                    {warn.message}
                  </div>
                  <div className={`mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{warn.suggestion}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Columns Profiling Table */}
      <div className={`border rounded-xl overflow-hidden shadow-xs transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className={`p-4 border-b ${isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'}`}>
          <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Column Profiles & Statistical Summary</h3>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Type classification, missingness rates, unique cardinalities, and descriptive distributions.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className={`border-b uppercase font-mono tracking-wider ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}>
              <tr>
                <th className="py-2.5 px-4">Column</th>
                <th className="py-2.5 px-4">Detected Type</th>
                <th className="py-2.5 px-4 text-right">Missing</th>
                <th className="py-2.5 px-4 text-right">Unique Values</th>
                <th className="py-2.5 px-4">Statistical Summary / Range</th>
                <th className="py-2.5 px-4">Sample Values</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-sans ${
              isDark ? 'divide-slate-800/60 text-slate-300' : 'divide-slate-200 text-slate-700'
            }`}>
              {columns.map((col) => (
                <tr key={col.name} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                  <td className={`py-3 px-4 font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {col.name}
                  </td>
                  <td className="py-3 px-4 font-mono">
                    <span className={`px-2 py-0.5 rounded text-[11px] uppercase ${
                      isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {col.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {col.nullCount > 0 ? (
                      <span className={col.nullPercentage > 20 ? 'text-rose-500 font-semibold' : (isDark ? 'text-slate-300' : 'text-slate-700')}>
                        {col.nullCount} ({col.nullPercentage}%)
                      </span>
                    ) : (
                      <span className="text-emerald-500">0 (0%)</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {col.uniqueCount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-xs font-mono tabular-nums">
                    {col.type === 'numeric' && col.min !== undefined && col.max !== undefined ? (
                      <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                        Min: {formatMetric(col.min, 'number')} · Max: {formatMetric(col.max, 'number')} · μ: {formatMetric(col.mean || 0, 'number')}
                      </span>
                    ) : col.type === 'date' && col.minDate && col.maxDate ? (
                      <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                        {col.minDate} &rarr; {col.maxDate}
                      </span>
                    ) : col.topCategories && col.topCategories.length > 0 ? (
                      <span className={`font-sans ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Top: {col.topCategories.slice(0, 2).map((c) => `${c.value} (${c.percentage}%)`).join(', ')}
                      </span>
                    ) : (
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>—</span>
                    )}
                  </td>
                  <td className={`py-3 px-4 font-mono text-[11px] truncate max-w-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {col.sampleValues.filter((v) => v !== null).slice(0, 3).map(String).join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
