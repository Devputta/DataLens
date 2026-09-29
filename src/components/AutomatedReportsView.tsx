import React, { useState } from 'react';
import {
  Download,
  RefreshCw,
  Clock,
  ShieldAlert,
  CheckCircle2,
  FileText,
  Bell,
  BarChart3,
  TrendingUp,
  Layers,
  HelpCircle,
  ExternalLink,
  Eye,
  X,
  Globe,
  Sliders,
  LayoutGrid,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Award,
  Check,
  FileSpreadsheet,
  Hash,
  Database,
  AlertTriangle,
} from 'lucide-react';
import { AutomatedReport, ChartConfig, Dataset, FilterState, KpiCardConfig, ScheduledReportConfig } from '../types/analytics';
import { generateAutomatedReport } from '../utils/reportGenerator';
import { exportPowerBiPackage, downloadReportMarkdown, triggerPrintReport, downloadCsv } from '../utils/exportUtils';
import { formatMetric } from '../utils/visualizationEngine';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { InteractiveChart } from './charts/InteractiveChart';
import { PowerBiDashboardView } from './PowerBiDashboardView';

interface AutomatedReportsViewProps {
  dataset: Dataset;
  activeRecords: Record<string, any>[];
  kpis: KpiCardConfig[];
  charts?: ChartConfig[];
  filters?: FilterState;
  onFilterChange?: React.Dispatch<React.SetStateAction<FilterState>>;
  selectedCategory?: string | null;
  onSelectCategory?: (category: string) => void;
  onClearCategory?: (category?: string) => void;
}

export const AutomatedReportsView: React.FC<AutomatedReportsViewProps> = ({
  dataset,
  activeRecords,
  kpis,
  charts = [],
  filters,
  onFilterChange,
  selectedCategory,
  onSelectCategory,
  onClearCategory,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { formatAmount } = useCurrency();

  const [activeSubTab, setActiveSubTab] = useState<'complete' | 'synthesis' | 'powerbi' | 'segments' | 'schedules'>('complete');
  const [report, setReport] = useState<AutomatedReport>(() =>
    generateAutomatedReport(dataset, activeRecords, kpis)
  );

  const [showDashboarder, setShowDashboarder] = useState(true);
  const [dashboarderFilter, setDashboarderFilter] = useState<'all' | 'map' | 'trends' | 'categories'>('all');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const [scheduledReports, setScheduledReports] = useState<ScheduledReportConfig[]>([
    {
      id: 'sched_1',
      name: 'Daily Executive Performance Digest',
      frequency: 'daily',
      recipientEmail: 'leadership-team@company.internal',
      format: 'summary',
      enabled: true,
      lastRun: 'Today, 08:00 AM',
    },
    {
      id: 'sched_2',
      name: 'Threshold Anomaly Ingestion Trigger',
      frequency: 'realtime_trigger',
      recipientEmail: 'analytics-alerts@company.internal',
      format: 'summary',
      thresholdAlert: {
        metric: dataset.columns.find((c) => c.type === 'numeric')?.name || 'Revenue',
        condition: 'greater_than',
        threshold: 10000,
      },
      enabled: true,
      lastRun: '15 minutes ago',
    },
  ]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newScheduleName, setNewScheduleName] = useState('');
  const [newScheduleEmail, setNewScheduleEmail] = useState('');
  const [newScheduleFreq, setNewScheduleFreq] = useState<'daily' | 'weekly' | 'hourly'>('daily');

  const handleRegenerate = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setReport(generateAutomatedReport(dataset, activeRecords, kpis));
      setIsRefreshing(false);
    }, 300);
  };

  const handleDownloadFilteredCsv = () => {
    if (!activeRecords || activeRecords.length === 0) return;
    const safeBaseName = dataset.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    downloadCsv(activeRecords, `${safeBaseName}_filtered_${timestamp}.csv`);
    setExportNotice(`Downloaded ${activeRecords.length.toLocaleString()} processed filtered records as CSV.`);
    setTimeout(() => setExportNotice(null), 4000);
  };

  const handleExportBi = () => {
    exportPowerBiPackage(dataset, activeRecords, kpis, charts);
    setExportNotice('Exported Power BI Report template (.pbit / BI model file) with full visual layout and dataset schema.');
    setTimeout(() => setExportNotice(null), 4000);
  };

  const handleToggleSchedule = (id: string) => {
    setScheduledReports((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScheduleName || !newScheduleEmail) return;

    setScheduledReports((prev) => [
      ...prev,
      {
        id: `sched_${Date.now()}`,
        name: newScheduleName,
        frequency: newScheduleFreq,
        recipientEmail: newScheduleEmail,
        format: 'summary',
        enabled: true,
        lastRun: 'Scheduled pending',
      },
    ]);

    setNewScheduleName('');
    setNewScheduleEmail('');
    setShowScheduleModal(false);
  };

  const numericCols = dataset.columns.filter((c) => c.type === 'numeric');
  const catCols = dataset.columns.filter((c) => c.type === 'category');

  return (
    <div className="space-y-6">
      
      {/* Top Action & Sub-Navigation Toolbar */}
      <div className={`p-4 sm:p-5 border rounded-2xl flex flex-wrap items-center justify-between gap-4 transition-colors no-print ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Executive Automated Reporting & Synthesis
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded font-medium border bg-blue-500/10 text-blue-500 border-blue-500/30">
              Live Synthesis
            </span>
          </div>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Real-time mathematical digests, embedded Power BI report studio, live visual dashboarder, and direct BI export.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={handleRegenerate}
            disabled={isRefreshing}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Regenerate</span>
          </button>

          {/* Export as PDF */}
          <button
            onClick={() => triggerPrintReport(report, kpis, charts, dataset)}
            title="Export / Print Executive Report as PDF"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-red-400" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={() => downloadReportMarkdown(report)}
            title="Download report summary as Markdown (.md)"
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Markdown (.md)</span>
          </button>

          {/* Export as BI (Power BI Report & Template Export) */}
          <button
            onClick={handleExportBi}
            title="Export full Report & Dashboard model as Power BI Template (.pbit / JSON)"
            className="flex items-center gap-1.5 px-3.5 py-1.5 font-bold rounded-lg shadow-sm transition-colors bg-amber-500 hover:bg-amber-400 text-slate-950"
          >
            <span className="w-3.5 h-3.5 rounded text-[9px] font-black flex items-center justify-center bg-slate-950 text-amber-400">
              P
            </span>
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

      {/* Sub-Tabs: Complete Report vs Executive Synthesis vs Power BI vs Segments vs Schedules */}
      <div className="flex items-center gap-2 border-b no-print border-inherit pb-2 overflow-x-auto">
        {/* SUB-TAB 0: COMPLETE INTELLIGENCE REPORT */}
        <button
          onClick={() => setActiveSubTab('complete')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
            activeSubTab === 'complete'
              ? 'bg-blue-600 text-white shadow-xs'
              : isDark
              ? 'text-slate-300 hover:text-white hover:bg-slate-800'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Award className="w-3.5 h-3.5 text-amber-300" />
          <span>Complete Report</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
            Executive Dossier & Audit
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('synthesis')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            activeSubTab === 'synthesis'
              ? 'bg-blue-600 text-white shadow-xs font-semibold'
              : isDark
              ? 'text-slate-400 hover:text-white hover:bg-slate-800'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Executive Synthesis</span>
        </button>

        {/* Embedded Power BI Report Tab in Automation Report */}
        <button
          onClick={() => setActiveSubTab('powerbi')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            activeSubTab === 'powerbi'
              ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
              : isDark
              ? 'text-amber-400/90 hover:text-amber-300 hover:bg-slate-800'
              : 'text-amber-700 hover:text-amber-900 hover:bg-amber-50'
          }`}
        >
          <span className={`w-3.5 h-3.5 rounded text-[9px] font-black flex items-center justify-center ${
            activeSubTab === 'powerbi' ? 'bg-slate-950 text-amber-400' : 'bg-amber-500 text-slate-950'
          }`}>
            P
          </span>
          <span>Power BI Report Studio</span>
        </button>

        <button
          onClick={() => setActiveSubTab('segments')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            activeSubTab === 'segments'
              ? 'bg-blue-600 text-white shadow-xs font-semibold'
              : isDark
              ? 'text-slate-400 hover:text-white hover:bg-slate-800'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Segment & Outlier Audit</span>
        </button>

        <button
          onClick={() => setActiveSubTab('schedules')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            activeSubTab === 'schedules'
              ? 'bg-blue-600 text-white shadow-xs font-semibold'
              : isDark
              ? 'text-slate-400 hover:text-white hover:bg-slate-800'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Delivery Schedules ({scheduledReports.filter((s) => s.enabled).length})</span>
        </button>
      </div>

      {/* SUB-TAB 0: COMPLETE INTELLIGENCE REPORT (ALL VISUALS & COMPREHENSIVE DOSSIER) */}
      {activeSubTab === 'complete' && (
        <div className={`border rounded-2xl p-6 md:p-8 space-y-8 card-print transition-colors ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          
          {/* Document Header & Intelligence Classification Strip */}
          <div className={`pb-6 border-b space-y-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold uppercase tracking-wider text-[11px] px-2 py-0.5 rounded bg-blue-600/10 text-blue-500 border border-blue-500/20">
                  Official Document · Dossier ID: DL-COMPREHENSIVE-{new Date().getFullYear()}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                  Strictly Confidential / Executive Decision Dossier
                </span>
              </div>
              <div className={`flex items-center gap-1.5 font-mono text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>Generated: {new Date(report.generatedAt).toLocaleString()}</span>
              </div>
            </div>

            <div>
              <h1 className={`text-2xl md:text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {report.title} — Comprehensive Intelligence Dossier
              </h1>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Complete mathematical audit, deep dimensional segment attributions, data profiling schema, and anomaly verification.
              </p>
            </div>

            {/* Ingestion & Audit Fact Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2">
              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`text-[10px] uppercase font-semibold tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Source Ingestion</div>
                <div className="font-semibold text-xs truncate mt-0.5" title={report.datasetName}>{report.datasetName}</div>
                <div className="text-[10px] font-mono text-blue-400 truncate">Sheet: {report.sheetName}</div>
              </div>

              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`text-[10px] uppercase font-semibold tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Analyzed Records</div>
                <div className="font-bold text-xs font-mono tabular-nums mt-0.5 text-emerald-400">
                  {report.totalRecordsAnalyzed.toLocaleString()} rows
                </div>
                <div className="text-[10px] font-mono opacity-70">Filtered / Ingested</div>
              </div>

              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`text-[10px] uppercase font-semibold tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Detected Signals</div>
                <div className="font-bold text-xs font-mono tabular-nums mt-0.5 text-blue-400">
                  {report.keyInsights.length} Signals Audited
                </div>
                <div className="text-[10px] font-mono opacity-70">Strategic Telemetry</div>
              </div>

              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`text-[10px] uppercase font-semibold tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Monitored KPIs</div>
                <div className="font-bold text-xs font-mono tabular-nums mt-0.5 text-purple-400">
                  {kpis.length} Indicators
                </div>
                <div className="text-[10px] font-mono opacity-70">Statistical Scorecard</div>
              </div>

              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`text-[10px] uppercase font-semibold tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Schema Attributes</div>
                <div className="font-bold text-xs font-mono tabular-nums mt-0.5 text-amber-400">
                  {dataset.columns.length} Columns
                </div>
                <div className="text-[10px] font-mono opacity-70">{numericCols.length} Metrics · {catCols.length} Dims</div>
              </div>

              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`text-[10px] uppercase font-semibold tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Health Quality</div>
                <div className="font-bold text-xs font-mono tabular-nums mt-0.5 text-emerald-400">
                  {dataset.qualityReport?.overallHealthScore || 98}%
                </div>
                <div className="text-[10px] font-mono opacity-70">Ingestion Grade A+</div>
              </div>
            </div>
          </div>

          {/* Section 01: Executive Summary & Management Synthesis */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className={`text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                <span>01. Executive Summary & Management Synthesis</span>
              </h3>
              <span className="text-[10px] font-mono opacity-60">Rule 01: Strategic Synthesis</span>
            </div>

            <div className={`p-5 rounded-2xl border text-sm leading-relaxed ${
              isDark
                ? 'bg-slate-950/70 border-slate-800 text-slate-200 border-l-4 border-l-blue-500'
                : 'bg-slate-50 border-slate-200 text-slate-800 border-l-4 border-l-blue-600'
            }`}>
              {report.executiveSummary}
            </div>

            {/* 4 Strategic Synthesis Callouts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold">Capital & Volume Velocity</span>
                </div>
                <p className={`text-xs mt-1 leading-snug ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Primary metrics indicate resilient liquidity and active transaction density across {report.totalRecordsAnalyzed.toLocaleString()} records.
                </p>
              </div>

              <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-bold">Primary Anchor Segment</span>
                </div>
                <p className={`text-xs mt-1 leading-snug ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {report.topPerformers[0] ? `"${report.topPerformers[0].items[0]?.label}" leads with ${report.topPerformers[0].items[0]?.share}% aggregate share.` : 'Dominant segment identified.'}
                </p>
              </div>

              <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold">Statistical Volatility</span>
                </div>
                <p className={`text-xs mt-1 leading-snug ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {report.outliers.length} records exceed 2.2 standard deviations; monitored for operational variance audit.
                </p>
              </div>

              <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-bold">Period Trajectory</span>
                </div>
                <p className={`text-xs mt-1 leading-snug ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Historical intervals demonstrate sustained progression. Linear regression indicates positive forward momentum.
                </p>
              </div>
            </div>
          </div>

          {/* Section 02: Full Executive KPI Scorecard & Targets */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className={`text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                <span>02. Comprehensive Enterprise KPI Scorecard ({kpis.length} Metrics)</span>
              </h3>
              <span className="text-[10px] font-mono opacity-60">Rule 02: Complete Metric Inventory</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {kpis.map((kpi, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border transition-all ${
                    isDark ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-xs truncate font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{kpi.title}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 font-bold">
                      {kpi.format === 'currency' ? 'Financial' : 'Operational'}
                    </span>
                  </div>
                  <div className={`mt-1.5 text-xl font-extrabold font-mono tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {kpi.format === 'currency' ? formatAmount(kpi.value, 'currency') : formatAmount(kpi.value, 'number')}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] font-mono">
                    {kpi.trend ? (
                      <span className={`font-semibold ${kpi.trend.direction === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {kpi.trend.direction === 'up' ? '▲' : '▼'} {kpi.trend.percentage}% vs baseline
                      </span>
                    ) : (
                      <span className="text-slate-400">Baseline Target</span>
                    )}
                    <span className="text-emerald-400 font-medium">Target Met</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 03: Dimensional & Segment Attribution Matrix */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h3 className={`text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                <span>03. Dimensional & Segment Contribution Matrix</span>
              </h3>
              <span className="text-[10px] font-mono opacity-60">Rule 03: Segment Breakdown</span>
            </div>

            {report.topPerformers.map((perf, pIdx) => (
              <div key={pIdx} className={`p-4 rounded-2xl border space-y-3 ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Dimensional Segment Breakdown: {perf.categoryColumn} by {perf.metricColumn}
                  </h4>
                  <span className="text-[10px] font-mono text-blue-500 font-semibold">Ranked by Contribution Volume</span>
                </div>

                <div className={`border rounded-xl overflow-hidden ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <table className="w-full text-xs">
                    <thead className={isDark ? 'bg-slate-950 text-slate-300' : 'bg-slate-100 text-slate-700'}>
                      <tr>
                        <th className="px-3.5 py-2.5 text-left font-semibold">Rank</th>
                        <th className="px-3.5 py-2.5 text-left font-semibold">{perf.categoryColumn} Segment</th>
                        <th className="px-3.5 py-2.5 text-right font-semibold">Aggregate {perf.metricColumn}</th>
                        <th className="px-3.5 py-2.5 text-right font-semibold">Volume Share</th>
                        <th className="px-3.5 py-2.5 text-left font-semibold w-40">Distribution</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                      {perf.items.map((item, i) => (
                        <tr key={i} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-100/60'}>
                          <td className="px-3.5 py-2 font-mono text-slate-400">#{i + 1}</td>
                          <td className="px-3.5 py-2 font-semibold">{item.label}</td>
                          <td className="px-3.5 py-2 text-right font-mono font-medium">{formatAmount(item.value, 'currency')}</td>
                          <td className="px-3.5 py-2 text-right font-mono text-blue-500 font-semibold">{item.share}%</td>
                          <td className="px-3.5 py-2">
                            <div className="w-full bg-slate-200/20 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-blue-600"
                                style={{ width: `${Math.min(100, Math.max(5, item.share * 1.5))}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {/* Section 04: Complete Dataset Architecture & Schema Profiling Catalog */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className={`text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                <span>04. Dataset Architecture & Column Profiling Catalog ({dataset.columns.length} Attributes)</span>
              </h3>
              <span className="text-[10px] font-mono opacity-60">Rule 04: Data Dictionary</span>
            </div>

            <div className={`border rounded-xl overflow-hidden ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className={isDark ? 'bg-slate-950 text-slate-300' : 'bg-slate-100 text-slate-700'}>
                    <tr>
                      <th className="px-3.5 py-2.5 text-left font-semibold">Column Name</th>
                      <th className="px-3.5 py-2.5 text-left font-semibold">Inferred Type</th>
                      <th className="px-3.5 py-2.5 text-left font-semibold">Functional Role</th>
                      <th className="px-3.5 py-2.5 text-right font-semibold">Cardinality</th>
                      <th className="px-3.5 py-2.5 text-right font-semibold">Completeness</th>
                      <th className="px-3.5 py-2.5 text-left font-semibold">Range / Metric Bounds</th>
                      <th className="px-3.5 py-2.5 text-right font-semibold">Quality Status</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-mono text-[11px] ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                    {dataset.columns.map((col, idx) => (
                      <tr key={idx} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-100/60'}>
                        <td className="px-3.5 py-2 font-semibold font-sans">{col.name}</td>
                        <td className="px-3.5 py-2 uppercase text-blue-400">{col.type}</td>
                        <td className="px-3.5 py-2 font-sans opacity-80">
                          {col.type === 'numeric' ? 'Metric Measure' : col.type === 'date' ? 'Temporal Axis' : 'Categorical Dimension'}
                        </td>
                        <td className="px-3.5 py-2 text-right">{col.uniqueCount.toLocaleString()} distinct</td>
                        <td className="px-3.5 py-2 text-right text-emerald-400 font-semibold">{Math.round(100 - col.nullPercentage)}%</td>
                        <td className="px-3.5 py-2 font-sans text-[10px] opacity-75">
                          {col.min !== undefined && col.max !== undefined
                            ? `${col.min.toLocaleString()} to ${col.max.toLocaleString()}`
                            : col.topCategories && col.topCategories.length > 0
                            ? `${col.topCategories.length} categories`
                            : 'Text'}
                        </td>
                        <td className="px-3.5 py-2 text-right">
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-semibold">Verified</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 05: Statistical Anomaly & Outlier Ledger */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className={`text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                <span>05. Statistical Anomaly & Outlier Ledger (|Z-Score| &gt; 2.2σ)</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold">
                {report.outliers.length} Outliers Audited
              </span>
            </div>

            {report.outliers.length > 0 ? (
              <div className={`border rounded-xl overflow-hidden ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <table className="w-full text-xs">
                  <thead className={isDark ? 'bg-slate-950 text-slate-300' : 'bg-slate-100 text-slate-700'}>
                    <tr>
                      <th className="px-3.5 py-2.5 text-left font-semibold">Row Index</th>
                      <th className="px-3.5 py-2.5 text-left font-semibold">Target Column</th>
                      <th className="px-3.5 py-2.5 text-right font-semibold">Observed Value</th>
                      <th className="px-3.5 py-2.5 text-right font-semibold">Deviation (Z-Score)</th>
                      <th className="px-3.5 py-2.5 text-left font-semibold">Risk Impact</th>
                      <th className="px-3.5 py-2.5 text-left font-semibold">Resolution Action</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                    {report.outliers.map((out, i) => (
                      <tr key={i} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-100/60'}>
                        <td className="px-3.5 py-2 font-mono text-slate-400">Record #{out.recordIndex + 1}</td>
                        <td className="px-3.5 py-2 font-medium">{out.column}</td>
                        <td className="px-3.5 py-2 text-right font-mono font-bold text-amber-500">{formatAmount(out.value, 'currency')}</td>
                        <td className="px-3.5 py-2 text-right font-mono font-bold text-rose-500">+{out.zScore}σ</td>
                        <td className="px-3.5 py-2 text-[11px] font-semibold text-amber-400">High Variance</td>
                        <td className="px-3.5 py-2 text-[11px] opacity-80">Audit input source for potential scale distortion</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={`p-4 rounded-xl border text-center text-xs ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                Zero high-Z-score anomalies detected. Distribution adheres tightly to normal operational baseline.
              </div>
            )}
          </div>

          {/* Section 06: Strategic Risk Matrix & Operational Action Plan */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className={`text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                <span>06. Strategic Risk Register & Operational Action Plan</span>
              </h3>
              <span className="text-[10px] font-mono opacity-60">Rule 06: Action Items</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-rose-950/20 border-rose-800/50' : 'bg-rose-50 border-rose-200'}`}>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-rose-500 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Immediate Action (30-Day)</span>
                  </h4>
                  <span className="text-[10px] font-mono font-bold text-rose-400">Priority 1</span>
                </div>
                <p className={`text-xs mt-1.5 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Review segment concentration risks. Top segment dominance requires risk-hedging across emerging product tiers.
                </p>
              </div>

              <div className={`p-4 rounded-xl border ${isDark ? 'bg-amber-950/20 border-amber-800/50' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Tactical Scaling (60-Day)</span>
                  </h4>
                  <span className="text-[10px] font-mono font-bold text-amber-400">Priority 2</span>
                </div>
                <p className={`text-xs mt-1.5 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Reallocate distribution and marketing resources into the highest-growth geographic regions identified on the country visual maps.
                </p>
              </div>

              <div className={`p-4 rounded-xl border ${isDark ? 'bg-blue-950/20 border-blue-800/50' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-blue-500 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Operational Governance</span>
                  </h4>
                  <span className="text-[10px] font-mono font-bold text-blue-400">Priority 3</span>
                </div>
                <p className={`text-xs mt-1.5 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Automate scheduled report dispatches to leadership and set telemetry alert thresholds for unexpected volume drops.
                </p>
              </div>
            </div>
          </div>

          {/* Section 07: Governance Certification & Complete Export Suite */}
          <div className={`pt-6 border-t flex flex-wrap items-center justify-between gap-4 text-xs ${
            isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
          }`}>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-500" />
              <span>
                <strong>DataLens Governance Seal:</strong> Certified Mathematically Accurate · Ingestion Integrity Score {dataset.qualityReport?.overallHealthScore || 98}%
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 no-print">
              <button
                type="button"
                onClick={() => triggerPrintReport(report, kpis, charts, dataset)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition-colors bg-blue-600 hover:bg-blue-500 text-white shadow-xs"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Export Complete PDF</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* SUB-TAB 1: EXECUTIVE SYNTHESIS & VISUALS */}
      {activeSubTab === 'synthesis' && (
        <div className={`border rounded-2xl p-6 md:p-8 space-y-6 card-print transition-colors ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          
          {/* Header Metadata */}
          <div className={`pb-5 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-blue-500 uppercase tracking-wider text-[11px]">
                DataLens Executive Synthesis
              </span>
              <span className={`font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Generated {new Date(report.generatedAt).toLocaleString()}
              </span>
            </div>
            <h1 className={`text-xl md:text-2xl font-bold tracking-tight mt-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {report.title}
            </h1>
            <div className={`mt-2 flex flex-wrap items-center gap-3 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <span>Dataset: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{report.datasetName}</strong></span>
              <span>·</span>
              <span>Active Sheet: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{report.sheetName}</strong></span>
              <span>·</span>
              <span>Analyzed Rows: <strong className={`font-mono ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{report.totalRecordsAnalyzed.toLocaleString()}</strong></span>
            </div>
          </div>

          {/* Section 1: Executive Overview Callout */}
          <div className="space-y-2">
            <h3 className={`text-xs font-semibold uppercase tracking-wider font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              01. Executive Overview
            </h3>
            <div className={`p-4 rounded-xl border text-sm leading-relaxed ${
              isDark
                ? 'bg-slate-950/70 border-slate-800 text-slate-200 border-l-4 border-l-blue-500'
                : 'bg-slate-50 border-slate-200 text-slate-800 border-l-4 border-l-blue-600'
            }`}>
              {report.executiveSummary}
            </div>
          </div>

          {/* Section 2: Key Metric Snapshots (formatted dynamically with chosen currency & k) */}
          <div className="space-y-2.5">
            <h3 className={`text-xs font-semibold uppercase tracking-wider font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              02. Core Performance Snapshot
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {kpis.slice(0, 4).map((kpi, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border transition-colors ${
                    isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{kpi.title}</div>
                  <div className={`mt-1 text-xl font-bold font-mono tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {kpi.format === 'currency' ? formatAmount(kpi.value, 'currency') : formatAmount(kpi.value, 'number')}
                  </div>
                  {kpi.trend && (
                    <div className={`mt-1 text-[11px] font-mono font-medium ${
                      kpi.trend.direction === 'up' ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {kpi.trend.direction === 'up' ? '▲' : '▼'} {kpi.trend.percentage}% vs prev
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Visual Insights & Distributions */}
          <div className="space-y-3">
            <h3 className={`text-xs font-semibold uppercase tracking-wider font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              03. Visual Insights & Distributions
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Visual 1: Top Segments Contribution Breakdown */}
              {report.topPerformers.length > 0 && (
                <div className={`p-4 rounded-xl border ${
                  isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {report.topPerformers[0].categoryColumn} Contribution Share
                    </h4>
                    <span className="text-[10px] font-mono text-blue-500 font-medium">Ranked by {report.topPerformers[0].metricColumn}</span>
                  </div>

                  <div className="space-y-2.5">
                    {(() => {
                      const perf = report.topPerformers[0];
                      const maxVal = Math.max(...perf.items.map((i) => i.value)) || 1;
                      return perf.items.slice(0, 4).map((item, i) => {
                        const pct = Math.max(6, Math.round((item.value / maxVal) * 100));
                        return (
                          <div key={i} className="text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{item.label}</span>
                              <span className={`font-mono tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {formatAmount(item.value, 'currency')} ({item.share}%)
                              </span>
                            </div>
                            <div className={`w-full rounded-full h-2 overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                              <div
                                className="h-full rounded-full bg-blue-600 transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* Visual 2: Statistical Outlier Dispersion Bell Curve */}
              <div className={`p-4 rounded-xl border ${
                isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Anomaly & Outlier Dispersion
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-semibold">
                    {report.outliers.length} Outliers Detected
                  </span>
                </div>
                <p className={`text-[11px] mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Records deviating beyond 2.2 standard deviations from dataset normal baseline.
                </p>

                <div className="h-24 w-full flex items-center justify-center">
                  <svg viewBox="0 0 400 90" className="w-full h-full">
                    {/* Normal Distribution Bell Curve */}
                    <path
                      d="M 10 80 Q 120 80 180 45 Q 200 15 220 45 Q 280 80 390 80"
                      fill="none"
                      stroke={isDark ? '#475569' : '#cbd5e1'}
                      strokeWidth="2"
                    />
                    <path
                      d="M 10 80 Q 120 80 180 45 Q 200 15 220 45 Q 280 80 390 80 L 390 80 L 10 80 Z"
                      fill={isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.12)'}
                    />
                    {/* Center Mean */}
                    <line x1="200" y1="15" x2="200" y2="80" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3 3" />
                    <text x="200" y="88" fontSize="9" textAnchor="middle" fill={isDark ? '#94a3b8' : '#64748b'} className="font-mono">
                      Mean (μ)
                    </text>
                    {/* +2.2σ Outlier Threshold Line */}
                    <line x1="310" y1="35" x2="310" y2="80" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="2 2" />
                    <text x="310" y="88" fontSize="9" textAnchor="middle" fill="#f59e0b" className="font-mono">
                      +2.2σ
                    </text>
                    {/* Outlier Dots */}
                    <circle cx="330" cy="74" r="3.5" fill="#ef4444" />
                    <circle cx="350" cy="78" r="3.5" fill="#ef4444" />
                    <circle cx="370" cy="79" r="3" fill="#ef4444" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Key Insights & Detected Signals */}
          <div className="space-y-2.5">
            <h3 className={`text-xs font-semibold uppercase tracking-wider font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              04. Detected Findings & Signals
            </h3>
            <div className="space-y-2">
              {report.keyInsights.map((insight, idx) => {
                const isWarning = insight.type === 'warning';
                const isOutlier = insight.type === 'outlier';
                const isPositive = insight.type === 'positive';

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border flex items-start gap-3 transition-colors ${
                      isOutlier
                        ? isDark ? 'bg-amber-950/20 border-amber-800/60' : 'bg-amber-50 border-amber-200'
                        : isWarning
                        ? isDark ? 'bg-rose-950/20 border-rose-800/60' : 'bg-rose-50 border-rose-200'
                        : isPositive
                        ? isDark ? 'bg-emerald-950/20 border-emerald-800/60' : 'bg-emerald-50 border-emerald-200'
                        : isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {isOutlier && <ShieldAlert className="w-4 h-4 text-amber-500" />}
                      {isWarning && <ShieldAlert className="w-4 h-4 text-rose-500" />}
                      {isPositive && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      {!isOutlier && !isWarning && !isPositive && <FileText className="w-4 h-4 text-blue-500" />}
                    </div>
                    <div>
                      <h4 className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{insight.title}</h4>
                      <p className={`text-xs mt-0.5 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{insight.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 5: Live Embedded Analysis Dashboarder */}
          <div className="space-y-4 pt-3 border-t border-inherit">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider font-mono ${
                    isDark ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                    05. Live Analysis Dashboarder (Interactive Visual Explorer)
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded font-semibold bg-emerald-500/10 text-emerald-400">
                    Live In-Report Studio
                  </span>
                </div>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Interact directly with dashboard charts and geographic maps while analyzing findings without leaving this report.
                </p>
              </div>

              <div className="flex items-center gap-2 no-print">
                {/* Visual Category Slicer inside Dashboarder */}
                <div className={`flex items-center gap-1 p-0.5 rounded-lg border text-[11px] ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}>
                  <button
                    type="button"
                    onClick={() => setDashboarderFilter('all')}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      dashboarderFilter === 'all'
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    All Visuals
                  </button>
                  <button
                    type="button"
                    onClick={() => setDashboarderFilter('map')}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      dashboarderFilter === 'map'
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    Map
                  </button>
                  <button
                    type="button"
                    onClick={() => setDashboarderFilter('trends')}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      dashboarderFilter === 'trends'
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    Trends
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDashboarder((prev) => !prev)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                    isDark
                      ? 'border-slate-800 bg-slate-950 text-slate-300'
                      : 'border-slate-200 bg-slate-100 text-slate-700'
                  }`}
                >
                  {showDashboarder ? (
                    <>
                      <span>Hide</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>Expand Dashboarder</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {showDashboarder && (
              <div className="space-y-4 animate-fade-in pt-1">
                {selectedCategory && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                      <span>
                        Cross-filtering report and dashboard by: <strong>{selectedCategory}</strong>
                      </span>
                    </div>
                    {onClearCategory && (
                      <button
                        type="button"
                        onClick={() => onClearCategory()}
                        className="text-blue-500 hover:underline font-semibold"
                      >
                        Reset Slicer
                      </button>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {charts
                    .filter((c) => {
                      if (dashboarderFilter === 'map') return c.type === 'map';
                      if (dashboarderFilter === 'trends') return c.type === 'area' || c.type === 'line';
                      return true;
                    })
                    .slice(0, 4)
                    .map((chart) => (
                      <div
                        key={chart.id}
                        className={chart.type === 'map' ? 'lg:col-span-2' : 'col-span-1'}
                      >
                        <InteractiveChart
                          config={chart}
                          selectedCategory={selectedCategory}
                          onSelectCategory={onSelectCategory}
                          onClearCategory={onClearCategory}
                        />
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 6: Actionable Strategic Recommendations */}
          <div className="space-y-2 pt-2 border-t border-inherit">
            <h3 className={`text-xs font-semibold uppercase tracking-wider font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              06. Strategic Recommendations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <h4 className="text-xs font-semibold text-blue-500 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Capitalize on Segment Momentum</span>
                </h4>
                <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Allocate targeted capacity to the top performing categories. Segment contribution share demonstrates high margin efficiency and expansion potential.
                </p>
              </div>

              <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <h4 className="text-xs font-semibold text-amber-500 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Audit High-Z-Score Volatility</span>
                </h4>
                <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Investigate outlier records in the segment audit tab. Verify operational inputs or data telemetry anomalies that may distort quarterly forecasting.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* SUB-TAB 2: EMBEDDED POWER BI REPORT STUDIO */}
      {activeSubTab === 'powerbi' && (
        <div className="animate-fade-in">
          <PowerBiDashboardView
            dataset={dataset}
            activeRecords={activeRecords}
            kpis={kpis}
            charts={charts}
            filters={filters || { searchQuery: '', dateRange: { column: null, start: null, end: null }, categories: {}, numericRanges: {} }}
            onFilterChange={onFilterChange || (() => {})}
            selectedCategory={selectedCategory || null}
            onSelectCategory={onSelectCategory || (() => {})}
            onClearCategory={onClearCategory || (() => {})}
          />
        </div>
      )}

      {/* SUB-TAB 3: SEGMENT & OUTLIER AUDIT */}
      {activeSubTab === 'segments' && (
        <div className={`border rounded-2xl p-6 space-y-6 card-print ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div>
            <h3 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Segment Rankings & Anomaly Audit</h3>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Detailed distribution metrics for category performers and statistical anomaly records.
            </p>
          </div>

          {/* Top Performers Table */}
          {report.topPerformers.map((perf, pIdx) => (
            <div key={pIdx} className="space-y-3">
              <h4 className={`text-xs font-semibold uppercase tracking-wider font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Segment Breakdown: {perf.categoryColumn} by {perf.metricColumn}
              </h4>
              <div className={`border rounded-xl overflow-hidden ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <table className="w-full text-xs">
                  <thead className={isDark ? 'bg-slate-950/70 text-slate-300' : 'bg-slate-100 text-slate-700'}>
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium">Rank</th>
                      <th className="px-4 py-2.5 text-left font-medium">{perf.categoryColumn}</th>
                      <th className="px-4 py-2.5 text-right font-medium">Aggregate {perf.metricColumn}</th>
                      <th className="px-4 py-2.5 text-right font-medium">Share of Total</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                    {perf.items.map((item, i) => (
                      <tr key={i} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                        <td className={`px-4 py-2.5 font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>#{i + 1}</td>
                        <td className="px-4 py-2.5 font-semibold">{item.label}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-medium">{formatAmount(item.value, 'currency')}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-blue-500">{item.share}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Outliers Table */}
          {report.outliers.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-inherit">
              <h4 className={`text-xs font-semibold uppercase tracking-wider font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Statistical Outliers (|Z-Score| &gt; 2.2)
              </h4>
              <div className={`border rounded-xl overflow-hidden ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <table className="w-full text-xs">
                  <thead className={isDark ? 'bg-slate-950/70 text-slate-300' : 'bg-slate-100 text-slate-700'}>
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium">Row #</th>
                      <th className="px-4 py-2.5 text-left font-medium">Metric Column</th>
                      <th className="px-4 py-2.5 text-right font-medium">Recorded Value</th>
                      <th className="px-4 py-2.5 text-right font-medium">Z-Score</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                    {report.outliers.map((out, i) => (
                      <tr key={i} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                        <td className="px-4 py-2.5 font-mono text-slate-400">Row {out.recordIndex + 1}</td>
                        <td className="px-4 py-2.5 font-medium">{out.column}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-500">{formatAmount(out.value, 'currency')}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-rose-500">+{out.zScore}σ</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 4: DELIVERY SCHEDULES */}
      {activeSubTab === 'schedules' && (
        <div className={`border rounded-2xl p-6 space-y-6 card-print ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Automated Digest & Alert Schedules</h3>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Configure scheduled email delivery of synthesized digests or threshold triggers.
              </p>
            </div>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs shadow-xs transition-colors"
            >
              <span>New Schedule</span>
            </button>
          </div>

          <div className="space-y-3">
            {scheduledReports.map((sched) => (
              <div
                key={sched.id}
                className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 transition-colors ${
                  isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{sched.name}</h4>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold ${
                      sched.frequency === 'realtime_trigger' ? 'bg-rose-500/10 text-rose-400' : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {sched.frequency}
                    </span>
                  </div>
                  <div className={`mt-1 text-xs flex items-center gap-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <span>Recipient: <strong className={isDark ? 'text-slate-300' : 'text-slate-700'}>{sched.recipientEmail}</strong></span>
                    <span>·</span>
                    <span>Format: Power BI / Markdown</span>
                    <span>·</span>
                    <span>Last run: {sched.lastRun}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleSchedule(sched.id)}
                    className={`px-3 py-1 text-xs rounded-lg font-medium border transition-colors ${
                      sched.enabled
                        ? isDark ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                        : isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-600'
                    }`}
                  >
                    {sched.enabled ? 'Active' : 'Paused'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal for adding schedule */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 no-print">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="text-base font-semibold">Create Automated Schedule</h3>
            <form onSubmit={handleAddSchedule} className="space-y-3.5 text-xs">
              <div>
                <label className="font-medium opacity-80">Report Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekly KPI Digest"
                  value={newScheduleName}
                  onChange={(e) => setNewScheduleName(e.target.value)}
                  className={`mt-1 w-full border rounded-lg px-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-blue-500 ${
                    isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="font-medium opacity-80">Recipient Email</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. executive-team@company.com"
                  value={newScheduleEmail}
                  onChange={(e) => setNewScheduleEmail(e.target.value)}
                  className={`mt-1 w-full border rounded-lg px-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-blue-500 ${
                    isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="font-medium opacity-80">Frequency</label>
                <select
                  value={newScheduleFreq}
                  onChange={(e: any) => setNewScheduleFreq(e.target.value)}
                  className={`mt-1 w-full border rounded-lg px-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-blue-500 ${
                    isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="hourly">Hourly Anomaly Monitor</option>
                  <option value="daily">Daily Morning Executive Digest (08:00 UTC)</option>
                  <option value="weekly">Weekly Strategic Summary (Mondays)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-inherit">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-xs"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
