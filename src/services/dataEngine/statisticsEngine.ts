import { Dataset } from '../../types';

export interface NumericSummary {
  column: string;
  count: number;
  min: number;
  max: number;
  sum: number;
  mean: number;
  median: number;
  stdDev: number;
  variance: number;
  q1: number;
  q3: number;
  iqr: number;
}

export function computeNumericSummary(values: number[], colName: string): NumericSummary | null {
  const nums = values.filter(v => typeof v === 'number' && !isNaN(v)).sort((a, b) => a - b);
  if (nums.length === 0) return null;

  const count = nums.length;
  const min = nums[0];
  const max = nums[nums.length - 1];
  const sum = nums.reduce((a, b) => a + b, 0);
  const mean = sum / count;

  const mid = Math.floor(count / 2);
  const median = count % 2 === 0 ? (nums[mid - 1] + nums[mid]) / 2 : nums[mid];

  const variance = nums.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / count;
  const stdDev = Math.sqrt(variance);

  const getPercentile = (p: number) => {
    const idx = (count - 1) * p;
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    const weight = idx - lower;
    return nums[lower] * (1 - weight) + nums[upper] * weight;
  };

  const q1 = getPercentile(0.25);
  const q3 = getPercentile(0.75);
  const iqr = q3 - q1;

  return {
    column: colName,
    count,
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
    sum: Number(sum.toFixed(2)),
    mean: Number(mean.toFixed(2)),
    median: Number(median.toFixed(2)),
    stdDev: Number(stdDev.toFixed(2)),
    variance: Number(variance.toFixed(2)),
    q1: Number(q1.toFixed(2)),
    q3: Number(q3.toFixed(2)),
    iqr: Number(iqr.toFixed(2)),
  };
}

export function computeCorrelationMatrix(dataset: Dataset): { cols: string[]; matrix: number[][] } {
  const numCols = dataset.columns.filter(c => c.type === 'number').map(c => c.name);
  if (numCols.length < 2) return { cols: numCols, matrix: [] };

  const matrix: number[][] = [];

  for (let i = 0; i < numCols.length; i++) {
    const rowCorr: number[] = [];
    const colA = numCols[i];
    const valsA = dataset.data.map(r => r[colA] as number);

    for (let j = 0; j < numCols.length; j++) {
      if (i === j) {
        rowCorr.push(1.0);
        continue;
      }
      const colB = numCols[j];
      const valsB = dataset.data.map(r => r[colB] as number);

      // Filter pair-wise valid
      const pairs: [number, number][] = [];
      for (let k = 0; k < dataset.data.length; k++) {
        if (typeof valsA[k] === 'number' && typeof valsB[k] === 'number' && !isNaN(valsA[k]) && !isNaN(valsB[k])) {
          pairs.push([valsA[k], valsB[k]]);
        }
      }

      if (pairs.length < 3) {
        rowCorr.push(0);
        continue;
      }

      const meanA = pairs.reduce((acc, p) => acc + p[0], 0) / pairs.length;
      const meanB = pairs.reduce((acc, p) => acc + p[1], 0) / pairs.length;

      let num = 0;
      let denA = 0;
      let denB = 0;

      for (const [a, b] of pairs) {
        const da = a - meanA;
        const db = b - meanB;
        num += da * db;
        denA += da * da;
        denB += db * db;
      }

      const denom = Math.sqrt(denA * denB);
      const r = denom === 0 ? 0 : num / denom;
      rowCorr.push(Number(r.toFixed(2)));
    }
    matrix.push(rowCorr);
  }

  return { cols: numCols, matrix };
}

export function computeHistogramBins(values: number[], binCount = 8): { label: string; count: number; min: number; max: number }[] {
  const valid = values.filter(v => typeof v === 'number' && !isNaN(v)).sort((a, b) => a - b);
  if (valid.length === 0) return [];

  const min = valid[0];
  const max = valid[valid.length - 1];
  if (min === max) {
    return [{ label: `${min}`, count: valid.length, min, max }];
  }

  const binWidth = (max - min) / binCount;
  const bins = Array.from({ length: binCount }, (_, i) => {
    const bMin = min + i * binWidth;
    const bMax = min + (i + 1) * binWidth;
    return {
      label: `${Math.round(bMin)} - ${Math.round(bMax)}`,
      count: 0,
      min: bMin,
      max: bMax,
    };
  });

  for (const v of valid) {
    const idx = Math.min(Math.floor((v - min) / binWidth), binCount - 1);
    bins[idx].count++;
  }

  return bins;
}

export function aggregateByDimension(
  data: Record<string, any>[],
  dimensionCol: string,
  metricCol: string,
  aggType: 'sum' | 'avg' | 'count' = 'sum'
): { label: string; value: number }[] {
  const groups: Record<string, number[]> = {};

  for (const row of data) {
    const dimVal = String(row[dimensionCol] || 'Other');
    const metricVal = Number(row[metricCol]);
    if (!groups[dimVal]) groups[dimVal] = [];
    if (!isNaN(metricVal)) {
      groups[dimVal].push(metricVal);
    }
  }

  const result = Object.entries(groups).map(([label, values]) => {
    let value = 0;
    if (aggType === 'sum') {
      value = values.reduce((a, b) => a + b, 0);
    } else if (aggType === 'avg') {
      value = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    } else {
      value = values.length;
    }
    return { label, value: Number(value.toFixed(2)) };
  });

  return result.sort((a, b) => b.value - a.value);
}
