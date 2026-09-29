/**
 * Trend Analysis & Regression Utilities
 * Computes Simple Linear Regression with future projections for time-based series,
 * Moving Average, and Polynomial Regression overlays.
 */

export type TrendType = 'none' | 'linear' | 'moving_average' | 'polynomial';

export interface TrendPoint {
  index: number;
  label: string;
  rawValue?: number;
  trendValue: number;
  isProjected?: boolean;
}

export interface TrendResult {
  type: TrendType;
  points: TrendPoint[];
  equation: string;
  rSquared?: number;
  slope?: number;
  intercept?: number;
  direction: 'upward' | 'downward' | 'stable';
  growthPercentage: number;
  projectedCount?: number;
  historicalCount?: number;
}

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Extrapolates future labels for time-based or sequential series
 */
export function extrapolateNextLabel(lastLabel: string, prevLabel: string | undefined, stepIndex: number, allLabels: string[]): string {
  if (!lastLabel) return `+${stepIndex} (Forecast)`;

  const trimmed = lastLabel.trim();

  // 1. Check if labels are ISO dates (YYYY-MM-DD)
  const isIsoDate = /^\d{4}-\d{2}-\d{2}/.test(trimmed);
  if (isIsoDate && allLabels.length >= 2) {
    const firstDate = new Date(allLabels[0]).getTime();
    const lastDate = new Date(trimmed).getTime();
    if (!isNaN(firstDate) && !isNaN(lastDate) && lastDate > firstDate) {
      const avgIntervalMs = (lastDate - firstDate) / (allLabels.length - 1);
      const targetTime = lastDate + avgIntervalMs * stepIndex;
      const targetDate = new Date(targetTime);
      return targetDate.toISOString().split('T')[0];
    }
  }

  // 2. Check if labels are Quarter strings like Q1 2026 or Q3
  const qMatch = trimmed.match(/^Q([1-4])(?:\s*'?(\d{2,4}))?$/i);
  if (qMatch) {
    const curQ = parseInt(qMatch[1], 10);
    const curYear = qMatch[2] ? parseInt(qMatch[2], 10) : undefined;
    const totalQ = (curQ - 1) + stepIndex;
    const nextQ = (totalQ % 4) + 1;
    const yearAdd = Math.floor(totalQ / 4);
    if (curYear !== undefined) {
      const nextYear = curYear < 100 ? (curYear + yearAdd) : (curYear + yearAdd);
      return `Q${nextQ} '${String(nextYear).slice(-2)}`;
    }
    return `Q${nextQ}`;
  }

  // 3. Check for Short Month names (Jan, Feb...)
  const shortMonthIdx = MONTH_NAMES_SHORT.findIndex((m) => m.toLowerCase() === trimmed.toLowerCase());
  if (shortMonthIdx !== -1) {
    const nextIdx = (shortMonthIdx + stepIndex) % 12;
    return `${MONTH_NAMES_SHORT[nextIdx]} (Proj)`;
  }

  // 4. Check for Full Month names (January, February...)
  const fullMonthIdx = MONTH_NAMES_FULL.findIndex((m) => m.toLowerCase() === trimmed.toLowerCase());
  if (fullMonthIdx !== -1) {
    const nextIdx = (fullMonthIdx + stepIndex) % 12;
    return `${MONTH_NAMES_FULL[nextIdx]} (Proj)`;
  }

  // 5. Check if numeric sequence (e.g. "Day 1", "Week 12", "Sprint 4")
  const seqMatch = trimmed.match(/^(.*?)(\d+)$/);
  if (seqMatch) {
    const prefix = seqMatch[1];
    const num = parseInt(seqMatch[2], 10);
    return `${prefix}${num + stepIndex} (Proj)`;
  }

  // 6. Generic forecast label
  return `+${stepIndex} Period (Proj)`;
}

/**
 * Computes Simple Linear Regression using Ordinary Least Squares (OLS)
 * Fits y = mx + b and projects future data points for time-based series
 */
export function computeLinearRegression(
  data: { label: string; value: number }[],
  futureSteps = 3
): TrendResult {
  const n = data.length;
  if (n === 0) {
    return {
      type: 'linear',
      points: [],
      equation: 'Linear Fit: y = mx + b',
      direction: 'stable',
      growthPercentage: 0,
      rSquared: 0,
      projectedCount: 0,
      historicalCount: 0,
    };
  }

  const yVals = data.map((d) => d.value);
  const labels = data.map((d) => d.label);
  const meanY = yVals.reduce((a, b) => a + b, 0) / n;

  // Simple Linear Regression: x = 0, 1, 2, ..., n-1
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = yVals[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const denom = n * sumX2 - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;

  // Compute R²
  let ssTot = 0;
  let ssRes = 0;

  // 1. Historical fitted points
  const points: TrendPoint[] = data.map((d, i) => {
    const x = i;
    const rawValue = d.value;
    const trendValue = Math.round((slope * x + intercept) * 100) / 100;
    ssTot += Math.pow(rawValue - meanY, 2);
    ssRes += Math.pow(rawValue - trendValue, 2);
    return {
      index: i,
      label: d.label,
      rawValue,
      trendValue,
      isProjected: false,
    };
  });

  const rSquared = ssTot > 0 ? Math.max(0, Math.min(0.999, Math.round((1 - ssRes / ssTot) * 1000) / 1000)) : 1;

  // 2. Future Projected points using linear regression formula
  const validSteps = Math.max(0, Math.min(12, futureSteps));
  const lastLabel = labels[labels.length - 1] || 'T';
  const prevLabel = labels.length > 1 ? labels[labels.length - 2] : undefined;

  for (let step = 1; step <= validSteps; step++) {
    const projIndex = n - 1 + step;
    const projectedVal = Math.round((slope * projIndex + intercept) * 100) / 100;
    const projLabel = extrapolateNextLabel(lastLabel, prevLabel, step, labels);

    points.push({
      index: projIndex,
      label: projLabel,
      rawValue: undefined,
      trendValue: projectedVal,
      isProjected: true,
    });
  }

  const firstFit = points[0]?.trendValue || 0;
  const lastHistoricalFit = points[n - 1]?.trendValue || 0;
  const growthPercentage = firstFit !== 0 ? Math.round(((lastHistoricalFit - firstFit) / Math.abs(firstFit)) * 1000) / 10 : 0;
  const direction = slope > 0.01 ? 'upward' : slope < -0.01 ? 'downward' : 'stable';

  const slopeStr = slope >= 0 ? `+${slope.toFixed(2)}` : slope.toFixed(2);
  const interceptStr = intercept >= 0 ? `+${intercept.toFixed(1)}` : intercept.toFixed(1);
  const equation = validSteps > 0
    ? `Linear: y = ${slopeStr}x ${interceptStr} (R²=${rSquared.toFixed(2)}) · +${validSteps} Projected`
    : `Linear Trend: y = ${slopeStr}x ${interceptStr} (R²=${rSquared.toFixed(2)})`;

  return {
    type: 'linear',
    points,
    equation,
    rSquared,
    slope: Math.round(slope * 1000) / 1000,
    intercept: Math.round(intercept * 100) / 100,
    direction,
    growthPercentage,
    projectedCount: validSteps,
    historicalCount: n,
  };
}

/**
 * Computes Centered Moving Average with window size (default 3)
 */
export function computeMovingAverage(
  data: { label: string; value: number }[],
  windowSize = 3
): TrendResult {
  const n = data.length;
  if (n === 0) {
    return {
      type: 'moving_average',
      points: [],
      equation: 'Moving Average (SMA)',
      direction: 'stable',
      growthPercentage: 0,
      projectedCount: 0,
      historicalCount: 0,
    };
  }

  const half = Math.floor(windowSize / 2);
  const points: TrendPoint[] = data.map((d, i) => {
    const start = Math.max(0, i - half);
    const end = Math.min(n - 1, i + half);
    const count = end - start + 1;
    let sum = 0;
    for (let k = start; k <= end; k++) {
      sum += data[k].value;
    }
    const trendValue = Math.round((sum / count) * 100) / 100;
    return {
      index: i,
      label: d.label,
      rawValue: d.value,
      trendValue,
      isProjected: false,
    };
  });

  const first = points[0]?.trendValue || 0;
  const last = points[points.length - 1]?.trendValue || 0;
  const growthPercentage = first !== 0 ? Math.round(((last - first) / Math.abs(first)) * 1000) / 10 : 0;
  const direction = growthPercentage > 1 ? 'upward' : growthPercentage < -1 ? 'downward' : 'stable';

  return {
    type: 'moving_average',
    points,
    equation: `3-Pt Moving Avg (${direction === 'upward' ? '↗' : direction === 'downward' ? '↘' : '→'} ${growthPercentage >= 0 ? '+' : ''}${growthPercentage}%)`,
    direction,
    growthPercentage,
    projectedCount: 0,
    historicalCount: n,
  };
}

/**
 * Determinant of a 3x3 matrix
 */
function det3x3(m: number[][]): number {
  return (
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  );
}

/**
 * Computes Polynomial Regression (Degree 2) using least squares: y = ax^2 + bx + c
 */
export function computePolynomialRegression(
  data: { label: string; value: number }[]
): TrendResult {
  const n = data.length;
  if (n === 0) {
    return {
      type: 'polynomial',
      points: [],
      equation: 'Polynomial Fit',
      direction: 'stable',
      growthPercentage: 0,
      rSquared: 0,
      projectedCount: 0,
      historicalCount: 0,
    };
  }

  const yVals = data.map((d) => d.value);
  const meanY = yVals.reduce((a, b) => a + b, 0) / n;

  if (n < 3) {
    return computeLinearRegression(data, 0);
  }

  // 2nd degree polynomial least squares
  let sX = 0;
  let sX2 = 0;
  let sX3 = 0;
  let sX4 = 0;
  let sY = 0;
  let sXY = 0;
  let sX2Y = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = yVals[i];
    const x2 = x * x;
    sX += x;
    sX2 += x2;
    sX3 += x2 * x;
    sX4 += x2 * x2;
    sY += y;
    sXY += x * y;
    sX2Y += x2 * y;
  }

  const M = [
    [sX4, sX3, sX2],
    [sX3, sX2, sX],
    [sX2, sX, n],
  ];

  const D = det3x3(M);

  let a = 0;
  let b = 0;
  let c = meanY;

  if (Math.abs(D) > 1e-12) {
    const Ma = [
      [sX2Y, sX3, sX2],
      [sXY, sX2, sX],
      [sY, sX, n],
    ];
    const Mb = [
      [sX4, sX2Y, sX2],
      [sX3, sXY, sX],
      [sX2, sY, n],
    ];
    const Mc = [
      [sX4, sX3, sX2Y],
      [sX3, sX2, sXY],
      [sX2, sX, sY],
    ];

    a = det3x3(Ma) / D;
    b = det3x3(Mb) / D;
    c = det3x3(Mc) / D;
  } else {
    const denom = n * sX2 - sX * sX;
    b = denom !== 0 ? (n * sXY - sX * sY) / denom : 0;
    c = (sY - b * sX) / n;
  }

  let ssTot = 0;
  let ssRes = 0;

  const points: TrendPoint[] = data.map((d, i) => {
    const x = i;
    const rawValue = d.value;
    const trendValue = Math.round((a * x * x + b * x + c) * 100) / 100;
    ssTot += Math.pow(rawValue - meanY, 2);
    ssRes += Math.pow(rawValue - trendValue, 2);
    return {
      index: i,
      label: d.label,
      rawValue,
      trendValue,
      isProjected: false,
    };
  });

  const rSquared = ssTot > 0 ? Math.max(0, Math.min(0.999, Math.round((1 - ssRes / ssTot) * 1000) / 1000)) : 1;

  const firstTrend = points[0]?.trendValue || 0;
  const lastTrend = points[points.length - 1]?.trendValue || 0;
  const growthPercentage = firstTrend !== 0 ? Math.round(((lastTrend - firstFitOrDefault(points, firstTrend)) / Math.abs(firstFitOrDefault(points, firstTrend))) * 1000) / 10 : 0;
  const direction = growthPercentage > 1 ? 'upward' : growthPercentage < -1 ? 'downward' : 'stable';

  const equationStr = `Poly R²=${rSquared.toFixed(2)} (${direction === 'upward' ? '↗' : direction === 'downward' ? '↘' : '→'} ${growthPercentage >= 0 ? '+' : ''}${growthPercentage}%)`;

  return {
    type: 'polynomial',
    points,
    equation: equationStr,
    rSquared,
    direction,
    growthPercentage,
    projectedCount: 0,
    historicalCount: n,
  };
}

function firstFitOrDefault(pts: TrendPoint[], defVal: number): number {
  return pts[0]?.trendValue || defVal || 1;
}

/**
 * Master helper to compute requested trend type with optional future projection
 */
export function calculateTrend(
  type: TrendType,
  data: { label: string; value: number }[],
  futureSteps = 0
): TrendResult | null {
  if (type === 'none' || !data || data.length < 2) return null;
  if (type === 'linear') {
    return computeLinearRegression(data, futureSteps);
  }
  if (type === 'moving_average') {
    return computeMovingAverage(data);
  }
  if (type === 'polynomial') {
    return computePolynomialRegression(data);
  }
  return null;
}
