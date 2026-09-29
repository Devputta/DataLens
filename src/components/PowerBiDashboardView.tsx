import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Globe,
  Sliders,
  Filter,
  Download,
  Share2,
  RefreshCw,
  Plus,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronRight,
  Maximize2,
  LayoutGrid,
  FileSpreadsheet,
  X,
  Search,
  Sparkles,
  Layers,
  Table,
  Eye,
  Settings2,
} from 'lucide-react';
import { ChartConfig, Dataset, FilterState, KpiCardConfig } from '../types/analytics';
import { formatMetric } from '../utils/visualizationEngine';
import { exportPowerBiPackage } from '../utils/exportUtils';
import { InteractiveChart } from './charts/InteractiveChart';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';

interface PowerBiDashboardViewProps {
  dataset: Dataset;
  activeRecords: Record<string, any>[];
  kpis: KpiCardConfig[];
  charts: ChartConfig[];
  filters: FilterState;
  onFilterChange: React.Dispatch<React.SetStateAction<FilterState>>;
  selectedCategory: string | null;
  onSelectCategory: (category: string) => void;
  onClearCategory: (category?: string) => void;
}

export type PowerBiVisualId = 'kpis' | 'map' | 'bar' | 'donut' | 'line' | 'matrix' | 'boxplot' | 'scatter';

interface VisualOption {
  id: PowerBiVisualId;
  name: string;
  category: 'Overview' | 'Geographic' | 'Categorical' | 'Advanced';
  description: string;
  icon: any;
  defaultActive: boolean;
}

const AVAILABLE_POWERBI_VISUALS: VisualOption[] = [
  {
    id: 'kpis',
    name: 'Executive Multi-Row KPI Cards',
    category: 'Overview',
    description: 'High-impact total metrics, period trends, and mini sparklines',
    icon: Sparkles,
    defaultActive: true,
  },
  {
    id: 'map',
    name: 'Geographic & Territory Map',
    category: 'Geographic',
    description: 'Interactive regional choropleth, territory bubbles, and global density',
    icon: Globe,
    defaultActive: true,
  },
  {
    id: 'line',
    name: 'Time Series Area & Trend',
    category: 'Overview',
    description: 'Chronological growth trajectory, area gradients, and trajectory curves',
    icon: TrendingUp,
    defaultActive: true,
  },
  {
    id: 'bar',
    name: 'Ranked Performance Bar Chart',
    category: 'Categorical',
    description: 'Segment volume comparison, sorted rankings, and distribution',
    icon: BarChart3,
    defaultActive: true,
  },
  {
    id: 'donut',
    name: 'Segment Donut Share',
    category: 'Categorical',
    description: 'Part-to-whole segment percentage breakdown',
    icon: PieChart,
    defaultActive: true,
  },
  {
    id: 'boxplot',
    name: 'Statistical Dispersion Boxplot',
    category: 'Advanced',
    description: 'Interquartile ranges, medians, and distribution spread',
    icon: Layers,
    defaultActive: false,
  },
  {
    id: 'matrix',
    name: 'Cross-Tabular Heatmap Matrix',
    category: 'Advanced',
    description: 'Two-dimensional concentration grid across categories',
    icon: LayoutGrid,
    defaultActive: false,
  },
  {
    id: 'scatter',
    name: 'Correlation Scatter Plot',
    category: 'Advanced',
    description: 'Relationship between two numeric metrics across records',
    icon: TrendingUp,
    defaultActive: false,
  },
];

export const PowerBiDashboardView: React.FC<PowerBiDashboardViewProps> = ({
  dataset,
  activeRecords,
  kpis,
  charts,
  filters,
  onFilterChange,
  selectedCategory,
  onSelectCategory,
  onClearCategory,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { formatAmount } = useCurrency();

  // Active Report Page Tab
  const [activePage, setActivePage] = useState<'overview' | 'geo' | 'breakdown' | 'custom'>('overview');

  // Selected Visuals for the Power BI Dashboard Canvas
  const [selectedVisualIds, setSelectedVisualIds] = useState<PowerBiVisualId[]>([
    'kpis',
    'map',
    'line',
    'bar',
    'donut',
  ]);

  // Drawer / Modal for Visual Selection
  const [showVisualSelector, setShowVisualSelector] = useState(false);

  // Filter Pane Visibility
  const [isFilterPaneOpen, setIsFilterPaneOpen] = useState(true);

  // Export Toast state
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Toggle visual inclusion
  const toggleVisual = (id: PowerBiVisualId) => {
    setSelectedVisualIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  // Find or generate map chart
  const mapChart = useMemo(() => {
    const existing = charts.find((c) => c.type === 'map');
    if (existing) return existing;

    const catCol = dataset.columns.find((c) => c.type === 'category' || c.type === 'text');
    const numCol = dataset.columns.find((c) => c.type === 'numeric');
    if (!catCol || !numCol) return null;

    const mapTotals = new Map<string, number>();
    for (const r of activeRecords) {
      const k = String(r[catCol.name] || 'Other');
      const n = typeof r[numCol.name] === 'number' ? r[numCol.name] : 1;
      mapTotals.set(k, (mapTotals.get(k) || 0) + n);
    }
    const sum = Array.from(mapTotals.values()).reduce((a, b) => a + b, 0);
    const data = Array.from(mapTotals.entries())
      .map(([label, val]) => ({
        label,
        value: val,
        percentage: sum > 0 ? Math.round((val / sum) * 1000) / 10 : 0,
      }))
      .slice(0, 8);

    return {
      id: 'pbi_map_chart',
      title: `Regional Geo Map: ${numCol.name} by ${catCol.name}`,
      subtitle: 'Power BI interactive geographic visual',
      type: 'map' as const,
      xAxisColumn: catCol.name,
      yAxisColumn: numCol.name,
      aggregation: 'sum' as const,
      data,
    };
  }, [charts, dataset.columns, activeRecords]);

  // Find line / time-based chart
  const lineChart = useMemo(() => {
    return charts.find((c) => c.type === 'area' || c.type === 'line') || charts[0];
  }, [charts]);

  // Find bar chart
  const barChart = useMemo(() => {
    return charts.find((c) => c.type === 'bar' || c.type === 'horizontal_bar') || charts[1];
  }, [charts]);

  // Find donut chart
  const donutChart = useMemo(() => {
    return charts.find((c) => c.type === 'donut') || charts[2];
  }, [charts]);

  // Find boxplot or heatmap
  const boxplotChart = useMemo(() => {
    return charts.find((c) => c.type === 'boxplot');
  }, [charts]);

  // Find heatmap chart
  const heatmapChart = useMemo(() => {
    return charts.find((c) => c.type === 'heatmap');
  }, [charts]);

  // Find scatter chart
  const scatterChart = useMemo(() => {
    return charts.find((c) => c.type === 'scatter');
  }, [charts]);

  // Direct Power BI Model & Template Export (.pbit / JSON)
  const handleExportBi = () => {
    exportPowerBiPackage(dataset, activeRecords, kpis, charts);
    setExportNotice('Exported Power BI Report template (.pbit / BI model file) with full visual layout and dataset schema.');
    setTimeout(() => setExportNotice(null), 4000);
  };

  return (
    <div className="space-y-4">
      
      {/* 1. Power BI Application Ribbon Bar */}
      <div className={`border rounded-2xl p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 transition-colors no-print ${
        isDark
          ? 'bg-slate-900 border-slate-800 text-slate-100'
          : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black text-sm shadow-md">
            PBI
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold tracking-tight">
                Power BI Enterprise Report Studio
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold border bg-amber-500/15 text-amber-500 border-amber-500/30">
                Connected · {activeRecords.length.toLocaleString()} Rows
              </span>
            </div>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Multi-visual canvas, slicers pane, regional map, cross-highlighting, and direct Power BI (.pbit) model export.
            </p>
          </div>
        </div>

        {/* Ribbon Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Visual Selection Button */}
          <button
            type="button"
            onClick={() => setShowVisualSelector(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Select Visuals ({selectedVisualIds.length})</span>
          </button>

          {/* Toggle Filter Pane */}
          <button
            type="button"
            onClick={() => setIsFilterPaneOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              isFilterPaneOpen
                ? 'bg-blue-600/10 text-blue-500 border-blue-500/30'
                : isDark
                ? 'bg-slate-800 border-slate-700 text-slate-300'
                : 'bg-slate-100 border-slate-300 text-slate-700'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{isFilterPaneOpen ? 'Hide Slicers' : 'Show Slicers'}</span>
          </button>

          {/* Export as BI (Power BI Model & Template) */}
          <button
            type="button"
            onClick={handleExportBi}
            title="Export as Power BI Report Template (.pbit) and JSON Data Model"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm bg-amber-500 hover:bg-amber-400 text-slate-950"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export as BI</span>
          </button>
        </div>
      </div>

      {/* Export notification banner */}
      {exportNotice && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-400 flex items-center justify-between no-print animate-fade-in font-mono">
          <span>✓ {exportNotice}</span>
          <button onClick={() => setExportNotice(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* 2. Main Power BI Report Studio Workspace (Canvas + Slicers Pane) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Canvas Zone: Left (9 or 12 columns) */}
        <div className={`${isFilterPaneOpen ? 'lg:col-span-9' : 'lg:col-span-12'} space-y-5 transition-all`}>
          
          {/* Power BI Canvas Page Tabs Ribbon */}
          <div className={`flex items-center gap-1 border-b pb-2 no-print overflow-x-auto ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}>
            <button
              onClick={() => setActivePage('overview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                activePage === 'overview'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : isDark
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Page 1: Executive KPI & Overview</span>
            </button>

            <button
              onClick={() => setActivePage('geo')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                activePage === 'geo'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : isDark
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Page 2: Geographic & Regional Map</span>
            </button>

            <button
              onClick={() => setActivePage('breakdown')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                activePage === 'breakdown'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : isDark
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Page 3: Categorical & Outlier Matrix</span>
            </button>

            <button
              onClick={() => setActivePage('custom')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                activePage === 'custom'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : isDark
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Page 4: Visuals Workspace ({selectedVisualIds.length})</span>
            </button>
          </div>

          {/* PAGE 1: Executive KPI & Overview */}
          {activePage === 'overview' && (
            <div className="space-y-5">
              {/* Multi-Row KPI Cards Visual */}
              {selectedVisualIds.includes('kpis') && (
                <div className={`p-4 border rounded-xl card-print ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider opacity-80">
                      Power BI Executive Metrics Cards
                    </h3>
                    <span className="text-[10px] font-mono opacity-70">Auto-calculated</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {kpis.slice(0, 4).map((kpi) => (
                      <div
                        key={kpi.id}
                        className={`p-3 rounded-lg border ${
                          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="text-[11px] font-medium opacity-75 truncate">{kpi.title}</div>
                        <div className="text-lg font-bold font-mono mt-1 tracking-tight">
                          {kpi.format === 'currency' ? formatAmount(kpi.value, 'currency') : formatAmount(kpi.value, 'number')}
                        </div>
                        {kpi.trend && (
                          <div className={`text-[10px] font-mono mt-1 ${
                            kpi.trend.direction === 'up' ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {kpi.trend.direction === 'up' ? '▲' : '▼'} {kpi.trend.percentage}% vs prev
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Grid with Map Visual and Time Series Trend */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {selectedVisualIds.includes('map') && mapChart && (
                  <div className="col-span-1">
                    <InteractiveChart
                      config={mapChart}
                      selectedCategory={selectedCategory}
                      onSelectCategory={onSelectCategory}
                      onClearCategory={() => onClearCategory()}
                    />
                  </div>
                )}

                {selectedVisualIds.includes('line') && lineChart && (
                  <div className="col-span-1">
                    <InteractiveChart
                      config={lineChart}
                      selectedCategory={selectedCategory}
                      onSelectCategory={onSelectCategory}
                      onClearCategory={() => onClearCategory()}
                    />
                  </div>
                )}
              </div>

              {/* Grid with Bar and Donut */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {selectedVisualIds.includes('bar') && barChart && (
                  <InteractiveChart
                    config={barChart}
                    selectedCategory={selectedCategory}
                    onSelectCategory={onSelectCategory}
                    onClearCategory={() => onClearCategory()}
                  />
                )}

                {selectedVisualIds.includes('donut') && donutChart && (
                  <InteractiveChart
                    config={donutChart}
                    selectedCategory={selectedCategory}
                    onSelectCategory={onSelectCategory}
                    onClearCategory={() => onClearCategory()}
                  />
                )}
              </div>
            </div>
          )}

          {/* PAGE 2: Geographic & Regional Map Focus */}
          {activePage === 'geo' && (
            <div className="space-y-5">
              {mapChart ? (
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl border ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-amber-500" />
                        <h3 className="text-sm font-bold">Geographic Intelligence & Global Footprint</h3>
                      </div>
                      <span className="text-xs font-mono opacity-80">Interactive Territory Nodes</span>
                    </div>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Click on any territory bubble to cross-filter the entire dashboard to that region. Use the 'Rank List' switch to view ordered metrics.
                    </p>
                  </div>

                  <div className="w-full">
                    <InteractiveChart
                      config={{
                        ...mapChart,
                        title: 'Global Territory Distribution & Regional Intensity',
                        subtitle: 'Power BI Geographic Visual with interactive choropleth',
                      }}
                      selectedCategory={selectedCategory}
                      onSelectCategory={onSelectCategory}
                      onClearCategory={() => onClearCategory()}
                    />
                  </div>

                  {/* Regional Breakdown Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {mapChart.data.slice(0, 3).map((item: any, i: number) => (
                      <div
                        key={`pbi-map-region-${item.id || item.label}-${i}`}
                        onClick={() => onSelectCategory(item.label)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          selectedCategory === item.label
                            ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500'
                            : isDark
                            ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">{item.label}</span>
                          <span className="text-[10px] font-mono opacity-70">Rank #{i + 1}</span>
                        </div>
                        <div className="text-lg font-bold font-mono mt-2">
                          {formatAmount(item.value, 'currency')}
                        </div>
                        <div className="text-xs mt-1 opacity-80">
                          {item.percentage}% of global volume
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-xs text-slate-400">No geographic data detected</div>
              )}
            </div>
          )}

          {/* PAGE 3: Categorical & Outlier Matrix */}
          {activePage === 'breakdown' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {barChart && (
                  <InteractiveChart
                    config={barChart}
                    selectedCategory={selectedCategory}
                    onSelectCategory={onSelectCategory}
                    onClearCategory={() => onClearCategory()}
                  />
                )}

                {donutChart && (
                  <InteractiveChart
                    config={donutChart}
                    selectedCategory={selectedCategory}
                    onSelectCategory={onSelectCategory}
                    onClearCategory={() => onClearCategory()}
                  />
                )}
              </div>

              {boxplotChart && (
                <InteractiveChart
                  config={boxplotChart}
                  selectedCategory={selectedCategory}
                  onSelectCategory={onSelectCategory}
                  onClearCategory={() => onClearCategory()}
                />
              )}

              {heatmapChart && (
                <InteractiveChart
                  config={heatmapChart}
                  selectedCategory={selectedCategory}
                  onSelectCategory={onSelectCategory}
                  onClearCategory={() => onClearCategory()}
                />
              )}

              {scatterChart && (
                <InteractiveChart
                  config={scatterChart}
                  selectedCategory={selectedCategory}
                  onSelectCategory={onSelectCategory}
                  onClearCategory={() => onClearCategory()}
                />
              )}
            </div>
          )}

          {/* PAGE 4: Custom Visuals Workspace */}
          {activePage === 'custom' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold">Custom Visuals Canvas</h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Active visual count: {selectedVisualIds.length}. Customize which visuals appear in this Power BI report.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVisualSelector(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold bg-amber-500 text-slate-950"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Choose Visuals</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {selectedVisualIds.includes('map') && mapChart && (
                  <InteractiveChart
                    config={mapChart}
                    selectedCategory={selectedCategory}
                    onSelectCategory={onSelectCategory}
                    onClearCategory={() => onClearCategory()}
                  />
                )}
                {selectedVisualIds.includes('line') && lineChart && (
                  <InteractiveChart
                    config={lineChart}
                    selectedCategory={selectedCategory}
                    onSelectCategory={onSelectCategory}
                    onClearCategory={() => onClearCategory()}
                  />
                )}
                {selectedVisualIds.includes('bar') && barChart && (
                  <InteractiveChart
                    config={barChart}
                    selectedCategory={selectedCategory}
                    onSelectCategory={onSelectCategory}
                    onClearCategory={() => onClearCategory()}
                  />
                )}
                {selectedVisualIds.includes('donut') && donutChart && (
                  <InteractiveChart
                    config={donutChart}
                    selectedCategory={selectedCategory}
                    onSelectCategory={onSelectCategory}
                    onClearCategory={() => onClearCategory()}
                  />
                )}
                {selectedVisualIds.includes('boxplot') && boxplotChart && (
                  <InteractiveChart
                    config={boxplotChart}
                    selectedCategory={selectedCategory}
                    onSelectCategory={onSelectCategory}
                    onClearCategory={() => onClearCategory()}
                  />
                )}
                {selectedVisualIds.includes('scatter') && scatterChart && (
                  <InteractiveChart
                    config={scatterChart}
                    selectedCategory={selectedCategory}
                    onSelectCategory={onSelectCategory}
                    onClearCategory={() => onClearCategory()}
                  />
                )}
              </div>
            </div>
          )}

        </div>

        {/* 3. Power BI Slicers & Filter Pane: Right (3 columns) */}
        {isFilterPaneOpen && (
          <aside className={`lg:col-span-3 border rounded-xl p-4 space-y-5 transition-all no-print ${
            isDark
              ? 'bg-slate-900 border-slate-800 text-slate-100'
              : 'bg-white border-slate-200 text-slate-900 shadow-xs'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-inherit">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Power BI Slicers & Filters</h3>
              </div>
              <button
                type="button"
                onClick={() => onClearCategory()}
                className="text-[11px] hover:underline font-semibold opacity-75"
              >
                Reset All
              </button>
            </div>

            {/* Active Slicer Chip */}
            {selectedCategory && (
              <div className="p-2.5 rounded-lg border flex items-center justify-between text-xs bg-amber-500/10 border-amber-500/30 text-amber-500">
                <div className="truncate">
                  <span className="opacity-70 text-[10px] block">Active Slicer:</span>
                  <strong>{selectedCategory}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => onClearCategory()}
                  className="p-1 hover:opacity-100 opacity-70"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Category Slicers List */}
            {dataset.columns
              .filter((c) => c.type === 'category' || c.type === 'text')
              .slice(0, 3)
              .map((col) => {
                const uniqueVals = Array.from(
                  new Set(activeRecords.map((r) => r[col.name]).filter(Boolean))
                ).slice(0, 6);

                return (
                  <div key={col.name} className="space-y-1.5">
                    <label className="text-[11px] font-semibold opacity-80 flex items-center justify-between">
                      <span>{col.name}</span>
                      <span className="text-[10px] opacity-60 font-mono">{uniqueVals.length} items</span>
                    </label>

                    <div className="space-y-1">
                      {uniqueVals.map((val, valIdx) => {
                        const isChecked =
                          selectedCategory === String(val) ||
                          (filters.categories[col.name] &&
                            filters.categories[col.name].includes(String(val)));

                        return (
                          <div
                            key={`pbi-filter-${col.name}-${String(val)}-${valIdx}`}
                            onClick={() => onSelectCategory(String(val))}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-amber-500 text-slate-950 font-bold'
                                : isDark
                                ? 'hover:bg-slate-800 text-slate-300'
                                : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <span className="truncate">{String(val)}</span>
                            {isChecked && <CheckSquare className="w-3.5 h-3.5 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

            {/* Quick Stats Summary Footer */}
            <div className="pt-3 border-t border-inherit text-[11px] font-mono opacity-75 space-y-1">
              <div>Dataset: {dataset.name}</div>
              <div>Profiled Columns: {dataset.columns.length}</div>
              <div>Quality Score: {dataset.qualityReport.overallHealthScore}/100</div>
            </div>
          </aside>
        )}

      </div>

      {/* 4. Visual Selector Drawer / Modal (Option to Select Visuals for Power BI Dashboard) */}
      {showVisualSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 no-print overflow-y-auto">
          <div className={`w-full max-w-xl rounded-2xl border shadow-2xl p-6 transition-all my-8 ${
            isDark
              ? 'bg-slate-900 border-slate-800 text-slate-100'
              : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-inherit">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center">
                  <Sliders className="w-4 h-4 font-bold" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Select Visuals for Power BI Dashboard</h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Choose which visual widgets to render on the Power BI report canvas.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVisualSelector(false)}
                className="p-1.5 rounded-lg border border-inherit hover:opacity-80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {AVAILABLE_POWERBI_VISUALS.map((opt) => {
                const isSelected = selectedVisualIds.includes(opt.id);
                const IconComponent = opt.icon;

                return (
                  <div
                    key={opt.id}
                    onClick={() => toggleVisual(opt.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 shadow-xs'
                        : isDark
                        ? 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold">{opt.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-500/20 opacity-80">
                            {opt.category}
                          </span>
                        </div>
                        <p className={`text-[11px] mt-0.5 line-clamp-1 ${
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          {opt.description}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 pl-2">
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-amber-500" />
                      ) : (
                        <Square className="w-5 h-5 opacity-40" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-inherit flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setSelectedVisualIds([
                    'kpis',
                    'map',
                    'line',
                    'bar',
                    'donut',
                    'boxplot',
                    'matrix',
                    'scatter',
                  ])
                }
                className="text-xs font-semibold hover:underline opacity-80"
              >
                Select All Visuals
              </button>

              <button
                type="button"
                onClick={() => setShowVisualSelector(false)}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 text-slate-950"
              >
                Apply Visuals ({selectedVisualIds.length})
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
