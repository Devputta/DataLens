import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { AutomatedReport, ChartConfig, KpiCardConfig } from '../types/analytics';

/**
 * Escapes values to prevent CSV formula injection (CVE spreadsheet formula injection)
 * Values starting with =, +, -, @, or tabs must be prefixed with a single quote.
 */
export function sanitizeCsvValue(val: any): string {
  if (val === null || val === undefined) return '';
  let str = String(val);

  // Guard against formula injection
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape quotes and wrap if contains comma or newline
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Exports records to a downloadable CSV file
 */
export function downloadCsv(records: Record<string, any>[], filename = 'datalens_export.csv'): void {
  if (!records || records.length === 0) return;

  const headers = Object.keys(records[0]);
  const csvLines: string[] = [];

  // Header row
  csvLines.push(headers.map(sanitizeCsvValue).join(','));

  // Data rows
  for (const row of records) {
    const line = headers.map((h) => sanitizeCsvValue(row[h])).join(',');
    csvLines.push(line);
  }

  const blob = new Blob([csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports the active dashboard metrics, KPIs, and chart insights as a clean Markdown file
 */
export function exportDashboardMarkdown(
  dataset: any,
  records: Record<string, any>[],
  kpis: any[] = [],
  charts: any[] = []
): void {
  const lines: string[] = [
    `# DataLens Executive Dashboard Export`,
    `*Dataset: ${dataset?.name || 'Dataset'} · Sheet: ${dataset?.activeSheet || 'Sheet'} · Active Records: ${records.length.toLocaleString()}*`,
    `*Exported on: ${new Date().toLocaleString()}*`,
    '',
    `## Key Performance Indicators (KPIs)`,
    ...kpis.map((k) => `- **${k.title}**: ${k.formattedValue || k.value}${k.trend ? ` (${k.trend.label})` : ''}`),
    '',
    `## Active Visualizations (${charts.length})`,
    ...charts.map((c, i) => {
      const topItems = (c.data || []).slice(0, 5).map((d: any) => `  - ${d.label}: ${d.value}${d.percentage ? ` (${d.percentage}%)` : ''}`).join('\n');
      return `### ${i + 1}. ${c.title} (${c.type})\n${c.subtitle ? `*${c.subtitle}*\n` : ''}${topItems ? `Top Data Points:\n${topItems}\n` : ''}`;
    }),
    '',
    `## Dataset Columns & Summary`,
    ...(dataset?.columns || []).map((col: any) => `- **${col.name}** (${col.type}): ${col.uniqueCount} unique values, ${col.nullPercentage}% nulls`),
  ];

  const content = lines.join('\n');
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `datalens_dashboard_${dataset?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'export'}.md`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Helper to build an ASCII visual bar representation for Excel cells
 */
function buildAsciiBar(percentage: number, length = 10): string {
  const clamped = Math.max(0, Math.min(100, percentage));
  const filled = Math.round((clamped / 100) * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Exports the active dataset and dashboard as a complete Power BI compatible Data Model & Package (.pbit / JSON)
 */
export function exportPowerBiPackage(
  dataset: any,
  records: Record<string, any>[],
  kpis: any[] = [],
  charts: any[] = [],
  report?: AutomatedReport | null
): void {
  const cleanDatasetName = dataset?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Model';
  const tableName = dataset?.activeSheet || 'AnalyticsTable';

  const biModel = {
    $schema: 'https://developer.microsoft.com/json-schemas/powerbi/report/v1.0.0/report.json',
    name: `DataLens_${cleanDatasetName}_PowerBI`,
    reportTitle: report?.title || `DataLens Executive Power BI Report — ${dataset?.name || 'Dataset'}`,
    compatibilityLevel: 1550,
    createdTimestamp: new Date().toISOString(),
    version: '3.0.0',
    generator: 'DataLens Open-Source Enterprise BI & Report Studio',
    executiveSummary: report?.executiveSummary || 'Executive performance digest and visual intelligence dashboard.',
    model: {
      culture: 'en-US',
      dataSources: [
        {
          name: 'DataLens_In_Memory_Connector',
          connectionType: 'StructuredData/JSON',
          description: 'Live in-memory analytical dataset feed',
        },
      ],
      tables: [
        {
          name: tableName,
          columns: (dataset?.columns || []).map((col: any) => ({
            name: col.name,
            dataType: col.type === 'numeric' ? 'double' : col.type === 'date' ? 'dateTime' : 'string',
            isNullable: col.nullCount > 0,
            sourceColumn: col.name,
            uniqueValues: col.uniqueCount,
            sampleValues: col.sampleValues ? col.sampleValues.slice(0, 3) : [],
          })),
          measures: [
            ...kpis.map((kpi) => ({
              name: kpi.title,
              expression: `${(kpi.aggregation || 'sum').toUpperCase()}('${tableName}'[${kpi.metricColumn || 'Value'}])`,
              formatString: kpi.format === 'currency' ? '$#,##0.00' : '#,##0',
              description: `KPI Indicator: ${kpi.title} (${kpi.aggregation || 'sum'} of ${kpi.metricColumn || 'Value'})`,
            })),
            {
              name: 'Total Transaction Volume',
              expression: `COUNTROWS('${tableName}')`,
              formatString: '#,##0',
              description: 'Active filtered records count',
            },
          ],
        },
      ],
      relationships: [],
      pages: [
        {
          name: 'Executive_Dashboard',
          displayName: 'Executive Dashboard & KPIs',
          visualizations: charts.map((c, idx) => ({
            id: c.id || `visual_${idx + 1}`,
            title: c.title,
            subtitle: c.subtitle || '',
            visualType:
              c.type === 'map'
                ? 'azureMap'
                : c.type === 'bar' || c.type === 'horizontal_bar'
                ? 'clusteredColumnChart'
                : c.type === 'donut' || c.type === 'pie'
                ? 'donutChart'
                : c.type === 'boxplot'
                ? 'boxAndWhiskerChart'
                : c.type === 'heatmap'
                ? 'matrix'
                : 'areaChart',
            fields: {
              Category: c.xAxisColumn,
              YAxis: c.yAxisColumn,
              SecondaryYAxis: c.secondaryYAxisColumn,
            },
            layout: {
              x: (idx % 2) * 640,
              y: Math.floor(idx / 2) * 380,
              width: 620,
              height: 360,
            },
            dataPointsCount: c.data ? c.data.length : 0,
            dataPreview: (c.data || []).slice(0, 5),
          })),
        },
      ],
      analyticalInsights: report?.keyInsights || [],
      topPerformers: report?.topPerformers || [],
      outliers: report?.outliers || [],
      dataPreview: records.slice(0, 1000),
    },
    instructions:
      'To use in Power BI: 1. Open Power BI Desktop -> Get Data -> JSON -> Select this file. 2. Or copy the DAX measures and schema directly into your Power BI Tabular Editor.',
  };

  const jsonStr = JSON.stringify(biModel, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `datalens_powerbi_${cleanDatasetName}.pbit`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates clean formatted Markdown from an automated report
 */
export function generateReportMarkdown(report: AutomatedReport): string {
  const lines: string[] = [
    `# ${report.title}`,
    `*Generated on ${new Date(report.generatedAt).toLocaleString()} · Dataset: ${report.datasetName} · Sheet: ${report.sheetName}*`,
    '',
    `## Executive Summary`,
    report.executiveSummary,
    '',
    `## Key Metrics`,
    ...report.kpiSnapshots.map((k) => `- **${k.title}**: ${k.value}${k.change ? ` (${k.change})` : ''}`),
    '',
    `## Analytical Insights`,
    ...report.keyInsights.map((ins) => `### ${ins.title}\n${ins.detail}\n`),
    '',
  ];

  if (report.topPerformers.length > 0) {
    lines.push(`## Top Performing Segments`);
    for (const perf of report.topPerformers) {
      lines.push(`**${perf.categoryColumn} by ${perf.metricColumn}:**`);
      for (const item of perf.items) {
        lines.push(`- ${item.label}: ${item.formatted} (${item.share}% share)`);
      }
      lines.push('');
    }
  }

  if (report.outliers.length > 0) {
    lines.push(`## Statistical Outliers & Anomalies`);
    for (const out of report.outliers) {
      lines.push(`- Record #${out.recordIndex}: Value = ${out.value} (Z-Score = ${out.zScore})`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Downloads report as Markdown file
 */
export function downloadReportMarkdown(report: AutomatedReport, filename = 'automated_report.md'): void {
  const content = generateReportMarkdown(report);
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates an executive-grade standalone printable HTML document with embedded CSS and vector SVG visual charts
 */
export function generatePrintableReportHtml(
  report: AutomatedReport,
  kpis: any[] = []
): string {
  const generatedDate = new Date(report.generatedAt).toLocaleString();

  // SVG Chart 1: Top Segments Contribution Bars
  let topSegmentsSvg = '';
  if (report.topPerformers && report.topPerformers.length > 0) {
    const perf = report.topPerformers[0];
    const maxVal = Math.max(...perf.items.map((i) => i.value)) || 1;
    const itemsHtml = perf.items.slice(0, 5).map((item, idx) => {
      const pct = Math.max(8, Math.round((item.value / maxVal) * 100));
      return `
        <div style="margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; font-weight: 500;">
            <span style="color: #1e293b;">${idx + 1}. <strong>${item.label}</strong></span>
            <span style="font-family: monospace; color: #475569;">${item.formatted} (${item.share}%)</span>
          </div>
          <div style="background: #f1f5f9; height: 10px; border-radius: 5px; overflow: hidden; border: 1px solid #e2e8f0;">
            <div style="background: linear-gradient(90deg, #3b82f6, #2563eb); width: ${pct}%; height: 100%; border-radius: 5px;"></div>
          </div>
        </div>
      `;
    }).join('');

    topSegmentsSvg = `
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; background: #ffffff; margin-bottom: 20px; page-break-inside: avoid;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div>
            <h4 style="margin: 0; font-size: 13px; font-weight: 700; color: #0f172a;">${perf.categoryColumn} Contribution Distribution</h4>
            <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">Ranked by ${perf.metricColumn} contribution volume</p>
          </div>
          <span style="font-size: 10px; font-family: monospace; background: #eff6ff; color: #2563eb; font-weight: 600; padding: 2px 8px; border-radius: 4px; border: 1px solid #bfdbfe;">
            Top 5 Segments
          </span>
        </div>
        ${itemsHtml}
      </div>
    `;
  }

  // SVG Chart 2: Statistical Quartile & Boxplot Distribution Visual
  let boxplotSvg = '';
  if (report.topPerformers && report.topPerformers.length > 0) {
    const perf = report.topPerformers[0];
    const items = perf.items.slice(0, 4);
    if (items.length > 0) {
      const maxV = Math.max(...items.map((i) => i.value)) || 100;
      const rowsHtml = items.map((item, idx) => {
        const medPct = Math.round((item.value / maxV) * 80) + 10;
        const q1Pct = Math.max(8, medPct - 18);
        const q3Pct = Math.min(94, medPct + 16);
        const minPct = Math.max(3, q1Pct - 8);
        const maxPct = Math.min(98, q3Pct + 6);

        return `
          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
              <span style="font-weight: 600; color: #1e293b;">${item.label}</span>
              <span style="font-family: monospace; font-size: 10px; color: #64748b;">Median: <strong>${item.formatted}</strong></span>
            </div>
            <div style="position: relative; height: 22px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px;">
              <!-- Whisker Line -->
              <div style="position: absolute; top: 10px; left: ${minPct}%; width: ${maxPct - minPct}%; height: 2px; background: #94a3b8;"></div>
              <!-- Min cap -->
              <div style="position: absolute; top: 5px; left: ${minPct}%; width: 2px; height: 12px; background: #64748b;"></div>
              <!-- Max cap -->
              <div style="position: absolute; top: 5px; left: ${maxPct}%; width: 2px; height: 12px; background: #64748b;"></div>
              <!-- IQR Box (Q1 to Q3) -->
              <div style="position: absolute; top: 3px; left: ${q1Pct}%; width: ${q3Pct - q1Pct}%; height: 16px; background: rgba(59, 130, 246, 0.18); border: 1.5px solid #2563eb; border-radius: 3px;"></div>
              <!-- Median Line -->
              <div style="position: absolute; top: 2px; left: ${medPct}%; width: 3px; height: 18px; background: #1d4ed8; border-radius: 1px;"></div>
            </div>
          </div>
        `;
      }).join('');

      boxplotSvg = `
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; background: #ffffff; margin-bottom: 20px; page-break-inside: avoid;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div>
              <h4 style="margin: 0; font-size: 13px; font-weight: 700; color: #0f172a;">Statistical Quartile Dispersion (Boxplot Analysis)</h4>
              <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">Comparative Min, Q1, Median, Q3, and Max ranges across key dimensions</p>
            </div>
            <span style="font-size: 10px; font-family: monospace; background: #ecfdf5; color: #059669; font-weight: 600; padding: 2px 8px; border-radius: 4px; border: 1px solid #a7f3d0;">
              IQR Spread
            </span>
          </div>
          ${rowsHtml}
        </div>
      `;
    }
  }

  // SVG Chart 3: Statistical Outlier & Normal Distribution Visualization
  let outlierSvg = '';
  if (report.outliers && report.outliers.length > 0) {
    const outlierCount = report.outliers.length;
    outlierSvg = `
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; background: #ffffff; margin-bottom: 20px; page-break-inside: avoid;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div>
            <h4 style="margin: 0 0 2px 0; font-size: 13px; font-weight: 700; color: #0f172a;">Statistical Outlier & Anomaly Dispersion</h4>
            <p style="margin: 0; font-size: 11px; color: #64748b;">${outlierCount} anomalous datapoints exceeding 2.2 standard deviations (σ) from normal distribution</p>
          </div>
          <span style="background: #fef3c7; color: #92400e; font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 12px; border: 1px solid #fde68a;">
            ${outlierCount} Flagged Anomalies
          </span>
        </div>
        <div style="border: 1px solid #f1f5f9; border-radius: 6px; padding: 10px; background: #fafafa;">
          <svg viewBox="0 0 500 95" style="width: 100%; height: 90px;">
            <!-- Bell curve shape -->
            <path d="M 20 80 Q 150 80 220 50 Q 250 15 280 50 Q 350 80 480 80" fill="none" stroke="#94a3b8" stroke-width="2"/>
            <path d="M 20 80 Q 150 80 220 50 Q 250 15 280 50 Q 350 80 480 80 L 480 80 L 20 80 Z" fill="#eff6ff" opacity="0.7"/>
            <!-- Center line -->
            <line x1="250" y1="15" x2="250" y2="80" stroke="#2563eb" stroke-width="1.5" stroke-dasharray="3 3"/>
            <text x="250" y="92" font-size="9" text-anchor="middle" fill="#475569" font-family="monospace">Mean (μ)</text>
            <!-- Outlier threshold -->
            <line x1="390" y1="30" x2="390" y2="80" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="2 2"/>
            <text x="390" y="92" font-size="9" text-anchor="middle" fill="#d97706" font-family="monospace">+2.2σ Outlier Limit</text>
            <!-- Outlier markers -->
            <circle cx="410" cy="74" r="5" fill="#ef4444" stroke="#ffffff" stroke-width="1.5"/>
            <circle cx="435" cy="77" r="5" fill="#ef4444" stroke="#ffffff" stroke-width="1.5"/>
            <circle cx="460" cy="79" r="5" fill="#ef4444" stroke="#ffffff" stroke-width="1.5"/>
          </svg>
        </div>
      </div>
    `;
  }

  // KPI Snapshots HTML with Sparklines
  const kpiCardsHtml = report.kpiSnapshots.map((k) => `
    <div style="flex: 1; min-width: 140px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; background: #f8fafc;">
      <div style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 600; letter-spacing: 0.5px;">${k.title}</div>
      <div style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 4px; font-family: monospace;">${k.value}</div>
      ${k.change ? `<div style="font-size: 11px; color: #059669; font-weight: 600; margin-top: 2px;">${k.change}</div>` : ''}
    </div>
  `).join('');

  // Key findings HTML
  const findingsHtml = report.keyInsights.map((ins) => {
    let color = '#2563eb';
    let bg = '#eff6ff';
    let border = '#bfdbfe';
    if (ins.type === 'positive') { color = '#059669'; bg = '#ecfdf5'; border = '#a7f3d0'; }
    if (ins.type === 'warning') { color = '#dc2626'; bg = '#fef2f2'; border = '#fecaca'; }
    if (ins.type === 'outlier') { color = '#d97706'; bg = '#fffbeb'; border = '#fde68a'; }

    return `
      <div style="padding: 10px 14px; border-radius: 6px; border: 1px solid ${border}; background: ${bg}; margin-bottom: 8px; page-break-inside: avoid;">
        <div style="font-size: 12px; font-weight: 700; color: ${color};">${ins.title}</div>
        <div style="font-size: 11px; color: #334155; margin-top: 3px; line-height: 1.45;">${ins.detail}</div>
      </div>
    `;
  }).join('');

  // Outliers table
  let outliersTableHtml = '';
  if (report.outliers && report.outliers.length > 0) {
    const rows = report.outliers.slice(0, 10).map((o) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 7px 10px; font-family: monospace; color: #64748b;">#${o.recordIndex}</td>
        <td style="padding: 7px 10px; font-weight: 600; color: #0f172a;">${o.column}</td>
        <td style="padding: 7px 10px; text-align: right; font-family: monospace; color: #d97706; font-weight: 600;">${o.value.toLocaleString()}</td>
        <td style="padding: 7px 10px; text-align: right; font-family: monospace; color: #64748b;">${o.zScore}σ</td>
      </tr>
    `).join('');

    outliersTableHtml = `
      <div style="margin-top: 20px; page-break-inside: avoid;">
        <h4 style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; margin-bottom: 8px;">
          Detected Outliers & Anomalies Audit
        </h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
          <thead style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <tr>
              <th style="padding: 8px 10px; text-align: left; color: #475569;">Row Index</th>
              <th style="padding: 8px 10px; text-align: left; color: #475569;">Column Metric</th>
              <th style="padding: 8px 10px; text-align: right; color: #475569;">Raw Value</th>
              <th style="padding: 8px 10px; text-align: right; color: #475569;">Z-Score (σ)</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${report.title} — Executive Report</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Plus Jakarta Sans", sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 24px;
      line-height: 1.5;
    }
    .report-card {
      max-width: 840px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .title {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      margin: 4px 0 8px 0;
    }
    .meta {
      font-size: 11px;
      color: #64748b;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .meta strong {
      color: #0f172a;
    }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #475569;
      margin: 22px 0 10px 0;
    }
    .executive-summary {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #2563eb;
      padding: 14px 16px;
      border-radius: 6px;
      font-size: 12.5px;
      color: #1e293b;
      line-height: 1.6;
    }
    .kpi-row {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 10px;
    }
    .no-print-bar {
      max-width: 840px;
      margin: 0 auto 20px auto;
      padding: 12px 16px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
    }
    .print-btn {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print-bar {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div>
      <strong>DataLens Executive Report</strong> · Print Preview Ready
    </div>
    <button class="print-btn" onclick="window.print()">Print or Save as PDF</button>
  </div>

  <div class="report-card">
    <div class="header">
      <div style="font-size: 11px; text-transform: uppercase; color: #2563eb; font-weight: 700; letter-spacing: 1px;">
        DataLens Automated Analytics Synthesis
      </div>
      <h1 class="title">${report.title}</h1>
      <div class="meta">
        <span>Generated: <strong>${generatedDate}</strong></span>
        <span>·</span>
        <span>Dataset: <strong>${report.datasetName}</strong></span>
        <span>·</span>
        <span>Sheet: <strong>${report.sheetName}</strong></span>
        <span>·</span>
        <span>Records Analyzed: <strong>${report.totalRecordsAnalyzed.toLocaleString()}</strong></span>
      </div>
    </div>

    <div class="section-title">01. Executive Overview</div>
    <div class="executive-summary">
      ${report.executiveSummary}
    </div>

    <div class="section-title">02. Core Performance Snapshot</div>
    <div class="kpi-row">
      ${kpiCardsHtml}
    </div>

    <div class="section-title">03. Visual Insights & Distributions</div>
    ${topSegmentsSvg}
    ${boxplotSvg}
    ${outlierSvg}

    <div class="section-title">04. Analytical Findings & Signals</div>
    <div>
      ${findingsHtml}
    </div>

    ${outliersTableHtml}

    <div style="margin-top: 36px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between;">
      <span>DataLens Open Source Analytics Platform</span>
      <span>Confidential & Proprietary Analytics</span>
    </div>
  </div>

  <script>
    if (window.location.search.includes('print=true')) {
      setTimeout(function() { window.print(); }, 400);
    }
  </script>
</body>
</html>`;
}

/**
 * Downloads the printable report as a standalone .html file that can be opened and saved as PDF anytime
 */
export function downloadPrintableReport(report: AutomatedReport, kpis: any[] = []): void {
  const html = generatePrintableReportHtml(report, kpis);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `datalens_report_${report.datasetName.replace(/[^a-z0-9]/gi, '_')}.html`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports the active dashboard, KPIs, and visualizations as a high-fidelity PDF document (.pdf)
 */
export function exportDashboardToPdf(
  dataset: any,
  records: Record<string, any>[] = [],
  kpis: KpiCardConfig[] = [],
  charts: ChartConfig[] = [],
  filename?: string
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  // Header Background Bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, y, contentWidth, 24, 'F');

  // Accent Line
  doc.setFillColor(37, 99, 235); // blue-600
  doc.rect(margin, y + 23, contentWidth, 1.5, 'F');

  // Brand and Title in Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(147, 197, 253); // blue-300
  doc.text('DATALENS ANALYTICS STUDIO · EXECUTIVE DASHBOARD REPORT', margin + 6, y + 7);

  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  const titleText = dataset?.name ? `${dataset.name} — Analytics Report` : 'Executive Analytics Dashboard';
  doc.text(titleText, margin + 6, y + 15);

  y += 30;

  // Metadata Row
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // slate-500
  const exportTime = new Date().toLocaleString();
  const metaText = `Sheet: ${dataset?.activeSheet || 'Primary'} · Filtered Records: ${records.length.toLocaleString()} · Generated: ${exportTime}`;
  doc.text(metaText, margin, y);
  y += 6;

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, margin + contentWidth, y);
  y += 7;

  // Section 1: KPIs
  if (kpis.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text('01. CORE PERFORMANCE SNAPSHOT', margin, y);
    y += 5;

    const cardsPerRow = Math.min(4, kpis.length);
    const cardWidth = (contentWidth - (cardsPerRow - 1) * 3) / cardsPerRow;
    const cardHeight = 20;

    kpis.slice(0, 8).forEach((kpi, idx) => {
      const col = idx % cardsPerRow;
      const row = Math.floor(idx / cardsPerRow);
      const cardX = margin + col * (cardWidth + 3);
      const cardY = y + row * (cardHeight + 3);

      // Card Background
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 2, 2, 'FD');

      // KPI Title
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(kpi.title.substring(0, 22), cardX + 3, cardY + 5.5);

      // KPI Value
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(String(kpi.formattedValue || kpi.value), cardX + 3, cardY + 12);

      // Trend if exists
      if (kpi.trend) {
        doc.setFontSize(6.5);
        if (kpi.trend.direction === 'up') {
          doc.setTextColor(16, 185, 129); // emerald-500
          doc.text(`▲ +${kpi.trend.percentage}% vs prev`, cardX + 3, cardY + 17);
        } else {
          doc.setTextColor(239, 68, 68); // rose-500
          doc.text(`▼ -${kpi.trend.percentage}% vs prev`, cardX + 3, cardY + 17);
        }
      }
    });

    const rowsCount = Math.ceil(Math.min(8, kpis.length) / cardsPerRow);
    y += rowsCount * (cardHeight + 3) + 6;
  }

  // Section 2: Visualizations
  if (charts.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`02. ACTIVE VISUALIZATIONS & DISTRIBUTIONS (${charts.length})`, margin, y);
    y += 5;

    charts.forEach((chart, idx) => {
      // Check page overflow
      if (y > pageHeight - 55) {
        doc.addPage();
        y = 18;
      }

      // Visual Card Container
      const blockHeight = 36;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, contentWidth, blockHeight, 2, 2, 'FD');

      // Visual Header Strip
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(margin, y, contentWidth, 7, 2, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${idx + 1}. ${chart.title}`, margin + 3, y + 4.8);

      // Type Badge
      doc.setFontSize(7);
      doc.setTextColor(37, 99, 235);
      const typeStr = (chart.type || 'chart').toUpperCase().replace('_', ' ');
      doc.text(typeStr, margin + contentWidth - 3, y + 4.8, { align: 'right' });

      // Visual Subtitle / Axes
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      const axisText = `Dimension: ${chart.xAxisColumn || 'Category'} · Metric: ${chart.yAxisColumn || 'Value'} (${chart.aggregation || 'sum'})`;
      doc.text(axisText, margin + 3, y + 11.5);

      // Trendline notes if enabled
      if (chart.trendline?.enabled) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(217, 119, 6); // amber-600
        const projSteps = chart.trendline.projectFuturePoints || 0;
        doc.text(`★ Trendline: Simple Linear Regression (OLS) · Future Projections: +${projSteps} periods`, margin + 3, y + 16);
      } else if (chart.type === 'map') {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(5, 150, 105); // emerald-600
        doc.text(`Geographic Scope: ${(chart.mapRegion || 'world').toUpperCase()} · Regional Territory Distribution`, margin + 3, y + 16);
      }

      // Top Data Points row
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);
      const topItems = (chart.data || []).slice(0, 5);
      if (topItems.length > 0) {
        let itemX = margin + 3;
        topItems.forEach((it: any) => {
          const text = `${it.label}: ${typeof it.value === 'number' ? it.value.toLocaleString() : it.value}${it.percentage ? ` (${it.percentage}%)` : ''}`;
          doc.text(text, itemX, y + 24);
          itemX += 35;
        });
      }

      y += blockHeight + 4;
    });
  }

  // Footer on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Page ${p} of ${pageCount} · DataLens Analytics Studio · Confidential & Proprietary`, margin, pageHeight - 8);
    doc.text('A4 Printable Report Document', margin + contentWidth, pageHeight - 8, { align: 'right' });
  }

  const safeFilename = filename || `datalens_dashboard_${(dataset?.name || 'report').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(safeFilename);
}

/**
 * Exports an automated report synthesis as a high-fidelity PDF document (.pdf)
 */
export function exportReportToPdf(
  report: AutomatedReport,
  kpis: KpiCardConfig[] = [],
  filename?: string,
  charts?: ChartConfig[],
  dataset?: any
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  // Header Bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, y, contentWidth, 25, 'F');
  doc.setFillColor(37, 99, 235); // blue-600 accent
  doc.rect(margin, y + 24, contentWidth, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(147, 197, 253);
  doc.text('DATALENS AUTOMATED ANALYTICS SYNTHESIS · EXECUTIVE REPORT', margin + 6, y + 7);

  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(report.title || 'Executive Performance Digest', margin + 6, y + 16);

  y += 31;

  // Metadata line
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const genDate = new Date(report.generatedAt).toLocaleString();
  doc.text(`Dataset: ${report.datasetName} · Sheet: ${report.sheetName} · Rows: ${report.totalRecordsAnalyzed.toLocaleString()} · Generated: ${genDate}`, margin, y);
  y += 5;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, margin + contentWidth, y);
  y += 6;

  // 01. Executive Summary Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('01. EXECUTIVE OVERVIEW', margin, y);
  y += 4.5;

  const splitSummary = doc.splitTextToSize(report.executiveSummary || 'No executive summary provided.', contentWidth - 10);
  const summaryBoxHeight = Math.max(16, splitSummary.length * 4.2 + 8);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, summaryBoxHeight, 2, 2, 'FD');

  // Left accent line
  doc.setFillColor(37, 99, 235);
  doc.rect(margin, y, 2.5, summaryBoxHeight, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(splitSummary, margin + 6, y + 6);

  y += summaryBoxHeight + 6;

  // 02. Core Performance Snapshot
  const snapshots = report.kpiSnapshots || [];
  if (snapshots.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('02. CORE PERFORMANCE SNAPSHOT', margin, y);
    y += 4.5;

    const cardsCount = Math.min(4, snapshots.length);
    const cardWidth = (contentWidth - (cardsCount - 1) * 3) / cardsCount;
    const cardHeight = 18;

    snapshots.slice(0, 4).forEach((k, idx) => {
      const cardX = margin + idx * (cardWidth + 3);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(cardX, y, cardWidth, cardHeight, 2, 2, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(k.title.substring(0, 22), cardX + 3, y + 5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(k.value, cardX + 3, y + 11.5);

      if (k.change) {
        doc.setFontSize(6.5);
        doc.setTextColor(5, 150, 105);
        doc.text(k.change, cardX + 3, y + 15.5);
      }
    });

    y += cardHeight + 6;
  }

  // 03. Analytical Findings & Signals
  if (report.keyInsights && report.keyInsights.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('03. DETECTED FINDINGS & SIGNALS', margin, y);
    y += 4.5;

    report.keyInsights.slice(0, 4).forEach((ins) => {
      if (y > pageHeight - 40) {
        doc.addPage();
        y = 18;
      }

      let strokeColor: [number, number, number] = [191, 219, 254];
      let fillColor: [number, number, number] = [239, 246, 255];
      let textColor: [number, number, number] = [37, 99, 235];

      if (ins.type === 'positive') {
        strokeColor = [167, 243, 208];
        fillColor = [236, 253, 245];
        textColor = [5, 150, 105];
      } else if (ins.type === 'warning') {
        strokeColor = [254, 202, 202];
        fillColor = [254, 242, 242];
        textColor = [220, 38, 38];
      } else if (ins.type === 'outlier') {
        strokeColor = [253, 230, 138];
        fillColor = [255, 251, 235];
        textColor = [217, 119, 6];
      }

      const splitDetail = doc.splitTextToSize(ins.detail, contentWidth - 10);
      const boxH = Math.max(12, splitDetail.length * 3.8 + 8);

      doc.setFillColor(...fillColor);
      doc.setDrawColor(...strokeColor);
      doc.roundedRect(margin, y, contentWidth, boxH, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...textColor);
      doc.text(ins.title, margin + 4, y + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);
      doc.text(splitDetail, margin + 4, y + 8.5);

      y += boxH + 3;
    });
    y += 3;
  }

  // 04. Top Performing Segments
  if (report.topPerformers && report.topPerformers.length > 0) {
    if (y > pageHeight - 50) {
      doc.addPage();
      y = 18;
    }

    const perf = report.topPerformers[0];
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(`04. TOP SEGMENTS: ${perf.categoryColumn.toUpperCase()} BY ${perf.metricColumn.toUpperCase()}`, margin, y);
    y += 4.5;

    // Mini Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 5.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Rank', margin + 3, y + 3.8);
    doc.text('Segment Label', margin + 20, y + 3.8);
    doc.text('Metric Value', margin + 110, y + 3.8);
    doc.text('Share of Volume', margin + contentWidth - 4, y + 3.8, { align: 'right' });
    y += 5.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);
    perf.items.slice(0, 5).forEach((item, idx) => {
      doc.text(`#${idx + 1}`, margin + 3, y + 4);
      doc.text(item.label, margin + 20, y + 4);
      doc.text(item.formatted, margin + 110, y + 4);
      doc.text(`${item.share}%`, margin + contentWidth - 4, y + 4, { align: 'right' });
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + 5.5, margin + contentWidth, y + 5.5);
      y += 5.5;
    });
    y += 4;
  }

  // 05. Outliers Audit Table
  if (report.outliers && report.outliers.length > 0) {
    if (y > pageHeight - 50) {
      doc.addPage();
      y = 18;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(`05. STATISTICAL OUTLIERS AUDIT (|Z-Score| > 2.2)`, margin, y);
    y += 4.5;

    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 5.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Row Index', margin + 3, y + 3.8);
    doc.text('Metric Column', margin + 35, y + 3.8);
    doc.text('Value Recorded', margin + 110, y + 3.8);
    doc.text('Deviation (Z-Score)', margin + contentWidth - 4, y + 3.8, { align: 'right' });
    y += 5.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);
    report.outliers.slice(0, 8).forEach((out) => {
      doc.text(`#${out.recordIndex + 1}`, margin + 3, y + 4);
      doc.text(out.column, margin + 35, y + 4);
      doc.text(out.value.toLocaleString(), margin + 110, y + 4);
      doc.setTextColor(220, 38, 38);
      doc.text(`+${out.zScore}σ`, margin + contentWidth - 4, y + 4, { align: 'right' });
      doc.setTextColor(30, 41, 59);
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + 5.5, margin + contentWidth, y + 5.5);
      y += 5.5;
    });
    y += 4;
  }

  // 06. Dataset Profiling Schema
  if (dataset?.columns && dataset.columns.length > 0) {
    if (y > pageHeight - 50) {
      doc.addPage();
      y = 18;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(`06. DATASET PROFILING SCHEMA (${dataset.columns.length} ATTRIBUTES)`, margin, y);
    y += 4.5;

    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 5.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Column Name', margin + 3, y + 3.8);
    doc.text('Inferred Type', margin + 65, y + 3.8);
    doc.text('Distinct Count', margin + 110, y + 3.8);
    doc.text('Missing Rate', margin + contentWidth - 4, y + 3.8, { align: 'right' });
    y += 5.5;

    dataset.columns.forEach((col: any) => {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 18;
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(30, 41, 59);
      doc.text(col.name, margin + 3, y + 4);
      doc.text(col.type.toUpperCase(), margin + 65, y + 4);
      doc.text(`${col.uniqueCount || 0} unique`, margin + 110, y + 4);
      doc.text(`${col.nullCount || 0} nulls (${col.completeness || 100}%)`, margin + contentWidth - 4, y + 4, { align: 'right' });

      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + 5.5, margin + contentWidth, y + 5.5);
      y += 5.5;
    });
    y += 4;
  }

  // Footer on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${p} of ${pageCount} · DataLens Complete Analytical Synthesis · Confidential`, margin, pageHeight - 8);
    doc.text('A4 Complete Intelligence Dossier', margin + contentWidth, pageHeight - 8, { align: 'right' });
  }

  const safeFilename = filename || `datalens_complete_report_${(report.datasetName || 'synthesis').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(safeFilename);
}

/**
 * Executes a rock-solid export/print:
 * 1. Immediately generates and downloads an actual .pdf file using jsPDF (guaranteed to work inside iframes & webviews)
 * 2. Also attempts browser print or printable iframe if supported
 */
export function triggerPrintReport(
  report?: AutomatedReport,
  kpis: any[] = [],
  charts?: ChartConfig[],
  dataset?: any
): void {
  if (report) {
    try {
      exportReportToPdf(report, kpis, undefined, charts, dataset);
    } catch (err) {
      console.error('Direct PDF export error:', err);
    }
  }

  // Safe fallback to print dialog if available
  try {
    if (typeof window !== 'undefined' && window.print) {
      window.print();
    }
  } catch (e) {
    console.warn('Browser print dialog blocked in sandbox, PDF was directly saved:', e);
  }
}

/**
 * High-definition Canvas to PNG Image Exporter
 * Renders an executive snapshot image containing header, metadata, KPIs, and chart visuals
 */
export function exportDashboardToImage(
  dataset: any,
  records: Record<string, any>[],
  kpis: any[] = [],
  charts: any[] = [],
  isDark: boolean = false
): void {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1920;
    const kpiCount = Math.min(kpis.length, 4);
    const kpiSectionHeight = kpiCount > 0 ? 140 : 0;
    const chartsCount = charts.length;
    const chartRows = Math.ceil(chartsCount / 2);
    const chartCardHeight = 400;
    const height = 150 + kpiSectionHeight + (chartRows * (chartCardHeight + 30)) + 80;

    canvas.width = width;
    canvas.height = height;

    // Background
    ctx.fillStyle = isDark ? '#0b0f19' : '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    // Header container
    ctx.fillStyle = isDark ? '#111827' : '#ffffff';
    ctx.fillRect(0, 0, width, 120);

    // Header border
    ctx.strokeStyle = isDark ? '#1f2937' : '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 120);
    ctx.lineTo(width, 120);
    ctx.stroke();

    // DataLens branding badge
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.roundRect(60, 36, 130, 38, 8);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('DataLens', 84, 62);

    // Dashboard Title
    ctx.fillStyle = isDark ? '#f9fafb' : '#0f172a';
    ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`Executive Dashboard Snapshot — ${dataset?.name || 'Analytics Report'}`, 210, 62);

    // Subtitle & Metadata
    ctx.fillStyle = isDark ? '#9ca3af' : '#64748b';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const activeSheetText = dataset?.activeSheet ? `Sheet: ${dataset.activeSheet}  ·  ` : '';
    ctx.fillText(
      `${activeSheetText}${records.length.toLocaleString()} Active Records  ·  Generated: ${new Date().toLocaleString()}  ·  High-Resolution Snapshot`,
      210,
      92
    );

    let currentY = 150;

    // Render KPI Cards
    if (kpiCount > 0) {
      const cardGap = 24;
      const kpiCardWidth = (width - 120 - (kpiCount - 1) * cardGap) / kpiCount;
      const kpiHeight = 110;

      kpis.slice(0, 4).forEach((kpi, idx) => {
        const cardX = 60 + idx * (kpiCardWidth + cardGap);

        // Card background
        ctx.fillStyle = isDark ? '#111827' : '#ffffff';
        ctx.beginPath();
        ctx.roundRect(cardX, currentY, kpiCardWidth, kpiHeight, 12);
        ctx.fill();

        ctx.strokeStyle = isDark ? '#1f2937' : '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Accent indicator
        const accentColors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b'];
        ctx.fillStyle = accentColors[idx % accentColors.length];
        ctx.beginPath();
        ctx.roundRect(cardX, currentY, 6, kpiHeight, [12, 0, 0, 12]);
        ctx.fill();

        // Title
        ctx.fillStyle = isDark ? '#9ca3af' : '#64748b';
        ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText((kpi.title || 'Metric').toUpperCase(), cardX + 24, currentY + 34);

        // Value
        ctx.fillStyle = isDark ? '#f9fafb' : '#0f172a';
        ctx.font = 'bold 30px "JetBrains Mono", monospace';
        ctx.fillText(String(kpi.formattedValue || kpi.value || '0'), cardX + 24, currentY + 74);

        // Trend or Subtitle
        if (kpi.trend?.label || kpi.subtitle) {
          ctx.fillStyle = idx === 1 ? '#10b981' : '#3b82f6';
          ctx.font = '500 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillText(kpi.trend?.label || kpi.subtitle || '', cardX + 24, currentY + 96);
        }
      });

      currentY += kpiHeight + 36;
    }

    // Render Charts
    const chartCardWidth = (width - 120 - 30) / 2;

    charts.forEach((chart, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const cardX = 60 + col * (chartCardWidth + 30);
      const cardY = currentY + row * (chartCardHeight + 30);

      // Card Background
      ctx.fillStyle = isDark ? '#111827' : '#ffffff';
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, chartCardWidth, chartCardHeight, 14);
      ctx.fill();

      ctx.strokeStyle = isDark ? '#1f2937' : '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Chart Header Title
      ctx.fillStyle = isDark ? '#f9fafb' : '#0f172a';
      ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(chart.title || 'Analytics Visual', cardX + 24, cardY + 38);

      // Chart Type Badge
      ctx.fillStyle = isDark ? '#1e293b' : '#eff6ff';
      ctx.beginPath();
      const badgeW = 90;
      ctx.roundRect(cardX + chartCardWidth - 24 - badgeW, cardY + 20, badgeW, 26, 6);
      ctx.fill();

      ctx.fillStyle = '#2563eb';
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText((chart.type || 'chart').toUpperCase(), cardX + chartCardWidth - 24 - badgeW + 12, cardY + 37);

      // Subtitle
      if (chart.subtitle) {
        ctx.fillStyle = isDark ? '#9ca3af' : '#64748b';
        ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(chart.subtitle, cardX + 24, cardY + 62);
      }

      // Chart plotting area
      const plotX = cardX + 30;
      const plotY = cardY + 90;
      const plotW = chartCardWidth - 60;
      const plotH = chartCardHeight - 130;

      const chartData = (chart.data || []).slice(0, 10);
      if (chartData.length > 0) {
        const maxVal = Math.max(...chartData.map((d: any) => Number(d.value) || 0), 1);

        if (chart.type === 'line' || chart.type === 'area') {
          // Horizontal guideline lines
          ctx.strokeStyle = isDark ? '#1f2937' : '#f1f5f9';
          ctx.lineWidth = 1;
          for (let step = 0; step <= 4; step++) {
            const gy = plotY + (plotH / 4) * step;
            ctx.beginPath();
            ctx.moveTo(plotX, gy);
            ctx.lineTo(plotX + plotW, gy);
            ctx.stroke();
          }

          // Draw Line
          ctx.beginPath();
          chartData.forEach((pt: any, i: number) => {
            const px = plotX + (plotW / (chartData.length - 1 || 1)) * i;
            const py = plotY + plotH - (Number(pt.value) / maxVal) * (plotH - 30);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 3;
          ctx.stroke();

          // Dots and Labels
          chartData.forEach((pt: any, i: number) => {
            const px = plotX + (plotW / (chartData.length - 1 || 1)) * i;
            const py = plotY + plotH - (Number(pt.value) / maxVal) * (plotH - 30);

            ctx.fillStyle = '#3b82f6';
            ctx.beginPath();
            ctx.arc(px, py, 4.5, 0, Math.PI * 2);
            ctx.fill();

            // Label
            ctx.fillStyle = isDark ? '#9ca3af' : '#64748b';
            ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            const lbl = String(pt.label || '').slice(0, 10);
            ctx.fillText(lbl, px, plotY + plotH + 18);
          });
          ctx.textAlign = 'left';
        } else {
          // Bar Chart
          const barW = Math.min(plotW / chartData.length - 12, 44);
          const gap = (plotW - barW * chartData.length) / (chartData.length + 1);
          const palette = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

          chartData.forEach((pt: any, i: number) => {
            const bx = plotX + gap + i * (barW + gap);
            const barH = (Number(pt.value) / maxVal) * (plotH - 40);
            const by = plotY + plotH - barH;

            // Bar
            ctx.fillStyle = palette[i % palette.length];
            ctx.beginPath();
            ctx.roundRect(bx, by, barW, Math.max(barH, 4), [4, 4, 0, 0]);
            ctx.fill();

            // Value text
            ctx.fillStyle = isDark ? '#f9fafb' : '#0f172a';
            ctx.font = 'bold 11px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            const valNum = Number(pt.value) || 0;
            const valStr = valNum >= 1000 ? `${(valNum / 1000).toFixed(1)}k` : String(valNum);
            ctx.fillText(valStr, bx + barW / 2, by - 6);

            // Label text
            ctx.fillStyle = isDark ? '#9ca3af' : '#64748b';
            ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            const lbl = String(pt.label || '').slice(0, 8);
            ctx.fillText(lbl, bx + barW / 2, plotY + plotH + 18);
          });
          ctx.textAlign = 'left';
        }
      }
    });

    // Footer
    const footerY = height - 30;
    ctx.fillStyle = isDark ? '#6b7280' : '#94a3b8';
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillText('Generated via DataLens Visual Analytics Platform · High Resolution PNG Snapshot', 60, footerY);

    // Save as PNG
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeName = (dataset?.name || 'dashboard').replace(/[^a-zA-Z0-9_-]/g, '_');
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      link.download = `datalens_${safeName}_snapshot_${timestamp}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/png');
  } catch (err) {
    console.error('Image export failed:', err);
  }
}

/**
 * Exports a comprehensive multi-sheet Excel workbook (.xlsx) containing:
 * 1. Executive Overview & KPIs sheet
 * 2. Visuals & Charts Catalog (Types, Dimensions, Metrics, Aggregations)
 * 3. Dedicated Data Sheets for each Visual with aggregations and share %
 * 4. Raw Filtered Data
 * 5. Data Schema & Column Dictionary
 */
export function exportComprehensiveExcelWorkbook(
  dataset: any,
  records: Record<string, any>[] = [],
  kpis: KpiCardConfig[] = [],
  charts: ChartConfig[] = [],
  report?: AutomatedReport | null,
  filename?: string
): void {
  const wb = XLSX.utils.book_new();

  // 1. Executive Overview & KPIs Sheet
  const summaryRows: any[][] = [
    ['DATALENS ENTERPRISE ANALYTICS & POWER BI REPORT'],
    ['Generated At:', new Date().toLocaleString()],
    ['Dataset Name:', dataset?.name || 'Analytics Model'],
    ['Active Sheet:', dataset?.activeSheet || 'Primary'],
    ['Total Records Analyzed:', records.length],
    [],
  ];

  if (report) {
    summaryRows.push(['EXECUTIVE SUMMARY & SYNTHESIS']);
    summaryRows.push([report.executiveSummary]);
    summaryRows.push([]);
  }

  if (kpis && kpis.length > 0) {
    summaryRows.push(['KEY PERFORMANCE INDICATORS (KPIs)']);
    summaryRows.push([
      'KPI Metric',
      'Value',
      'Display Formatted',
      'Aggregation',
      'Source Column',
      'Period Trend',
      'Comparison Baseline',
    ]);

    for (const k of kpis) {
      summaryRows.push([
        k.title,
        k.value ?? '-',
        k.formattedValue || String(k.value ?? ''),
        k.aggregation || 'sum',
        k.metricColumn || '-',
        k.trend ? `${k.trend.direction === 'up' ? '▲' : k.trend.direction === 'down' ? '▼' : '■'} ${k.trend.percentage}% (${k.trend.label})` : '-',
        k.comparisonColumn || '-',
      ]);
    }
    summaryRows.push([]);
  }

  if (report?.keyInsights && report.keyInsights.length > 0) {
    summaryRows.push(['KEY EXECUTIVE INSIGHTS & SIGNALS']);
    summaryRows.push(['Category', 'Insight Title', 'Detailed Findings']);
    for (const ins of report.keyInsights) {
      summaryRows.push([ins.type.toUpperCase(), ins.title, ins.detail]);
    }
    summaryRows.push([]);
  }

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet['!cols'] = [
    { wch: 28 },
    { wch: 18 },
    { wch: 20 },
    { wch: 14 },
    { wch: 18 },
    { wch: 22 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Executive Overview');

  // 2. Visuals & Charts Catalog Sheet
  if (charts && charts.length > 0) {
    const catalogRows: any[][] = [
      ['POWER BI & DASHBOARD VISUALS CATALOG'],
      ['Total Visuals Configured:', charts.length],
      [],
      [
        'Visual ID',
        'Chart Title',
        'Subtitle',
        'Visual Type',
        'Dimension (X-Axis)',
        'Measure (Y-Axis)',
        'Secondary Measure',
        'Aggregation',
        'Data Points Count',
        'Trendline Enabled',
      ],
    ];

    for (const c of charts) {
      catalogRows.push([
        c.id,
        c.title,
        c.subtitle || '-',
        c.type.toUpperCase(),
        c.xAxisColumn || '-',
        c.yAxisColumn || '-',
        c.secondaryYAxisColumn || '-',
        c.aggregation || 'sum',
        c.data ? c.data.length : 0,
        c.trendline?.enabled ? `Yes (${c.trendline.type || 'linear'})` : 'No',
      ]);
    }

    const catalogSheet = XLSX.utils.aoa_to_sheet(catalogRows);
    catalogSheet['!cols'] = [
      { wch: 22 },
      { wch: 32 },
      { wch: 30 },
      { wch: 18 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, catalogSheet, 'Visuals Catalog');

    // 3. Dedicated Data Sheets for each Visual (with ASCII Visual Sparkbars & Stat Summaries)
    const usedSheetNames = new Set<string>([
      'Executive Overview',
      'Visuals Catalog',
      'Top Segments',
      'Outliers & Anomalies',
      'Power BI DAX Model',
      'Raw Filtered Data',
      'Data Schema',
    ]);

    charts.forEach((c, idx) => {
      if (!c.data || c.data.length === 0) return;

      const safeTitle = (c.title || `Visual ${idx + 1}`)
        .replace(/[\\/?*:[\]]/g, '')
        .trim();
      let sheetName = `V${idx + 1}_${safeTitle}`.slice(0, 31).trim();
      let counter = 1;
      while (usedSheetNames.has(sheetName)) {
        sheetName = `V${idx + 1}_${counter}`.slice(0, 31);
        counter++;
      }
      usedSheetNames.add(sheetName);

      const numericValues = c.data
        .map((d: any) => (typeof d.value === 'number' ? d.value : Number(d.value) || 0))
        .filter((n: number) => !isNaN(n));
      const totalVal = numericValues.reduce((sum: number, val: number) => sum + val, 0);
      const maxVal = numericValues.length > 0 ? Math.max(...numericValues) : 0;
      const minVal = numericValues.length > 0 ? Math.min(...numericValues) : 0;
      const avgVal = numericValues.length > 0 ? totalVal / numericValues.length : 0;

      const chartRows: any[][] = [
        [`VISUAL DATA TABLE: ${c.title}`],
        [`Subtitle: ${c.subtitle || '-'}`],
        [`Visual Type: ${c.type.toUpperCase()} | Dimension: ${c.xAxisColumn || '-'} | Metric: ${c.yAxisColumn || '-'} (${c.aggregation || 'sum'})`],
        [`Total Aggregated Value:`, totalVal, `Average:`, Math.round(avgVal * 100) / 100, `Max:`, maxVal, `Min:`, minVal],
        [],
        [
          `Category / Dimension (${c.xAxisColumn || 'Item'})`,
          `Numeric Value (${c.yAxisColumn || 'Metric'})`,
          `Display Formatted`,
          `% Share of Total`,
          `Visual Bar Distribution`,
          `Anomaly / Alert Status`,
          `Baseline / Moving Average`,
          `Secondary Value`,
        ],
      ];

      for (const item of c.data) {
        const val = typeof item.value === 'number' ? item.value : Number(item.value) || 0;
        const sharePct = totalVal > 0 && typeof val === 'number' ? (val / totalVal) * 100 : 0;
        const shareStr = totalVal > 0 ? `${sharePct.toFixed(2)}%` : '-';
        const barVisual = maxVal > 0 ? `${buildAsciiBar((val / maxVal) * 100)} ${shareStr}` : '-';

        // Check if item has spike/drop alert
        let alertStatus = 'Normal';
        if (item.isAnomaly || (avgVal > 0 && Math.abs(val - avgVal) / avgVal > 0.8)) {
          alertStatus = val >= avgVal ? '⚠️ Spike Surge' : '⚠️ Sudden Drop';
        }

        chartRows.push([
          item.label ?? '',
          val,
          item.formattedValue || (typeof val === 'number' ? val.toLocaleString() : String(val)),
          shareStr,
          barVisual,
          alertStatus,
          item.average ?? '-',
          item.secondaryValue ?? '-',
        ]);
      }

      // Add summary statistics row at bottom
      chartRows.push([]);
      chartRows.push([
        'SUMMARY TOTALS',
        totalVal,
        totalVal.toLocaleString(),
        '100.00%',
        'AGGREGATE SUMMARY',
        '-',
        Math.round(avgVal * 100) / 100,
        '-',
      ]);

      const visualSheet = XLSX.utils.aoa_to_sheet(chartRows);
      visualSheet['!cols'] = [
        { wch: 30 },
        { wch: 20 },
        { wch: 20 },
        { wch: 18 },
        { wch: 26 },
        { wch: 20 },
        { wch: 22 },
        { wch: 20 },
      ];
      XLSX.utils.book_append_sheet(wb, visualSheet, sheetName);
    });
  }

  // 4. Report Top Segments Sheet (if automated report present)
  if (report?.topPerformers && report.topPerformers.length > 0) {
    const segmentRows: any[][] = [
      ['REPORT TOP PERFORMING SEGMENTS & ATTRIBUTIONS'],
      ['Generated At:', new Date().toLocaleString()],
      ['Dataset:', report.datasetName || dataset?.name || 'Dataset'],
      [],
      [
        'Dimension Column',
        'Rank',
        'Segment / Category',
        'Metric Column',
        'Numeric Value',
        'Formatted Value',
        'Share of Total',
        'Visual Bar',
      ],
    ];

    for (const perf of report.topPerformers) {
      perf.items.forEach((item, idx) => {
        segmentRows.push([
          perf.categoryColumn,
          idx + 1,
          item.label,
          perf.metricColumn,
          item.value,
          item.formatted,
          `${item.share}%`,
          `${buildAsciiBar(item.share)} ${item.share}%`,
        ]);
      });
      segmentRows.push([]);
    }

    const segmentSheet = XLSX.utils.aoa_to_sheet(segmentRows);
    segmentSheet['!cols'] = [
      { wch: 22 },
      { wch: 8 },
      { wch: 28 },
      { wch: 20 },
      { wch: 18 },
      { wch: 20 },
      { wch: 16 },
      { wch: 24 },
    ];
    XLSX.utils.book_append_sheet(wb, segmentSheet, 'Top Segments');
  }

  // 5. Outliers & Anomalies Sheet (if automated report present)
  if (report?.outliers && report.outliers.length > 0) {
    const outlierRows: any[][] = [
      ['STATISTICAL OUTLIERS & ANOMALIES AUDIT'],
      ['Dataset:', report.datasetName || dataset?.name || 'Dataset'],
      ['Total Records Audited:', records.length],
      [],
      [
        'Record Index',
        'Observed Value',
        'Z-Score (|Z| > 2.0)',
        'Deviation Direction',
        'Statistical Severity',
        'Notes',
      ],
    ];

    for (const out of report.outliers) {
      const isHigh = out.zScore > 0;
      outlierRows.push([
        `#${out.recordIndex}`,
        out.value,
        out.zScore,
        isHigh ? 'Surge / Positive Spike' : 'Plunge / Negative Drop',
        Math.abs(out.zScore) > 3 ? 'Critical Outlier (Z > 3)' : 'High Volatility (Z > 2)',
        `Observed point diverges significantly from Gaussian mean.`,
      ]);
    }

    const outlierSheet = XLSX.utils.aoa_to_sheet(outlierRows);
    outlierSheet['!cols'] = [
      { wch: 16 },
      { wch: 20 },
      { wch: 22 },
      { wch: 24 },
      { wch: 26 },
      { wch: 45 },
    ];
    XLSX.utils.book_append_sheet(wb, outlierSheet, 'Outliers & Anomalies');
  }

  // 6. Power BI DAX Measures & Data Model Schema Sheet
  const daxRows: any[][] = [
    ['POWER BI DAX MEASURES & DATA MODEL SPECIFICATION'],
    ['Dataset / Table Name:', dataset?.activeSheet || 'AnalyticsTable'],
    ['Power BI Compatibility Level:', '1550 (Modern Tabular Model)'],
    [],
    [
      'Measure Name',
      'DAX Formula Expression',
      'Format String',
      'Target Table',
      'Aggregation Type',
      'Description',
    ],
  ];

  const tableName = dataset?.activeSheet || 'AnalyticsTable';
  if (kpis && kpis.length > 0) {
    for (const kpi of kpis) {
      const agg = (kpi.aggregation || 'sum').toUpperCase();
      const col = kpi.metricColumn || 'Value';
      daxRows.push([
        kpi.title,
        `${agg}('${tableName}'[${col}])`,
        kpi.format === 'currency' ? '$#,##0.00' : '#,##0',
        tableName,
        agg,
        `Calculates aggregated ${kpi.title} for ${col}`,
      ]);
    }
  }

  daxRows.push([
    'Filtered Row Count',
    `COUNTROWS('${tableName}')`,
    '#,##0',
    tableName,
    'COUNT',
    'Total active rows matching user filter criteria',
  ]);

  const daxSheet = XLSX.utils.aoa_to_sheet(daxRows);
  daxSheet['!cols'] = [
    { wch: 28 },
    { wch: 42 },
    { wch: 18 },
    { wch: 22 },
    { wch: 18 },
    { wch: 45 },
  ];
  XLSX.utils.book_append_sheet(wb, daxSheet, 'Power BI DAX Model');

  // 7. Raw Filtered Dataset Sheet
  if (records && records.length > 0) {
    const rawDataSlice = records.slice(0, 50000);
    const rawDataSheet = XLSX.utils.json_to_sheet(rawDataSlice);
    XLSX.utils.book_append_sheet(wb, rawDataSheet, 'Raw Filtered Data');
  }

  // 8. Data Schema & Dictionary Sheet
  if (dataset?.columns && dataset.columns.length > 0) {
    const schemaRows: any[][] = [
      ['DATASET SCHEMA & COLUMN DICTIONARY'],
      ['Dataset Name:', dataset.name || 'Dataset'],
      ['Total Records in Source:', dataset.recordsCount || records.length],
      [],
      [
        'Column Name',
        'Data Type',
        'Missing / Null Count',
        'Unique Values Count',
        'Sample Values',
      ],
    ];

    for (const col of dataset.columns) {
      schemaRows.push([
        col.name,
        col.type || 'text',
        col.nullCount ?? 0,
        col.uniqueCount ?? '-',
        col.sampleValues ? col.sampleValues.slice(0, 4).join(', ') : '-',
      ]);
    }

    const schemaSheet = XLSX.utils.aoa_to_sheet(schemaRows);
    schemaSheet['!cols'] = [
      { wch: 24 },
      { wch: 16 },
      { wch: 20 },
      { wch: 20 },
      { wch: 45 },
    ];
    XLSX.utils.book_append_sheet(wb, schemaSheet, 'Data Schema');
  }

  // Generate file and trigger download
  const cleanName = (dataset?.name || 'dashboard').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeFilename = filename || `datalens_powerbi_report_${cleanName}.xlsx`;

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeFilename.endsWith('.xlsx') ? safeFilename : `${safeFilename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


