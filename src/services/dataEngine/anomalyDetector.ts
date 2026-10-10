import { Dataset, AnomalyItem } from '../../types';

export function detectDatasetAnomalies(dataset: Dataset, zScoreThreshold = 2.8): AnomalyItem[] {
  const anomalies: AnomalyItem[] = [];
  const numericColumns = dataset.columns.filter(c => c.type === 'number');

  for (const col of numericColumns) {
    const rawValues = dataset.data.map(r => r[col.name]);
    const validRows = dataset.data
      .map((row, index) => ({ index, val: Number(row[col.name]), row }))
      .filter(item => !isNaN(item.val) && item.val !== null);

    if (validRows.length < 5) continue;

    const nums = validRows.map(r => r.val);
    const sum = nums.reduce((a, b) => a + b, 0);
    const mean = sum / nums.length;
    const variance = nums.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / nums.length;
    const stdDev = Math.sqrt(variance);

    // IQR boundaries
    const sorted = [...nums].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerFence = q1 - 1.5 * iqr;
    const upperFence = q3 + 1.5 * iqr;

    // Evaluate each row
    for (const item of validRows) {
      const z = stdDev > 0 ? Math.abs((item.val - mean) / stdDev) : 0;
      const isExtremeZ = z >= zScoreThreshold;
      const isOutsideIQR = (item.val < lowerFence || item.val > upperFence) && iqr > 0;
      const isNegativeAnomaly = (col.name.toLowerCase().includes('price') ||
                                col.name.toLowerCase().includes('revenue') ||
                                col.name.toLowerCase().includes('sales') ||
                                col.name.toLowerCase().includes('quantity')) && item.val < 0;

      if (isExtremeZ || isOutsideIQR || isNegativeAnomaly) {
        let method: 'z-score' | 'iqr' | 'domain-rule' = 'z-score';
        let explanation = '';
        let severity: 'critical' | 'warning' | 'info' = 'info';

        if (isNegativeAnomaly) {
          method = 'domain-rule';
          severity = 'critical';
          explanation = `Negative value (${item.val}) detected in strictly non-negative business vector '${col.name}'. Likely data entry error or unclassified return.`;
        } else if (z >= 3.5) {
          severity = 'critical';
          explanation = `Extreme statistical outlier: value ${item.val.toLocaleString()} is ${z.toFixed(1)} standard deviations away from mean (${mean.toFixed(1)}). Upper 0.1% tail.`;
        } else if (z >= zScoreThreshold) {
          severity = 'warning';
          explanation = `Outlier with Z-score ${z.toFixed(2)}. Value is significantly higher than dataset typical range [${q1.toFixed(1)} - ${q3.toFixed(1)}].`;
        } else {
          method = 'iqr';
          severity = 'info';
          explanation = `Value ${item.val} lies outside standard interquartile bounds [${lowerFence.toFixed(1)} - ${upperFence.toFixed(1)}].`;
        }

        anomalies.push({
          id: `anom_${col.name}_${item.index}`,
          rowIndex: item.index + 1,
          column: col.name,
          value: item.val,
          method,
          score: Number(z.toFixed(2)),
          explanation,
          severity,
          rowData: item.row,
        });
      }
    }
  }

  // Sort anomalies by severity and score
  const severityRank = { critical: 3, warning: 2, info: 1 };
  return anomalies
    .sort((a, b) => (severityRank[b.severity] - severityRank[a.severity]) || (b.score - a.score))
    .slice(0, 20); // Top 20 significant anomalies
}
