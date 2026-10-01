import { ColumnProfile, DataQualityReport, DataType, Dataset } from '../types/analytics';

/**
 * Checks if a string looks like a standard date or ISO timestamp.
 */
function isDateString(val: any): boolean {
  if (!val) return false;
  if (typeof val === 'number') return false;
  if (val instanceof Date && !isNaN(val.getTime())) return true;
  
  const str = String(val).trim();
  // Quick pattern reject if it has no date separators
  if (!str.includes('-') && !str.includes('/') && !str.includes('.')) return false;
  
  // Exclude simple decimal numbers like 12.34
  if (/^\d+\.\d+$/.test(str)) return false;

  const parsed = Date.parse(str);
  if (isNaN(parsed)) return false;

  // Check valid year range (1900 to 2100)
  const d = new Date(parsed);
  const year = d.getFullYear();
  return year >= 1950 && year <= 2099;
}

/**
 * Tries to parse a value into a pure number, safely handling currency ($1,234.50), percentages (12.5%), and commified numbers.
 */
export function parseNumericValue(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val === 'boolean') return null;

  let str = String(val).trim();
  
  // Remove common currency symbols and commified thousands
  str = str.replace(/[$€£¥₹]/g, '').replace(/,/g, '').trim();

  // If percentage (e.g. "15.4%"), strip %
  if (str.endsWith('%')) {
    str = str.slice(0, -1).trim();
  }

  // Check if valid numeric format
  if (/^-?\d+(\.\d+)?$/.test(str)) {
    const num = parseFloat(str);
    return isNaN(num) ? null : num;
  }

  return null;
}

/**
 * Normalizes boolean strings
 */
function isBooleanValue(val: any): boolean {
  if (typeof val === 'boolean') return true;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    return ['true', 'false', 'yes', 'no', '1', '0', 'y', 'n'].includes(s);
  }
  return false;
}

/**
 * Profiles all columns from a set of raw records.
 */
export function profileDataset(
  name: string,
  sheetNames: string[],
  activeSheet: string,
  rawRecords: Record<string, any>[]
): Dataset {
  if (!rawRecords || rawRecords.length === 0) {
    return {
      id: `ds_${Date.now()}`,
      name,
      sheetNames,
      activeSheet,
      columns: [],
      rawRecords: [],
      cleanedRecords: [],
      qualityReport: {
        totalRows: 0,
        totalColumns: 0,
        duplicateRowsCount: 0,
        overallHealthScore: 0,
        warnings: [{ level: 'critical', message: 'The active sheet contains 0 data rows.', suggestion: 'Upload a non-empty sheet.' }],
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  const totalRows = rawRecords.length;
  // Get all unique keys across all records
  const allKeys = Array.from(
    new Set(rawRecords.flatMap((row) => Object.keys(row || {})))
  ).filter((k) => k && k.trim() !== '');

  const cleanedRecords: Record<string, any>[] = [];
  const columnProfiles: ColumnProfile[] = [];
  const warnings: DataQualityReport['warnings'] = [];

  // First pass: inspect each column
  for (const colKey of allKeys) {
    const originalName = colKey;
    let nullCount = 0;
    let numericCount = 0;
    let dateCount = 0;
    let booleanCount = 0;
    let textCount = 0;

    const values: any[] = [];
    const parsedNumbers: number[] = [];
    const parsedDates: Date[] = [];
    const categoryFreq: Record<string, number> = {};

    for (let i = 0; i < totalRows; i++) {
      const row = rawRecords[i];
      const val = row[colKey];

      if (val === null || val === undefined || String(val).trim() === '' || String(val).toLowerCase() === 'n/a' || String(val).toLowerCase() === 'null') {
        nullCount++;
        values.push(null);
        continue;
      }

      values.push(val);

      // Check numeric
      const numVal = parseNumericValue(val);
      if (numVal !== null) {
        numericCount++;
        parsedNumbers.push(numVal);
      } else if (isDateString(val)) {
        dateCount++;
        parsedDates.push(new Date(val));
      } else if (isBooleanValue(val)) {
        booleanCount++;
      } else {
        textCount++;
      }

      const strVal = String(val).trim();
      categoryFreq[strVal] = (categoryFreq[strVal] || 0) + 1;
    }

    const nonNullCount = totalRows - nullCount;
    const uniqueValuesCount = Object.keys(categoryFreq).length;
    const nullPercentage = Math.round((nullCount / totalRows) * 1000) / 10;

    // Determine data type by dominant non-null frequency
    let detectedType: DataType = 'text';
    if (nonNullCount === 0) {
      detectedType = 'text';
    } else if (dateCount / nonNullCount >= 0.7) {
      detectedType = 'date';
    } else if (numericCount / nonNullCount >= 0.75) {
      // Check if it's an ID (all integers, 100% unique or high cardinality with sequential/id naming)
      const isIdLike =
        (originalName.toLowerCase().includes('id') || originalName.toLowerCase().endsWith('_id')) &&
        uniqueValuesCount === nonNullCount;
      detectedType = isIdLike ? 'id' : 'numeric';
    } else if (booleanCount / nonNullCount >= 0.8) {
      detectedType = 'boolean';
    } else if (uniqueValuesCount <= Math.min(30, nonNullCount * 0.4)) {
      detectedType = 'category';
    } else {
      detectedType = 'text';
    }

    // Calculate statistical metrics
    let min: number | undefined;
    let max: number | undefined;
    let mean: number | undefined;
    let median: number | undefined;
    let sum: number | undefined;
    let stdDev: number | undefined;

    if (detectedType === 'numeric' && parsedNumbers.length > 0) {
      const sorted = [...parsedNumbers].sort((a, b) => a - b);
      min = sorted[0];
      max = sorted[sorted.length - 1];
      sum = sorted.reduce((acc, curr) => acc + curr, 0);
      mean = sum / sorted.length;
      
      const mid = Math.floor(sorted.length / 2);
      median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

      // Standard deviation
      const variance = sorted.reduce((acc, curr) => acc + Math.pow(curr - mean!, 2), 0) / sorted.length;
      stdDev = Math.sqrt(variance);
    }

    let minDate: string | undefined;
    let maxDate: string | undefined;
    if (detectedType === 'date' && parsedDates.length > 0) {
      const sortedDates = [...parsedDates].sort((a, b) => a.getTime() - b.getTime());
      minDate = sortedDates[0].toISOString().split('T')[0];
      maxDate = sortedDates[sortedDates.length - 1].toISOString().split('T')[0];
    }

    // Top categories
    const topCategories = Object.entries(categoryFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([value, count]) => ({
        value,
        count,
        percentage: Math.round((count / nonNullCount) * 1000) / 10,
      }));

    // Quality issues
    const qualityIssues: string[] = [];
    if (nullPercentage > 20) {
      qualityIssues.push(`High missing rate: ${nullPercentage}% of records are empty.`);
      warnings.push({
        column: originalName,
        level: nullPercentage > 50 ? 'critical' : 'warning',
        message: `Column "${originalName}" has ${nullPercentage}% missing values.`,
        suggestion: 'Consider filtering out null records or verifying data completeness at source.',
      });
    }

    if (detectedType === 'numeric' && numericCount < nonNullCount && nonNullCount > 0) {
      const nonNumeric = nonNullCount - numericCount;
      qualityIssues.push(`Mixed data types: ${nonNumeric} rows contain non-numeric text.`);
      warnings.push({
        column: originalName,
        level: 'warning',
        message: `Column "${originalName}" has ${nonNumeric} text values in a mostly numeric column.`,
        suggestion: 'Values will be normalized; non-numeric entries are treated as null in aggregations.',
      });
    }

    if (detectedType === 'category' && uniqueValuesCount === 1) {
      qualityIssues.push('Single unique value: offers no variance for grouping.');
      warnings.push({
        column: originalName,
        level: 'info',
        message: `Column "${originalName}" only contains a single value ("${topCategories[0]?.value}").`,
        suggestion: 'This column will provide uniform values across all groupings.',
      });
    }

    columnProfiles.push({
      name: originalName,
      originalName,
      type: detectedType,
      sampleValues: values.slice(0, 5),
      totalCount: totalRows,
      nullCount,
      nullPercentage,
      uniqueCount: uniqueValuesCount,
      isUnique: uniqueValuesCount === totalRows,
      min,
      max,
      mean,
      median,
      sum,
      stdDev,
      minDate,
      maxDate,
      topCategories: detectedType === 'category' || detectedType === 'text' || detectedType === 'date' ? topCategories : undefined,
      qualityIssues,
    });
  }

  // Build cleaned working dataset
  // Normalize date formats to YYYY-MM-DD, parse numbers to float
  for (let i = 0; i < totalRows; i++) {
    const rawRow = rawRecords[i];
    const cleanedRow: Record<string, any> = {};

    for (const col of columnProfiles) {
      const rawVal = rawRow[col.name];

      if (rawVal === null || rawVal === undefined || String(rawVal).trim() === '') {
        cleanedRow[col.name] = null;
        continue;
      }

      if (col.type === 'numeric') {
        const parsed = parseNumericValue(rawVal);
        cleanedRow[col.name] = parsed;
      } else if (col.type === 'date') {
        const d = new Date(rawVal);
        cleanedRow[col.name] = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : String(rawVal);
      } else if (col.type === 'boolean') {
        cleanedRow[col.name] = ['true', 'yes', '1', 'y'].includes(String(rawVal).toLowerCase().trim());
      } else {
        cleanedRow[col.name] = String(rawVal).trim();
      }
    }

    cleanedRecords.push(cleanedRow);
  }

  // Duplicate rows detection
  let duplicateRowsCount = 0;
  const rowHash = new Set<string>();
  for (let i = 0; i < Math.min(totalRows, 2000); i++) {
    const hash = JSON.stringify(cleanedRecords[i]);
    if (rowHash.has(hash)) {
      duplicateRowsCount++;
    } else {
      rowHash.add(hash);
    }
  }

  if (duplicateRowsCount > 0) {
    warnings.push({
      level: 'warning',
      message: `Detected ${duplicateRowsCount} duplicate rows in dataset sample.`,
      suggestion: 'Duplicate rows can distort totals and averages; inspect in Data Table.',
    });
  }

  // Calculate overall health score (0-100)
  let healthScore = 100;
  for (const col of columnProfiles) {
    if (col.nullPercentage > 50) healthScore -= 12;
    else if (col.nullPercentage > 20) healthScore -= 5;
    if (col.qualityIssues.length > 0) healthScore -= 3;
  }
  if (duplicateRowsCount > 0) healthScore -= 10;
  const overallHealthScore = Math.max(20, Math.min(100, Math.round(healthScore)));

  return {
    id: `ds_${Date.now()}`,
    name,
    sheetNames,
    activeSheet,
    columns: columnProfiles,
    rawRecords,
    cleanedRecords,
    qualityReport: {
      totalRows,
      totalColumns: columnProfiles.length,
      duplicateRowsCount,
      overallHealthScore,
      warnings,
    },
    lastUpdated: new Date().toISOString(),
  };
}
