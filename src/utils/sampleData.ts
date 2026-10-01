import { Dataset } from '../types/analytics';
import { profileDataset } from './dataProfiler';

export interface SampleDatasetOption {
  id: string;
  name: string;
  description: string;
  recordsCount: number;
  tags: string[];
  generateData: () => Dataset;
}

export function createSaaSDataset(): Dataset {
  const records: Record<string, any>[] = [];
  const regions = ['North America', 'Europe', 'Asia-Pacific', 'Latin America'];
  const geoDetails = [
    { country: 'United States', lat: 37.77, lng: -122.42 },
    { country: 'Germany', lat: 50.11, lng: 8.68 },
    { country: 'Japan', lat: 35.68, lng: 139.69 },
    { country: 'Brazil', lat: -23.55, lng: -46.63 },
  ];
  const tiers = ['Enterprise', 'Scale', 'Growth', 'Starter'];
  const statuses = ['Active', 'Active', 'Active', 'At Risk', 'Pending Renewal'];

  const baseDate = new Date('2026-01-01');

  for (let i = 0; i < 180; i++) {
    const curDate = new Date(baseDate);
    curDate.setDate(baseDate.getDate() + Math.floor(i * 1.5));
    const tier = tiers[i % tiers.length];
    const geoIndex = i % regions.length;
    const region = regions[geoIndex];
    const geo = geoDetails[geoIndex];
    
    let baseMrr = 1200;
    if (tier === 'Enterprise') baseMrr = 9500 + (i % 7) * 800;
    else if (tier === 'Scale') baseMrr = 3800 + (i % 5) * 450;
    else if (tier === 'Growth') baseMrr = 1400 + (i % 6) * 120;
    else baseMrr = 450 + (i % 8) * 40;

    // Slight variance
    const mrr = Math.round(baseMrr * (0.9 + Math.random() * 0.25));
    const arr = mrr * 12;
    const churnRisk = Math.round((Math.random() * 25 + (tier === 'Starter' ? 10 : 2)) * 10) / 10;
    const nps = Math.floor(7 + Math.random() * 4);

    records.push({
      Date: curDate.toISOString().split('T')[0],
      CustomerID: `CUST-${1000 + i}`,
      Region: region,
      Country: geo.country,
      Latitude: geo.lat,
      Longitude: geo.lng,
      Tier: tier,
      MRR: mrr,
      ARR: arr,
      ChurnRiskPct: churnRisk,
      NPS: nps,
      Status: statuses[i % statuses.length],
    });
  }

  return profileDataset('Global SaaS Revenue & Growth.xlsx', ['Monthly MRR', 'Churn Analysis'], 'Monthly MRR', records);
}

export function createEcommerceDataset(): Dataset {
  const records: Record<string, any>[] = [];
  const categories = ['Enterprise Electronics', 'Office Automation', 'Industrial Storage', 'Network Hardware', 'Display Solutions'];
  const segments = ['B2B Enterprise', 'Mid-Market', 'Government', 'Education'];
  const shippingStatuses = ['Delivered', 'In Transit', 'Processing', 'Delivered', 'Delayed'];

  const baseDate = new Date('2026-03-01');

  for (let i = 0; i < 200; i++) {
    const curDate = new Date(baseDate);
    curDate.setDate(baseDate.getDate() + Math.floor(i * 0.9));
    const category = categories[i % categories.length];
    const segment = segments[i % segments.length];
    const quantity = Math.floor(1 + Math.random() * 15);
    
    let unitPrice = 180;
    if (category === 'Enterprise Electronics') unitPrice = 1250;
    else if (category === 'Network Hardware') unitPrice = 680;
    else if (category === 'Display Solutions') unitPrice = 420;
    else if (category === 'Industrial Storage') unitPrice = 310;
    
    const revenue = Math.round(quantity * unitPrice * (0.95 + Math.random() * 0.15));
    const profitMargin = Math.round((22 + Math.random() * 18) * 10) / 10;

    records.push({
      OrderDate: curDate.toISOString().split('T')[0],
      OrderID: `ORD-2026-${5000 + i}`,
      Category: category,
      CustomerSegment: segment,
      Quantity: quantity,
      UnitPrice: unitPrice,
      Revenue: revenue,
      ProfitMargin: profitMargin,
      ShippingStatus: shippingStatuses[i % shippingStatuses.length],
    });
  }

  return profileDataset('Logistics & Commercial Sales.xlsx', ['Commercial Orders', 'Returns & Exchanges'], 'Commercial Orders', records);
}

export function createIoTTelemetryDataset(): Dataset {
  const records: Record<string, any>[] = [];
  const facilities = ['Frankfurt Hub', 'Austin Data Center', 'Tokyo Terminal', 'Singapore Node'];
  const statuses = ['Optimal', 'Optimal', 'Optimal', 'Elevated Load', 'Inspection Required'];

  const baseDate = new Date('2026-09-01');

  for (let i = 0; i < 150; i++) {
    const curDate = new Date(baseDate);
    curDate.setMinutes(baseDate.getMinutes() + i * 45);
    const facility = facilities[i % facilities.length];
    const powerKwh = Math.round((140 + Math.random() * 65 + (facility.includes('Frankfurt') ? 35 : 0)) * 10) / 10;
    const tempC = Math.round((28 + Math.random() * 14 + (powerKwh > 180 ? 6 : 0)) * 10) / 10;
    const vibrationHz = Math.round((1.2 + Math.random() * 2.8) * 100) / 100;

    records.push({
      Timestamp: curDate.toISOString().replace('T', ' ').substring(0, 16),
      DeviceID: `NODE-${200 + (i % 12)}`,
      Facility: facility,
      PowerKwh: powerKwh,
      TemperatureC: tempC,
      VibrationHz: vibrationHz,
      FleetStatus: statuses[i % statuses.length],
    });
  }

  return profileDataset('Edge Fleet Telemetry.csv', ['Node Diagnostics'], 'Node Diagnostics', records);
}

export const SAMPLE_DATASETS: SampleDatasetOption[] = [
  {
    id: 'saas_revenue',
    name: 'SaaS MRR & Customer Health',
    description: '180 accounts tracking Monthly Recurring Revenue, ARR, Churn Risk %, and NPS.',
    recordsCount: 180,
    tags: ['Time Series', 'MRR', 'Tiers'],
    generateData: createSaaSDataset,
  },
  {
    id: 'ecommerce_sales',
    name: 'Commercial Logistics & Revenue',
    description: '200 orders across 5 enterprise hardware categories with margins and shipping metrics.',
    recordsCount: 200,
    tags: ['Categorical', 'Margins', 'Revenue'],
    generateData: createEcommerceDataset,
  },
  {
    id: 'iot_telemetry',
    name: 'IoT Fleet Telemetry & Energy',
    description: '150 telemetry timestamps with sensor temperatures, kWh power draw, and node alerts.',
    recordsCount: 150,
    tags: ['Real-Time', 'Sensors', 'Status'],
    generateData: createIoTTelemetryDataset,
  },
];

/**
 * Generates an incoming real-time record to append to the active dataset
 */
export function generateLiveRecord(dataset: Dataset): Record<string, any> {
  const { columns, cleanedRecords } = dataset;
  const lastRecord = cleanedRecords[cleanedRecords.length - 1] || {};
  const newRow: Record<string, any> = {};

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toISOString().replace('T', ' ').substring(0, 19);

  for (const col of columns) {
    if (col.type === 'id') {
      newRow[col.name] = `LIVE-${Math.floor(1000 + Math.random() * 9000)}`;
    } else if (col.type === 'date') {
      newRow[col.name] = col.name.toLowerCase().includes('time') ? timeStr : dateStr;
    } else if (col.type === 'numeric') {
      const prevVal = typeof lastRecord[col.name] === 'number' ? lastRecord[col.name] : (col.mean || 100);
      // Realistic jitter +/- 8%
      const jitter = (Math.random() - 0.48) * 0.16;
      let nextVal = Math.round(prevVal * (1 + jitter) * 100) / 100;
      if (nextVal < 0 && (col.min ?? 0) >= 0) nextVal = Math.abs(nextVal);
      newRow[col.name] = nextVal;
    } else if (col.type === 'category' && col.topCategories && col.topCategories.length > 0) {
      // Pick random category weighted by top
      const idx = Math.floor(Math.random() * col.topCategories.length);
      newRow[col.name] = col.topCategories[idx].value;
    } else if (col.type === 'boolean') {
      newRow[col.name] = Math.random() > 0.3;
    } else {
      newRow[col.name] = lastRecord[col.name] || 'Active';
    }
  }

  return newRow;
}
