import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Grid,
  Activity,
  BarChart2,
  Pencil,
  X,
  ArrowLeft,
  ArrowRight,
  Globe,
  MapPin,
  Layers,
  GripVertical,
  Maximize2,
  Minimize2,
  AlertTriangle,
} from 'lucide-react';
import { ChartConfig, ChartType, MapRegionScope } from '../../types/analytics';
import { formatMetric } from '../../utils/visualizationEngine';
import { useTheme } from '../../context/ThemeContext';
import { useCurrency } from '../../context/CurrencyContext';
import { calculateTrend, TrendType, TrendResult, TrendPoint } from '../../utils/trendAnalysis';

export interface InteractiveChartProps {
  config: ChartConfig;
  onSelectCategory?: (category: string) => void;
  onClearCategory?: () => void;
  selectedCategory?: string | null;
  onOpenEditModal?: (config: ChartConfig) => void;
  onRemoveVisual?: (chartId: string) => void;
  onAdjustWidth?: (chartId: string) => void;
  isFullWidth?: boolean;
  onMoveEarlier?: (chartId: string) => void;
  onMoveLater?: (chartId: string) => void;
  canMoveEarlier?: boolean;
  canMoveLater?: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  config,
  onSelectCategory,
  onClearCategory,
  selectedCategory,
  onOpenEditModal,
  onRemoveVisual,
  onAdjustWidth,
  isFullWidth = false,
  onMoveEarlier,
  onMoveLater,
  canMoveEarlier = false,
  canMoveLater = false,
  isDragging = false,
  isDragOver = false,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { formatAmount } = useCurrency();

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [activeType, setActiveType] = useState<ChartType>(config.type);
  const [trendType, setTrendType] = useState<TrendType>(
    config.trendline?.enabled ? (config.trendline.type || 'linear') : 'none'
  );
  const [trendFutureSteps, setTrendFutureSteps] = useState<number>(
    typeof config.trendline?.projectFuturePoints === 'number' ? config.trendline.projectFuturePoints : 3
  );

  // Anomaly Detection State (Z-Score Thresholding)
  const [anomalyActive, setAnomalyActive] = useState<boolean>(Boolean(config.anomalyDetection?.enabled));
  const [anomalyThreshold, setAnomalyThreshold] = useState<number>(
    typeof config.anomalyDetection?.threshold === 'number' ? config.anomalyDetection.threshold : 2.0
  );
  const [anomalyColor, setAnomalyColor] = useState<string>(
    config.anomalyDetection?.highlightColor || '#ef4444'
  );

  useEffect(() => {
    setActiveType(config.type);
  }, [config.type]);

  useEffect(() => {
    if (config.trendline) {
      setTrendType(config.trendline.enabled ? (config.trendline.type || 'linear') : 'none');
      if (typeof config.trendline.projectFuturePoints === 'number') {
        setTrendFutureSteps(config.trendline.projectFuturePoints);
      }
    }
  }, [config.trendline]);

  useEffect(() => {
    if (config.anomalyDetection) {
      setAnomalyActive(Boolean(config.anomalyDetection.enabled));
      if (typeof config.anomalyDetection.threshold === 'number') {
        setAnomalyThreshold(config.anomalyDetection.threshold);
      }
      if (config.anomalyDetection.highlightColor) {
        setAnomalyColor(config.anomalyDetection.highlightColor);
      }
    }
  }, [config.anomalyDetection]);

  const { title, subtitle, data } = config;

  const supportsTrend =
    activeType === 'line' ||
    activeType === 'area' ||
    activeType === 'bar' ||
    activeType === 'horizontal_bar';

  // Compute Trend Analysis overlay (Simple Linear Regression OLS, Moving Average, or Polynomial Regression)
  const trendResult = useMemo(() => {
    if (!supportsTrend || trendType === 'none' || !data || data.length < 2) {
      return null;
    }
    return calculateTrend(trendType, data, trendFutureSteps);
  }, [supportsTrend, trendType, trendFutureSteps, data]);

  // Compute Statistical Anomaly Detection (Gaussian Z-score thresholding |Z| = |x - μ| / σ >= threshold)
  const anomalyResult = useMemo(() => {
    if (!anomalyActive || !data || data.length < 3) return null;
    const values = data.map((d: any) => Number(d.value) || 0);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0) {
      return { mean, stdDev: 0, threshold: anomalyThreshold, count: 0, items: [], highlightColor: anomalyColor };
    }

    const items = data.map((d: any, idx: number) => {
      const val = Number(d.value) || 0;
      const z = (val - mean) / stdDev;
      const isAnomaly = Math.abs(z) >= anomalyThreshold;
      return {
        index: idx,
        label: String(d.label ?? ''),
        value: val,
        zScore: z,
        isAnomaly,
        deviationPercent: mean !== 0 ? ((val - mean) / Math.abs(mean)) * 100 : 0,
      };
    });

    const count = items.filter((f) => f.isAnomaly).length;
    return {
      mean,
      stdDev,
      threshold: anomalyThreshold,
      count,
      items,
      highlightColor: anomalyColor,
    };
  }, [anomalyActive, anomalyThreshold, anomalyColor, data]);

  if (!data || data.length === 0) {
    return (
      <div className={`p-6 border rounded-xl flex flex-col items-center justify-center text-center h-80 transition-colors ${
        isDark
          ? 'bg-slate-900 border-slate-800'
          : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>No chart data available</p>
        <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Adjust filters or select another sheet to view data.</p>
      </div>
    );
  }

  // Theme-aware Palette
  const getThemePalette = (themeName?: string) => {
    switch (themeName) {
      case 'emerald-growth':
        return ['#10B981', '#059669', '#34D399', '#6EE7B7', '#047857'];
      case 'sunset-amber':
        return ['#F59E0B', '#D97706', '#FBBF24', '#FCD34D', '#B45309'];
      case 'royal-purple':
        return ['#8B5CF6', '#7C3AED', '#A78BFA', '#C4B5FD', '#6D28D9'];
      case 'crimson-rose':
        return ['#EC4899', '#DB2777', '#F472B6', '#FBCFE8', '#BE185D'];
      case 'teal-ocean':
        return ['#06B6D4', '#0891B2', '#22D3EE', '#67E8F9', '#0E7490'];
      case 'modern-blue':
      default:
        return [
          '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6',
          '#EC4899', '#06B6D4', '#6366F1', '#14B8A6',
        ];
    }
  };

  const palette = getThemePalette(config.colorTheme);

  // Visual alternate switcher choices
  const getAlternateTypes = (): ChartType[] => {
    const isGeo = /(region|country|state|territory|location|geo|market|facility|hub|lat|lng|latitude|longitude)/i.test(config.xAxisColumn) ||
      config.data?.some((d: any) => /(north america|europe|asia|america|latin|pacific)/i.test(String(d.label || '')));

    if (config.type === 'map') {
      return ['map', 'bar', 'donut'];
    }
    if (config.type === 'area' || config.type === 'line') {
      return ['area', 'line'];
    }
    if (config.type === 'bar' || config.type === 'horizontal_bar') {
      return isGeo ? ['bar', 'map', 'donut'] : ['bar', 'horizontal_bar', 'donut'];
    }
    if (config.type === 'donut') {
      return isGeo ? ['donut', 'map', 'bar'] : ['donut', 'bar', 'horizontal_bar'];
    }
    if (config.type === 'pareto') {
      return ['pareto', 'bar'];
    }
    return [config.type];
  };

  const alternateTypes = getAlternateTypes();

  return (
    <div className={`group p-5 border rounded-xl flex flex-col justify-between transition-all duration-200 card-print relative ${
      isDragging ? 'opacity-40 scale-[0.98]' : ''
    } ${
      isDragOver ? 'ring-2 ring-blue-500 border-blue-500 shadow-lg' : ''
    } ${
      isDark
        ? 'bg-slate-900 border-slate-800 hover:border-slate-700 shadow-xs'
        : 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
    }`}>
      {/* Rollover Visual Movement & Adjusting Bar (Shows on mouse rollover / hover) */}
      <div className={`-mt-1 mb-3 px-2.5 py-1.5 rounded-lg border flex items-center justify-between text-xs transition-all duration-200 no-print opacity-90 group-hover:opacity-100 ${
        isDark
          ? 'bg-slate-950/90 border-slate-800 text-slate-300'
          : 'bg-slate-100/90 border-slate-200 text-slate-700 shadow-2xs'
      }`}>
        {/* Left: Drag Grip Handle & Move Left/Right Controls */}
        <div className="flex items-center gap-1.5">
          <div
            className="flex items-center gap-1 cursor-grab active:cursor-grabbing font-mono text-[11px] text-slate-400 hover:text-blue-400 select-none px-1 py-0.5 rounded hover:bg-slate-800/40"
            title="Click & Drag handle to move this visual to any position in the dashboard"
          >
            <GripVertical className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline font-sans">Move</span>
          </div>

          <div className="h-3 w-px bg-slate-700/40 mx-0.5" />

          {/* Move Earlier / Left button */}
          <button
            type="button"
            onClick={() => onMoveEarlier?.(config.id)}
            disabled={!canMoveEarlier}
            title="Move visual left / earlier in the grid"
            className="p-1 rounded hover:bg-slate-700/50 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>

          {/* Move Later / Right button */}
          <button
            type="button"
            onClick={() => onMoveLater?.(config.id)}
            disabled={!canMoveLater}
            title="Move visual right / later in the grid"
            className="p-1 rounded hover:bg-slate-700/50 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Width Adjust + Visual Cancel 'X' Button */}
        <div className="flex items-center gap-1.5">
          {onAdjustWidth && (
            <button
              type="button"
              onClick={() => onAdjustWidth(config.id)}
              title={isFullWidth ? 'Adjust visual width: Collapse to Half Width' : 'Adjust visual width: Expand to Full Width'}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-sans font-medium border transition-colors ${
                isFullWidth
                  ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                  : 'border-slate-700/40 hover:bg-slate-800/60 text-slate-400'
              }`}
            >
              {isFullWidth ? <Minimize2 className="w-3 h-3 text-blue-400" /> : <Maximize2 className="w-3 h-3 text-blue-400" />}
              <span>{isFullWidth ? 'Half Width' : 'Full Width'}</span>
            </button>
          )}

          {onRemoveVisual && (
            <button
              type="button"
              onClick={() => onRemoveVisual(config.id)}
              title="Cancel / Close visual (X)"
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span className="text-[11px] hidden sm:inline">Cancel</span>
            </button>
          )}
        </div>
      </div>

      {/* Chart Title Header */}
      <div className="flex flex-wrap items-start justify-between mb-4 gap-2">
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`text-sm font-semibold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
            {selectedCategory && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                'bg-blue-500/10 text-blue-500 border-blue-500/30'
              }`}>
                <span>{selectedCategory}</span>
                <button
                  type="button"
                  onClick={onClearCategory}
                  title="Clear filter and show all"
                  className="hover:text-blue-700 ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
          {subtitle && <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{subtitle}</p>}
        </div>

        {/* Action Controls: Trend Analysis + Edit Visual + Type Switcher + Cancel X */}
        <div className="flex items-center gap-1.5 shrink-0 no-print">
          {/* Trend Analysis Toggle */}
          {supportsTrend && (
            <div>
              {trendType === 'none' ? (
                <button
                  type="button"
                  onClick={() => setTrendType('linear')}
                  title="Add Trendline (Simple Linear Regression OLS with future projections for time series)"
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors ${
                    isDark
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                      : 'border-amber-400/50 bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  <TrendingUp className="w-3 h-3 text-amber-500" />
                  <span className="text-[11px] font-medium">Add Trendline</span>
                </button>
              ) : (
                <div className="flex items-center gap-1 p-0.5 rounded-lg border bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-xs">
                  <button
                    type="button"
                    onClick={() => {
                      const nextType: TrendType = trendType === 'linear' ? 'moving_average' : trendType === 'moving_average' ? 'polynomial' : 'linear';
                      setTrendType(nextType);
                    }}
                    title={`Active Model: ${trendType === 'linear' ? 'Linear Regression (OLS: y = mx + b)' : trendType === 'moving_average' ? 'Moving Average' : 'Polynomial Regression'}. Click to cycle.`}
                    className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500 text-slate-950 flex items-center gap-1"
                  >
                    <TrendingUp className="w-2.5 h-2.5" />
                    <span>{trendType === 'linear' ? 'Linear OLS' : trendType === 'moving_average' ? 'Moving Avg' : 'Polynomial'}</span>
                  </button>

                  {/* Future Projection step adjuster button */}
                  {trendType === 'linear' && (
                    <button
                      type="button"
                      onClick={() => setTrendFutureSteps((prev) => (prev >= 5 ? 1 : prev + 1))}
                      title={`Extrapolating +${trendFutureSteps} future data points ahead via simple linear regression. Click to cycle +1, +2, +3, +5.`}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/25 text-amber-300 hover:bg-amber-500/40 border border-amber-500/40"
                    >
                      +{trendFutureSteps} Proj
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setTrendType('none')}
                    title="Remove Trendline (X)"
                    className="p-1 hover:text-red-300 rounded hover:bg-amber-500/20"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quick Anomaly Detection Toggle Button */}
          {supportsTrend && (
            <button
              type="button"
              onClick={() => setAnomalyActive(!anomalyActive)}
              title={anomalyActive ? "Disable Anomaly Detection" : "Enable Anomaly Detection (Statistical Z-Score Threshold)"}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors ${
                anomalyActive
                  ? 'border-rose-500/50 bg-rose-500/15 text-rose-400 font-semibold shadow-2xs'
                  : isDark
                  ? 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <AlertTriangle className={`w-3 h-3 ${anomalyActive ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`} />
              <span className="text-[11px]">Anomalies</span>
              {anomalyResult && anomalyResult.count > 0 && (
                <span className="px-1 py-0.2 rounded-full text-[9px] bg-rose-500 text-white font-bold ml-0.5">
                  {anomalyResult.count}
                </span>
              )}
            </button>
          )}

          {/* Edit Visual Button */}
          {onOpenEditModal && (
            <button
              type="button"
              onClick={() => onOpenEditModal(config)}
              title="Edit Visual (type, metrics, dimensions, theme)"
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors ${
                isDark
                  ? 'border-slate-800 bg-slate-950 text-slate-300 hover:text-white hover:border-slate-700'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Pencil className="w-3 h-3 text-blue-500" />
              <span className="text-[11px] font-medium">Edit</span>
            </button>
          )}

          {/* Visual Type Indicator & Interactive Switcher */}
          <div className={`flex items-center gap-1 p-0.5 rounded-lg border shrink-0 ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            {alternateTypes.length > 1 ? (
              alternateTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveType(t)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono uppercase transition-colors ${
                    activeType === t
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : isDark
                      ? 'text-slate-400 hover:text-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.replace('_', ' ')}
                </button>
              ))
            ) : (
              <span className={`text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                {activeType.replace('_', ' ')}
              </span>
            )}
          </div>

          {/* Visual Cancel 'X' symbol button right on top of visual card */}
          {onRemoveVisual && (
            <button
              type="button"
              onClick={() => onRemoveVisual(config.id)}
              title="Cancel / Close visual (X)"
              className={`p-1 rounded-md border transition-colors ${
                isDark
                  ? 'border-slate-800 bg-slate-950 text-slate-400 hover:text-red-400 hover:border-red-500/40'
                  : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-red-500 hover:border-red-300'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Chart Rendering Area */}
      <div className="w-full h-64 relative flex items-center justify-center">
        {/* Floating Trend Equation Badge with Cancel X symbol */}
        {trendResult && (
          <div className="absolute top-2 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono border bg-amber-500/15 text-amber-300 border-amber-500/40 backdrop-blur-md shadow-xs pointer-events-auto">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-semibold">{trendResult.equation}</span>
            <button
              type="button"
              onClick={() => setTrendType('none')}
              title="Cancel trend overlay (X)"
              className="ml-1 p-0.5 hover:text-white rounded hover:bg-amber-500/30"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Floating Anomaly Detection Badge with Outlier Count and Cancel X */}
        {anomalyResult && anomalyResult.count > 0 && (
          <div className="absolute top-2 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono border bg-rose-500/15 text-rose-300 border-rose-500/40 backdrop-blur-md shadow-xs pointer-events-auto">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="font-semibold">
              🚨 {anomalyResult.count} {anomalyResult.count === 1 ? 'Anomaly' : 'Anomalies'} (|Z| ≥ {anomalyResult.threshold}σ)
            </span>
            <button
              type="button"
              onClick={() => setAnomalyActive(false)}
              title="Hide anomaly highlights (X)"
              className="ml-1 p-0.5 hover:text-white rounded hover:bg-rose-500/30"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {activeType === 'area' || activeType === 'line' ? (
          <TimeSeriesSvgChart
            data={data}
            hoverIndex={hoverIndex}
            setHoverIndex={setHoverIndex}
            color={palette[0] || '#3B82F6'}
            isLineOnly={activeType === 'line'}
            isDark={isDark}
            trendResult={trendResult}
            anomalyResult={anomalyResult}
          />
        ) : activeType === 'bar' ? (
          <VerticalBarSvgChart
            data={data}
            hoverIndex={hoverIndex}
            setHoverIndex={setHoverIndex}
            palette={palette}
            onSelectCategory={onSelectCategory}
            selectedCategory={selectedCategory}
            onClearCategory={onClearCategory}
            isDark={isDark}
            trendResult={trendResult}
            anomalyResult={anomalyResult}
          />
        ) : activeType === 'horizontal_bar' ? (
          <HorizontalBarSvgChart
            data={data}
            hoverIndex={hoverIndex}
            setHoverIndex={setHoverIndex}
            palette={palette}
            onSelectCategory={onSelectCategory}
            selectedCategory={selectedCategory}
            onClearCategory={onClearCategory}
            isDark={isDark}
            trendResult={trendResult}
            anomalyResult={anomalyResult}
          />
        ) : activeType === 'donut' ? (
          <DonutSvgChart
            data={data}
            hoverIndex={hoverIndex}
            setHoverIndex={setHoverIndex}
            palette={palette}
            onSelectCategory={onSelectCategory}
            selectedCategory={selectedCategory}
            onClearCategory={onClearCategory}
            isDark={isDark}
          />
        ) : activeType === 'scatter' ? (
          <ScatterSvgChart
            data={data}
            hoverIndex={hoverIndex}
            setHoverIndex={setHoverIndex}
            isDark={isDark}
          />
        ) : activeType === 'pareto' ? (
          <ParetoSvgChart
            data={data}
            hoverIndex={hoverIndex}
            setHoverIndex={setHoverIndex}
            palette={palette}
            onSelectCategory={onSelectCategory}
            selectedCategory={selectedCategory}
            onClearCategory={onClearCategory}
            isDark={isDark}
          />
        ) : activeType === 'heatmap' ? (
          <HeatmapSvgChart
            data={data}
            hoverIndex={hoverIndex}
            setHoverIndex={setHoverIndex}
            onSelectCategory={onSelectCategory}
            selectedCategory={selectedCategory}
            onClearCategory={onClearCategory}
            isDark={isDark}
          />
        ) : activeType === 'boxplot' ? (
          <BoxplotSvgChart
            data={data}
            hoverIndex={hoverIndex}
            setHoverIndex={setHoverIndex}
            palette={palette}
            onSelectCategory={onSelectCategory}
            selectedCategory={selectedCategory}
            onClearCategory={onClearCategory}
            isDark={isDark}
          />
        ) : activeType === 'map' ? (
          <MapSvgChart
            data={data}
            hoverIndex={hoverIndex}
            setHoverIndex={setHoverIndex}
            palette={palette}
            onSelectCategory={onSelectCategory}
            selectedCategory={selectedCategory}
            onClearCategory={onClearCategory}
            isDark={isDark}
            initialMapRegion={config.mapRegion}
          />
        ) : (
          <VerticalBarSvgChart
            data={data}
            hoverIndex={hoverIndex}
            setHoverIndex={setHoverIndex}
            palette={palette}
            onSelectCategory={onSelectCategory}
            selectedCategory={selectedCategory}
            onClearCategory={onClearCategory}
            isDark={isDark}
          />
        )}
      </div>

      {/* Chart Footer description */}
      {config.description && (
        <div className={`mt-3 pt-3 border-t flex items-center justify-between text-[11px] ${
          isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
        }`}>
          <span>{config.description}</span>
          {onSelectCategory &&
            (activeType === 'bar' ||
              activeType === 'donut' ||
              activeType === 'horizontal_bar' ||
              activeType === 'pareto' ||
              activeType === 'heatmap' ||
              activeType === 'boxplot') && (
              <span className="text-blue-500 font-medium hidden sm:inline">
                {selectedCategory ? 'Click item again or Back to show all' : 'Click item to filter'}
              </span>
            )}
        </div>
      )}
    </div>
  );
};

/* ---------------- Time Series Area / Line Chart ---------------- */
function TimeSeriesSvgChart({
  data,
  hoverIndex,
  setHoverIndex,
  color,
  isLineOnly = false,
  isDark = true,
  trendResult = null,
  anomalyResult = null,
}: {
  data: any[];
  hoverIndex: number | null;
  setHoverIndex: (idx: number | null) => void;
  color: string;
  isLineOnly?: boolean;
  isDark?: boolean;
  trendResult?: TrendResult | null;
  anomalyResult?: any | null;
}) {
  const width = 600;
  const height = 240;
  const padding = { top: 22, right: 30, bottom: 35, left: 45 };

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const historicalCount = data.length;
  const totalCount = trendResult && trendResult.points.length > historicalCount ? trendResult.points.length : historicalCount;
  const hasProjections = Boolean(trendResult && trendResult.projectedCount && trendResult.projectedCount > 0);

  const rawValues = data.map((d) => d.value);
  const trendVals = trendResult ? trendResult.points.map((p) => p.trendValue) : [];
  const allValues = [...rawValues, ...trendVals];
  const minVal = Math.min(0, ...allValues);
  const maxVal = Math.max(...allValues) * 1.12 || 100;

  const getX = (idx: number) => padding.left + (idx / Math.max(1, totalCount - 1)) * innerWidth;
  const getY = (val: number) => padding.top + innerHeight - ((val - minVal) / (maxVal - minVal || 1)) * innerHeight;

  // Build historical SVG path
  const histPoints = data.map((d, i) => `${getX(i)},${getY(d.value)}`).join(' ');
  const areaPath = `${histPoints} L ${getX(historicalCount - 1)},${padding.top + innerHeight} L ${getX(0)},${padding.top + innerHeight} Z`;

  // Ticks
  const yTicks = [minVal, (minVal + maxVal) / 2, maxVal];

  // Forecast horizon X position
  const forecastHorizonX = getX(historicalCount - 1);

  return (
    <div className="w-full h-full relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full overflow-visible"
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
          <pattern id="forecastHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke={isDark ? '#f59e0b' : '#d97706'} strokeWidth="1" strokeOpacity="0.12" />
          </pattern>
        </defs>

        {/* Future Forecast Zone Background Shading */}
        {hasProjections && (
          <g className="forecast-zone">
            <rect
              x={forecastHorizonX}
              y={padding.top}
              width={padding.left + innerWidth - forecastHorizonX}
              height={innerHeight}
              fill="url(#forecastHatch)"
            />
            <line
              x1={forecastHorizonX}
              y1={padding.top}
              x2={forecastHorizonX}
              y2={padding.top + innerHeight}
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              opacity="0.85"
            />
            <text
              x={forecastHorizonX + 4}
              y={padding.top + 9}
              fill="#f59e0b"
              fontSize="8.5"
              fontWeight="bold"
              className="font-mono uppercase tracking-wider"
            >
              Forecast (OLS)
            </text>
          </g>
        )}

        {/* Grid lines */}
        {yTicks.map((tick, i) => {
          const y = getY(tick);
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke={isDark ? '#334155' : '#e2e8f0'}
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={y + 3}
                fill={isDark ? '#94a3b8' : '#64748b'}
                fontSize="10"
                textAnchor="end"
                className="font-mono tabular-nums"
              >
                {formatMetric(tick, 'number')}
              </text>
            </g>
          );
        })}

        {/* Area fill (if not line only) */}
        {!isLineOnly && <path d={`M ${areaPath}`} fill="url(#areaGradient)" />}

        {/* Historical Line stroke */}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={histPoints}
        />

        {/* Trend Analysis Overlay Line (Historical Segment: Dashed Amber) */}
        {trendResult && trendResult.points.length > 0 && (
          <g className="trend-overlay pointer-events-none">
            {/* Historical Trendline */}
            <polyline
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="4 3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={trendResult.points.slice(0, historicalCount).map((p, i) => `${getX(i)},${getY(p.trendValue)}`).join(' ')}
            />

            {/* Future Projected Trendline (Connecting from last historical to projected points) */}
            {hasProjections && (
              <polyline
                fill="none"
                stroke="#fbbf24"
                strokeWidth="2.5"
                strokeDasharray="5 3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={trendResult.points.slice(historicalCount - 1).map((p, i) => `${getX(historicalCount - 1 + i)},${getY(p.trendValue)}`).join(' ')}
              />
            )}

            {/* Historical Trend fitted nodes */}
            {trendResult.points.slice(0, historicalCount).map((p, i) => (
              <circle
                key={`trend-pt-${i}`}
                cx={getX(i)}
                cy={getY(p.trendValue)}
                r={hoverIndex === i ? 4.5 : 2}
                fill="#f59e0b"
                stroke={isDark ? '#0f172a' : '#ffffff'}
                strokeWidth={1.5}
              />
            ))}

            {/* Future Projected Forecast Nodes */}
            {trendResult.points.slice(historicalCount).map((p, i) => {
              const projIdx = historicalCount + i;
              const isHovered = hoverIndex === projIdx;
              return (
                <g key={`proj-pt-${projIdx}`}>
                  {isHovered && (
                    <circle
                      cx={getX(projIdx)}
                      cy={getY(p.trendValue)}
                      r={9}
                      fill="#f59e0b"
                      opacity="0.3"
                      className="animate-ping"
                    />
                  )}
                  <circle
                    cx={getX(projIdx)}
                    cy={getY(p.trendValue)}
                    r={isHovered ? 5.5 : 3.5}
                    fill="#fbbf24"
                    stroke="#b45309"
                    strokeWidth={2}
                  />
                </g>
              );
            })}
          </g>
        )}

        {/* Interactive Hover Vertical Bar & Points (Historical Data) */}
        {data.map((d, i) => {
          const cx = getX(i);
          const cy = getY(d.value);
          const isHovered = hoverIndex === i;
          const anomalyItem = anomalyResult?.items?.[i];
          const isAnomaly = Boolean(anomalyItem?.isAnomaly);

          return (
            <g key={i} onMouseEnter={() => setHoverIndex(i)} className="cursor-pointer">
              <rect
                x={cx - innerWidth / totalCount / 2}
                y={padding.top}
                width={innerWidth / totalCount}
                height={innerHeight}
                fill="transparent"
              />

              {isHovered && (
                <line
                  x1={cx}
                  y1={padding.top}
                  x2={cx}
                  y2={padding.top + innerHeight}
                  stroke={isAnomaly ? (anomalyResult?.highlightColor || '#ef4444') : isDark ? '#94a3b8' : '#64748b'}
                  strokeWidth={isAnomaly ? '1.5' : '1'}
                  strokeDasharray="2 2"
                />
              )}

              {/* Anomaly Ping Halo & Distinct Warning Node */}
              {isAnomaly && (
                <g className="pointer-events-none">
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 12 : 9}
                    fill={anomalyResult?.highlightColor || '#ef4444'}
                    opacity="0.3"
                    className="animate-ping"
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 7.5 : 5.5}
                    fill={anomalyResult?.highlightColor || '#ef4444'}
                    stroke={isDark ? '#0f172a' : '#ffffff'}
                    strokeWidth={2}
                  />
                  <text
                    x={cx}
                    y={cy - 9}
                    textAnchor="middle"
                    fill={anomalyResult?.highlightColor || '#ef4444'}
                    fontSize="9"
                    fontWeight="bold"
                  >
                    !
                  </text>
                </g>
              )}

              {/* Standard Node (when not anomaly) */}
              {!isAnomaly && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 5 : 3}
                  fill={isHovered ? '#60a5fa' : color}
                  stroke={isDark ? '#0f172a' : '#ffffff'}
                  strokeWidth={isHovered ? 2 : 1}
                  className="transition-all"
                />
              )}
            </g>
          );
        })}

        {/* Interactive Hover Hit Area for Projected Future Points */}
        {hasProjections && trendResult?.points.slice(historicalCount).map((p, i) => {
          const projIdx = historicalCount + i;
          const cx = getX(projIdx);
          const cy = getY(p.trendValue);
          const isHovered = hoverIndex === projIdx;

          return (
            <g key={`proj-hit-${projIdx}`} onMouseEnter={() => setHoverIndex(projIdx)} className="cursor-pointer">
              <rect
                x={cx - innerWidth / totalCount / 2}
                y={padding.top}
                width={innerWidth / totalCount}
                height={innerHeight}
                fill="transparent"
              />
              {isHovered && (
                <line
                  x1={cx}
                  y1={padding.top}
                  x2={cx}
                  y2={padding.top + innerHeight}
                  stroke="#f59e0b"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
              )}
            </g>
          );
        })}

        {/* X-axis labels */}
        {data.length > 0 && (
          <g fill={isDark ? '#94a3b8' : '#64748b'} fontSize="10" className="font-mono">
            <text x={getX(0)} y={height - 10} textAnchor="start">
              {data[0].label}
            </text>
            {data.length > 2 && !hasProjections && (
              <text x={getX(Math.floor(data.length / 2))} y={height - 10} textAnchor="middle">
                {data[Math.floor(data.length / 2)].label}
              </text>
            )}
            <text x={getX(historicalCount - 1)} y={height - 10} textAnchor={hasProjections ? 'middle' : 'end'}>
              {data[historicalCount - 1].label}
            </text>
            {hasProjections && trendResult && (
              <text x={getX(totalCount - 1)} y={height - 10} textAnchor="end" fill="#f59e0b" fontWeight="bold">
                {trendResult.points[totalCount - 1]?.label}
              </text>
            )}
          </g>
        )}
      </svg>

      {/* Floating Tooltip (Handles Historical & Projected Points) */}
      {hoverIndex !== null && (() => {
        // Case 1: Hovering a historical data point
        if (hoverIndex < historicalCount && data[hoverIndex]) {
          const d = data[hoverIndex];
          const trPoint = trendResult?.points[hoverIndex];
          return (
            <div
              className={`absolute z-10 border rounded-lg shadow-xl px-2.5 py-1.5 text-xs pointer-events-none -translate-x-1/2 -translate-y-full ${
                isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
              style={{
                left: `${(getX(hoverIndex) / width) * 100}%`,
                top: `${(getY(d.value) / height) * 100 - 8}%`,
              }}
            >
              <div className={`font-mono text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{d.label}</div>
              <div className="font-mono font-bold mt-0.5">
                {formatMetric(d.value, 'number')}
              </div>
              {trPoint && (
                <div className="mt-1 pt-1 border-t border-slate-700/60 flex items-center justify-between gap-3 text-[10px] font-mono text-amber-400">
                  <span>Linear Fit: {formatMetric(trPoint.trendValue, 'number')}</span>
                  <span>
                    {d.value !== 0
                      ? `${d.value >= trPoint.trendValue ? '+' : ''}${Math.round(
                          ((d.value - trPoint.trendValue) / Math.abs(trPoint.trendValue || 1)) * 1000
                        ) / 10}%`
                      : ''}
                  </span>
                </div>
              )}
              {/* Statistical Anomaly Highlight in Tooltip */}
              {anomalyResult && anomalyResult.items?.[hoverIndex]?.isAnomaly && (
                <div className="mt-1.5 pt-1.5 border-t border-rose-500/40 text-[10px] font-mono text-rose-400 space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-rose-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                    <span>Statistical Anomaly (|Z| = {Math.abs(anomalyResult.items[hoverIndex].zScore).toFixed(2)}σ)</span>
                  </div>
                  <div className="text-[9px] text-slate-300 font-sans">
                    Deviates {anomalyResult.items[hoverIndex].deviationPercent >= 0 ? '+' : ''}{anomalyResult.items[hoverIndex].deviationPercent.toFixed(1)}% from mean ({formatMetric(anomalyResult.mean, 'number')})
                  </div>
                </div>
              )}
            </div>
          );
        }

        // Case 2: Hovering a future projected point
        if (trendResult && hoverIndex >= historicalCount && trendResult.points[hoverIndex]) {
          const p = trendResult.points[hoverIndex];
          return (
            <div
              className="absolute z-20 border rounded-lg shadow-2xl px-3 py-2 text-xs pointer-events-none -translate-x-1/2 -translate-y-full bg-slate-950 border-amber-500/60 text-amber-300"
              style={{
                left: `${(getX(hoverIndex) / width) * 100}%`,
                top: `${(getY(p.trendValue) / height) * 100 - 8}%`,
              }}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="font-mono font-bold text-[11px] text-white">{p.label}</span>
                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-bold">
                  Projected
                </span>
              </div>
              <div className="font-mono font-bold text-sm text-white mt-1">
                {formatMetric(p.trendValue, 'number')}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 font-sans">
                Simple Linear Regression (OLS: <code>y = mx + b</code>)
              </div>
              {trendResult.slope !== undefined && (
                <div className="text-[10px] font-mono text-amber-400/90 mt-0.5">
                  Trajectory: {trendResult.slope >= 0 ? '+' : ''}{trendResult.slope} / period (R²={trendResult.rSquared?.toFixed(2)})
                </div>
              )}
            </div>
          );
        }

        return null;
      })()}
    </div>
  );
}

/* ---------------- Vertical Bar Chart ---------------- */
function VerticalBarSvgChart({
  data,
  hoverIndex,
  setHoverIndex,
  palette,
  onSelectCategory,
  selectedCategory,
  onClearCategory,
  isDark = true,
  trendResult = null,
  anomalyResult = null,
}: {
  data: any[];
  hoverIndex: number | null;
  setHoverIndex: (idx: number | null) => void;
  palette: string[];
  onSelectCategory?: (category: string) => void;
  selectedCategory?: string | null;
  onClearCategory?: () => void;
  isDark?: boolean;
  trendResult?: TrendResult | null;
  anomalyResult?: any | null;
}) {
  const width = 600;
  const height = 240;
  const padding = { top: 22, right: 25, bottom: 40, left: 45 };

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const historicalCount = data.length;
  const totalCount = trendResult && trendResult.points.length > historicalCount ? trendResult.points.length : historicalCount;
  const hasProjections = Boolean(trendResult && trendResult.projectedCount && trendResult.projectedCount > 0);

  const rawVals = data.map((d) => d.value);
  const trendVals = trendResult ? trendResult.points.map((p) => p.trendValue) : [];
  const maxVal = Math.max(...rawVals, ...trendVals) * 1.12 || 100;
  const gap = innerWidth / Math.max(1, totalCount);
  const barWidth = Math.min(44, gap * 0.68);

  return (
    <div className="w-full h-full relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full"
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* Horizontal grid lines */}
        {[0, maxVal / 2, maxVal].map((tick, i) => {
          const y = padding.top + innerHeight - (tick / maxVal) * innerHeight;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke={isDark ? '#334155' : '#e2e8f0'}
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={y + 3}
                fill={isDark ? '#94a3b8' : '#64748b'}
                fontSize="10"
                textAnchor="end"
                className="font-mono tabular-nums"
              >
                {formatMetric(tick, 'number')}
              </text>
            </g>
          );
        })}

        {/* Historical Bars */}
        {data.map((d, i) => {
          const barHeight = Math.max(2, (d.value / maxVal) * innerHeight);
          const x = padding.left + i * gap + (gap - barWidth) / 2;
          const y = padding.top + innerHeight - barHeight;
          const isHovered = hoverIndex === i;
          const isSelected = selectedCategory === d.label;
          const anomalyItem = anomalyResult?.items?.[i];
          const isAnomaly = Boolean(anomalyItem?.isAnomaly);
          const color = isAnomaly ? (anomalyResult?.highlightColor || '#ef4444') : palette[i % palette.length];

          return (
            <g
              key={`hist-bar-${i}`}
              onMouseEnter={() => setHoverIndex(i)}
              onClick={() => {
                if (isSelected) {
                  if (onClearCategory) onClearCategory();
                  else if (onSelectCategory) onSelectCategory(d.label);
                } else {
                  if (onSelectCategory) onSelectCategory(d.label);
                }
              }}
              className="cursor-pointer group"
            >
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={3}
                fill={color}
                opacity={isSelected ? 1 : isHovered ? 0.95 : isAnomaly ? 0.9 : 0.8}
                stroke={isSelected ? '#3b82f6' : isAnomaly ? '#b91c1c' : 'transparent'}
                strokeWidth={isSelected || isAnomaly ? 2 : 0}
                className="transition-all duration-150"
              />
              {/* Alert ping dot above anomalous bar */}
              {isAnomaly && (
                <g>
                  <circle
                    cx={x + barWidth / 2}
                    cy={Math.max(padding.top + 5, y - 7)}
                    r={5}
                    fill={anomalyResult?.highlightColor || '#ef4444'}
                    opacity="0.3"
                    className="animate-ping"
                  />
                  <circle
                    cx={x + barWidth / 2}
                    cy={Math.max(padding.top + 5, y - 7)}
                    r={3}
                    fill={anomalyResult?.highlightColor || '#ef4444'}
                  />
                </g>
              )}
              {/* Category label */}
              <text
                x={x + barWidth / 2}
                y={height - 15}
                fill={isSelected ? '#3b82f6' : isAnomaly ? '#ef4444' : isHovered ? (isDark ? '#ffffff' : '#0f172a') : (isDark ? '#94a3b8' : '#64748b')}
                fontSize="10"
                fontWeight={isSelected || isAnomaly ? 'bold' : 'normal'}
                textAnchor="middle"
                className="transition-colors truncate font-sans"
              >
                {d.label.length > 9 ? `${d.label.substring(0, 8)}…` : d.label}
              </text>
            </g>
          );
        })}

        {/* Future Projected Bars (with dashed borders and Proj tag) */}
        {hasProjections && trendResult?.points.slice(historicalCount).map((p, i) => {
          const projIdx = historicalCount + i;
          const barHeight = Math.max(4, (Math.max(0, p.trendValue) / maxVal) * innerHeight);
          const x = padding.left + projIdx * gap + (gap - barWidth) / 2;
          const y = padding.top + innerHeight - barHeight;
          const isHovered = hoverIndex === projIdx;

          return (
            <g
              key={`proj-bar-${projIdx}`}
              onMouseEnter={() => setHoverIndex(projIdx)}
              className="cursor-pointer group"
            >
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={3}
                fill={isHovered ? 'rgba(245, 158, 11, 0.35)' : 'rgba(245, 158, 11, 0.18)'}
                stroke="#f59e0b"
                strokeWidth={1.5}
                strokeDasharray="3 2"
                className="transition-all duration-150"
              />
              {/* Top 'Proj' tag */}
              <text
                x={x + barWidth / 2}
                y={y - 3}
                fill="#f59e0b"
                fontSize="8"
                fontWeight="bold"
                textAnchor="middle"
                className="font-mono uppercase"
              >
                Proj
              </text>
              {/* Category label */}
              <text
                x={x + barWidth / 2}
                y={height - 15}
                fill="#f59e0b"
                fontSize="9.5"
                fontWeight="bold"
                textAnchor="middle"
                className="font-mono truncate"
              >
                {p.label.length > 8 ? `${p.label.substring(0, 7)}…` : p.label}
              </text>
            </g>
          );
        })}

        {/* Trend Analysis Overlay Line across Bars */}
        {trendResult && trendResult.points.length > 0 && (
          <g className="trend-overlay pointer-events-none">
            {/* Historical trendline */}
            <polyline
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="4 3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={trendResult.points.slice(0, historicalCount).map((p, i) => {
                const cx = padding.left + i * gap + gap / 2;
                const cy = padding.top + innerHeight - (Math.max(0, p.trendValue) / maxVal) * innerHeight;
                return `${cx},${cy}`;
              }).join(' ')}
            />

            {/* Projected trendline extension */}
            {hasProjections && (
              <polyline
                fill="none"
                stroke="#fbbf24"
                strokeWidth="2.5"
                strokeDasharray="5 3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={trendResult.points.slice(historicalCount - 1).map((p, i) => {
                  const actualIdx = historicalCount - 1 + i;
                  const cx = padding.left + actualIdx * gap + gap / 2;
                  const cy = padding.top + innerHeight - (Math.max(0, p.trendValue) / maxVal) * innerHeight;
                  return `${cx},${cy}`;
                }).join(' ')}
              />
            )}

            {/* Trend points */}
            {trendResult.points.map((p, i) => {
              const cx = padding.left + i * gap + gap / 2;
              const cy = padding.top + innerHeight - (Math.max(0, p.trendValue) / maxVal) * innerHeight;
              const isProj = i >= historicalCount;
              return (
                <circle
                  key={`bar-trend-${i}`}
                  cx={cx}
                  cy={cy}
                  r={hoverIndex === i ? 5 : isProj ? 4 : 2.5}
                  fill={isProj ? '#fbbf24' : '#f59e0b'}
                  stroke={isDark ? '#0f172a' : '#ffffff'}
                  strokeWidth={1.5}
                />
              );
            })}
          </g>
        )}
      </svg>

      {/* Floating Tooltip */}
      {hoverIndex !== null && (() => {
        if (hoverIndex < historicalCount && data[hoverIndex]) {
          const d = data[hoverIndex];
          const trPoint = trendResult?.points[hoverIndex];
          return (
            <div
              className={`absolute z-10 rounded-lg shadow-xl px-2.5 py-1.5 text-xs pointer-events-none -translate-x-1/2 -translate-y-full border ${
                isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
              style={{
                left: `${((padding.left + hoverIndex * gap + gap / 2) / width) * 100}%`,
                top: `${((padding.top + innerHeight - (d.value / maxVal) * innerHeight) / height) * 100 - 8}%`,
              }}
            >
              <div className={isDark ? 'text-slate-300 font-medium' : 'text-slate-700 font-medium'}>{d.label}</div>
              <div className="font-mono font-bold mt-0.5">
                {formatMetric(d.value, 'number')}
                {d.count && (
                  <span className={`font-normal ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>({d.count} entries)</span>
                )}
              </div>
              {trPoint && (
                <div className="mt-1 pt-1 border-t border-slate-700/60 flex items-center justify-between gap-3 text-[10px] font-mono text-amber-400">
                  <span>Linear Fit: {formatMetric(trPoint.trendValue, 'number')}</span>
                  <span>
                    {d.value !== 0
                      ? `${d.value >= trPoint.trendValue ? '+' : ''}${Math.round(
                          ((d.value - trPoint.trendValue) / Math.abs(trPoint.trendValue || 1)) * 1000
                        ) / 10}%`
                      : ''}
                  </span>
                </div>
              )}
              {/* Statistical Anomaly Highlight in Tooltip */}
              {anomalyResult && anomalyResult.items?.[hoverIndex]?.isAnomaly && (
                <div className="mt-1.5 pt-1.5 border-t border-rose-500/40 text-[10px] font-mono text-rose-400 space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-rose-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                    <span>Statistical Anomaly (|Z| = {Math.abs(anomalyResult.items[hoverIndex].zScore).toFixed(2)}σ)</span>
                  </div>
                  <div className="text-[9px] text-slate-300 font-sans">
                    Deviates {anomalyResult.items[hoverIndex].deviationPercent >= 0 ? '+' : ''}{anomalyResult.items[hoverIndex].deviationPercent.toFixed(1)}% from mean ({formatMetric(anomalyResult.mean, 'number')})
                  </div>
                </div>
              )}
            </div>
          );
        }

        if (trendResult && hoverIndex >= historicalCount && trendResult.points[hoverIndex]) {
          const p = trendResult.points[hoverIndex];
          return (
            <div
              className="absolute z-20 rounded-lg shadow-2xl px-3 py-2 text-xs pointer-events-none -translate-x-1/2 -translate-y-full border bg-slate-950 border-amber-500/60 text-amber-300"
              style={{
                left: `${((padding.left + hoverIndex * gap + gap / 2) / width) * 100}%`,
                top: `${((padding.top + innerHeight - (p.trendValue / maxVal) * innerHeight) / height) * 100 - 8}%`,
              }}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="font-mono font-bold text-white text-[11px]">{p.label}</span>
                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-bold">
                  Projected
                </span>
              </div>
              <div className="font-mono font-bold text-sm text-white mt-1">
                {formatMetric(p.trendValue, 'number')}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Projected using Simple Linear Regression (OLS)
              </div>
            </div>
          );
        }

        return null;
      })()}
    </div>
  );
}

/* ---------------- Horizontal Bar Chart ---------------- */
function HorizontalBarSvgChart({
  data,
  hoverIndex,
  setHoverIndex,
  palette,
  onSelectCategory,
  selectedCategory,
  onClearCategory,
  isDark = true,
  trendResult = null,
  anomalyResult = null,
}: {
  data: any[];
  hoverIndex: number | null;
  setHoverIndex: (idx: number | null) => void;
  palette: string[];
  onSelectCategory?: (category: string) => void;
  selectedCategory?: string | null;
  onClearCategory?: () => void;
  isDark?: boolean;
  trendResult?: TrendResult | null;
  anomalyResult?: any | null;
}) {
  const maxVal = Math.max(...data.map((d) => d.value)) || 1;

  return (
    <div className="w-full h-full flex flex-col justify-center space-y-2.5 px-2">
      {data.map((d, i) => {
        const pct = Math.max(4, Math.round((d.value / maxVal) * 100));
        const isHovered = hoverIndex === i;
        const isSelected = selectedCategory === d.label;
        const color = palette[i % palette.length];

        return (
          <div
            key={i}
            onMouseEnter={() => setHoverIndex(i)}
            onMouseLeave={() => setHoverIndex(null)}
            onClick={() => {
              if (isSelected) {
                if (onClearCategory) onClearCategory();
                else if (onSelectCategory) onSelectCategory(d.label);
              } else {
                if (onSelectCategory) onSelectCategory(d.label);
              }
            }}
            className={`cursor-pointer transition-all p-1 rounded-lg ${
              isSelected
                ? isDark ? 'bg-blue-600/20 border border-blue-500/50' : 'bg-blue-50 border border-blue-300'
                : isHovered ? 'scale-[1.01]' : ''
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className={`font-medium truncate max-w-[200px] ${
                isSelected ? 'text-blue-500 font-bold' : isHovered ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-slate-300' : 'text-slate-700')
              }`}>
                {d.label}
              </span>
              <span className={`font-mono tabular-nums ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {formatMetric(d.value, 'number')}
              </span>
            </div>
            <div className={`w-full rounded-full h-2 overflow-hidden ${isDark ? 'bg-slate-800/80' : 'bg-slate-200'}`}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Donut Chart ---------------- */
function DonutSvgChart({
  data,
  hoverIndex,
  setHoverIndex,
  palette,
  onSelectCategory,
  selectedCategory,
  onClearCategory,
  isDark = true,
}: {
  data: any[];
  hoverIndex: number | null;
  setHoverIndex: (idx: number | null) => void;
  palette: string[];
  onSelectCategory?: (category: string) => void;
  selectedCategory?: string | null;
  onClearCategory?: () => void;
  isDark?: boolean;
}) {
  const total = data.reduce((acc, curr) => acc + curr.value, 0) || 1;
  const radius = 80;
  const strokeWidth = 26;
  const center = 120;
  const circumference = 2 * Math.PI * radius;

  let currentAngle = -90;

  return (
    <div className="w-full h-full flex flex-col sm:flex-row items-center justify-around gap-4">
      {/* SVG Donut */}
      <div className="relative w-48 h-48 shrink-0">
        <svg viewBox="0 0 240 240" className="w-full h-full -rotate-90">
          {data.map((d, i) => {
            const fraction = d.value / total;
            const strokeDasharray = `${fraction * circumference} ${circumference}`;
            const strokeDashoffset = 0;
            const transform = `rotate(${currentAngle + 90} ${center} ${center})`;
            currentAngle += fraction * 360;
            const isHovered = hoverIndex === i;
            const isSelected = selectedCategory === d.label;

            return (
              <circle
                key={i}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={palette[i % palette.length]}
                strokeWidth={isSelected ? strokeWidth + 6 : isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                transform={transform}
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
                onClick={() => {
                  if (isSelected) {
                    if (onClearCategory) onClearCategory();
                    else if (onSelectCategory) onSelectCategory(d.label);
                  } else {
                    if (onSelectCategory) onSelectCategory(d.label);
                  }
                }}
                className="cursor-pointer transition-all duration-150"
                opacity={isSelected ? 1 : isHovered ? 1 : 0.85}
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-4">
          <span className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {hoverIndex !== null && data[hoverIndex] ? data[hoverIndex].label : selectedCategory || 'Total'}
          </span>
          <span className={`text-base font-bold font-mono tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {hoverIndex !== null && data[hoverIndex]
              ? `${data[hoverIndex].percentage || Math.round((data[hoverIndex].value / total) * 100)}%`
              : formatMetric(total, 'number')}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-1.5 max-w-[200px] w-full text-xs">
        {data.slice(0, 6).map((d, i) => {
          const isHovered = hoverIndex === i;
          const isSelected = selectedCategory === d.label;
          return (
            <div
              key={i}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              onClick={() => {
                if (isSelected) {
                  if (onClearCategory) onClearCategory();
                  else if (onSelectCategory) onSelectCategory(d.label);
                } else {
                  if (onSelectCategory) onSelectCategory(d.label);
                }
              }}
              className={`flex items-center justify-between p-1 rounded cursor-pointer transition-colors ${
                isSelected
                  ? isDark ? 'bg-blue-600/30 text-white font-semibold' : 'bg-blue-100 text-blue-900 font-semibold'
                  : isHovered
                  ? isDark ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-900'
                  : isDark ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: palette[i % palette.length] }}
                />
                <span className="truncate">{d.label}</span>
              </div>
              <span className={`font-mono tabular-nums pl-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {d.percentage || Math.round((d.value / total) * 100)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Pareto 80/20 Analysis Chart ---------------- */
function ParetoSvgChart({
  data,
  hoverIndex,
  setHoverIndex,
  palette,
  onSelectCategory,
  selectedCategory,
  onClearCategory,
  isDark = true,
}: {
  data: any[];
  hoverIndex: number | null;
  setHoverIndex: (idx: number | null) => void;
  palette: string[];
  onSelectCategory?: (category: string) => void;
  selectedCategory?: string | null;
  onClearCategory?: () => void;
  isDark?: boolean;
}) {
  const width = 600;
  const height = 240;
  const padding = { top: 25, right: 45, bottom: 40, left: 45 };

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map((d) => d.value)) * 1.15 || 100;
  const barWidth = Math.min(36, (innerWidth / data.length) * 0.6);
  const gap = innerWidth / data.length;

  const getBarX = (i: number) => padding.left + i * gap + (gap - barWidth) / 2;
  const getLineX = (i: number) => padding.left + i * gap + gap / 2;
  const getLineY = (pct: number) => padding.top + innerHeight - (pct / 100) * innerHeight;

  // 80% line Y
  const y80 = getLineY(80);

  // Cumulative line points
  const linePoints = data.map((d, i) => `${getLineX(i)},${getLineY(d.cumulativePct)}`).join(' ');

  return (
    <div className="w-full h-full relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full"
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* 80% Pareto Guideline */}
        <line
          x1={padding.left}
          y1={y80}
          x2={width - padding.right}
          y2={y80}
          stroke="#f59e0b"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <text
          x={width - padding.right}
          y={y80 - 5}
          fill="#f59e0b"
          fontSize="9"
          textAnchor="end"
          className="font-mono font-semibold"
        >
          80% Threshold
        </text>

        {/* Left Y Axis grid ticks (Values) */}
        {[0, maxVal / 2, maxVal].map((tick, i) => {
          const y = padding.top + innerHeight - (tick / maxVal) * innerHeight;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke={isDark ? '#334155' : '#e2e8f0'}
                strokeDasharray="2 3"
                strokeWidth="1"
              />
              <text
                x={padding.left - 6}
                y={y + 3}
                fill={isDark ? '#94a3b8' : '#64748b'}
                fontSize="9"
                textAnchor="end"
                className="font-mono"
              >
                {formatMetric(tick, 'number')}
              </text>
            </g>
          );
        })}

        {/* Right Y Axis ticks (Percentages) */}
        {[0, 50, 100].map((pct, i) => {
          const y = getLineY(pct);
          return (
            <text
              key={i}
              x={width - padding.right + 6}
              y={y + 3}
              fill={isDark ? '#94a3b8' : '#64748b'}
              fontSize="9"
              textAnchor="start"
              className="font-mono"
            >
              {pct}%
            </text>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const barHeight = Math.max(2, (d.value / maxVal) * innerHeight);
          const x = getBarX(i);
          const y = padding.top + innerHeight - barHeight;
          const isHovered = hoverIndex === i;
          const isSelected = selectedCategory === d.label;

          return (
            <g
              key={i}
              onMouseEnter={() => setHoverIndex(i)}
              onClick={() => {
                if (isSelected) {
                  if (onClearCategory) onClearCategory();
                  else if (onSelectCategory) onSelectCategory(d.label);
                } else {
                  if (onSelectCategory) onSelectCategory(d.label);
                }
              }}
              className="cursor-pointer"
            >
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={2.5}
                fill={isSelected ? '#3b82f6' : (palette[i % palette.length] || '#3b82f6')}
                opacity={isSelected ? 1 : isHovered ? 0.95 : 0.75}
                stroke={isSelected ? '#2563eb' : 'transparent'}
                strokeWidth={isSelected ? 2 : 0}
                className="transition-all"
              />
              <text
                x={x + barWidth / 2}
                y={height - 12}
                fill={isSelected ? '#3b82f6' : isHovered ? (isDark ? '#ffffff' : '#0f172a') : (isDark ? '#94a3b8' : '#64748b')}
                fontSize="9"
                fontWeight={isSelected ? 'bold' : 'normal'}
                textAnchor="middle"
                className="truncate font-sans"
              >
                {d.label.length > 8 ? `${d.label.substring(0, 7)}…` : d.label}
              </text>
            </g>
          );
        })}

        {/* Cumulative Percentage Line */}
        <polyline
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={linePoints}
        />

        {/* Cumulative Line Dots */}
        {data.map((d, i) => {
          const cx = getLineX(i);
          const cy = getLineY(d.cumulativePct);
          const isHovered = hoverIndex === i;

          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={isHovered ? 4.5 : 3}
              fill="#f59e0b"
              stroke="#0f172a"
              strokeWidth={1.5}
              className="transition-all pointer-events-none"
            />
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoverIndex !== null && data[hoverIndex] && (
        <div
          className="absolute z-10 bg-slate-950 border border-slate-700 rounded shadow-xl px-2.5 py-1.5 text-xs pointer-events-none -translate-x-1/2 -translate-y-full"
          style={{
            left: `${(getLineX(hoverIndex) / width) * 100}%`,
            top: `${(getLineY(data[hoverIndex].cumulativePct) / height) * 100 - 8}%`,
          }}
        >
          <div className="text-slate-300 font-medium">{data[hoverIndex].label}</div>
          <div className="text-white font-mono font-bold mt-0.5">
            Value: {formatMetric(data[hoverIndex].value, 'number')}
          </div>
          <div className="text-amber-400 font-mono text-[11px]">
            Cumulative: {data[hoverIndex].cumulativePct}% of total
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- 2D Cross-Tabulation Matrix / Heatmap ---------------- */
function HeatmapSvgChart({
  data,
  hoverIndex,
  setHoverIndex,
  onSelectCategory,
  selectedCategory,
  onClearCategory,
  isDark = true,
}: {
  data: { row: string; col: string; value: number; count: number }[];
  hoverIndex: number | null;
  setHoverIndex: (idx: number | null) => void;
  onSelectCategory?: (category: string) => void;
  selectedCategory?: string | null;
  onClearCategory?: () => void;
  isDark?: boolean;
}) {
  const rows = Array.from(new Set(data.map((d) => d.row)));
  const cols = Array.from(new Set(data.map((d) => d.col)));

  const maxVal = Math.max(...data.map((d) => d.value)) || 1;

  return (
    <div className="w-full h-full flex flex-col justify-center overflow-x-auto p-1">
      <div className="min-w-[420px]">
        {/* Column Headers */}
        <div className={`flex pl-24 pb-1.5 text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {cols.map((colName, cIdx) => (
            <div key={`heat-col-${colName}-${cIdx}`} className="flex-1 text-center truncate px-1" title={colName}>
              {colName}
            </div>
          ))}
        </div>

        {/* Matrix Rows */}
        <div className="space-y-1.5">
          {rows.map((rowName, rIdx) => {
            const isRowSelected = selectedCategory === rowName;
            return (
              <div key={`heat-row-${rowName}-${rIdx}`} className="flex items-center">
                {/* Row Label */}
                <div
                  className={`w-24 text-[11px] font-medium truncate pr-2 text-right cursor-pointer transition-colors ${
                    isRowSelected
                      ? 'text-blue-500 font-bold'
                      : isDark
                      ? 'text-slate-300 hover:text-white'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                  title={rowName}
                  onClick={() => {
                    if (isRowSelected) {
                      if (onClearCategory) onClearCategory();
                      else if (onSelectCategory) onSelectCategory(rowName);
                    } else {
                      if (onSelectCategory) onSelectCategory(rowName);
                    }
                  }}
                >
                  {rowName}
                </div>

                {/* Row Cells */}
                <div className="flex-1 flex gap-1.5">
                  {cols.map((colName, cIdx) => {
                    const cell = data.find((d) => d.row === rowName && d.col === colName);
                    const val = cell ? cell.value : 0;
                    const intensity = Math.min(1, Math.max(0.08, val / maxVal));

                    return (
                      <div
                        key={`heat-cell-${rowName}-${colName}-${cIdx}`}
                        onClick={() => {
                          if (isRowSelected) {
                            if (onClearCategory) onClearCategory();
                            else if (onSelectCategory) onSelectCategory(rowName);
                          } else {
                            if (onSelectCategory) onSelectCategory(rowName);
                          }
                        }}
                        className={`flex-1 h-9 rounded flex flex-col items-center justify-center cursor-pointer transition-all hover:ring-1 hover:ring-white/60 relative group ${
                          isRowSelected ? 'ring-2 ring-blue-500' : ''
                        }`}
                        style={{
                          backgroundColor: `rgba(59, 130, 246, ${intensity})`,
                        }}
                        title={`${rowName} × ${colName}: ${formatMetric(val, 'number')} (${cell?.count || 0} entries)`}
                      >
                        <span className="font-mono text-xs font-semibold text-white drop-shadow-sm">
                          {formatMetric(val, 'number')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className={`mt-3 flex items-center justify-end gap-2 text-[10px] font-mono pr-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          <span>Low</span>
          <div className="w-16 h-2 rounded bg-gradient-to-r from-blue-950 via-blue-700 to-blue-500" />
          <span>High ({formatMetric(maxVal, 'number')})</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Statistical Quartile Range & Boxplot ---------------- */
function BoxplotSvgChart({
  data,
  hoverIndex,
  setHoverIndex,
  palette,
  onSelectCategory,
  selectedCategory,
  onClearCategory,
  isDark = true,
}: {
  data: { label: string; min: number; q1: number; median: number; q3: number; max: number; mean: number; count: number }[];
  hoverIndex: number | null;
  setHoverIndex: (idx: number | null) => void;
  palette: string[];
  onSelectCategory?: (category: string) => void;
  selectedCategory?: string | null;
  onClearCategory?: () => void;
  isDark?: boolean;
}) {
  const globalMin = Math.min(...data.map((d) => d.min));
  const globalMax = Math.max(...data.map((d) => d.max)) || 100;
  const globalRange = globalMax - globalMin || 1;

  const getPct = (val: number) => Math.max(0, Math.min(100, ((val - globalMin) / globalRange) * 100));

  return (
    <div className="w-full h-full flex flex-col justify-around py-1">
      {/* Back button option when a category is selected */}
      {selectedCategory && (
        <div className={`flex items-center justify-between px-3 py-1.5 mb-2 rounded-lg border text-xs ${
          isDark ? 'bg-blue-950/40 border-blue-800/80 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span>Viewing segment: <strong className="font-semibold">{selectedCategory}</strong></span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onClearCategory) onClearCategory();
              else if (onSelectCategory) onSelectCategory(selectedCategory);
            }}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded transition-all shadow-xs"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Back / Show All</span>
          </button>
        </div>
      )}

      {data.map((item, idx) => {
        const minPct = getPct(item.min);
        const q1Pct = getPct(item.q1);
        const medPct = getPct(item.median);
        const q3Pct = getPct(item.q3);
        const maxPct = getPct(item.max);
        const meanPct = getPct(item.mean);
        const color = palette[idx % palette.length];
        const isSelected = selectedCategory === item.label;

        return (
          <div
            key={`boxplot-${item.label}-${idx}`}
            onClick={() => {
              if (isSelected) {
                // Click again -> Show All!
                if (onClearCategory) onClearCategory();
                else if (onSelectCategory) onSelectCategory(item.label);
              } else {
                if (onSelectCategory) onSelectCategory(item.label);
              }
            }}
            className={`group cursor-pointer py-1.5 px-2.5 rounded-lg transition-all ${
              isSelected
                ? isDark
                  ? 'bg-blue-600/20 border border-blue-500/60 ring-1 ring-blue-500/40'
                  : 'bg-blue-50 border border-blue-300 ring-1 ring-blue-200'
                : isDark
                ? 'hover:bg-slate-800/40'
                : 'hover:bg-slate-100'
            }`}
            title={isSelected ? 'Click again to show all categories' : `Click to filter by ${item.label}`}
          >
            {/* Header info */}
            <div className="flex items-center justify-between text-xs mb-1">
              <div className="flex items-center gap-2">
                <span className={`font-semibold transition-colors ${
                  isSelected
                    ? 'text-blue-500 font-bold'
                    : isDark
                    ? 'text-slate-200 group-hover:text-blue-400'
                    : 'text-slate-800 group-hover:text-blue-600'
                }`}>
                  {item.label}
                </span>
                {isSelected && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-600 text-white font-medium">
                    Filtered
                  </span>
                )}
              </div>
              <div className={`font-mono text-[11px] flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <span>
                  Median: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{formatMetric(item.median, 'number')}</strong>
                </span>
                <span>·</span>
                <span>
                  μ: <strong className={isDark ? 'text-slate-300' : 'text-slate-700'}>{formatMetric(item.mean, 'number')}</strong>
                </span>
              </div>
            </div>

            {/* Box & Whisker Track */}
            <div className={`relative w-full h-6 rounded border flex items-center px-1 ${
              isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-100 border-slate-200'
            }`}>
              {/* Whisker Line (Min to Max) */}
              <div
                className={`absolute h-0.5 rounded ${isDark ? 'bg-slate-600' : 'bg-slate-400'}`}
                style={{
                  left: `${minPct}%`,
                  width: `${Math.max(1, maxPct - minPct)}%`,
                }}
              />

              {/* Min End Cap */}
              <div
                className={`absolute w-1 h-3 rounded-sm -translate-x-1/2 ${isDark ? 'bg-slate-500' : 'bg-slate-400'}`}
                style={{ left: `${minPct}%` }}
                title={`Min: ${formatMetric(item.min, 'number')}`}
              />

              {/* Max End Cap */}
              <div
                className={`absolute w-1 h-3 rounded-sm -translate-x-1/2 ${isDark ? 'bg-slate-500' : 'bg-slate-400'}`}
                style={{ left: `${maxPct}%` }}
                title={`Max: ${formatMetric(item.max, 'number')}`}
              />

              {/* Interquartile Box (Q1 to Q3) */}
              <div
                className="absolute h-4.5 rounded border border-white/20 -translate-y-1/2 top-1/2 transition-opacity"
                style={{
                  left: `${q1Pct}%`,
                  width: `${Math.max(2, q3Pct - q1Pct)}%`,
                  backgroundColor: color,
                  opacity: 0.85,
                }}
                title={`Q1: ${formatMetric(item.q1, 'number')} — Q3: ${formatMetric(item.q3, 'number')}`}
              />

              {/* Median Line */}
              <div
                className="absolute w-1.5 h-5 bg-white rounded-sm -translate-x-1/2 -translate-y-1/2 top-1/2 z-10 shadow-xs"
                style={{ left: `${medPct}%` }}
                title={`Median: ${formatMetric(item.median, 'number')}`}
              />

              {/* Mean Diamond */}
              <div
                className="absolute w-2 h-2 bg-amber-400 rotate-45 -translate-x-1/2 -translate-y-1/2 top-1/2 z-10 shadow-xs"
                style={{ left: `${meanPct}%` }}
                title={`Mean (μ): ${formatMetric(item.mean, 'number')}`}
              />
            </div>

            {/* Foot labels */}
            <div className={`flex justify-between text-[10px] font-mono mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <span>Min: {formatMetric(item.min, 'number')}</span>
              <span>IQR: {formatMetric(item.q3 - item.q1, 'number')}</span>
              <span>Max: {formatMetric(item.max, 'number')}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Scatter Plot ---------------- */
function ScatterSvgChart({
  data,
  hoverIndex,
  setHoverIndex,
  isDark = true,
}: {
  data: any[];
  hoverIndex: number | null;
  setHoverIndex: (idx: number | null) => void;
  isDark?: boolean;
}) {
  const width = 600;
  const height = 240;
  const padding = { top: 20, right: 25, bottom: 35, left: 45 };

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const xVals = data.map((d) => d.x);
  const yVals = data.map((d) => d.y);

  const minX = Math.min(...xVals);
  const maxX = Math.max(...xVals) * 1.05 || 10;
  const minY = Math.min(...yVals);
  const maxY = Math.max(...yVals) * 1.05 || 10;

  const getX = (x: number) => padding.left + ((x - minX) / (maxX - minX || 1)) * innerWidth;
  const getY = (y: number) => padding.top + innerHeight - ((y - minY) / (maxY - minY || 1)) * innerHeight;

  return (
    <div className="w-full h-full relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full"
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* Grid lines */}
        {[minY, (minY + maxY) / 2, maxY].map((tick, i) => {
          const y = getY(tick);
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke={isDark ? '#334155' : '#e2e8f0'}
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={y + 3}
                fill={isDark ? '#94a3b8' : '#64748b'}
                fontSize="10"
                textAnchor="end"
                className="font-mono tabular-nums"
              >
                {formatMetric(tick, 'number')}
              </text>
            </g>
          );
        })}

        {/* Scatter points */}
        {data.map((d, i) => {
          const cx = getX(d.x);
          const cy = getY(d.y);
          const isHovered = hoverIndex === i;

          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={isHovered ? 6 : 3.5}
              fill={isHovered ? '#60a5fa' : '#3b82f6'}
              opacity={isHovered ? 1 : 0.75}
              stroke={isDark ? '#0f172a' : '#ffffff'}
              strokeWidth={1}
              onMouseEnter={() => setHoverIndex(i)}
              className="cursor-pointer transition-all duration-150"
            />
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoverIndex !== null && data[hoverIndex] && (
        <div
          className={`absolute z-10 border rounded shadow-xl px-2.5 py-1.5 text-xs pointer-events-none -translate-x-1/2 -translate-y-full ${
            isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xl'
          }`}
          style={{
            left: `${(getX(data[hoverIndex].x) / width) * 100}%`,
            top: `${(getY(data[hoverIndex].y) / height) * 100 - 8}%`,
          }}
        >
          <div className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{data[hoverIndex].label}</div>
          <div className={`font-mono text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            X: <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatMetric(data[hoverIndex].x, 'number')}</span> · Y:{' '}
            <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatMetric(data[hoverIndex].y, 'number')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Interactive Geographic Map Visual ---------------- */
function MapSvgChart({
  data,
  hoverIndex,
  setHoverIndex,
  palette,
  onSelectCategory,
  selectedCategory,
  onClearCategory,
  isDark = true,
  initialMapRegion,
}: {
  data: any[];
  hoverIndex: number | null;
  setHoverIndex: (idx: number | null) => void;
  palette: string[];
  onSelectCategory?: (category: string) => void;
  selectedCategory?: string | null;
  onClearCategory?: () => void;
  isDark?: boolean;
  initialMapRegion?: MapRegionScope;
}) {
  const [viewMode, setViewMode] = useState<'map' | 'table'>('map');
  const { formatAmount } = useCurrency();

  // Intelligent auto-detection of regional scope from data labels
  const detectedScope = useMemo<MapRegionScope>(() => {
    if (initialMapRegion) return initialMapRegion;
    if (!data || data.length === 0) return 'world';

    const text = data.map((d) => String(d.label || '').toLowerCase()).join(' ');
    if (
      text.includes('karnataka') ||
      text.includes('maharashtra') ||
      text.includes('delhi') ||
      text.includes('tamil nadu') ||
      text.includes('telangana') ||
      text.includes('mumbai') ||
      text.includes('bangalore') ||
      text.includes('bengaluru') ||
      text.includes('india') ||
      text.includes('hyderabad') ||
      text.includes('pune') ||
      text.includes('chennai')
    ) {
      return 'india';
    }
    if (
      text.includes('california') ||
      text.includes('texas') ||
      text.includes('florida') ||
      text.includes('new york') ||
      text.includes('washington') ||
      text.includes('illinois') ||
      text.includes('united states') ||
      text.includes('usa') ||
      text.includes('austin') ||
      text.includes('seattle') ||
      text.includes('boston') ||
      text.includes('chicago')
    ) {
      return 'us';
    }
    if (
      text.includes('germany') ||
      text.includes('france') ||
      text.includes('uk') ||
      text.includes('united kingdom') ||
      text.includes('spain') ||
      text.includes('italy') ||
      text.includes('london') ||
      text.includes('paris') ||
      text.includes('berlin') ||
      text.includes('europe') ||
      text.includes('frankfurt')
    ) {
      return 'europe';
    }
    if (
      text.includes('singapore') ||
      text.includes('tokyo') ||
      text.includes('japan') ||
      text.includes('australia') ||
      text.includes('sydney') ||
      text.includes('apac') ||
      text.includes('korea')
    ) {
      return 'apac';
    }
    return 'world';
  }, [initialMapRegion, data]);

  const [activeScope, setActiveScope] = useState<MapRegionScope>(initialMapRegion || detectedScope);

  useEffect(() => {
    if (initialMapRegion) {
      setActiveScope(initialMapRegion);
    }
  }, [initialMapRegion]);

  if (!data || data.length === 0) {
    return <div className="text-xs text-slate-400">No geographic data</div>;
  }

  // Pre-calculate region & coordinate points for each scope
  const getCoordinates = (item: any, idx: number, scope: MapRegionScope) => {
    const l = String(item.label || '').toLowerCase();
    const hasLat = typeof item.lat === 'number' && !isNaN(item.lat);
    const hasLng = typeof item.lng === 'number' && !isNaN(item.lng);

    // 1. UNITED STATES
    if (scope === 'us') {
      if (hasLat && hasLng) {
        const x = Math.max(50, Math.min(680, 60 + ((item.lng - (-125)) / (-66 - (-125))) * 610));
        const y = Math.max(35, Math.min(340, 35 + ((50 - item.lat) / (50 - 24)) * 300));
        return { x, y, name: item.label, isCoord: true, lat: item.lat, lng: item.lng };
      }
      if (l.includes('california') || l.includes('ca') || l.includes('san francisco') || l.includes('los angeles') || l.includes('silicon valley')) return { x: 85, y: 195, name: item.label, isCoord: false };
      if (l.includes('washington') || l.includes('seattle') || l.includes('wa')) return { x: 95, y: 65, name: item.label, isCoord: false };
      if (l.includes('texas') || l.includes('austin') || l.includes('dallas') || l.includes('houston') || l.includes('tx')) return { x: 345, y: 295, name: item.label, isCoord: false };
      if (l.includes('new york') || l.includes('nyc') || l.includes('ny')) return { x: 625, y: 125, name: item.label, isCoord: false };
      if (l.includes('florida') || l.includes('miami') || l.includes('orlando') || l.includes('fl')) return { x: 585, y: 315, name: item.label, isCoord: false };
      if (l.includes('illinois') || l.includes('chicago') || l.includes('il')) return { x: 450, y: 140, name: item.label, isCoord: false };
      if (l.includes('massachusetts') || l.includes('boston') || l.includes('ma')) return { x: 675, y: 95, name: item.label, isCoord: false };
      if (l.includes('colorado') || l.includes('denver') || l.includes('co')) return { x: 245, y: 175, name: item.label, isCoord: false };
      if (l.includes('georgia') || l.includes('atlanta') || l.includes('ga')) return { x: 535, y: 250, name: item.label, isCoord: false };
      if (l.includes('north carolina') || l.includes('nc') || l.includes('raleigh')) return { x: 595, y: 215, name: item.label, isCoord: false };
      if (l.includes('pennsylvania') || l.includes('pa') || l.includes('philly')) return { x: 605, y: 145, name: item.label, isCoord: false };
      if (l.includes('ohio') || l.includes('oh') || l.includes('michigan') || l.includes('mi')) return { x: 510, y: 135, name: item.label, isCoord: false };
      if (l.includes('arizona') || l.includes('phoenix') || l.includes('az')) return { x: 175, y: 250, name: item.label, isCoord: false };
      if (l.includes('oregon') || l.includes('or') || l.includes('portland')) return { x: 80, y: 110, name: item.label, isCoord: false };
      if (l.includes('utah') || l.includes('salt lake') || l.includes('ut')) return { x: 190, y: 165, name: item.label, isCoord: false };
      if (l.includes('virginia') || l.includes('va')) return { x: 595, y: 180, name: item.label, isCoord: false };
      const usGrid = [{ x: 95, y: 65 }, { x: 85, y: 195 }, { x: 345, y: 295 }, { x: 625, y: 125 }, { x: 450, y: 140 }, { x: 585, y: 315 }, { x: 245, y: 175 }, { x: 535, y: 250 }];
      return { ...usGrid[idx % usGrid.length], name: item.label, isCoord: false };
    }

    // 2. INDIA
    if (scope === 'india') {
      if (hasLat && hasLng) {
        const x = Math.max(120, Math.min(460, 110 + ((item.lng - 68) / (98 - 68)) * 340));
        const y = Math.max(35, Math.min(470, 30 + ((37 - item.lat) / (37 - 8)) * 430));
        return { x, y, name: item.label, isCoord: true, lat: item.lat, lng: item.lng };
      }
      if (l.includes('karnataka') || l.includes('bengaluru') || l.includes('bangalore') || l.includes('ka')) return { x: 235, y: 380, name: item.label, isCoord: false };
      if (l.includes('maharashtra') || l.includes('mumbai') || l.includes('pune') || l.includes('mh')) return { x: 195, y: 285, name: item.label, isCoord: false };
      if (l.includes('delhi') || l.includes('ncr') || l.includes('gurgaon') || l.includes('noida') || l.includes('dl')) return { x: 245, y: 135, name: item.label, isCoord: false };
      if (l.includes('telangana') || l.includes('hyderabad') || l.includes('ts')) return { x: 275, y: 320, name: item.label, isCoord: false };
      if (l.includes('tamil nadu') || l.includes('chennai') || l.includes('tn')) return { x: 285, y: 420, name: item.label, isCoord: false };
      if (l.includes('west bengal') || l.includes('kolkata') || l.includes('wb')) return { x: 385, y: 225, name: item.label, isCoord: false };
      if (l.includes('gujarat') || l.includes('ahmedabad') || l.includes('gj')) return { x: 165, y: 220, name: item.label, isCoord: false };
      if (l.includes('rajasthan') || l.includes('jaipur') || l.includes('rj')) return { x: 195, y: 160, name: item.label, isCoord: false };
      if (l.includes('kerala') || l.includes('kochi') || l.includes('kl')) return { x: 230, y: 450, name: item.label, isCoord: false };
      if (l.includes('uttar pradesh') || l.includes('lucknow') || l.includes('up')) return { x: 295, y: 175, name: item.label, isCoord: false };
      if (l.includes('andhra') || l.includes('vizag') || l.includes('ap')) return { x: 310, y: 345, name: item.label, isCoord: false };
      const inGrid = [{ x: 235, y: 380 }, { x: 195, y: 285 }, { x: 245, y: 135 }, { x: 275, y: 320 }, { x: 285, y: 420 }, { x: 385, y: 225 }, { x: 165, y: 220 }, { x: 230, y: 450 }];
      return { ...inGrid[idx % inGrid.length], name: item.label, isCoord: false };
    }

    // 3. EUROPE
    if (scope === 'europe') {
      if (hasLat && hasLng) {
        const x = Math.max(90, Math.min(560, 90 + ((item.lng - (-10)) / (35 - (-10))) * 460));
        const y = Math.max(35, Math.min(390, 35 + ((65 - item.lat) / (65 - 35)) * 350));
        return { x, y, name: item.label, isCoord: true, lat: item.lat, lng: item.lng };
      }
      if (l.includes('uk') || l.includes('united kingdom') || l.includes('london') || l.includes('britain') || l.includes('england')) return { x: 175, y: 165, name: item.label, isCoord: false };
      if (l.includes('germany') || l.includes('frankfurt') || l.includes('berlin') || l.includes('munich') || l.includes('de')) return { x: 295, y: 185, name: item.label, isCoord: false };
      if (l.includes('france') || l.includes('paris') || l.includes('fr')) return { x: 215, y: 235, name: item.label, isCoord: false };
      if (l.includes('spain') || l.includes('madrid') || l.includes('barcelona') || l.includes('es')) return { x: 155, y: 335, name: item.label, isCoord: false };
      if (l.includes('italy') || l.includes('rome') || l.includes('milan') || l.includes('it')) return { x: 330, y: 310, name: item.label, isCoord: false };
      if (l.includes('netherlands') || l.includes('amsterdam') || l.includes('nl')) return { x: 235, y: 155, name: item.label, isCoord: false };
      if (l.includes('ireland') || l.includes('dublin') || l.includes('ie')) return { x: 125, y: 145, name: item.label, isCoord: false };
      if (l.includes('sweden') || l.includes('stockholm') || l.includes('nordic') || l.includes('se')) return { x: 345, y: 85, name: item.label, isCoord: false };
      if (l.includes('switzerland') || l.includes('zurich') || l.includes('geneva') || l.includes('ch')) return { x: 265, y: 245, name: item.label, isCoord: false };
      if (l.includes('poland') || l.includes('warsaw') || l.includes('pl')) return { x: 395, y: 165, name: item.label, isCoord: false };
      const euGrid = [{ x: 175, y: 165 }, { x: 295, y: 185 }, { x: 215, y: 235 }, { x: 155, y: 335 }, { x: 330, y: 310 }, { x: 235, y: 155 }, { x: 345, y: 85 }];
      return { ...euGrid[idx % euGrid.length], name: item.label, isCoord: false };
    }

    // 4. ASIA-PACIFIC
    if (scope === 'apac') {
      if (hasLat && hasLng) {
        const x = Math.max(70, Math.min(630, 70 + ((item.lng - 65) / (175 - 65)) * 550));
        const y = Math.max(30, Math.min(380, 30 + ((50 - item.lat) / (50 - (-45))) * 340));
        return { x, y, name: item.label, isCoord: true, lat: item.lat, lng: item.lng };
      }
      if (l.includes('japan') || l.includes('tokyo') || l.includes('osaka') || l.includes('jp')) return { x: 535, y: 110, name: item.label, isCoord: false };
      if (l.includes('singapore') || l.includes('sg')) return { x: 295, y: 250, name: item.label, isCoord: false };
      if (l.includes('australia') || l.includes('sydney') || l.includes('melbourne') || l.includes('au')) return { x: 565, y: 345, name: item.label, isCoord: false };
      if (l.includes('korea') || l.includes('seoul') || l.includes('kr')) return { x: 475, y: 105, name: item.label, isCoord: false };
      if (l.includes('china') || l.includes('shanghai') || l.includes('beijing') || l.includes('cn')) return { x: 410, y: 135, name: item.label, isCoord: false };
      if (l.includes('india') || l.includes('south asia') || l.includes('in')) return { x: 175, y: 180, name: item.label, isCoord: false };
      if (l.includes('indonesia') || l.includes('jakarta') || l.includes('id')) return { x: 345, y: 285, name: item.label, isCoord: false };
      if (l.includes('new zealand') || l.includes('auckland') || l.includes('nz')) return { x: 650, y: 380, name: item.label, isCoord: false };
      if (l.includes('taiwan') || l.includes('taipei') || l.includes('tw')) return { x: 450, y: 185, name: item.label, isCoord: false };
      const apacGrid = [{ x: 535, y: 110 }, { x: 295, y: 250 }, { x: 565, y: 345 }, { x: 475, y: 105 }, { x: 410, y: 135 }, { x: 175, y: 180 }];
      return { ...apacGrid[idx % apacGrid.length], name: item.label, isCoord: false };
    }

    // 5. WORLD (Default)
    if (hasLat && hasLng) {
      const x = Math.max(35, Math.min(705, ((item.lng + 180) / 360) * 670 + 35));
      const y = Math.max(25, Math.min(265, ((90 - item.lat) / 180) * 240 + 25));
      return { x, y, name: item.label, isCoord: true, lat: item.lat, lng: item.lng };
    }
    if (l.includes('north america') || l.includes('usa') || l.includes('us') || l.includes('austin') || l.includes('canada')) {
      return { x: 195, y: 90, name: 'North America', isCoord: false };
    }
    if (l.includes('latin') || l.includes('south america') || l.includes('brazil') || l.includes('mexico')) {
      return { x: 235, y: 220, name: 'Latin America', isCoord: false };
    }
    if (l.includes('europe') || l.includes('frankfurt') || l.includes('uk') || l.includes('germany') || l.includes('france')) {
      return { x: 410, y: 80, name: 'Europe', isCoord: false };
    }
    if (l.includes('africa') || l.includes('south africa') || l.includes('kenya') || l.includes('nigeria')) {
      return { x: 415, y: 175, name: 'Africa', isCoord: false };
    }
    if (l.includes('asia-pacific') || l.includes('apac') || l.includes('asia') || l.includes('singapore') || l.includes('tokyo') || l.includes('japan') || l.includes('china') || l.includes('india')) {
      return { x: 550, y: 105, name: 'Asia-Pacific', isCoord: false };
    }
    if (l.includes('middle east') || l.includes('dubai') || l.includes('uae')) {
      return { x: 470, y: 130, name: 'Middle East', isCoord: false };
    }
    if (l.includes('oceania') || l.includes('australia') || l.includes('sydney')) {
      return { x: 620, y: 230, name: 'Oceania', isCoord: false };
    }
    const defaultPoints = [
      { x: 195, y: 90 },
      { x: 410, y: 80 },
      { x: 550, y: 105 },
      { x: 235, y: 220 },
      { x: 415, y: 175 },
      { x: 620, y: 230 },
      { x: 470, y: 130 },
    ];
    return { ...defaultPoints[idx % defaultPoints.length], name: item.label, isCoord: false };
  };

  const maxVal = Math.max(...data.map((d) => d.value || 1), 1);
  const totalVal = data.reduce((acc, curr) => acc + (curr.value || 0), 0);

  // SVG viewBox for activeScope
  const getViewBox = (scope: MapRegionScope) => {
    switch (scope) {
      case 'us':
        return '0 0 740 380';
      case 'india':
        return '0 0 580 500';
      case 'europe':
        return '0 0 650 440';
      case 'apac':
        return '0 0 700 420';
      default:
        return '0 0 740 290';
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-between relative select-none">
      {/* Map Sub-bar / View Switcher & Country Scope Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 mb-2">
        <div className="flex flex-wrap items-center gap-2">
          {selectedCategory ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                Region: <strong>{selectedCategory}</strong>
              </span>
              {onClearCategory && (
                <button
                  type="button"
                  onClick={onClearCategory}
                  className="text-[11px] hover:underline text-blue-400 ml-1"
                >
                  ← Show All Regions
                </button>
              )}
            </div>
          ) : (
            <span className={`text-[11px] font-mono flex items-center gap-1 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              <Globe className="w-3 h-3 text-blue-400 inline" />
              <span>Click node to cross-filter</span>
            </span>
          )}

          {/* Interactive Country & Region Scope Switcher Tabs */}
          <div className={`flex items-center rounded-lg p-0.5 border text-[10px] font-medium ${
            isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
          }`}>
            {(
              [
                { id: 'world', label: 'World' },
                { id: 'us', label: 'US Map' },
                { id: 'india', label: 'India' },
                { id: 'europe', label: 'Europe' },
                { id: 'apac', label: 'APAC' },
              ] as { id: MapRegionScope; label: string }[]
            ).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveScope(s.id)}
                className={`px-2 py-0.5 rounded transition-all ${
                  activeScope === s.id
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'hover:text-slate-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* View Switcher: Map vs Table */}
        <div className={`flex items-center rounded-lg p-0.5 border text-[11px] ${
          isDark
            ? 'bg-slate-950 border-slate-800 text-slate-300'
            : 'bg-slate-100 border-slate-200 text-slate-700'
        }`}>
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`px-2 py-0.5 rounded transition-colors ${
              viewMode === 'map'
                ? 'bg-blue-600 text-white font-semibold'
                : 'opacity-70 hover:opacity-100'
            }`}
          >
            Map
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-2 py-0.5 rounded transition-colors ${
              viewMode === 'table'
                ? 'bg-blue-600 text-white font-semibold'
                : 'opacity-70 hover:opacity-100'
            }`}
          >
            Rank List
          </button>
        </div>
      </div>

      {viewMode === 'map' ? (
        <div className="relative w-full flex-1 flex items-center justify-center min-h-[200px]">
          <svg
            viewBox={getViewBox(activeScope)}
            className="w-full h-full max-h-60"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <filter id="mapShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.35" />
              </filter>
            </defs>

            {/* Render Country / Regional Silhouette Boundaries based on activeScope */}
            {activeScope === 'us' ? (
              /* UNITED STATES High-Detail Vector Map */
              <g
                className="transition-colors"
                fill={isDark ? '#1e293b' : '#e2e8f0'}
                stroke={isDark ? '#334155' : '#cbd5e1'}
                strokeWidth="1.2"
                opacity="0.88"
              >
                {/* Pacific West Coast & California */}
                <path d="M 60,35 L 140,30 L 130,95 L 115,170 L 100,240 L 70,270 L 50,190 L 55,100 Z" />
                {/* Mountain West & Southwest */}
                <path d="M 140,30 L 300,30 L 295,140 L 310,210 L 290,300 L 180,300 L 165,240 L 130,95 Z" />
                {/* Midwest & Great Lakes */}
                <path d="M 300,30 L 530,35 L 535,130 L 515,190 L 420,195 L 310,210 L 295,140 Z" />
                {/* South & Texas Gulf */}
                <path d="M 290,300 L 310,210 L 420,195 L 540,205 L 580,245 L 610,345 L 560,340 L 525,275 L 430,275 L 360,360 L 330,360 Z" />
                {/* Mid-Atlantic & Southeast */}
                <path d="M 420,195 L 515,190 L 615,170 L 640,225 L 580,245 L 540,205 Z" />
                {/* Northeast & New England */}
                <path d="M 535,130 L 635,90 L 690,45 L 710,75 L 665,150 L 615,170 L 535,130 Z" />
                {/* Alaska Inset */}
                <path d="M 45,310 L 120,305 L 135,345 L 90,365 L 40,345 Z" strokeDasharray="2 2" />
                {/* Hawaii Inset */}
                <path d="M 155,340 L 175,335 L 195,345 L 170,355 Z" strokeDasharray="2 2" />
              </g>
            ) : activeScope === 'india' ? (
              /* INDIA Subcontinent High-Detail Vector Map */
              <g
                className="transition-colors"
                fill={isDark ? '#1e293b' : '#e2e8f0'}
                stroke={isDark ? '#334155' : '#cbd5e1'}
                strokeWidth="1.2"
                opacity="0.88"
              >
                {/* Kashmir & Northern Himalayas */}
                <path d="M 235,25 L 290,30 L 315,75 L 270,110 L 225,95 L 210,60 Z" />
                {/* Punjab, Haryana, Delhi-NCR, Rajasthan */}
                <path d="M 210,60 L 225,95 L 270,110 L 255,160 L 205,190 L 155,180 L 150,130 L 195,100 Z" />
                {/* Gangetic Plains: UP, Bihar */}
                <path d="M 255,160 L 350,150 L 390,195 L 330,225 L 270,205 L 255,160 Z" />
                {/* Western India: Gujarat */}
                <path d="M 155,180 L 205,190 L 190,250 L 130,245 L 120,205 Z" />
                {/* Maharashtra & Central India: Mumbai, Pune */}
                <path d="M 205,190 L 330,225 L 340,285 L 260,315 L 200,320 L 185,255 Z" />
                {/* Southern Tech Corridor: Karnataka, Telangana, Andhra */}
                <path d="M 200,320 L 260,315 L 330,310 L 325,385 L 255,420 L 205,375 Z" />
                {/* Deep South: Tamil Nadu, Kerala */}
                <path d="M 205,375 L 255,420 L 325,385 L 295,465 L 250,480 L 220,445 Z" />
                {/* Eastern & Northeast: West Bengal, Assam */}
                <path d="M 350,150 L 460,140 L 485,180 L 435,210 L 390,195 L 365,280 L 330,225 Z" />
              </g>
            ) : activeScope === 'europe' ? (
              /* EUROPE & UK High-Detail Vector Map */
              <g
                className="transition-colors"
                fill={isDark ? '#1e293b' : '#e2e8f0'}
                stroke={isDark ? '#334155' : '#cbd5e1'}
                strokeWidth="1.2"
                opacity="0.88"
              >
                {/* United Kingdom & Ireland */}
                <path d="M 115,110 L 160,95 L 185,140 L 165,200 L 135,170 Z" />
                {/* France & Benelux */}
                <path d="M 180,185 L 245,160 L 260,220 L 240,290 L 175,270 Z" />
                {/* Germany & DACH */}
                <path d="M 245,160 L 335,145 L 340,230 L 270,250 L 260,220 Z" />
                {/* Iberia (Spain & Portugal) */}
                <path d="M 105,275 L 185,270 L 205,335 L 175,395 L 105,370 Z" />
                {/* Italy & Mediterranean */}
                <path d="M 270,250 L 330,265 L 380,350 L 350,380 L 310,310 Z" />
                {/* Scandinavia & Nordics */}
                <path d="M 260,35 L 350,25 L 380,115 L 310,135 L 265,100 Z" />
                {/* Central & Eastern Europe */}
                <path d="M 335,145 L 480,135 L 500,240 L 410,265 L 340,230 Z" />
              </g>
            ) : activeScope === 'apac' ? (
              /* ASIA-PACIFIC High-Detail Vector Map */
              <g
                className="transition-colors"
                fill={isDark ? '#1e293b' : '#e2e8f0'}
                stroke={isDark ? '#334155' : '#cbd5e1'}
                strokeWidth="1.2"
                opacity="0.88"
              >
                {/* East Asia: China & Korea */}
                <path d="M 330,70 L 470,60 L 510,130 L 430,190 L 340,160 Z" />
                {/* Japan Archipelago */}
                <path d="M 520,80 L 565,105 L 545,150 L 515,120 Z" />
                {/* Southeast Asia: Indochina & Singapore */}
                <path d="M 270,180 L 340,175 L 320,260 L 285,250 Z" />
                {/* Indonesia & Maritime SEA */}
                <path d="M 310,270 L 430,270 L 410,300 L 320,295 Z" />
                {/* Australia & Oceania */}
                <path d="M 500,290 L 620,285 L 640,365 L 550,385 L 490,340 Z" />
                {/* New Zealand */}
                <path d="M 640,370 L 665,360 L 660,405 L 635,410 Z" />
              </g>
            ) : (
              /* WORLD Continents Outlines */
              <g
                className="transition-colors"
                fill={isDark ? '#1e293b' : '#e2e8f0'}
                stroke={isDark ? '#334155' : '#cbd5e1'}
                strokeWidth="1.2"
                opacity="0.85"
              >
                {/* North America */}
                <path d="M 80,45 L 140,30 L 220,35 L 260,65 L 275,100 L 250,140 L 195,155 L 170,135 L 130,160 L 110,125 L 75,95 Z" />
                {/* Greenland */}
                <path d="M 270,25 L 315,20 L 325,48 L 285,55 Z" />
                {/* South America */}
                <path d="M 185,165 L 240,175 L 265,215 L 245,265 L 210,285 L 180,240 L 180,185 Z" />
                {/* Europe */}
                <path d="M 355,50 L 415,40 L 445,70 L 425,105 L 385,110 L 360,90 L 345,65 Z" />
                {/* Africa */}
                <path d="M 365,125 L 430,120 L 455,165 L 435,230 L 390,250 L 360,185 L 350,140 Z" />
                {/* Asia */}
                <path d="M 435,40 L 575,35 L 635,75 L 625,130 L 555,160 L 475,150 L 455,100 Z" />
                {/* Australia / Oceania */}
                <path d="M 585,195 L 655,200 L 670,240 L 615,255 L 580,225 Z" />
              </g>
            )}

            {/* Regional Territory Nodes & Bubbles */}
            {data.map((item, idx) => {
              const coords = getCoordinates(item, idx, activeScope);
              const isSelected = selectedCategory === item.label;
              const isHovered = hoverIndex === idx;

              // Radius scaled by relative volume (between 12px and 26px)
              const ratio = Math.max(0.2, (item.value || 0) / maxVal);
              const radius = 12 + ratio * 16;
              const color = isSelected
                ? '#38bdf8'
                : palette[idx % palette.length] || '#3B82F6';

              return (
                <g
                  key={item.id ? `map-pt-${item.id}-${idx}` : `map-pt-${item.label}-${idx}`}
                  className="cursor-pointer transition-transform duration-200"
                  onClick={() => onSelectCategory && onSelectCategory(item.label)}
                  onMouseEnter={() => setHoverIndex(idx)}
                  onMouseLeave={() => setHoverIndex(null)}
                  filter="url(#mapShadow)"
                >
                  {/* Pulsing outer aura if selected or hovered */}
                  {(isSelected || isHovered) && (
                    <circle
                      cx={coords.x}
                      cy={coords.y}
                      r={radius + 8}
                      fill={color}
                      opacity={isSelected ? 0.35 : 0.2}
                      className="animate-pulse"
                    />
                  )}

                  {/* Core territory circle */}
                  <circle
                    cx={coords.x}
                    cy={coords.y}
                    r={radius}
                    fill={color}
                    fillOpacity={isSelected ? 1 : 0.88}
                    stroke={isSelected ? '#ffffff' : isDark ? '#0f172a' : '#ffffff'}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                  />

                  {/* Value / Percentage inside or adjacent */}
                  <text
                    x={coords.x}
                    y={coords.y + 4}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize={radius > 18 ? '10px' : '9px'}
                    fontWeight="bold"
                    className="pointer-events-none font-mono"
                  >
                    {item.percentage ? `${Math.round(item.percentage)}%` : formatAmount(item.value, 'number')}
                  </text>

                  {/* Territory Name Label Pill */}
                  <g transform={`translate(${coords.x}, ${coords.y + radius + 11})`}>
                    <rect
                      x="-42"
                      y="-7"
                      width="84"
                      height="15"
                      rx="4"
                      fill={isDark ? '#090d16' : '#ffffff'}
                      stroke={isSelected ? color : isDark ? '#334155' : '#cbd5e1'}
                      strokeWidth={isSelected ? 1.5 : 0.8}
                    />
                    <text
                      x="0"
                      y="3.5"
                      textAnchor="middle"
                      fill={isSelected ? '#38bdf8' : isDark ? '#cbd5e1' : '#334155'}
                      fontSize="8.5px"
                      fontWeight={isSelected ? 'bold' : 'normal'}
                      className="pointer-events-none"
                    >
                      {item.label}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {/* Floating Tooltip */}
          {hoverIndex !== null && data[hoverIndex] && (() => {
            const item = data[hoverIndex];
            const coords = getCoordinates(item, hoverIndex, activeScope);
            return (
              <div
                className={`absolute z-20 pointer-events-none rounded-xl border p-2.5 shadow-2xl text-xs backdrop-blur-xs transition-all ${
                  isDark
                    ? 'bg-slate-950/95 border-slate-700 text-white'
                    : 'bg-white/95 border-slate-200 text-slate-900'
                }`}
                style={{
                  left: '50%',
                  top: '8px',
                  transform: 'translateX(-50%)',
                }}
              >
                <div className="flex items-center gap-1.5 font-semibold">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  <span>{item.label}</span>
                  {selectedCategory === item.label && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-mono">
                      Filtered
                    </span>
                  )}
                </div>
                <div className="mt-1 font-mono text-[11px] grid grid-cols-2 gap-x-3 gap-y-0.5 opacity-90">
                  <div>Metric: <strong>{formatAmount(item.value, 'currency')}</strong></div>
                  <div>Share: <strong>{item.percentage || (totalVal > 0 ? ((item.value / totalVal) * 100).toFixed(1) : 0)}%</strong></div>
                  {coords.isCoord && typeof coords.lat === 'number' && typeof coords.lng === 'number' && (
                    <div className="col-span-2 text-[10px] text-blue-400">Coordinates: {coords.lat.toFixed(3)}°, {coords.lng.toFixed(3)}°</div>
                  )}
                  {item.count && (
                    <div className="col-span-2 text-[10px] opacity-75">Records: {item.count.toLocaleString()} rows</div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        /* Ranked Regional Leaderboard View */
        <div className="flex-1 overflow-y-auto max-h-56 pr-1 space-y-2 mt-1">
          {data.map((item, idx) => {
            const pct = item.percentage || (totalVal > 0 ? Math.round((item.value / totalVal) * 1000) / 10 : 0);
            const isSelected = selectedCategory === item.label;

            return (
              <div
                key={item.id ? `leaderboard-${item.id}-${idx}` : `leaderboard-${item.label}-${idx}`}
                onClick={() => onSelectCategory && onSelectCategory(item.label)}
                className={`p-2 rounded-lg border flex items-center justify-between text-xs cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-blue-500/10 border-blue-500 text-blue-400 font-semibold'
                    : isDark
                    ? 'border-slate-800 hover:bg-slate-800/50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] font-mono opacity-60 w-4">#{idx + 1}</span>
                  <div className="truncate font-medium">{item.label}</div>
                </div>

                <div className="flex items-center gap-4 shrink-0 font-mono text-[11px]">
                  <div className="w-24 bg-slate-200/20 rounded-full h-1.5 overflow-hidden hidden sm:block">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <span className="font-semibold">{formatAmount(item.value, 'currency')}</span>
                  <span className="opacity-70 w-10 text-right">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
