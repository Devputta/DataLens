export type DataType = 'numeric' | 'date' | 'category' | 'boolean' | 'text' | 'id';

export interface ColumnProfile {
  name: string;
  originalName: string;
  type: DataType;
  sampleValues: (string | number | boolean | null)[];
  totalCount: number;
  nullCount: number;
  nullPercentage: number;
  uniqueCount: number;
  isUnique: boolean;
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  sum?: number;
  stdDev?: number;
  minDate?: string;
  maxDate?: string;
  topCategories?: { value: string; count: number; percentage: number }[];
  qualityIssues: string[];
}

export interface DataQualityReport {
  totalRows: number;
  totalColumns: number;
  duplicateRowsCount: number;
  overallHealthScore: number; // 0-100
  warnings: {
    column?: string;
    level: 'info' | 'warning' | 'critical';
    message: string;
    suggestion: string;
  }[];
}

export interface Dataset {
  id: string;
  name: string;
  sheetNames: string[];
  activeSheet: string;
  columns: ColumnProfile[];
  rawRecords: Record<string, any>[];
  cleanedRecords: Record<string, any>[];
  qualityReport: DataQualityReport;
  lastUpdated: string;
  isStreaming?: boolean;
}

export interface KpiCardConfig {
  id: string;
  title: string;
  metricColumn: string;
  aggregation: 'sum' | 'avg' | 'count' | 'distinct_count' | 'min' | 'max' | 'ratio';
  format: 'currency' | 'number' | 'percentage' | 'integer';
  value: number;
  formattedValue: string;
  subtitle?: string;
  trend?: {
    percentage: number;
    direction: 'up' | 'down' | 'neutral';
    label: string;
  };
  sparkline?: number[];
  comparisonColumn?: string;
}

export type ChartType = 'line' | 'area' | 'bar' | 'horizontal_bar' | 'donut' | 'scatter' | 'histogram' | 'pareto' | 'heatmap' | 'boxplot' | 'map';

export interface ChartTrendlineConfig {
  enabled: boolean;
  type?: 'linear' | 'moving_average' | 'polynomial';
  projectFuturePoints?: number; // Number of periods ahead to project via linear regression
}

export interface ChartAnomalyConfig {
  enabled: boolean;
  threshold?: number; // Z-Score threshold (e.g. 1.5, 2.0, 2.5, 3.0 standard deviations)
  highlightColor?: string; // Anomaly highlight color (e.g. '#ef4444')
}

export type MapRegionScope = 'world' | 'us' | 'india' | 'europe' | 'apac';

export interface ChartConfig {
  id: string;
  title: string;
  subtitle?: string;
  type: ChartType;
  xAxisColumn: string;
  yAxisColumn: string;
  secondaryYAxisColumn?: string;
  aggregation: 'sum' | 'avg' | 'count';
  colorPalette?: string[];
  data: any[];
  categoryCount?: number;
  isTimeBased?: boolean;
  description?: string;
  isCustom?: boolean;
  colorTheme?: string;
  trendline?: ChartTrendlineConfig;
  mapRegion?: MapRegionScope;
  anomalyDetection?: ChartAnomalyConfig;
}

export interface FilterState {
  searchQuery: string;
  dateRange: {
    column: string | null;
    start: string | null;
    end: string | null;
  };
  categories: Record<string, string[]>;
  numericRanges: Record<string, { min: number; max: number; currentMin: number; currentMax: number }>;
}

export interface AutomatedReport {
  id: string;
  title: string;
  generatedAt: string;
  datasetName: string;
  sheetName: string;
  totalRecordsAnalyzed: number;
  executiveSummary: string;
  keyInsights: {
    title: string;
    detail: string;
    type: 'positive' | 'warning' | 'neutral' | 'outlier';
  }[];
  topPerformers: {
    categoryColumn: string;
    metricColumn: string;
    items: { label: string; value: number; formatted: string; share: number }[];
  }[];
  outliers: {
    column: string;
    recordIndex: number;
    value: number;
    zScore: number;
    context: Record<string, any>;
  }[];
  kpiSnapshots: {
    title: string;
    value: string;
    change?: string;
  }[];
}

export interface ScheduledReportConfig {
  id: string;
  name: string;
  frequency: 'hourly' | 'daily' | 'weekly' | 'realtime_trigger';
  recipientEmail: string;
  format: 'pdf' | 'csv' | 'summary';
  thresholdAlert?: {
    metric: string;
    condition: 'greater_than' | 'less_than';
    threshold: number;
  };
  enabled: boolean;
  lastRun?: string;
}

export interface DashboardLayoutSnapshot {
  id: string;
  name: string;
  createdAt: string;
  datasetName?: string;
  chartOrder: string[];
  hiddenChartIds: string[];
  chartWidthOverrides: Record<string, 'half' | 'full'>;
  totalChartsCount?: number;
  visibleCount?: number;
  hiddenCount?: number;
  fullWidthCount?: number;
}
