import Papa from 'papaparse';
import { ColumnMetadata, ColumnType, Dataset } from '../../types';

export function inferColumnType(values: any[]): ColumnType {
  const nonNulls = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '');
  if (nonNulls.length === 0) return 'string';

  let numericCount = 0;
  let dateCount = 0;
  let boolCount = 0;

  for (const val of nonNulls.slice(0, 100)) {
    const s = String(val).trim().toLowerCase();
    if (s === 'true' || s === 'false' || s === 'yes' || s === 'no' || s === '0' || s === '1') {
      boolCount++;
    }

    // Number check (handles currency, percentages, commas)
    const cleanNum = s.replace(/[\$,]/g, '').replace(/%$/, '');
    if (!isNaN(Number(cleanNum)) && cleanNum !== '') {
      numericCount++;
    }

    // Date check (ISO or common date formats)
    if (s.length >= 6 && !isNaN(Date.parse(s)) && isNaN(Number(s))) {
      dateCount++;
    }
  }

  const sampleSize = Math.min(nonNulls.length, 100);
  if (numericCount / sampleSize > 0.8) return 'number';
  if (dateCount / sampleSize > 0.8) return 'date';
  if (boolCount / sampleSize > 0.9 && sampleSize > 5) return 'boolean';

  // Categorical vs generic string
  const uniqueCount = new Set(nonNulls.map(String)).size;
  if (uniqueCount <= 15 && uniqueCount < nonNulls.length * 0.5) {
    return 'categorical';
  }

  return 'string';
}

export function parseAndCleanValue(val: any, type: ColumnType): any {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (s === '' || s === 'NA' || s === 'N/A' || s === 'null' || s === 'undefined' || s === '-') return null;

  if (type === 'number') {
    const clean = s.replace(/[\$,]/g, '').replace(/%$/, '');
    const num = Number(clean);
    return isNaN(num) ? null : num;
  }

  if (type === 'boolean') {
    const low = s.toLowerCase();
    if (low === 'true' || low === 'yes' || low === '1') return true;
    if (low === 'false' || low === 'no' || low === '0') return false;
    return null;
  }

  return s;
}

export function calculateColumnMetadata(name: string, rawValues: any[], type: ColumnType): ColumnMetadata {
  const totalCount = rawValues.length;
  const cleanedValues = rawValues.map(v => parseAndCleanValue(v, type));
  const validValues = cleanedValues.filter(v => v !== null);
  const nullCount = totalCount - validValues.length;

  const distinctSet = new Set(validValues);
  const distinctCount = distinctSet.size;

  const sampleValues = validValues.slice(0, 5);

  const meta: ColumnMetadata = {
    name,
    type,
    sampleValues,
    nullCount,
    distinctCount,
    totalCount,
  };

  if (type === 'number' && validValues.length > 0) {
    const nums = validValues as number[];
    const sorted = [...nums].sort((a, b) => a - b);
    meta.min = sorted[0];
    meta.max = sorted[sorted.length - 1];

    const sum = nums.reduce((acc, v) => acc + v, 0);
    meta.mean = Number((sum / nums.length).toFixed(2));

    const mid = Math.floor(sorted.length / 2);
    meta.median = sorted.length % 2 === 0
      ? Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2))
      : sorted[mid];

    const variance = nums.reduce((acc, v) => acc + Math.pow(v - (meta.mean || 0), 2), 0) / nums.length;
    meta.stdDev = Number(Math.sqrt(variance).toFixed(2));
  } else if ((type === 'string' || type === 'categorical') && validValues.length > 0) {
    const counts: Record<string, number> = {};
    for (const v of validValues) {
      counts[String(v)] = (counts[String(v)] || 0) + 1;
    }
    const top = Object.entries(counts)
      .map(([value, count]) => ({
        value,
        count,
        percentage: Number(((count / validValues.length) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    meta.topCategories = top;
  }

  return meta;
}

export function parseCSVString(csvString: string, fileName: string): Promise<Dataset> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, any>>(csvString, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false,
      transformHeader: h => h.trim().replace(/^["']|["']$/g, ''),
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          reject(new Error('The uploaded file contains no data or could not be parsed.'));
          return;
        }

        const rawRows = results.data;
        const columnNames = results.meta.fields || Object.keys(rawRows[0]);

        // Infer types
        const colTypes: Record<string, ColumnType> = {};
        for (const col of columnNames) {
          const colRaw = rawRows.map(r => r[col]);
          colTypes[col] = inferColumnType(colRaw);
        }

        // Clean & coerce rows
        const cleanedData = rawRows.map(row => {
          const newRow: Record<string, any> = {};
          for (const col of columnNames) {
            newRow[col] = parseAndCleanValue(row[col], colTypes[col]);
          }
          return newRow;
        });

        // Compute metadata
        const columns = columnNames.map(col => {
          const values = cleanedData.map(r => r[col]);
          return calculateColumnMetadata(col, values, colTypes[col]);
        });

        // Compute overall quality score
        const totalCells = cleanedData.length * columnNames.length;
        const totalNulls = columns.reduce((acc, c) => acc + c.nullCount, 0);
        const completeness = totalCells > 0 ? ((totalCells - totalNulls) / totalCells) * 100 : 100;
        const qualityScore = Math.max(10, Math.min(100, Math.round(completeness)));

        const dataset: Dataset = {
          id: `ds_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
          fileName,
          sizeBytes: csvString.length,
          rowCount: cleanedData.length,
          columnCount: columnNames.length,
          columns,
          data: cleanedData,
          createdAt: Date.now(),
          qualityScore,
        };

        resolve(dataset);
      },
      error: (err: any) => {
        reject(err);
      },
    });
  });
}
