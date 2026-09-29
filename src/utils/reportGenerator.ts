import { AutomatedReport, Dataset, KpiCardConfig } from '../types/analytics';
import { formatMetric } from './visualizationEngine';

/**
 * Automatically synthesizes an analytical report directly from dataset math and distributions.
 */
export function generateAutomatedReport(
  dataset: Dataset,
  activeRecords: Record<string, any>[],
  kpis: KpiCardConfig[]
): AutomatedReport {
  const { columns, activeSheet, name } = dataset;
  const totalRecords = activeRecords.length;

  const numericCols = columns.filter((c) => c.type === 'numeric' && !c.isUnique);
  const categoryCols = columns.filter((c) => c.type === 'category');
  const dateCol = columns.find((c) => c.type === 'date');

  const primaryNumeric = numericCols[0];
  const primaryCategory = categoryCols[0];

  const keyInsights: AutomatedReport['keyInsights'] = [];
  const topPerformers: AutomatedReport['topPerformers'] = [];
  const outliers: AutomatedReport['outliers'] = [];

  // 1. Primary volume & aggregate evaluation
  let executiveSummary = '';
  if (primaryNumeric && totalRecords > 0) {
    const vals = activeRecords.map((r) => r[primaryNumeric.name]).filter((v): v is number => typeof v === 'number');
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = vals.length > 0 ? sum / vals.length : 0;
    const min = vals.length > 0 ? Math.min(...vals) : 0;
    const max = vals.length > 0 ? Math.max(...vals) : 0;

    const isCurrency = /(revenue|sales|amount|price|cost|spend|mrr|arr|profit|value)/i.test(primaryNumeric.name);
    const formatType = isCurrency ? 'currency' : 'number';

    executiveSummary = `Analysis of sheet "${activeSheet}" encompasses ${totalRecords.toLocaleString()} records. Total ${primaryNumeric.name} stands at ${formatMetric(sum, formatType)}, with an average of ${formatMetric(avg, formatType)} per record (range: ${formatMetric(min, formatType)} to ${formatMetric(max, formatType)}).`;

    // 2. Anomaly / Outlier Detection via Z-score
    if (primaryNumeric.stdDev && primaryNumeric.stdDev > 0 && primaryNumeric.mean !== undefined) {
      const mean = primaryNumeric.mean;
      const stdDev = primaryNumeric.stdDev;

      activeRecords.forEach((row, idx) => {
        const val = row[primaryNumeric.name];
        if (typeof val === 'number') {
          const zScore = Math.abs(val - mean) / stdDev;
          if (zScore >= 2.2 && outliers.length < 5) {
            outliers.push({
              column: primaryNumeric.name,
              recordIndex: idx + 1,
              value: val,
              zScore: Math.round(zScore * 100) / 100,
              context: { ...row },
            });
          }
        }
      });

      if (outliers.length > 0) {
        keyInsights.push({
          title: 'Statistical Variance & Outliers Detected',
          detail: `Identified ${outliers.length} records exceeding 2.2 standard deviations in "${primaryNumeric.name}". Peak deviation: ${formatMetric(outliers[0].value, formatType)} (Z-score: ${outliers[0].zScore}).`,
          type: 'outlier',
        });
      }
    }

    // 3. Category Concentration Analysis
    if (primaryCategory) {
      const catSums = new Map<string, number>();
      for (const row of activeRecords) {
        const cat = row[primaryCategory.name] ? String(row[primaryCategory.name]) : '(Unassigned)';
        const num = typeof row[primaryNumeric.name] === 'number' ? row[primaryNumeric.name] : 0;
        catSums.set(cat, (catSums.get(cat) || 0) + num);
      }

      const sorted = Array.from(catSums.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([label, value]) => ({
          label,
          value,
          formatted: formatMetric(value, formatType),
          share: sum > 0 ? Math.round((value / sum) * 1000) / 10 : 0,
        }));

      topPerformers.push({
        categoryColumn: primaryCategory.name,
        metricColumn: primaryNumeric.name,
        items: sorted.slice(0, 5),
      });

      if (sorted.length > 0) {
        const top = sorted[0];
        keyInsights.push({
          title: `Leading Segment: ${top.label}`,
          detail: `"${top.label}" generates ${top.formatted}, representing ${top.share}% of aggregate ${primaryNumeric.name}.`,
          type: 'positive',
        });

        if (sorted.length > 1 && top.share >= 40) {
          keyInsights.push({
            title: 'High Concentration Risk',
            detail: `Top segment accounts for ${top.share}% of total volume; portfolio diversification is low.`,
            type: 'warning',
          });
        }
      }
    }

    // 4. Date Period Trends
    if (dateCol && totalRecords >= 4) {
      const sortedByDate = [...activeRecords]
        .filter((r) => r[dateCol.name])
        .sort((a, b) => new Date(a[dateCol.name]).getTime() - new Date(b[dateCol.name]).getTime());

      if (sortedByDate.length >= 2) {
        const startDate = String(sortedByDate[0][dateCol.name]).split('T')[0];
        const endDate = String(sortedByDate[sortedByDate.length - 1][dateCol.name]).split('T')[0];

        executiveSummary += ` Time horizon spans from ${startDate} through ${endDate}.`;

        const midpoint = Math.floor(sortedByDate.length / 2);
        const p1 = sortedByDate.slice(0, midpoint);
        const p2 = sortedByDate.slice(midpoint);

        const sum1 = p1.reduce((acc, r) => acc + (typeof r[primaryNumeric.name] === 'number' ? r[primaryNumeric.name] : 0), 0);
        const sum2 = p2.reduce((acc, r) => acc + (typeof r[primaryNumeric.name] === 'number' ? r[primaryNumeric.name] : 0), 0);

        if (sum1 > 0) {
          const deltaPct = Math.round(((sum2 - sum1) / sum1) * 1000) / 10;
          keyInsights.push({
            title: deltaPct >= 0 ? 'Period Growth Trend' : 'Period Contraction Detected',
            detail: `${primaryNumeric.name} moved by ${deltaPct >= 0 ? '+' : ''}${deltaPct}% between initial and subsequent observation halves.`,
            type: deltaPct >= 0 ? 'positive' : 'warning',
          });
        }
      }
    }
  } else {
    executiveSummary = `Dataset "${name}" (Sheet: "${activeSheet}") contains ${totalRecords.toLocaleString()} rows and ${columns.length} columns.`;
  }

  // 5. Data Quality findings
  if (dataset.qualityReport.duplicateRowsCount > 0) {
    keyInsights.push({
      title: 'Duplicate Rows Detected',
      detail: `${dataset.qualityReport.duplicateRowsCount} duplicate records identified in dataset sample. Inspection recommended.`,
      type: 'warning',
    });
  }

  const kpiSnapshots = kpis.map((k) => ({
    title: k.title,
    value: k.formattedValue,
    change: k.trend?.label,
  }));

  return {
    id: `rep_${Date.now()}`,
    title: `Automated Executive Digest — ${activeSheet}`,
    generatedAt: new Date().toISOString(),
    datasetName: name,
    sheetName: activeSheet,
    totalRecordsAnalyzed: totalRecords,
    executiveSummary,
    keyInsights,
    topPerformers,
    outliers,
    kpiSnapshots,
  };
}
