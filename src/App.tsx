/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { KpiGrid } from './components/KpiGrid';
import { InteractiveChart } from './components/charts/InteractiveChart';
import { VisualEditorModal } from './components/charts/VisualEditorModal';
import { DataTable } from './components/DataTable';
import { AutomatedReportsView } from './components/AutomatedReportsView';
import { DataQualityView } from './components/DataQualityView';
import { UploadModal } from './components/UploadModal';
import { SnapshotManagerModal } from './components/SnapshotManagerModal';
import { ExportSuccessModal, ExportSuccessDetails } from './components/ExportSuccessModal';
import { ChartConfig, Dataset, FilterState, DashboardLayoutSnapshot } from './types/analytics';
import { createSaaSDataset, generateLiveRecord } from './utils/sampleData';
import { filterRecords, generateDashboardCharts, generateKpis, recalculateChartData } from './utils/visualizationEngine';
import { profileDataset } from './utils/dataProfiler';
import {
  exportPowerBiPackage,
  exportComprehensiveExcelWorkbook,
  exportDashboardMarkdown,
  exportDashboardToPdf,
  exportDashboardToImage,
  downloadCsv,
} from './utils/exportUtils';
import { useTheme } from './context/ThemeContext';
import { useCurrency } from './context/CurrencyContext';
import { Activity, Bell, FileSpreadsheet, Plus, RefreshCw, Upload, Zap, Download, FileText, RotateCcw, ChevronDown, Bookmark, Image, CheckCircle2 } from 'lucide-react';

const SNAPSHOTS_STORAGE_KEY = 'datalens_dashboard_snapshots';

export default function App() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { currency, currencySymbol, useKFormat } = useCurrency();

  // Load initial dataset (SaaS MRR) so users see a rich, live dashboard immediately
  const [dataset, setDataset] = useState<Dataset>(() => createSaaSDataset());
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'reports' | 'table' | 'quality'>('dashboard');
  
  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadModalTab, setUploadModalTab] = useState<'upload' | 'samples'>('upload');

  // Visual Customizations & Editor Modal
  const [customizedCharts, setCustomizedCharts] = useState<Record<string, Partial<ChartConfig>>>({});
  const [userAddedCharts, setUserAddedCharts] = useState<ChartConfig[]>([]);
  const [editingChart, setEditingChart] = useState<ChartConfig | null>(null);

  // Visual movement, ordering & adjustment state
  const [chartOrder, setChartOrder] = useState<string[]>([]);
  const [hiddenChartIds, setHiddenChartIds] = useState<string[]>([]);
  const [chartWidthOverrides, setChartWidthOverrides] = useState<Record<string, 'half' | 'full'>>({});
  const [draggedChartId, setDraggedChartId] = useState<string | null>(null);
  const [dragOverChartId, setDragOverChartId] = useState<string | null>(null);

  // Real-time streaming simulation state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamTickCount, setStreamTickCount] = useState(0);
  const [liveToast, setLiveToast] = useState<{ message: string; timestamp: string } | null>(null);
  const [downloadModalDetails, setDownloadModalDetails] = useState<ExportSuccessDetails | null>(null);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  // Dashboard Layout Snapshots (saved named layouts: chart order, visibility, and width settings)
  const [snapshots, setSnapshots] = useState<DashboardLayoutSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem(SNAPSHOTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load snapshots from storage:', e);
    }
    return [
      {
        id: 'snapshot_exec_sample',
        name: 'Executive Overview',
        createdAt: new Date().toISOString(),
        datasetName: 'SaaS MRR Growth & Revenue Performance.csv',
        chartOrder: [],
        hiddenChartIds: [],
        chartWidthOverrides: { 'saas_chart_mrr_trend': 'full', 'saas_chart_plan_dist': 'full' },
        totalChartsCount: 6,
        visibleCount: 6,
        hiddenCount: 0,
        fullWidthCount: 2,
      },
    ];
  });
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | null>(null);
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);

  // Export As dropdown menu state for Interactive Analytics & Visualizations
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setIsExportDropdownOpen(false);
      }
    };
    if (isExportDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExportDropdownOpen]);

  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    dateRange: { column: null, start: null, end: null },
    categories: {},
    numericRanges: {},
  });

  // Handle active dataset sheet change
  const handleSheetChange = (sheetName: string) => {
    if (sheetName !== dataset.activeSheet) {
      const profiled = profileDataset(dataset.name, dataset.sheetNames, sheetName, dataset.rawRecords);
      setDataset(profiled);
      resetFilters();
      setCustomizedCharts({});
      setUserAddedCharts([]);
    }
  };

  const resetFilters = () => {
    setFilters({
      searchQuery: '',
      dateRange: { column: null, start: null, end: null },
      categories: {},
      numericRanges: {},
    });
  };

  // Real-time live data streaming simulation loop
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      setDataset((prev) => {
        const newRecord = generateLiveRecord(prev);
        const updatedCleaned = [...prev.cleanedRecords, newRecord];
        const updatedRaw = [...prev.rawRecords, newRecord];

        // Recalculate column profiles
        const profiled = profileDataset(prev.name, prev.sheetNames, prev.activeSheet, updatedRaw);
        return {
          ...profiled,
          isStreaming: true,
        };
      });

      setStreamTickCount((c) => c + 1);

      // Flash real-time toast
      setLiveToast({
        message: 'Live record ingested · Dashboard and KPIs updated',
        timestamp: new Date().toLocaleTimeString(),
      });
    }, 2200);

    return () => clearInterval(interval);
  }, [isStreaming]);

  // Dismiss live toast after 3 seconds
  useEffect(() => {
    if (!liveToast) return;
    const t = setTimeout(() => setLiveToast(null), 2500);
    return () => clearTimeout(t);
  }, [liveToast]);

  // Filter dataset records based on current active filters
  const filteredRecords = useMemo(() => {
    return filterRecords(dataset.cleanedRecords, filters, dataset.columns);
  }, [dataset.cleanedRecords, filters, dataset.columns]);

  // Generate responsive KPIs from active filtered records
  const kpis = useMemo(() => {
    return generateKpis(dataset, filteredRecords);
  }, [dataset, filteredRecords]);

  // Generate foundational dashboard charts (including map charts for coordinate / geo columns)
  const baseCharts = useMemo(() => {
    return generateDashboardCharts(dataset, filteredRecords);
  }, [dataset, filteredRecords]);

  // Merge base charts, user-added custom charts, and customizations
  const displayedCharts = useMemo(() => {
    const all = [...baseCharts, ...userAddedCharts];

    const processed = all
      .filter((c) => !hiddenChartIds.includes(c.id))
      .map((chart) => {
        const custom = customizedCharts[chart.id];
        if (!custom) return chart;

        const merged = { ...chart, ...custom };
        // If user changed dimensions or aggregation, recalculate data
        if (
          custom.xAxisColumn ||
          custom.yAxisColumn ||
          custom.aggregation ||
          custom.type !== chart.type
        ) {
          merged.data = recalculateChartData(merged, filteredRecords);
        }
        return merged;
      });

    if (chartOrder.length > 0) {
      processed.sort((a, b) => {
        const idxA = chartOrder.indexOf(a.id);
        const idxB = chartOrder.indexOf(b.id);
        if (idxA === -1 && idxB === -1) return 0;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
    }

    return processed;
  }, [baseCharts, userAddedCharts, customizedCharts, filteredRecords, hiddenChartIds, chartOrder]);

  // Handle cross-filtering by clicking a category bar/segment in charts or maps
  const handleSelectChartCategory = (categoryVal: string) => {
    const categoryCols = dataset.columns.filter((c) => c.type === 'category' || c.type === 'text');
    let targetCol = categoryCols[0]?.name;

    for (const col of categoryCols) {
      const exists = filteredRecords.some((r) => String(r[col.name]) === categoryVal);
      if (exists) {
        targetCol = col.name;
        break;
      }
    }

    if (!targetCol) return;

    setFilters((prev) => {
      const existing = prev.categories[targetCol] || [];
      const updated = existing.includes(categoryVal)
        ? existing.filter((v) => v !== categoryVal)
        : [categoryVal];

      return {
        ...prev,
        categories: {
          ...prev.categories,
          [targetCol]: updated,
        },
      };
    });
  };

  // Helper to determine active selected category
  const activeSelectedCategory = useMemo(() => {
    for (const [col, vals] of Object.entries(filters.categories)) {
      if (vals && vals.length > 0) return vals[0];
    }
    return null;
  }, [filters.categories]);

  const handleClearCategory = (category?: string) => {
    if (category) {
      setFilters((prev) => {
        const nextCats = { ...prev.categories };
        for (const col in nextCats) {
          nextCats[col] = nextCats[col].filter((v) => v !== category);
        }
        return { ...prev, categories: nextCats };
      });
    } else {
      setFilters((prev) => ({ ...prev, categories: {} }));
    }
  };

  // Handle saving visual customizations
  const handleSaveVisual = (updated: Partial<ChartConfig>) => {
    const targetId = updated.id || editingChart?.id;
    if (!targetId) return;

    setCustomizedCharts((prev) => ({
      ...prev,
      [targetId]: {
        ...prev[targetId],
        ...updated,
      },
    }));
  };

  // Handle resetting a visual to default
  const handleResetVisual = () => {
    if (!editingChart) return;
    setCustomizedCharts((prev) => {
      const next = { ...prev };
      delete next[editingChart.id];
      return next;
    });
  };

  // Handle adding a new chart
  const handleAddNewChart = () => {
    const numericCols = dataset.columns.filter((c) => c.type === 'numeric');
    const catCols = dataset.columns.filter((c) => c.type === 'category' || c.type === 'date');
    if (numericCols.length === 0 || catCols.length === 0) return;

    const newId = `custom_chart_${Date.now()}`;
    const newChart: ChartConfig = {
      id: newId,
      title: `${numericCols[0].name} by ${catCols[0].name}`,
      subtitle: 'Custom visual',
      type: 'bar',
      xAxisColumn: catCols[0].name,
      yAxisColumn: numericCols[0].name,
      aggregation: 'sum',
      data: recalculateChartData(
        { type: 'bar', xAxisColumn: catCols[0].name, yAxisColumn: numericCols[0].name, aggregation: 'sum' },
        filteredRecords
      ),
      isCustom: true,
    };

    setUserAddedCharts((prev) => [newChart, ...prev]);
    setEditingChart(newChart);
  };

  // Handle new dataset load
  const handleDatasetLoaded = (newDataset: Dataset) => {
    setDataset(newDataset);
    resetFilters();
    setCustomizedCharts({});
    setUserAddedCharts([]);
    setHiddenChartIds([]);
    setChartOrder([]);
    setCurrentTab('dashboard');
  };

  // Move visual earlier / later in dashboard
  const handleMoveChart = (chartId: string, direction: 'earlier' | 'later') => {
    const currentIds = displayedCharts.map((c) => c.id);
    const index = currentIds.indexOf(chartId);
    if (index === -1) return;

    const targetIndex = direction === 'earlier' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentIds.length) return;

    const nextOrder = [...currentIds];
    const [moved] = nextOrder.splice(index, 1);
    nextOrder.splice(targetIndex, 0, moved);

    setChartOrder(nextOrder);
    setLiveToast({
      message: `Visual moved ${direction === 'earlier' ? 'earlier (left)' : 'later (right)'}`,
      timestamp: new Date().toLocaleTimeString(),
    });
  };

  // Reorder visuals via drag and drop
  const handleReorderCharts = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const currentIds = displayedCharts.map((c) => c.id);
    const sourceIdx = currentIds.indexOf(sourceId);
    const targetIdx = currentIds.indexOf(targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const nextOrder = [...currentIds];
    const [moved] = nextOrder.splice(sourceIdx, 1);
    nextOrder.splice(targetIdx, 0, moved);

    setChartOrder(nextOrder);
    setLiveToast({
      message: 'Visual repositioned in dashboard grid',
      timestamp: new Date().toLocaleTimeString(),
    });
  };

  // Cancel / remove visual with X symbol
  const handleRemoveVisual = (chartId: string) => {
    setHiddenChartIds((prev) => [...prev, chartId]);
    setLiveToast({
      message: 'Visual hidden. Click "Restore Visuals" to recover anytime.',
      timestamp: new Date().toLocaleTimeString(),
    });
  };

  // Restore all hidden visuals
  const handleRestoreVisuals = () => {
    setHiddenChartIds([]);
    setLiveToast({
      message: 'All visuals restored to dashboard',
      timestamp: new Date().toLocaleTimeString(),
    });
  };

  // Adjust visual width (toggle between half and full width)
  const handleToggleChartWidth = (chartId: string) => {
    setChartWidthOverrides((prev) => {
      const current = prev[chartId];
      const next = current === 'full' ? 'half' : 'full';
      return { ...prev, [chartId]: next };
    });
  };

  // Export as PDF (Direct jsPDF generation + fallback)
  const handleExportPdf = () => {
    const filename = `datalens_dashboard_${dataset.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    try {
      exportDashboardToPdf(dataset, filteredRecords, kpis, displayedCharts, filename);
      setDownloadModalDetails({
        title: 'PDF Document Ready',
        filename,
        format: 'pdf',
        description: 'Executive printable PDF report generated with full visuals canvas and metrics scorecards.',
        highlights: [
          `All ${displayedCharts.length} visuals captured in vector quality`,
          'Executive KPI summary metrics',
          'Data profiling attribute summary',
        ],
      });
      setIsDownloadModalOpen(true);
    } catch (e) {
      console.error('PDF export failed, falling back to window.print():', e);
      try {
        window.print();
      } catch (err) {
        // ignore
      }
    }
  };

  // Export as BI (Power BI Model & Template .pbit / JSON)
  const handleExportBi = () => {
    const cleanDatasetName = dataset?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Model';
    const filename = `datalens_powerbi_${cleanDatasetName}.pbit`;
    exportPowerBiPackage(dataset, filteredRecords, kpis, displayedCharts);
    setDownloadModalDetails({
      title: 'Power BI Template Downloaded',
      filename,
      format: 'pbit',
      description: 'Your Power BI report template has been generated with complete data model schema, DAX measures, and visual canvas layouts.',
      highlights: [
        'Complete data model & column data type specifications',
        'Pre-calculated DAX measures (SUM, AVERAGE, COUNTROWS)',
        `Canvas layout with ${displayedCharts.length} visual widgets and mappings`,
        'Ready to import into Power BI Desktop or Service',
      ],
    });
    setIsDownloadModalOpen(true);
  };

  // Export as Excel (.xlsx with all visuals, charts data, and KPIs)
  const handleExportExcel = () => {
    const cleanName = (dataset?.name || 'dashboard').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `datalens_dashboard_${cleanName}.xlsx`;
    exportComprehensiveExcelWorkbook(
      dataset,
      filteredRecords,
      kpis,
      displayedCharts,
      null,
      filename
    );
    setDownloadModalDetails({
      title: 'Excel Workbook Downloaded',
      filename,
      format: 'xlsx',
      description: `Exported complete multi-sheet Excel workbook containing all ${displayedCharts.length} visuals, breakdown data tables, KPIs, and raw records.`,
      highlights: [
        `Dedicated data sheets for all ${displayedCharts.length} visuals with in-cell distribution bars`,
        'Visuals catalog & configuration reference',
        'Executive KPIs and trend baselines',
        'Raw filtered dataset and complete data dictionary',
      ],
    });
    setIsDownloadModalOpen(true);
  };

  // Export as MD (Markdown report file)
  const handleExportMd = () => {
    const filename = `datalens_dashboard_${dataset.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
    exportDashboardMarkdown(dataset, filteredRecords, kpis, displayedCharts);
    setDownloadModalDetails({
      title: 'Markdown Report Downloaded',
      filename,
      format: 'md',
      description: 'Exported executive dashboard summary and data tables as Markdown (.md).',
      highlights: [
        'KPI metrics summary',
        'Visualizations breakdown and data points',
        'Dataset columns summary',
      ],
    });
    setIsDownloadModalOpen(true);
  };

  // Download filtered records as CSV
  const handleDownloadFilteredCsv = () => {
    if (!filteredRecords || filteredRecords.length === 0) return;
    const safeBaseName = dataset.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `${safeBaseName}_filtered_${timestamp}.csv`;
    downloadCsv(filteredRecords, filename);
    setDownloadModalDetails({
      title: 'CSV Dataset Downloaded',
      filename,
      format: 'csv',
      description: `Downloaded ${filteredRecords.length.toLocaleString()} processed filtered records as CSV.`,
      highlights: [
        `${filteredRecords.length.toLocaleString()} records matching current filters`,
        'Includes all dataset dimensions and numeric measures',
        'Guarded against spreadsheet formula injection',
      ],
    });
    setIsDownloadModalOpen(true);
  };

  // Save current dashboard layout (chart order, visibility, and width settings) as a named snapshot
  const handleSaveSnapshot = (name: string) => {
    const newSnapshot: DashboardLayoutSnapshot = {
      id: `snapshot_${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      datasetName: dataset.name,
      chartOrder: [...chartOrder],
      hiddenChartIds: [...hiddenChartIds],
      chartWidthOverrides: { ...chartWidthOverrides },
      totalChartsCount: displayedCharts.length + hiddenChartIds.length,
      visibleCount: displayedCharts.length,
      hiddenCount: hiddenChartIds.length,
      fullWidthCount: Object.values(chartWidthOverrides).filter((w) => w === 'full').length,
    };

    setSnapshots((prev) => {
      const updated = [newSnapshot, ...prev];
      try {
        localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to persist snapshot:', e);
      }
      return updated;
    });

    setActiveSnapshotId(newSnapshot.id);
    setLiveToast({
      message: `Saved dashboard layout snapshot "${name}"`,
      timestamp: new Date().toLocaleTimeString(),
    });
  };

  // Recall / apply a saved layout snapshot
  const handleApplySnapshot = (snapshot: DashboardLayoutSnapshot) => {
    setChartOrder(snapshot.chartOrder || []);
    setHiddenChartIds(snapshot.hiddenChartIds || []);
    setChartWidthOverrides(snapshot.chartWidthOverrides || {});
    setActiveSnapshotId(snapshot.id);
    setLiveToast({
      message: `Applied layout snapshot "${snapshot.name}"`,
      timestamp: new Date().toLocaleTimeString(),
    });
  };

  // Delete a saved snapshot
  const handleDeleteSnapshot = (snapshotId: string) => {
    setSnapshots((prev) => {
      const updated = prev.filter((s) => s.id !== snapshotId);
      try {
        localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to update snapshots in storage:', e);
      }
      return updated;
    });
    if (activeSnapshotId === snapshotId) {
      setActiveSnapshotId(null);
    }
    setLiveToast({
      message: 'Layout snapshot deleted',
      timestamp: new Date().toLocaleTimeString(),
    });
  };

  // Reset dashboard layout to default
  const handleResetToDefaultLayout = () => {
    setChartOrder([]);
    setHiddenChartIds([]);
    setChartWidthOverrides({});
    setActiveSnapshotId(null);
    setLiveToast({
      message: 'Restored default dashboard layout',
      timestamp: new Date().toLocaleTimeString(),
    });
  };

  // Export Dashboard as Image (.png)
  const handleExportImage = () => {
    try {
      const cleanName = (dataset?.name || 'dashboard').replace(/[^a-zA-Z0-9_-]/g, '_');
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const filename = `datalens_${cleanName}_snapshot_${timestamp}.png`;
      exportDashboardToImage(dataset, filteredRecords, kpis, displayedCharts, isDark);
      setDownloadModalDetails({
        title: 'Image Snapshot Ready',
        filename,
        format: 'png',
        description: 'High-resolution PNG image captured of current dashboard metrics and active visualizations.',
        highlights: [
          'Full-canvas 2x high-DPI rendering',
          'Complete KPI scorecard & chart grid',
          'Ready for presentations and reports',
        ],
      });
      setIsDownloadModalOpen(true);
    } catch (err) {
      console.error('Image export failed:', err);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-150 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* 3-Zone Clean Top Bar */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        dataset={dataset}
        onOpenUpload={() => {
          setUploadModalTab('upload');
          setIsUploadOpen(true);
        }}
        onOpenSamples={() => {
          setUploadModalTab('samples');
          setIsUploadOpen(true);
        }}
        isStreaming={isStreaming}
        onToggleStreaming={() => setIsStreaming((s) => !s)}
        streamTickCount={streamTickCount}
      />

      {/* Dynamic Filter Bar */}
      {dataset && (
        <FilterBar
          dataset={dataset}
          filters={filters}
          onFilterChange={setFilters}
          onResetFilters={resetFilters}
          filteredCount={filteredRecords.length}
          totalCount={dataset.cleanedRecords.length}
          onSheetChange={dataset.sheetNames.length > 1 ? handleSheetChange : undefined}
        />
      )}

      {/* Main Viewport Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Normal Toast Notification for Dashboard Actions */}
        {liveToast && (
          <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs animate-fade-in no-print border bg-slate-900 border-slate-700 text-slate-100">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{liveToast.message}</span>
            <button
              onClick={() => setLiveToast(null)}
              className="ml-2 text-slate-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tab 1: Interactive Dashboard */}
        {currentTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* KPI Cards Row (Uses global currency: $ Dollars or ₹ Rupees, and 'k' units) */}
            <KpiGrid kpis={kpis} />

            {/* Dashboard Visuals Toolbar with PDF, BI, and MD export options */}
            <div className="flex flex-wrap items-center justify-between pt-1 gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={`text-sm font-semibold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Interactive Analytics & Visualizations ({displayedCharts.length})
                </h3>
                {activeSelectedCategory && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border bg-blue-500/10 text-blue-500 border-blue-500/30">
                    <span>Active Filter: <strong>{activeSelectedCategory}</strong></span>
                    <button
                      onClick={() => handleClearCategory()}
                      className="hover:underline text-[11px] font-semibold ml-1"
                    >
                      Clear
                    </button>
                  </span>
                )}
                {hiddenChartIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleRestoreVisuals}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors shadow-2xs"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restore {hiddenChartIds.length} hidden {hiddenChartIds.length === 1 ? 'visual' : 'visuals'}</span>
                  </button>
                )}
              </div>

              {/* Action Buttons: Export As Dropdown (CSV, PDF, PNG, MD, BI), Layout Snapshots, and Add Custom Visual */}
              <div className="flex flex-wrap items-center gap-2 no-print">
                {/* Unified "Export As" Dropdown Menu with extensions */}
                <div className="relative" ref={exportDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                    title="Export Visuals & Dataset in multiple formats"
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all shadow-2xs ${
                      isExportDropdownOpen
                        ? 'border-blue-500 bg-blue-500/15 text-blue-500 ring-1 ring-blue-500'
                        : isDark
                        ? 'bg-slate-900 hover:bg-slate-800 text-slate-100 border-slate-700'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5 text-blue-500" />
                    <span>Export As</span>
                    <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${isExportDropdownOpen ? 'rotate-180 text-blue-500' : 'opacity-70'}`} />
                  </button>

                  {isExportDropdownOpen && (
                    <div
                      className={`absolute right-0 sm:right-auto sm:left-0 mt-1.5 w-64 rounded-xl border shadow-2xl p-1.5 z-50 animate-fade-in ${
                        isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold border-b border-inherit flex items-center justify-between">
                        <span>Export Formats</span>
                        <span className="font-normal opacity-70">6 Types</span>
                      </div>

                      <div className="p-1 space-y-0.5">
                        {/* 1. Complete Excel Workbook (.xlsx) */}
                        <button
                          type="button"
                          onClick={() => {
                            handleExportExcel();
                            setIsExportDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                            isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-md bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="text-xs font-semibold flex items-center gap-1.5">
                                <span>Excel Workbook</span>
                                <span className="text-[9px] px-1 rounded bg-emerald-500/20 text-emerald-500 font-bold">ALL VISUALS</span>
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-500">
                            .XLSX
                          </span>
                        </button>

                        {/* 2. Power BI Package (.pbit) */}
                        <button
                          type="button"
                          onClick={() => {
                            handleExportBi();
                            setIsExportDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                            isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-md bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0 font-black text-xs">
                              P
                            </div>
                            <span className="text-xs font-semibold">Power BI Template</span>
                          </div>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-500">
                            .PBIT
                          </span>
                        </button>

                        {/* 3. PDF (.pdf) */}
                        <button
                          type="button"
                          onClick={() => {
                            handleExportPdf();
                            setIsExportDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                            isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-md bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                              <FileText className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-semibold">PDF Document</span>
                          </div>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-500/15 text-red-500">
                            .PDF
                          </span>
                        </button>

                        {/* 4. CSV (.csv) */}
                        <button
                          type="button"
                          onClick={() => {
                            handleDownloadFilteredCsv();
                            setIsExportDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                            isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-md bg-slate-500/10 text-slate-400 flex items-center justify-center shrink-0">
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-semibold">CSV Dataset</span>
                          </div>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-500/15 text-slate-400">
                            .CSV
                          </span>
                        </button>

                        {/* 5. Image (.png) */}
                        <button
                          type="button"
                          onClick={() => {
                            handleExportImage();
                            setIsExportDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                            isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-md bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                              <Image className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-semibold">Image Snapshot</span>
                          </div>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/15 text-purple-500">
                            .PNG
                          </span>
                        </button>

                        {/* 6. Markdown (.md) */}
                        <button
                          type="button"
                          onClick={() => {
                            handleExportMd();
                            setIsExportDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                            isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-md bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                              <Download className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-semibold">Markdown Report</span>
                          </div>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-500">
                            .MD
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dashboard Layout Snapshots (Save & Recall named dashboard layouts) */}
                <button
                  type="button"
                  onClick={() => setIsSnapshotModalOpen(true)}
                  title="Save and recall custom dashboard layout snapshots (chart order, visibility, and widths)"
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all shadow-2xs ${
                    activeSnapshotId
                      ? 'border-blue-500/60 bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/30'
                      : isDark
                      ? 'bg-slate-900 hover:bg-slate-800 text-slate-100 border-slate-700'
                      : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5 text-blue-500" />
                  <span>Layout Snapshots</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                    isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {snapshots.length}
                  </span>
                </button>

                {/* Add Custom Visual Button */}
                <button
                  type="button"
                  onClick={handleAddNewChart}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shadow-xs bg-blue-600 hover:bg-blue-500 text-white"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Custom Visual</span>
                </button>
              </div>
            </div>

            {/* Charts Grid with Drag & Drop movement and width adjusting */}
            {displayedCharts.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {displayedCharts.map((chart, idx) => {
                  const widthOverride = chartWidthOverrides[chart.id];
                  const isFullWidth =
                    widthOverride === 'full'
                      ? true
                      : widthOverride === 'half'
                      ? false
                      : (idx === 0 && chart.isTimeBased) ||
                        chart.type === 'map' ||
                        chart.type === 'heatmap' ||
                        chart.type === 'boxplot' ||
                        displayedCharts.length === 1;

                  return (
                    <div
                      key={chart.id}
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', chart.id);
                        setDraggedChartId(chart.id);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }}
                      onDragEnter={() => setDragOverChartId(chart.id)}
                      onDragEnd={() => {
                        setDraggedChartId(null);
                        setDragOverChartId(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedChartId && draggedChartId !== chart.id) {
                          handleReorderCharts(draggedChartId, chart.id);
                        }
                        setDraggedChartId(null);
                        setDragOverChartId(null);
                      }}
                      className={isFullWidth ? 'lg:col-span-2' : 'col-span-1'}
                    >
                      <InteractiveChart
                        config={chart}
                        selectedCategory={activeSelectedCategory}
                        onSelectCategory={handleSelectChartCategory}
                        onClearCategory={() => handleClearCategory()}
                        onOpenEditModal={(c) => setEditingChart(c)}
                        onRemoveVisual={handleRemoveVisual}
                        onAdjustWidth={handleToggleChartWidth}
                        isFullWidth={isFullWidth}
                        onMoveEarlier={() => handleMoveChart(chart.id, 'earlier')}
                        onMoveLater={() => handleMoveChart(chart.id, 'later')}
                        canMoveEarlier={idx > 0}
                        canMoveLater={idx < displayedCharts.length - 1}
                        isDragging={draggedChartId === chart.id}
                        isDragOver={dragOverChartId === chart.id}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`p-12 text-center border rounded-xl ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <h3 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>No charts visible</h3>
                <p className={`text-xs mt-1 max-w-md mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {hiddenChartIds.length > 0
                    ? 'All visuals have been hidden. Click "Restore Visuals" to display them again.'
                    : 'The active dataset has no recognized numeric metrics or date dimensions for automatic visualization.'}
                </p>
                {hiddenChartIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleRestoreVisuals}
                    className="mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500"
                  >
                    Restore Visuals
                  </button>
                )}
              </div>
            )}

            {/* Quick Preview Data Records Snippet */}
            <div className="pt-2 no-print">
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Recent Records ({Math.min(10, filteredRecords.length)} of {filteredRecords.length})
                </h3>
                <button
                  onClick={() => setCurrentTab('table')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-500"
                >
                  View full data table &rarr;
                </button>
              </div>
              <div className={`border rounded-xl overflow-hidden ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <DataTable
                  records={filteredRecords.slice(0, 10)}
                  columns={dataset.columns}
                  datasetName={dataset.name}
                />
              </div>
            </div>

          </div>
        )}

        {/* Tab 2: Full Data Table View */}
        {currentTab === 'table' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Underlying Dataset Records</h2>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Inspect raw records, sort columns, toggle visibility, and export filtered results as open-source CSV.
                </p>
              </div>
            </div>
            <DataTable
              records={filteredRecords}
              columns={dataset.columns}
              datasetName={dataset.name}
            />
          </div>
        )}

        {/* Tab 3: Automated Reporting Suite (with Embedded Power BI Studio & Live Dashboarder) */}
        {currentTab === 'reports' && (
          <AutomatedReportsView
            dataset={dataset}
            activeRecords={filteredRecords}
            kpis={kpis}
            charts={displayedCharts}
            filters={filters}
            onFilterChange={setFilters}
            selectedCategory={activeSelectedCategory}
            onSelectCategory={handleSelectChartCategory}
            onClearCategory={() => handleClearCategory()}
          />
        )}

        {/* Tab 4: Data Quality & Profiling Diagnostics */}
        {currentTab === 'quality' && (
          <DataQualityView dataset={dataset} />
        )}

      </main>

      {/* Visual Editor Modal */}
      <VisualEditorModal
        isOpen={editingChart !== null}
        chart={editingChart}
        columns={dataset.columns}
        onClose={() => setEditingChart(null)}
        onSave={handleSaveVisual}
        onResetToDefault={handleResetVisual}
      />

      {/* Upload and Sample Picker Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onDatasetLoaded={handleDatasetLoaded}
        initialTab={uploadModalTab}
      />

      {/* Dashboard Layout Snapshots Modal */}
      <SnapshotManagerModal
        isOpen={isSnapshotModalOpen}
        onClose={() => setIsSnapshotModalOpen(false)}
        snapshots={snapshots}
        activeSnapshotId={activeSnapshotId}
        onSaveSnapshot={handleSaveSnapshot}
        onApplySnapshot={handleApplySnapshot}
        onDeleteSnapshot={handleDeleteSnapshot}
        onResetToDefault={handleResetToDefaultLayout}
        currentChartCount={displayedCharts.length}
        currentHiddenCount={hiddenChartIds.length}
        currentFullWidthCount={Object.values(chartWidthOverrides).filter((w) => w === 'full').length}
      />

      {/* Normal Download Success Dialog Box */}
      <ExportSuccessModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        details={downloadModalDetails}
      />

    </div>
  );
}
