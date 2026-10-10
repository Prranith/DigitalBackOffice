import { Dataset, ForecastResult, ForecastPoint } from '../../types';

export function generateTrendForecast(
  dataset: Dataset,
  metricColumn?: string,
  timeColumn?: string,
  forecastPeriods = 4
): ForecastResult | null {
  const numericCols = dataset.columns.filter(c => c.type === 'number');
  const dateCols = dataset.columns.filter(c => c.type === 'date');
  const stringCols = dataset.columns.filter(c => c.type === 'string' || c.type === 'categorical');

  const metric = metricColumn || numericCols[0]?.name;
  if (!metric) return null;

  const timeCol = timeColumn || dateCols[0]?.name || stringCols.find(c => {
    const low = c.name.toLowerCase();
    return low.includes('date') || low.includes('month') || low.includes('year') || low.includes('quarter');
  })?.name;

  if (!timeCol) return null;

  // Aggregate metric by chronological period
  const periodMap: Record<string, number[]> = {};
  for (const row of dataset.data) {
    const period = String(row[timeCol] || 'Unknown');
    const val = Number(row[metric]);
    if (period && !isNaN(val)) {
      if (!periodMap[period]) periodMap[period] = [];
      periodMap[period].push(val);
    }
  }

  const periods = Object.keys(periodMap).sort();
  if (periods.length < 3) return null;

  const historicalAverages = periods.map(p => {
    const vals = periodMap[p];
    return vals.reduce((a, b) => a + b, 0); // Total volume per period
  });

  const n = periods.length;
  const xVals = Array.from({ length: n }, (_, i) => i);
  const yVals = historicalAverages;

  // OLS Linear Regression y = mx + b
  const xMean = xVals.reduce((a, b) => a + b, 0) / n;
  const yMean = yVals.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xVals[i] - xMean) * (yVals[i] - yMean);
    den += Math.pow(xVals[i] - xMean, 2);
  }

  const slope = den !== 0 ? num / den : 0;
  const intercept = yMean - slope * xMean;

  // R² Calculation
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const yPred = slope * xVals[i] + intercept;
    ssTot += Math.pow(yVals[i] - yMean, 2);
    ssRes += Math.pow(yVals[i] - yPred, 2);
  }
  const rSquared = ssTot !== 0 ? Math.max(0, 1 - (ssRes / ssTot)) : 0;
  const confidenceScore = Math.min(98, Math.max(45, Math.round(rSquared * 100)));

  // Growth rate
  const firstVal = yVals[0] || 1;
  const lastVal = yVals[yVals.length - 1] || 1;
  const overallGrowthRate = ((lastVal - firstVal) / Math.abs(firstVal)) * 100;

  // Standard error of regression
  const stdError = n > 2 ? Math.sqrt(ssRes / (n - 2)) : 0;

  // Build forecast points
  const points: ForecastPoint[] = [];

  // Historical points
  for (let i = 0; i < n; i++) {
    points.push({
      period: periods[i],
      historical: Number(yVals[i].toFixed(2)),
    });
  }

  // Future projected points
  for (let step = 1; step <= forecastPeriods; step++) {
    const futureX = n - 1 + step;
    const futureVal = Math.max(0, slope * futureX + intercept);
    const uncertaintyBand = stdError * Math.sqrt(1 + 1 / n + Math.pow(futureX - xMean, 2) / (den || 1)) * 1.96;

    points.push({
      period: `+${step} Period (Proj)`,
      forecast: Number(futureVal.toFixed(2)),
      upperBound: Number((futureVal + uncertaintyBand).toFixed(2)),
      lowerBound: Number(Math.max(0, futureVal - uncertaintyBand).toFixed(2)),
    });
  }

  return {
    metric,
    timeColumn: timeCol,
    historicalPeriods: n,
    forecastPeriods,
    growthRatePercentage: Number(overallGrowthRate.toFixed(1)),
    confidenceScore,
    rSquared: Number(rSquared.toFixed(3)),
    points,
    summary: `Based on OLS regression over ${n} historical intervals, '${metric}' is projected to grow at an average rate of ${overallGrowthRate >= 0 ? '+' : ''}${overallGrowthRate.toFixed(1)}% with an R² fit of ${rSquared.toFixed(2)}.`,
  };
}
