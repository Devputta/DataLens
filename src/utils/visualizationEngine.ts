import { ChartConfig, ColumnProfile, Dataset, FilterState, KpiCardConfig } from '../types/analytics';

/**
 * Formats a numeric value with readable abbreviations or decimals
 */
export function formatMetric(
  val: number,
  format: 'currency' | 'number' | 'percentage' | 'integer' = 'number',
  currencySymbol: string = '$'
): string {
  if (isNaN(val) || val === null || val === undefined) return '—';

  const absVal = Math.abs(val);

  if (format === 'percentage') {
    return `${val >= 0 ? '' : '-'}${absVal.toFixed(1)}%`;
  }

  let prefix = '';
  if (format === 'currency') prefix = currencySymbol;

  let formatted = '';
  if (absVal >= 1_000_000_000) {
    formatted = `${(val / 1_000_000_000).toFixed(2)}B`;
  } else if (absVal >= 1_000_000) {
    formatted = `${(val / 1_000_000).toFixed(2)}M`;
  } else if (absVal >= 1_000) {
    formatted = `${(val / 1_000).toFixed(1)}k`;
  } else if (format === 'integer' || Number.isInteger(val)) {
    formatted = Math.round(val).toLocaleString();
  } else {
    formatted = val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  }

  return `${prefix}${formatted}`;
}

/**
 * Filter records based on active FilterState
 */
export function filterRecords(records: Record<string, any>[], filters: FilterState, columns: ColumnProfile[]): Record<string, any>[] {
  if (!records || records.length === 0) return [];

  return records.filter((row) => {
    // 1. Text Search Query
    if (filters.searchQuery && filters.searchQuery.trim() !== '') {
      const q = filters.searchQuery.toLowerCase().trim();
      const matches = Object.values(row).some((val) => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(q);
      });
      if (!matches) return false;
    }

    // 2. Date Range
    if (filters.dateRange.column && (filters.dateRange.start || filters.dateRange.end)) {
      const val = row[filters.dateRange.column];
      if (!val) return false;
      const rowDate = new Date(val).getTime();
      if (isNaN(rowDate)) return false;

      if (filters.dateRange.start) {
        const start = new Date(filters.dateRange.start).getTime();
        if (rowDate < start) return false;
      }
      if (filters.dateRange.end) {
        // Include full end day
        const end = new Date(filters.dateRange.end).getTime() + 86400000;
        if (rowDate > end) return false;
      }
    }

    // 3. Categorical Filters
    for (const [colName, selectedValues] of Object.entries(filters.categories)) {
      if (selectedValues && selectedValues.length > 0) {
        const val = row[colName];
        const strVal = val === null || val === undefined ? '(Empty)' : String(val);
        if (!selectedValues.includes(strVal)) return false;
      }
    }

    // 4. Numeric Range Filters
    for (const [colName, range] of Object.entries(filters.numericRanges)) {
      const val = row[colName];
      if (val !== null && typeof val === 'number') {
        if (val < range.currentMin || val > range.currentMax) return false;
      }
    }

    return true;
  });
}

/**
 * Computes a mini trajectory array (sparkline) across 8-10 chronological or sequential intervals
 */
function computeSparkline(
  records: Record<string, any>[],
  dateColName: string | undefined,
  metricColName: string,
  aggregation: 'sum' | 'avg' | 'count' = 'sum'
): number[] {
  if (!records || records.length === 0) return [];
  let sorted = [...records];
  if (dateColName) {
    sorted = sorted
      .filter((r) => r[dateColName])
      .sort((a, b) => new Date(a[dateColName]).getTime() - new Date(b[dateColName]).getTime());
  }

  const bucketsCount = 8;
  if (sorted.length < bucketsCount) {
    return sorted.map((r) => (typeof r[metricColName] === 'number' ? r[metricColName] : 1));
  }

  const bucketSize = Math.floor(sorted.length / bucketsCount);
  const spark: number[] = [];

  for (let i = 0; i < bucketsCount; i++) {
    const chunk = sorted.slice(i * bucketSize, (i + 1) * bucketSize);
    if (aggregation === 'count') {
      spark.push(chunk.length);
    } else {
      const nums = chunk.map((r) => r[metricColName]).filter((v): v is number => typeof v === 'number');
      if (nums.length === 0) {
        spark.push(0);
      } else if (aggregation === 'avg') {
        const sum = nums.reduce((a, b) => a + b, 0);
        spark.push(Math.round((sum / nums.length) * 10) / 10);
      } else {
        spark.push(Math.round(nums.reduce((a, b) => a + b, 0) * 10) / 10);
      }
    }
  }

  return spark;
}

/**
 * Computes period-over-period growth vs previous period
 */
function computeTrend(
  records: Record<string, any>[],
  dateColName: string | undefined,
  metricColName: string,
  aggregation: 'sum' | 'avg' | 'count' | 'distinct_count' = 'sum'
): KpiCardConfig['trend'] | undefined {
  if (!records || records.length < 4) return undefined;

  let sorted = [...records];
  if (dateColName) {
    sorted = sorted
      .filter((r) => r[dateColName])
      .sort((a, b) => new Date(a[dateColName]).getTime() - new Date(b[dateColName]).getTime());
  }

  if (sorted.length < 4) return undefined;

  const midpoint = Math.floor(sorted.length / 2);
  const prevHalf = sorted.slice(0, midpoint);
  const currHalf = sorted.slice(midpoint);

  let prevVal = 0;
  let currVal = 0;

  if (aggregation === 'distinct_count') {
    prevVal = new Set(prevHalf.map((r) => r[metricColName]).filter(Boolean)).size;
    currVal = new Set(currHalf.map((r) => r[metricColName]).filter(Boolean)).size;
  } else if (aggregation === 'count') {
    prevVal = prevHalf.length;
    currVal = currHalf.length;
  } else {
    const vals1 = prevHalf.map((r) => r[metricColName]).filter((v): v is number => typeof v === 'number');
    const vals2 = currHalf.map((r) => r[metricColName]).filter((v): v is number => typeof v === 'number');

    const sum1 = vals1.reduce((a, b) => a + b, 0);
    const sum2 = vals2.reduce((a, b) => a + b, 0);

    if (aggregation === 'avg') {
      prevVal = vals1.length > 0 ? sum1 / vals1.length : 0;
      currVal = vals2.length > 0 ? sum2 / vals2.length : 0;
    } else {
      prevVal = sum1;
      currVal = sum2;
    }
  }

  if (prevVal === 0 && currVal === 0) {
    return {
      percentage: 0,
      direction: 'neutral',
      label: '0.0% vs prior period',
    };
  }

  if (prevVal === 0) {
    return {
      percentage: 100,
      direction: 'up',
      label: '+100% vs prior period',
    };
  }

  const change = ((currVal - prevVal) / Math.abs(prevVal)) * 100;
  const rounded = Math.round(Math.abs(change) * 10) / 10;
  const direction: 'up' | 'down' | 'neutral' = change > 0.05 ? 'up' : change < -0.05 ? 'down' : 'neutral';

  return {
    percentage: rounded,
    direction,
    label: `${change >= 0 ? '+' : '-'}${rounded}% vs prior period`,
  };
}

/**
 * Automatically generates KPI cards from the active dataset records
 */
export function generateKpis(dataset: Dataset, activeRecords: Record<string, any>[]): KpiCardConfig[] {
  const { columns } = dataset;
  const kpis: KpiCardConfig[] = [];
  const totalCount = activeRecords.length;

  const numericCols = columns.filter((c) => c.type === 'numeric' && !c.isUnique);
  const categoryCols = columns.filter((c) => c.type === 'category');
  const dateCol = columns.find((c) => c.type === 'date');

  // Priority score for numeric columns: names like revenue, sales, amount, total, mrr get high priority
  const scoreCol = (name: string): number => {
    const n = name.toLowerCase();
    if (n.includes('revenue') || n.includes('mrr') || n.includes('sales')) return 100;
    if (n.includes('amount') || n.includes('total') || n.includes('price')) return 90;
    if (n.includes('margin') || n.includes('profit')) return 80;
    if (n.includes('cost') || n.includes('spend')) return 70;
    if (n.includes('quantity') || n.includes('units') || n.includes('count')) return 60;
    if (n.includes('rate') || n.includes('score') || n.includes('percentage')) return 50;
    return 10;
  };

  const sortedNumeric = [...numericCols].sort((a, b) => scoreCol(b.name) - scoreCol(a.name));

  // 1. Primary Volume / Revenue Metric
  if (sortedNumeric.length > 0) {
    const primaryCol = sortedNumeric[0];
    const vals = activeRecords.map((r) => r[primaryCol.name]).filter((v): v is number => typeof v === 'number');
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = vals.length > 0 ? sum / vals.length : 0;
    
    const isCurrency = /(revenue|sales|amount|price|cost|spend|mrr|arr|profit|value)/i.test(primaryCol.name);
    const isRatio = /(rate|margin|percent|ratio|pct)/i.test(primaryCol.name);

    kpis.push({
      id: `kpi_total_${primaryCol.name}`,
      title: isRatio ? `Average ${primaryCol.name}` : `Total ${primaryCol.name}`,
      metricColumn: primaryCol.name,
      aggregation: isRatio ? 'avg' : 'sum',
      format: isCurrency ? 'currency' : isRatio ? 'percentage' : 'number',
      value: isRatio ? avg : sum,
      formattedValue: formatMetric(isRatio ? avg : sum, isCurrency ? 'currency' : isRatio ? 'percentage' : 'number'),
      subtitle: `${vals.length.toLocaleString()} active entries`,
      trend: computeTrend(activeRecords, dateCol?.name, primaryCol.name, isRatio ? 'avg' : 'sum'),
      sparkline: computeSparkline(activeRecords, dateCol?.name, primaryCol.name, isRatio ? 'avg' : 'sum'),
    });

    // 2. Average of primary metric if sum was used
    if (!isRatio && vals.length > 0) {
      kpis.push({
        id: `kpi_avg_${primaryCol.name}`,
        title: `Average ${primaryCol.name}`,
        metricColumn: primaryCol.name,
        aggregation: 'avg',
        format: isCurrency ? 'currency' : 'number',
        value: avg,
        formattedValue: formatMetric(avg, isCurrency ? 'currency' : 'number'),
        subtitle: `Range: ${formatMetric(Math.min(...vals), isCurrency ? 'currency' : 'number')} – ${formatMetric(Math.max(...vals), isCurrency ? 'currency' : 'number')}`,
        trend: computeTrend(activeRecords, dateCol?.name, primaryCol.name, 'avg'),
        sparkline: computeSparkline(activeRecords, dateCol?.name, primaryCol.name, 'avg'),
      });
    }
  }

  // 3. Secondary numeric metric if available
  if (sortedNumeric.length > 1) {
    const secCol = sortedNumeric[1];
    const vals = activeRecords.map((r) => r[secCol.name]).filter((v): v is number => typeof v === 'number');
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = vals.length > 0 ? sum / vals.length : 0;
    const isCurrency = /(revenue|sales|amount|price|cost|spend|profit)/i.test(secCol.name);
    const isRatio = /(rate|margin|percent|ratio|pct)/i.test(secCol.name);

    kpis.push({
      id: `kpi_${secCol.name}`,
      title: isRatio ? `Average ${secCol.name}` : `Total ${secCol.name}`,
      metricColumn: secCol.name,
      aggregation: isRatio ? 'avg' : 'sum',
      format: isCurrency ? 'currency' : isRatio ? 'percentage' : 'number',
      value: isRatio ? avg : sum,
      formattedValue: formatMetric(isRatio ? avg : sum, isCurrency ? 'currency' : isRatio ? 'percentage' : 'number'),
      subtitle: `${secCol.name} cumulative aggregate`,
      trend: computeTrend(activeRecords, dateCol?.name, secCol.name, isRatio ? 'avg' : 'sum'),
      sparkline: computeSparkline(activeRecords, dateCol?.name, secCol.name, isRatio ? 'avg' : 'sum'),
    });
  }

  // 4. Distinct count of dominant category or Total Records
  if (categoryCols.length > 0) {
    const dominantCat = categoryCols[0];
    const uniqueValues = new Set(activeRecords.map((r) => r[dominantCat.name]).filter(Boolean));
    kpis.push({
      id: `kpi_unique_${dominantCat.name}`,
      title: `Unique ${dominantCat.name}s`,
      metricColumn: dominantCat.name,
      aggregation: 'distinct_count',
      format: 'integer',
      value: uniqueValues.size,
      formattedValue: uniqueValues.size.toLocaleString(),
      subtitle: `Across ${totalCount.toLocaleString()} total rows`,
      trend: computeTrend(activeRecords, dateCol?.name, dominantCat.name, 'distinct_count'),
      sparkline: computeSparkline(activeRecords, dateCol?.name, dominantCat.name, 'count'),
    });
  } else {
    kpis.push({
      id: 'kpi_total_records',
      title: 'Total Records',
      metricColumn: 'records',
      aggregation: 'count',
      format: 'integer',
      value: totalCount,
      formattedValue: totalCount.toLocaleString(),
      subtitle: 'Active dataset rows',
      trend: computeTrend(activeRecords, dateCol?.name, 'records', 'count'),
      sparkline: computeSparkline(activeRecords, dateCol?.name, 'records', 'count'),
    });
  }

  return kpis.slice(0, 4);
}

/**
 * Automatically builds intelligent chart configurations based on detected column semantics
 */
export function generateDashboardCharts(dataset: Dataset, activeRecords: Record<string, any>[]): ChartConfig[] {
  const { columns } = dataset;
  const charts: ChartConfig[] = [];

  const dateCols = columns.filter((c) => c.type === 'date');
  const numericCols = columns.filter((c) => c.type === 'numeric' && !c.isUnique);
  const categoryCols = columns.filter((c) => c.type === 'category' && c.uniqueCount >= 2);

  const primaryNumeric = numericCols[0];
  const secondaryNumeric = numericCols[1];

  // 1. Time Series Chart (Line / Area)
  if (dateCols.length > 0 && primaryNumeric && activeRecords.length > 0) {
    const dateCol = dateCols[0];
    
    // Group records by date
    const dateMap = new Map<string, { sum: number; count: number; secondarySum: number }>();
    
    for (const row of activeRecords) {
      const dVal = row[dateCol.name];
      if (!dVal) continue;
      
      const dateStr = String(dVal).split('T')[0];
      const numVal = typeof row[primaryNumeric.name] === 'number' ? row[primaryNumeric.name] : 0;
      const secVal = secondaryNumeric && typeof row[secondaryNumeric.name] === 'number' ? row[secondaryNumeric.name] : 0;

      const current = dateMap.get(dateStr) || { sum: 0, count: 0, secondarySum: 0 };
      current.sum += numVal;
      current.count += 1;
      current.secondarySum += secVal;
      dateMap.set(dateStr, current);
    }

    const sortedDates = Array.from(dateMap.keys()).sort();
    
    // If too many points (> 30), sample or group nicely
    const timeData = sortedDates.map((dateStr) => {
      const entry = dateMap.get(dateStr)!;
      return {
        label: dateStr,
        value: Math.round(entry.sum * 100) / 100,
        average: Math.round((entry.sum / Math.max(1, entry.count)) * 100) / 100,
        secondaryValue: secondaryNumeric ? Math.round(entry.secondarySum * 100) / 100 : undefined,
      };
    });

    if (timeData.length >= 2) {
      charts.push({
        id: `chart_timeline_${primaryNumeric.name}`,
        title: `${primaryNumeric.name} Trend Over Time`,
        subtitle: `Chronological aggregate by ${dateCol.name}`,
        type: 'area',
        xAxisColumn: dateCol.name,
        yAxisColumn: primaryNumeric.name,
        secondaryYAxisColumn: secondaryNumeric?.name,
        aggregation: 'sum',
        data: timeData,
        isTimeBased: true,
        description: `Visualizes trajectory of ${primaryNumeric.name} over observed dates.`,
      });
    }
  }

  // 2. Categorical Comparison Bar Chart
  if (categoryCols.length > 0 && primaryNumeric && activeRecords.length > 0) {
    const catCol = categoryCols[0];
    const catMap = new Map<string, { sum: number; count: number }>();

    for (const row of activeRecords) {
      const catVal = row[catCol.name] !== null && row[catCol.name] !== undefined ? String(row[catCol.name]) : '(Unassigned)';
      const numVal = typeof row[primaryNumeric.name] === 'number' ? row[primaryNumeric.name] : 0;

      const current = catMap.get(catVal) || { sum: 0, count: 0 };
      current.sum += numVal;
      current.count += 1;
      catMap.set(catVal, current);
    }

    const sortedCats = Array.from(catMap.entries())
      .sort((a, b) => b[1].sum - a[1].sum)
      .slice(0, 8);

    const barData = sortedCats.map(([label, val]) => ({
      label,
      value: Math.round(val.sum * 100) / 100,
      count: val.count,
    }));

    if (barData.length > 0) {
      charts.push({
        id: `chart_category_${catCol.name}`,
        title: `${primaryNumeric.name} by ${catCol.name}`,
        subtitle: `Top segments ranked by total ${primaryNumeric.name}`,
        type: barData.length > 5 ? 'horizontal_bar' : 'bar',
        xAxisColumn: catCol.name,
        yAxisColumn: primaryNumeric.name,
        aggregation: 'sum',
        data: barData,
        categoryCount: barData.length,
        description: `Compares performance and volume across ${catCol.name} dimensions.`,
      });
    }
  }

  // 2b. Geographic & Coordinate Map Visual
  const latCol = columns.find((c) => /^(lat|latitude|lat_deg|y_coord)$/i.test(c.name));
  const lngCol = columns.find((c) => /^(lon|lng|long|longitude|lon_deg|x_coord)$/i.test(c.name));
  const geoCandidate = categoryCols.find((c) => /(region|country|state|territory|location|city|market|geo|continent|hub|facility)/i.test(c.name)) ||
    categoryCols.find((c) => c.topCategories?.some((tc) => /(north america|europe|asia|america|latin|pacific|us|uk|germany|japan|china|india|brazil)/i.test(tc.value))) ||
    categoryCols[0];

  if (primaryNumeric && activeRecords.length > 0 && (latCol || geoCandidate)) {
    if (latCol && lngCol) {
      // Coordinate-based map points
      const coordPoints = activeRecords.slice(0, 100).map((r, idx) => ({
        id: `coord_pt_${idx}`,
        label: geoCandidate ? String(r[geoCandidate.name] || `Point #${idx + 1}`) : `Point #${idx + 1}`,
        lat: typeof r[latCol.name] === 'number' ? r[latCol.name] : parseFloat(String(r[latCol.name])),
        lng: typeof r[lngCol.name] === 'number' ? r[lngCol.name] : parseFloat(String(r[lngCol.name])),
        value: typeof r[primaryNumeric.name] === 'number' ? r[primaryNumeric.name] : 1,
        count: 1,
      })).filter((p) => !isNaN(p.lat) && !isNaN(p.lng));

      const totalVal = coordPoints.reduce((acc, p) => acc + p.value, 0);
      const mapData = coordPoints.map((p) => ({
        ...p,
        percentage: totalVal > 0 ? Math.round((p.value / totalVal) * 1000) / 10 : 0,
      }));

      charts.push({
        id: `chart_coord_map_${latCol.name}_${lngCol.name}`,
        title: `Coordinate Distribution: ${primaryNumeric.name} by Coordinates`,
        subtitle: `Geographic coordinate point density map`,
        type: 'map',
        xAxisColumn: geoCandidate ? geoCandidate.name : latCol.name,
        yAxisColumn: primaryNumeric.name,
        aggregation: 'sum',
        data: mapData,
        description: `Visualizes geographic coordinates with precise latitude and longitude mappings.`,
      });
    } else if (geoCandidate) {
      // Geographic region-based map
      const geoMap = new Map<string, { sum: number; count: number; lat?: number; lng?: number }>();
      let geoTotal = 0;

      for (const row of activeRecords) {
        const geoVal = row[geoCandidate.name] !== null && row[geoCandidate.name] !== undefined ? String(row[geoCandidate.name]) : '(Unassigned)';
        const num = typeof row[primaryNumeric.name] === 'number' ? row[primaryNumeric.name] : 1;
        const cur = geoMap.get(geoVal) || { sum: 0, count: 0 };
        cur.sum += num;
        cur.count += 1;
        if (latCol && typeof row[latCol.name] === 'number') cur.lat = row[latCol.name];
        if (lngCol && typeof row[lngCol.name] === 'number') cur.lng = row[lngCol.name];
        geoMap.set(geoVal, cur);
        geoTotal += num;
      }

      const mapData = Array.from(geoMap.entries())
        .sort((a, b) => b[1].sum - a[1].sum)
        .map(([label, val]) => ({
          label,
          value: Math.round(val.sum * 100) / 100,
          count: val.count,
          percentage: geoTotal > 0 ? Math.round((val.sum / geoTotal) * 1000) / 10 : 0,
          lat: val.lat,
          lng: val.lng,
        }));

      if (mapData.length >= 1) {
        charts.push({
          id: `chart_geo_map_${geoCandidate.name}`,
          title: `Geographic Distribution: ${primaryNumeric.name} by ${geoCandidate.name}`,
          subtitle: `Regional territory & geographic metrics`,
          type: 'map',
          xAxisColumn: geoCandidate.name,
          yAxisColumn: primaryNumeric.name,
          aggregation: 'sum',
          data: mapData,
          description: `Interactive geographic map displaying regional performance, territory density, and global coverage.`,
        });
      }
    }
  }

  // 3. Donut Chart for Part-to-Whole (only for 3 to 7 categories)
  const donutCandidate = categoryCols.find((c) => c.uniqueCount >= 2 && c.uniqueCount <= 6) ||
    categoryCols[1] || (categoryCols[0] && categoryCols[0].uniqueCount <= 7 ? categoryCols[0] : null);

  if (donutCandidate && activeRecords.length > 0) {
    const catMap = new Map<string, number>();
    let totalSum = 0;

    for (const row of activeRecords) {
      const catVal = row[donutCandidate.name] !== null && row[donutCandidate.name] !== undefined ? String(row[donutCandidate.name]) : '(Other)';
      const weight = primaryNumeric && typeof row[primaryNumeric.name] === 'number' ? row[primaryNumeric.name] : 1;
      catMap.set(catVal, (catMap.get(catVal) || 0) + weight);
      totalSum += weight;
    }

    const donutData = Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({
        label,
        value: Math.round(value * 100) / 100,
        percentage: totalSum > 0 ? Math.round((value / totalSum) * 1000) / 10 : 0,
      }));

    if (donutData.length >= 2) {
      charts.push({
        id: `chart_share_${donutCandidate.name}`,
        title: `Distribution by ${donutCandidate.name}`,
        subtitle: primaryNumeric ? `Share of total ${primaryNumeric.name}` : 'Record proportion',
        type: 'donut',
        xAxisColumn: donutCandidate.name,
        yAxisColumn: primaryNumeric ? primaryNumeric.name : 'count',
        aggregation: 'sum',
        data: donutData,
        description: `Proportional breakdown across ${donutCandidate.name} tiers.`,
      });
    }
  }

  // 4. Scatter Plot or Secondary Categorical Comparison
  if (primaryNumeric && secondaryNumeric && activeRecords.length >= 10) {
    // Correlation scatter
    const scatterData = activeRecords
      .slice(0, 150)
      .filter((r) => typeof r[primaryNumeric.name] === 'number' && typeof r[secondaryNumeric.name] === 'number')
      .map((r, idx) => ({
        id: idx,
        x: r[primaryNumeric.name],
        y: r[secondaryNumeric.name],
        label: categoryCols[0] ? String(r[categoryCols[0].name] || '') : `Item #${idx + 1}`,
      }));

    if (scatterData.length >= 5) {
      charts.push({
        id: `chart_scatter_${primaryNumeric.name}_${secondaryNumeric.name}`,
        title: `${primaryNumeric.name} vs. ${secondaryNumeric.name}`,
        subtitle: `Scatter relationship across records`,
        type: 'scatter',
        xAxisColumn: primaryNumeric.name,
        yAxisColumn: secondaryNumeric.name,
        aggregation: 'sum',
        data: scatterData,
        description: `Cross-analyzes correlation between ${primaryNumeric.name} and ${secondaryNumeric.name}.`,
      });
    }
  } else if (categoryCols.length > 1 && primaryNumeric && activeRecords.length > 0) {
    // Secondary Category Comparison
    const secCat = categoryCols[1];
    const catMap = new Map<string, number>();

    for (const row of activeRecords) {
      const val = row[secCat.name] ? String(row[secCat.name]) : '(Unassigned)';
      const num = typeof row[primaryNumeric.name] === 'number' ? row[primaryNumeric.name] : 0;
      catMap.set(val, (catMap.get(val) || 0) + num);
    }

    const secondaryData = Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value]) => ({
        label,
        value: Math.round(value * 100) / 100,
      }));

    if (secondaryData.length > 0) {
      charts.push({
        id: `chart_secondary_${secCat.name}`,
        title: `${primaryNumeric.name} by ${secCat.name}`,
        subtitle: `Breakdown across ${secCat.name}`,
        type: 'bar',
        xAxisColumn: secCat.name,
        yAxisColumn: primaryNumeric.name,
        aggregation: 'sum',
        data: secondaryData,
        description: `Comparison of ${primaryNumeric.name} across ${secCat.name}.`,
      });
    }
  }

  // 5. Value Distribution Histogram (if no scatter or to provide comprehensive breakdown)
  if (primaryNumeric && charts.length < 4 && activeRecords.length >= 10) {
    const rawVals = activeRecords
      .map((r) => r[primaryNumeric.name])
      .filter((v): v is number => typeof v === 'number');

    if (rawVals.length >= 5) {
      const min = Math.min(...rawVals);
      const max = Math.max(...rawVals);
      const bucketCount = 5;
      const step = (max - min) / bucketCount;

      if (step > 0) {
        const buckets: { label: string; count: number; value: number }[] = [];
        for (let i = 0; i < bucketCount; i++) {
          const bStart = min + i * step;
          const bEnd = bStart + step;
          const label = `${formatMetric(bStart, 'number')}–${formatMetric(bEnd, 'number')}`;
          const count = rawVals.filter((v) => (i === bucketCount - 1 ? v >= bStart && v <= bEnd : v >= bStart && v < bEnd)).length;
          buckets.push({ label, count, value: count });
        }

        charts.push({
          id: `chart_dist_${primaryNumeric.name}`,
          title: `${primaryNumeric.name} Frequency Distribution`,
          subtitle: `Count distribution across value bins`,
          type: 'bar',
          xAxisColumn: 'Range',
          yAxisColumn: 'Count',
          aggregation: 'count',
          data: buckets,
          description: `Distribution density of ${primaryNumeric.name} values.`,
        });
      }
    }
  }

  // 6. Pareto 80/20 Cumulative Distribution Analysis
  if (categoryCols.length > 0 && primaryNumeric && activeRecords.length >= 6) {
    const catCol = categoryCols[0];
    const catTotals = new Map<string, number>();
    for (const row of activeRecords) {
      const cat = row[catCol.name] ? String(row[catCol.name]) : '(Other)';
      const num = typeof row[primaryNumeric.name] === 'number' ? row[primaryNumeric.name] : 0;
      catTotals.set(cat, (catTotals.get(cat) || 0) + num);
    }
    const sorted = Array.from(catTotals.entries()).sort((a, b) => b[1] - a[1]);
    const totalSum = sorted.reduce((acc, curr) => acc + curr[1], 0);

    if (totalSum > 0 && sorted.length >= 3) {
      let cumulative = 0;
      const paretoData = sorted.slice(0, 8).map(([label, value]) => {
        cumulative += value;
        return {
          label,
          value: Math.round(value * 100) / 100,
          cumulativePct: Math.round((cumulative / totalSum) * 1000) / 10,
        };
      });

      charts.push({
        id: `chart_pareto_${catCol.name}`,
        title: `Pareto 80/20 Analysis: ${primaryNumeric.name} by ${catCol.name}`,
        subtitle: `Cumulative volume share curve with 80% threshold line`,
        type: 'pareto',
        xAxisColumn: catCol.name,
        yAxisColumn: primaryNumeric.name,
        aggregation: 'sum',
        data: paretoData,
        description: `Ranks vital contributors to highlight which segments account for the bulk of volume.`,
      });
    }
  }

  // 7. 2D Density Cross-Tabulation Matrix / Heatmap
  if (categoryCols.length >= 2 && activeRecords.length >= 10) {
    const rowCat = categoryCols[0];
    const colCat = categoryCols[1];

    const topRows = Array.from(new Set(activeRecords.map((r) => r[rowCat.name]).filter(Boolean))).slice(0, 5);
    const topCols = Array.from(new Set(activeRecords.map((r) => r[colCat.name]).filter(Boolean))).slice(0, 5);

    if (topRows.length >= 2 && topCols.length >= 2) {
      const matrixCells: { row: string; col: string; value: number; count: number }[] = [];

      for (const rLabel of topRows) {
        for (const cLabel of topCols) {
          const matching = activeRecords.filter(
            (r) => String(r[rowCat.name]) === String(rLabel) && String(r[colCat.name]) === String(cLabel)
          );
          const sum = primaryNumeric
            ? matching.reduce((acc, r) => acc + (typeof r[primaryNumeric.name] === 'number' ? r[primaryNumeric.name] : 0), 0)
            : matching.length;

          matrixCells.push({
            row: String(rLabel),
            col: String(cLabel),
            value: Math.round(sum * 100) / 100,
            count: matching.length,
          });
        }
      }

      charts.push({
        id: `chart_heatmap_${rowCat.name}_${colCat.name}`,
        title: `${rowCat.name} × ${colCat.name} Density Matrix`,
        subtitle: primaryNumeric ? `Cross-tabulation volume of ${primaryNumeric.name}` : `Co-occurrence frequency matrix`,
        type: 'heatmap',
        xAxisColumn: colCat.name,
        yAxisColumn: rowCat.name,
        aggregation: 'sum',
        data: matrixCells,
        description: `Bi-dimensional cross-tabulation mapping concentration across ${rowCat.name} and ${colCat.name}.`,
      });
    }
  }

  // 8. Statistical Quartile Dispersion / Boxplot Visual
  if (primaryNumeric && activeRecords.length >= 12) {
    const targetCat = categoryCols[0];
    const segmentsToAnalyze = targetCat
      ? Array.from(new Set(activeRecords.map((r) => r[targetCat.name]).filter(Boolean))).slice(0, 4)
      : ['Overall Dataset'];

    const boxplotData: { label: string; min: number; q1: number; median: number; q3: number; max: number; mean: number; count: number }[] = [];

    for (const seg of segmentsToAnalyze) {
      const subset = targetCat
        ? activeRecords.filter((r) => String(r[targetCat.name]) === String(seg))
        : activeRecords;

      const vals = subset
        .map((r) => r[primaryNumeric.name])
        .filter((v): v is number => typeof v === 'number')
        .sort((a, b) => a - b);

      if (vals.length >= 4) {
        const min = vals[0];
        const max = vals[vals.length - 1];
        const q1 = vals[Math.floor(vals.length * 0.25)];
        const median = vals[Math.floor(vals.length * 0.5)];
        const q3 = vals[Math.floor(vals.length * 0.75)];
        const mean = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;

        boxplotData.push({
          label: String(seg),
          min,
          q1,
          median,
          q3,
          max,
          mean,
          count: vals.length,
        });
      }
    }

    if (boxplotData.length > 0) {
      charts.push({
        id: `chart_boxplot_${primaryNumeric.name}`,
        title: `${primaryNumeric.name} Quartile Spread & Distribution`,
        subtitle: `Statistical Min, Q1, Median, Q3, and Max bounds`,
        type: 'boxplot',
        xAxisColumn: targetCat ? targetCat.name : 'Dataset',
        yAxisColumn: primaryNumeric.name,
        aggregation: 'avg',
        data: boxplotData,
        description: `Visualizes dispersion, median benchmarks, and boundary limits.`,
      });
    }
  }

  return charts;
}

/**
 * Re-computes chart data when a user customizes/edits a chart's configuration
 */
export function recalculateChartData(
  config: Partial<ChartConfig>,
  records: Record<string, any>[]
): any[] {
  if (!records || records.length === 0) return [];

  const xCol = config.xAxisColumn || '';
  const yCol = config.yAxisColumn || '';
  const type = config.type || 'bar';
  const agg = config.aggregation || 'sum';

  const computeAgg = (vals: number[], count: number) => {
    if (vals.length === 0) return 0;
    if (agg === 'count') return count;
    if (agg === 'avg') return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
    if (agg === 'sum') return Math.round(vals.reduce((a, b) => a + b, 0) * 100) / 100;
    return Math.round(vals.reduce((a, b) => a + b, 0) * 100) / 100;
  };

  if (type === 'area' || type === 'line') {
    const map = new Map<string, number[]>();
    for (const r of records) {
      const key = r[xCol] ? String(r[xCol]).split('T')[0] : 'Unknown';
      const num = typeof r[yCol] === 'number' ? r[yCol] : 0;
      const list = map.get(key) || [];
      list.push(num);
      map.set(key, list);
    }
    const sortedKeys = Array.from(map.keys()).sort();
    return sortedKeys.map((k) => {
      const vals = map.get(k)!;
      return {
        label: k,
        value: computeAgg(vals, vals.length),
        count: vals.length,
      };
    });
  }

  if (type === 'bar' || type === 'horizontal_bar' || type === 'donut') {
    const map = new Map<string, number[]>();
    for (const r of records) {
      const key = r[xCol] !== null && r[xCol] !== undefined ? String(r[xCol]) : '(Unassigned)';
      const num = typeof r[yCol] === 'number' ? r[yCol] : 1;
      const list = map.get(key) || [];
      list.push(num);
      map.set(key, list);
    }
    const entries = Array.from(map.entries())
      .map(([label, vals]) => ({
        label,
        value: computeAgg(vals, vals.length),
        count: vals.length,
      }))
      .sort((a, b) => b.value - a.value);

    if (type === 'donut') {
      const total = entries.reduce((acc, curr) => acc + Math.max(0, curr.value), 0);
      return entries.slice(0, 7).map((e) => ({
        ...e,
        percentage: total > 0 ? Math.round((e.value / total) * 1000) / 10 : 0,
      }));
    }

    return entries.slice(0, 10);
  }

  if (type === 'pareto') {
    const map = new Map<string, number>();
    for (const r of records) {
      const key = r[xCol] ? String(r[xCol]) : '(Other)';
      const num = typeof r[yCol] === 'number' ? r[yCol] : 1;
      map.set(key, (map.get(key) || 0) + num);
    }
    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((acc, curr) => acc + curr[1], 0);
    let cumulative = 0;
    return sorted.slice(0, 8).map(([label, value]) => {
      cumulative += value;
      return {
        label,
        value: Math.round(value * 100) / 100,
        cumulativePct: total > 0 ? Math.round((cumulative / total) * 1000) / 10 : 0,
      };
    });
  }

  if (type === 'boxplot') {
    const segments = Array.from(new Set(records.map((r) => r[xCol]).filter(Boolean))).slice(0, 5);
    const targetSegments = segments.length > 0 ? segments : ['Overall'];
    const result: any[] = [];

    for (const seg of targetSegments) {
      const subset = segments.length > 0
        ? records.filter((r) => String(r[xCol]) === String(seg))
        : records;
      const vals = subset
        .map((r) => r[yCol])
        .filter((v): v is number => typeof v === 'number')
        .sort((a, b) => a - b);

      if (vals.length >= 2) {
        const min = vals[0];
        const max = vals[vals.length - 1];
        const q1 = vals[Math.floor(vals.length * 0.25)];
        const median = vals[Math.floor(vals.length * 0.5)];
        const q3 = vals[Math.floor(vals.length * 0.75)];
        const mean = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
        result.push({
          label: String(seg),
          min,
          q1,
          median,
          q3,
          max,
          mean,
          count: vals.length,
        });
      }
    }
    return result;
  }

  if (type === 'scatter') {
    return records.slice(0, 60).map((r, i) => ({
      x: typeof r[xCol] === 'number' ? r[xCol] : i + 1,
      y: typeof r[yCol] === 'number' ? r[yCol] : 0,
      label: r[xCol] ? `${xCol}: ${r[xCol]}` : `#${i + 1}`,
    }));
  }

  if (type === 'map') {
    const latCol = Object.keys(records[0] || {}).find((k) => /^(lat|latitude|lat_deg|y_coord)$/i.test(k));
    const lngCol = Object.keys(records[0] || {}).find((k) => /^(lon|lng|long|longitude|lon_deg|x_coord)$/i.test(k));

    if (latCol && lngCol && records.some((r) => r[latCol] !== undefined && r[lngCol] !== undefined)) {
      const coordPoints = records.slice(0, 100).map((r, i) => {
        const lat = typeof r[latCol] === 'number' ? r[latCol] : parseFloat(String(r[latCol]));
        const lng = typeof r[lngCol] === 'number' ? r[lngCol] : parseFloat(String(r[lngCol]));
        const val = typeof r[yCol] === 'number' ? r[yCol] : 1;
        return {
          id: `coord_pt_${i}`,
          label: r[xCol] ? String(r[xCol]) : `Point #${i + 1}`,
          lat,
          lng,
          value: val,
          count: 1,
        };
      }).filter((p) => !isNaN(p.lat) && !isNaN(p.lng));

      const total = coordPoints.reduce((acc, curr) => acc + Math.max(0, curr.value), 0);
      return coordPoints.map((e) => ({
        ...e,
        percentage: total > 0 ? Math.round((e.value / total) * 1000) / 10 : 0,
      }));
    }

    const map = new Map<string, { vals: number[]; lat?: number; lng?: number }>();
    for (const r of records) {
      const key = r[xCol] !== null && r[xCol] !== undefined ? String(r[xCol]) : '(Unassigned)';
      const num = typeof r[yCol] === 'number' ? r[yCol] : 1;
      const cur = map.get(key) || { vals: [] };
      cur.vals.push(num);
      if (latCol && typeof r[latCol] === 'number') cur.lat = r[latCol];
      if (lngCol && typeof r[lngCol] === 'number') cur.lng = r[lngCol];
      map.set(key, cur);
    }
    const entries = Array.from(map.entries())
      .map(([label, item]) => ({
        label,
        value: computeAgg(item.vals, item.vals.length),
        count: item.vals.length,
        lat: item.lat,
        lng: item.lng,
      }))
      .sort((a, b) => b.value - a.value);

    const total = entries.reduce((acc, curr) => acc + Math.max(0, curr.value), 0);
    return entries.map((e) => ({
      ...e,
      percentage: total > 0 ? Math.round((e.value / total) * 1000) / 10 : 0,
    }));
  }

  return [];
}

