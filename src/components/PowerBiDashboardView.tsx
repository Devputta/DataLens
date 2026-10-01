import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  FileText,
  X,
  Search,
  Sparkles,
  Layers,
  Table,
  Eye,
  Settings2,
} from 'lucide-react';
import { ChartConfig, Dataset, FilterState, KpiCardConfig, AutomatedReport } from '../types/analytics';
import { formatMetric } from '../utils/visualizationEngine';
import {
  exportPowerBiPackage,
  exportComprehensiveExcelWorkbook,
  exportDashboardToPdf,
  exportDashboardMarkdown,
  downloadCsv,
} from '../utils/exportUtils';
import { InteractiveChart } from './charts/InteractiveChart';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { ExportSuccessModal, ExportSuccessDetails } from './ExportSuccessModal';

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
  report?: AutomatedReport | null;
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
  report = null,
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

  // Normal Dialog Box state for Downloads
  const [downloadModalDetails, setDownloadModalDetails] = useState<ExportSuccessDetails | null>(null);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

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

  // Export Dropdown state
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setIsExportDropdownOpen(false);
      }
    };
    if (isExportDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isExportDropdownOpen]);

  // 1. Direct Power BI Model & Template Export (.pbit / JSON)
  const handleExportBi = () => {
    const cleanDatasetName = dataset?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Model';
    const filename = `datalens_powerbi_${cleanDatasetName}.pbit`;
    exportPowerBiPackage(dataset, activeRecords, kpis, charts, report || null);
    setIsExportDropdownOpen(false);
    setDownloadModalDetails({
      title: 'Power BI Template Downloaded',
      filename,
      format: 'pbit',
      description: 'Your Power BI report template has been generated with complete data model schema, DAX measures, and visual canvas layouts.',
      highlights: [
        'Complete data model & column data type specifications',
        'Pre-calculated DAX measures (SUM, AVERAGE, COUNTROWS)',
        `Canvas layout with ${charts.length} visual widgets and mappings`,
        'Ready to import into Power BI Desktop or Service',
      ],
    });
    setIsDownloadModalOpen(true);
  };

  // 2. Comprehensive Multi-Sheet Excel Workbook (.xlsx) with all visuals, data, and KPIs
  const handleExportExcel = () => {
    const safeBaseName = dataset?.name ? dataset.name.replace(/[^a-zA-Z0-9]/g, '_') : 'report';
    const filename = `datalens_powerbi_studio_${safeBaseName}.xlsx`;
    exportComprehensiveExcelWorkbook(
      dataset,
      activeRecords,
      kpis,
      charts,
      report || null,
      filename
    );
    setIsExportDropdownOpen(false);
    setDownloadModalDetails({
      title: 'Excel Workbook Downloaded',
      filename,
      format: 'xlsx',
      description: `Exported complete multi-sheet Excel workbook containing all ${charts.length} visuals, breakdown data tables, KPIs, and raw records.`,
      highlights: [
        `Dedicated data sheets for all ${charts.length} visuals with in-cell distribution bars`,
        'Power BI visual catalog & coordinates reference',
        'Key performance indicators (KPIs) and trend benchmarks',
        'Power BI DAX formula reference sheet',
        'Raw filtered dataset and complete data dictionary',
      ],
    });
    setIsDownloadModalOpen(true);
  };

  // 3. High-Resolution PDF Document (.pdf)
  const handleExportPdf = () => {
    const safeBaseName = dataset?.name ? dataset.name.replace(/[^a-zA-Z0-9]/g, '_') : 'report';
    const filename = `datalens_powerbi_studio_${safeBaseName}.pdf`;
    exportDashboardToPdf(
      dataset,
      activeRecords,
      kpis,
      charts,
      filename
    );
    setIsExportDropdownOpen(false);
    setDownloadModalDetails({
      title: 'PDF Report Ready',
      filename,
      format: 'pdf',
      description: 'Generated printable high-resolution PDF report of Power BI Studio visuals and metrics.',
      highlights: [
        `All ${charts.length} charts formatted in print-ready layout`,
        'KPI scorecards and metric benchmarks',
        'Executive visual summary',
      ],
    });
    setIsDownloadModalOpen(true);
  };

  // 4. Markdown Report (.md)
  const handleExportMd = () => {
    const safeBaseName = dataset?.name ? dataset.name.replace(/[^a-zA-Z0-9]/g, '_') : 'report';
    const filename = `datalens_powerbi_studio_${safeBaseName}.md`;
    exportDashboardMarkdown(dataset, activeRecords, kpis, charts);
    setIsExportDropdownOpen(false);
    setDownloadModalDetails({
      title: 'Markdown Report Downloaded',
      filename,
      format: 'md',
      description: 'Exported Power BI Studio dashboard summary and data tables as Markdown (.md).',
      highlights: [
        'Executive summary and KPI metric values',
        'Visuals catalog and field mappings',
        'Dataset column profiling summary',
      ],
    });
    setIsDownloadModalOpen(true);
  };

  // 5. CSV Dataset (.csv)
  const handleExportCsv = () => {
    const safeBaseName = dataset?.name ? dataset.name.replace(/[^a-zA-Z0-9]/g, '_') : 'data';
    const filename = `datalens_powerbi_studio_${safeBaseName}.csv`;
    downloadCsv(activeRecords, filename);
    setIsExportDropdownOpen(false);
    setDownloadModalDetails({
      title: 'CSV Dataset Downloaded',
      filename,
      format: 'csv',
      description: `Exported ${activeRecords.length.toLocaleString()} processed records as CSV.`,
      highlights: [
        `${activeRecords.length.toLocaleString()} records matching current filters`,
        'Includes all dataset dimensions and numeric measures',
        'Guarded against spreadsheet formula injection',
      ],
    });
    setIsDownloadModalOpen(true);
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
              Multi-visual canvas, slicers pane, regional map, cross-highlighting, and direct Power BI (.pbit) & Excel (.xlsx) export.
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

          {/* Export As Dropdown: BI (.pbit), Excel (.xlsx with everything), PDF (.pdf), MD, CSV */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              type="button"
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              title="Export Power BI Report (Power BI .pbit, Excel .xlsx with all visuals, PDF document)"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export As</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${isExportDropdownOpen ? 'rotate-180' : 'opacity-70'}`} />
            </button>

            {isExportDropdownOpen && (
              <div
                className={`absolute right-0 mt-1.5 w-72 rounded-2xl border shadow-2xl p-2 z-50 animate-fade-in ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold border-b border-inherit flex items-center justify-between">
                  <span>Export Formats</span>
                  <span className="font-normal opacity-70">5 Available</span>
                </div>

                <div className="p-1 space-y-1">
                  {/* 1. Power BI Package (.pbit) */}
                  <button
                    type="button"
                    onClick={handleExportBi}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 font-black text-xs border border-amber-500/30">
                        P
                      </div>
                      <div>
                        <div className="text-xs font-bold">Power BI Template</div>
                        <div className="text-[10px] opacity-60">Full data model, DAX & visual layout</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
                      .PBIT
                    </span>
                  </button>

                  {/* 2. Complete Excel Workbook (.xlsx) */}
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/30">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          <span>Excel Workbook</span>
                          <span className="text-[9px] px-1 rounded bg-emerald-500/20 text-emerald-500 font-semibold">ALL VISUALS</span>
                        </div>
                        <div className="text-[10px] opacity-60">Multi-sheet: charts data, KPIs & records</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                      .XLSX
                    </span>
                  </button>

                  {/* 3. PDF Document (.pdf) */}
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-red-500/15 text-red-500 flex items-center justify-center shrink-0 border border-red-500/30">
                        <FileText className="w-4 h-4 text-red-500" />
                      </div>
                      <div>
                        <div className="text-xs font-bold">PDF Visual Report</div>
                        <div className="text-[10px] opacity-60">High-res printable document</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-500 border border-red-500/30">
                      .PDF
                    </span>
                  </button>

                  {/* 4. Markdown (.md) */}
                  <button
                    type="button"
                    onClick={handleExportMd}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/30">
                        <Download className="w-4 h-4 text-blue-500" />
                      </div>
                      <div>
                        <div className="text-xs font-bold">Markdown Summary</div>
                        <div className="text-[10px] opacity-60">Text dossier & tabular metrics</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-500 border border-blue-500/30">
                      .MD
                    </span>
                  </button>

                  {/* 5. CSV (.csv) */}
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-500/15 text-slate-400 flex items-center justify-center shrink-0 border border-slate-500/30">
                        <Table className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold">CSV Raw Records</div>
                        <div className="text-[10px] opacity-60">Filtered table rows</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-500/20 text-slate-400 border border-slate-500/30">
                      .CSV
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Normal Download Success Dialog Box */}
      <ExportSuccessModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        details={downloadModalDetails}
      />

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
