import { Dataset, DataQualityReport, DataQualityIssue } from '../../types';

export function analyzeDataQuality(dataset: Dataset): DataQualityReport {
  const issues: DataQualityIssue[] = [];
  const columnHealth: Record<string, { completeness: number; validity: number; distinctValues: number }> = {};
  const totalRows = dataset.rowCount;
  const totalColumns = dataset.columnCount;

  if (totalRows === 0 || totalColumns === 0) {
    return {
      overallScore: 0,
      letterGrade: 'F',
      totalRows: 0,
      totalColumns: 0,
      duplicateRowCount: 0,
      duplicateRowPercentage: 0,
      completenessPercentage: 0,
      issues: [{ column: 'ALL', type: 'missing_values', severity: 'high', message: 'Dataset is empty', impactPercentage: 100 }],
      columnHealth: {},
    };
  }

  // 1. Column-by-column audit
  let totalNulls = 0;
  for (const col of dataset.columns) {
    const completeness = Number((((totalRows - col.nullCount) / totalRows) * 100).toFixed(1));
    totalNulls += col.nullCount;

    // Issue: Missing values
    const nullPct = Number(((col.nullCount / totalRows) * 100).toFixed(1));
    if (nullPct > 20) {
      issues.push({
        column: col.name,
        type: 'missing_values',
        severity: nullPct > 50 ? 'high' : 'medium',
        message: `${nullPct}% missing/null values detected. Consider imputation or filtering.`,
        impactPercentage: nullPct,
      });
    }

    // Issue: Constant column (zero variance)
    if (col.distinctCount <= 1 && totalRows > 1) {
      issues.push({
        column: col.name,
        type: 'constant_column',
        severity: 'medium',
        message: 'Column has only 1 unique value across all rows (provides zero entropy/variance).',
        impactPercentage: 100,
      });
    }

    // Issue: High cardinality in categorical column
    if (col.type === 'categorical' && col.distinctCount > 50 && col.distinctCount > totalRows * 0.7) {
      issues.push({
        column: col.name,
        type: 'high_cardinality',
        severity: 'low',
        message: 'High cardinality categorical column might represent unique IDs rather than categories.',
        impactPercentage: Number(((col.distinctCount / totalRows) * 100).toFixed(1)),
      });
    }

    columnHealth[col.name] = {
      completeness,
      validity: 100, // Normalized
      distinctValues: col.distinctCount,
    };
  }

  // 2. Duplicate rows audit
  const rowSignatures = new Set<string>();
  let duplicateRowCount = 0;
  const sampleCols = dataset.columns.slice(0, 6).map(c => c.name);

  for (const row of dataset.data) {
    const sig = sampleCols.map(c => String(row[c])).join('___');
    if (rowSignatures.has(sig)) {
      duplicateRowCount++;
    } else {
      rowSignatures.add(sig);
    }
  }

  const duplicateRowPercentage = Number(((duplicateRowCount / totalRows) * 100).toFixed(1));
  if (duplicateRowPercentage > 5) {
    issues.push({
      column: 'ROW_LEVEL',
      type: 'duplicates',
      severity: duplicateRowPercentage > 15 ? 'high' : 'medium',
      message: `${duplicateRowCount} duplicate rows (${duplicateRowPercentage}%) detected in dataset.`,
      impactPercentage: duplicateRowPercentage,
    });
  }

  // 3. Overall Completeness & Quality Score
  const totalCells = totalRows * totalColumns;
  const completenessPercentage = Number((((totalCells - totalNulls) / totalCells) * 100).toFixed(1));

  let score = completenessPercentage;
  score -= (duplicateRowPercentage * 0.5);
  score -= (issues.filter(i => i.severity === 'high').length * 8);
  score -= (issues.filter(i => i.severity === 'medium').length * 4);
  score = Math.max(10, Math.min(100, Math.round(score)));

  let letterGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'A';
  if (score >= 95) letterGrade = 'A+';
  else if (score >= 85) letterGrade = 'A';
  else if (score >= 70) letterGrade = 'B';
  else if (score >= 55) letterGrade = 'C';
  else if (score >= 40) letterGrade = 'D';
  else letterGrade = 'F';

  return {
    overallScore: score,
    letterGrade,
    totalRows,
    totalColumns,
    duplicateRowCount,
    duplicateRowPercentage,
    completenessPercentage,
    issues,
    columnHealth,
  };
}
