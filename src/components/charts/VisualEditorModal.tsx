import React, { useState, useEffect } from 'react';
import { X, Sliders, Palette, BarChart3, LineChart, PieChart, ScatterChart, Check, RotateCcw, TrendingUp, Globe, AlertTriangle } from 'lucide-react';
import { ChartConfig, ChartType, ColumnProfile, MapRegionScope } from '../../types/analytics';
import { useTheme } from '../../context/ThemeContext';

interface VisualEditorModalProps {
  isOpen: boolean;
  chart: ChartConfig | null;
  columns: ColumnProfile[];
  onClose: () => void;
  onSave: (updatedConfig: Partial<ChartConfig>) => void;
  onResetToDefault?: () => void;
}

const CHART_TYPES: { type: ChartType; label: string; desc: string }[] = [
  { type: 'map', label: 'Geographic Map', desc: 'Regional choropleth & country/territory visual distribution' },
  { type: 'area', label: 'Area Chart', desc: 'Continuous trajectory with gradient fill' },
  { type: 'line', label: 'Line Chart', desc: 'Clean trend lines over time or steps' },
  { type: 'bar', label: 'Vertical Bar', desc: 'Compare categories and metric volumes' },
  { type: 'horizontal_bar', label: 'Horizontal Bar', desc: 'Best for long segment names' },
  { type: 'donut', label: 'Donut Chart', desc: 'Part-to-whole segment percentage share' },
  { type: 'pareto', label: 'Pareto 80/20', desc: 'Cumulative volume curve & threshold' },
  { type: 'boxplot', label: 'Boxplot Spread', desc: 'Quartiles, median, min, max dispersion' },
  { type: 'heatmap', label: '2D Heatmap', desc: 'Matrix concentration across 2 dimensions' },
  { type: 'scatter', label: 'Scatter Plot', desc: 'Correlation between two numeric metrics' },
];

const MAP_REGIONS: { id: MapRegionScope; label: string; desc: string }[] = [
  { id: 'world', label: 'World Map', desc: 'Global continents, international trade corridors & marine bounds' },
  { id: 'us', label: 'United States (US)', desc: 'US states, economic corridors & major metro hubs' },
  { id: 'india', label: 'India Map', desc: 'National states, tech corridors (Bengaluru, Mumbai, Delhi, Hyderabad)' },
  { id: 'europe', label: 'Europe & UK', desc: 'Continental Europe, United Kingdom, DACH, Nordics & Mediterranean' },
  { id: 'apac', label: 'Asia-Pacific (APAC)', desc: 'Japan, Singapore, Australia, South Korea & East Asian hubs' },
];

const COLOR_THEMES = [
  { id: 'modern-blue', name: 'Electric Blue', colors: ['#3B82F6', '#60A5FA', '#93C5FD'] },
  { id: 'emerald-growth', name: 'Emerald Forest', colors: ['#10B981', '#34D399', '#6EE7B7'] },
  { id: 'sunset-amber', name: 'Sunset Amber', colors: ['#F59E0B', '#FBBF24', '#FCD34D'] },
  { id: 'royal-purple', name: 'Royal Violet', colors: ['#8B5CF6', '#A78BFA', '#C4B5FD'] },
  { id: 'crimson-rose', name: 'Crimson Rose', colors: ['#EC4899', '#F472B6', '#FBCFE8'] },
  { id: 'teal-ocean', name: 'Teal Ocean', colors: ['#06B6D4', '#22D3EE', '#67E8F9'] },
];

export const VisualEditorModal: React.FC<VisualEditorModalProps> = ({
  isOpen,
  chart,
  columns,
  onClose,
  onSave,
  onResetToDefault,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [type, setType] = useState<ChartType>('bar');
  const [xAxisColumn, setXAxisColumn] = useState('');
  const [yAxisColumn, setYAxisColumn] = useState('');
  const [aggregation, setAggregation] = useState<'sum' | 'avg' | 'count'>('sum');
  const [colorTheme, setColorTheme] = useState('modern-blue');

  // Trendline & Predictive Linear Regression State
  const [trendlineEnabled, setTrendlineEnabled] = useState(false);
  const [trendlineType, setTrendlineType] = useState<'linear' | 'moving_average' | 'polynomial'>('linear');
  const [projectFuturePoints, setProjectFuturePoints] = useState<number>(3);

  // Country & Regional Map Scope State
  const [mapRegion, setMapRegion] = useState<MapRegionScope>('world');

  // Statistical Anomaly Detection State (Z-Score Thresholding)
  const [anomalyEnabled, setAnomalyEnabled] = useState(false);
  const [anomalyThreshold, setAnomalyThreshold] = useState<number>(2.0);
  const [anomalyHighlightColor, setAnomalyHighlightColor] = useState<string>('#ef4444');

  useEffect(() => {
    if (chart) {
      setTitle(chart.title);
      setSubtitle(chart.subtitle || '');
      setType(chart.type);
      setXAxisColumn(chart.xAxisColumn);
      setYAxisColumn(chart.yAxisColumn);
      setAggregation(chart.aggregation || 'sum');
      setColorTheme(chart.colorTheme || 'modern-blue');

      // Initialize trendline settings
      setTrendlineEnabled(Boolean(chart.trendline?.enabled));
      setTrendlineType(chart.trendline?.type || 'linear');
      setProjectFuturePoints(typeof chart.trendline?.projectFuturePoints === 'number' ? chart.trendline.projectFuturePoints : 3);

      // Initialize map region scope
      setMapRegion(chart.mapRegion || 'world');

      // Initialize anomaly detection settings
      setAnomalyEnabled(Boolean(chart.anomalyDetection?.enabled));
      setAnomalyThreshold(typeof chart.anomalyDetection?.threshold === 'number' ? chart.anomalyDetection.threshold : 2.0);
      setAnomalyHighlightColor(chart.anomalyDetection?.highlightColor || '#ef4444');
    }
  }, [chart]);

  if (!isOpen || !chart) return null;

  const numericCols = columns.filter((c) => c.type === 'numeric');
  const categoryAndDateCols = columns.filter((c) => c.type === 'category' || c.type === 'date' || c.type === 'text' || c.type === 'id');

  // Live statistical calculation of outliers in currently loaded chart data
  const dataAnomalyCount = (() => {
    if (!chart.data || chart.data.length < 3) return 0;
    const values = chart.data.map((d: any) => Number(d.value) || 0);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0) return 0;
    return values.filter((v) => Math.abs((v - mean) / stdDev) >= anomalyThreshold).length;
  })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: chart.id,
      title: title.trim() || chart.title,
      subtitle: subtitle.trim(),
      type,
      xAxisColumn: xAxisColumn || chart.xAxisColumn,
      yAxisColumn: yAxisColumn || chart.yAxisColumn,
      aggregation,
      colorTheme,
      trendline: {
        enabled: trendlineEnabled,
        type: trendlineType,
        projectFuturePoints: trendlineEnabled ? projectFuturePoints : 0,
      },
      mapRegion: type === 'map' ? mapRegion : undefined,
      anomalyDetection: {
        enabled: anomalyEnabled,
        threshold: anomalyThreshold,
        highlightColor: anomalyHighlightColor,
      },
      isCustom: true,
    });
    onClose();
  };

  const isTrendSupported = type === 'line' || type === 'area' || type === 'bar' || type === 'horizontal_bar';
  const isAnomalySupported = type === 'line' || type === 'area' || type === 'bar' || type === 'horizontal_bar' || chart.isTimeBased;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 no-print overflow-y-auto">
      <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl p-6 transition-all my-8 ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-inherit">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-500 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Customize Visual</h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Edit chart type, dimensions, trendline regressions, country maps, and styling.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition-colors ${
              isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-500'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          
          {/* Title & Subtitle */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                Chart Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg text-xs font-medium border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
                placeholder="e.g. Monthly Revenue Spread"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                Subtitle / Description
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg text-xs font-medium border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
                placeholder="e.g. Segmented by customer tier"
              />
            </div>
          </div>

          {/* Chart Type Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2 opacity-80">
              Visualization Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CHART_TYPES.map((t) => {
                const isSelected = type === t.type;
                return (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => setType(t.type)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500 font-semibold'
                        : isDark
                        ? 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs">{t.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-500" />}
                    </div>
                    <p className={`text-[10px] mt-1 line-clamp-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {t.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dedicated Country Map Scope Selector (when type === 'map') */}
          {type === 'map' && (
            <div className={`p-4 rounded-xl border space-y-3 ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-semibold">Geographic Map Region / Scope</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">
                  {mapRegion.toUpperCase()} Map
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Select the country or regional map template to render detailed geographic visuals with territorial bounds and regional nodes.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {MAP_REGIONS.map((mr) => {
                  const isSelected = mapRegion === mr.id;
                  return (
                    <button
                      key={mr.id}
                      type="button"
                      onClick={() => setMapRegion(mr.id)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500 font-semibold'
                          : isDark
                          ? 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{mr.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                      </div>
                      <p className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {mr.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add Trendline & Linear Regression Future Projection (for time-based or sequential series) */}
          <div className={`p-4 rounded-xl border space-y-3 ${
            isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold">Trendline & Predictive Regression</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={trendlineEnabled}
                  onChange={(e) => setTrendlineEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                <span className="ml-2 text-xs font-medium">Add Trendline</span>
              </label>
            </div>

            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Uses simple linear regression (Ordinary Least Squares: <code>y = mx + b</code>) to fit historical trajectory and project future data points for time-based series.
            </p>

            {trendlineEnabled && (
              <div className="pt-2 border-t border-inherit space-y-3 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                      Regression Model
                    </label>
                    <select
                      value={trendlineType}
                      onChange={(e: any) => setTrendlineType(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-lg text-xs font-medium border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="linear">Simple Linear Regression (OLS y = mx + b)</option>
                      <option value="moving_average">Moving Average (3-Period Centered)</option>
                      <option value="polynomial">Polynomial Regression (Degree 2)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                      Project Future Data Points
                    </label>
                    <select
                      value={projectFuturePoints}
                      onChange={(e) => setProjectFuturePoints(Number(e.target.value))}
                      className={`w-full px-3 py-1.5 rounded-lg text-xs font-medium border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value={0}>0 (Fit historical trend only, no future points)</option>
                      <option value={1}>+1 Future Period Ahead</option>
                      <option value={2}>+2 Future Periods Ahead</option>
                      <option value={3}>+3 Future Periods Ahead (Recommended)</option>
                      <option value={4}>+4 Future Periods Ahead</option>
                      <option value={5}>+5 Future Periods Ahead</option>
                      <option value={6}>+6 Future Periods Ahead</option>
                    </select>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] font-mono text-amber-300 flex items-center justify-between">
                  <span>
                    ✓ Trendline Projection: {trendlineType === 'linear' ? 'Linear Regression' : trendlineType} with{' '}
                    <strong>+{projectFuturePoints} future {projectFuturePoints === 1 ? 'period' : 'periods'}</strong> extrapolated.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Anomaly Detection Toggle for time-series and sequential charts (Statistical Z-Score Thresholding) */}
          {isAnomalySupported && (
            <div className={`p-4 rounded-xl border space-y-3 ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-rose-500/10 text-rose-500 flex items-center justify-center">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold">Anomaly Detection (Z-Score Thresholding)</span>
                    <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded font-bold bg-rose-500/10 text-rose-400">
                      Statistical
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={anomalyEnabled}
                    onChange={(e) => setAnomalyEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
                  <span className="ml-2 text-xs font-medium">Highlight Anomalies</span>
                </label>
              </div>

              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Uses Gaussian standard deviation thresholding (<code>|Z| = |x - μ| / σ</code>) to identify and highlight data points that deviate significantly from historical mean levels.
              </p>

              {anomalyEnabled && (
                <div className="pt-2 border-t border-inherit space-y-3 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                        Statistical Sensitivity (Z-Score Threshold)
                      </label>
                      <select
                        value={anomalyThreshold}
                        onChange={(e) => setAnomalyThreshold(Number(e.target.value))}
                        className={`w-full px-3 py-1.5 rounded-lg text-xs font-medium border focus:outline-none focus:ring-1 focus:ring-rose-500 ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      >
                        <option value={1.5}>1.5σ (Sensitive — captures mild variations)</option>
                        <option value={2.0}>2.0σ (Standard 95% Confidence — Recommended)</option>
                        <option value={2.5}>2.5σ (Conservative 98.8% Confidence)</option>
                        <option value={3.0}>3.0σ (Extreme 99.7% — Severe Outliers Only)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                        Highlight Indicator Tone
                      </label>
                      <div className="flex items-center gap-2 pt-0.5">
                        {[
                          { id: '#ef4444', label: 'Crimson' },
                          { id: '#f59e0b', label: 'Amber' },
                          { id: '#f43f5e', label: 'Rose' },
                          { id: '#8b5cf6', label: 'Violet' },
                        ].map((tone) => (
                          <button
                            key={tone.id}
                            type="button"
                            onClick={() => setAnomalyHighlightColor(tone.id)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition-all ${
                              anomalyHighlightColor === tone.id
                                ? 'border-rose-500 bg-rose-500/10 text-rose-400 font-semibold ring-1 ring-rose-500'
                                : isDark
                                ? 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
                                : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                            }`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tone.id }} />
                            <span>{tone.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[11px] font-mono text-rose-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>
                        Live Sample Audit: <strong>{dataAnomalyCount} {dataAnomalyCount === 1 ? 'anomaly' : 'anomalies'} detected</strong> in this visual (|Z| ≥ {anomalyThreshold}σ).
                      </span>
                    </span>
                    <span className="text-[10px] opacity-75 font-sans">
                      {dataAnomalyCount > 0 ? 'Pulsing rings will mark anomalous nodes' : 'All values within normal bounds'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dimension (X-Axis) and Metric (Y-Axis) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                X-Axis / Category Column
              </label>
              <select
                value={xAxisColumn}
                onChange={(e) => setXAxisColumn(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg text-xs font-medium border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                {categoryAndDateCols.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.type})
                  </option>
                ))}
                {numericCols.map((c) => (
                  <option key={`num_${c.name}`} value={c.name}>
                    {c.name} (numeric)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                Y-Axis / Metric Column
              </label>
              <select
                value={yAxisColumn}
                onChange={(e) => setYAxisColumn(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg text-xs font-medium border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                {numericCols.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                Aggregation Function
              </label>
              <select
                value={aggregation}
                onChange={(e: any) => setAggregation(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg text-xs font-medium border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value="sum">Sum (Total Aggregate)</option>
                <option value="avg">Average (Arithmetic Mean)</option>
                <option value="count">Count (Frequency / Rows)</option>
              </select>
            </div>
          </div>

          {/* Color Themes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2 opacity-80 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-blue-500" />
              <span>Color Theme</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {COLOR_THEMES.map((themeOption) => {
                const isSelected = colorTheme === themeOption.id;
                return (
                  <button
                    key={themeOption.id}
                    type="button"
                    onClick={() => setColorTheme(themeOption.id)}
                    className={`p-2 rounded-lg border flex items-center justify-between text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500 font-semibold'
                        : isDark
                        ? 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xs">{themeOption.name}</span>
                    <div className="flex items-center gap-1">
                      {themeOption.colors.map((c, i) => (
                        <span key={i} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-inherit">
            <div>
              {onResetToDefault && (
                <button
                  type="button"
                  onClick={() => {
                    onResetToDefault();
                    onClose();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Default</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
              >
                Apply Changes
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
