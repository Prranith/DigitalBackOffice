import { Dataset } from '../../types';

export interface SQLQueryResult {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  executionTimeMs: number;
  error?: string;
}

/**
 * Case-insensitive, punctuation-tolerant column value getter.
 * Supports headers like "Customer Id", "customer_id", "CUSTOMER_ID", "CustomerID".
 */
export function getRowValue(row: Record<string, any>, colName: string): any {
  if (!row || !colName) return undefined;
  if (row[colName] !== undefined) return row[colName];

  // Try trimmed direct match
  const trimmed = colName.trim().replace(/^[`'"]|[`'"]$/g, '');
  if (row[trimmed] !== undefined) return row[trimmed];

  const targetNormalized = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const key of Object.keys(row)) {
    const keyNormalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (keyNormalized === targetNormalized) {
      return row[key];
    }
  }
  return undefined;
}

export function executeSQLQuery(
  query: string,
  datasets: Dataset[]
): SQLQueryResult {
  const startTime = performance.now();
  const cleanQuery = query.trim().replace(/;$/, '');

  try {
    if (!cleanQuery.toUpperCase().startsWith('SELECT')) {
      throw new Error('Only SELECT queries are supported in the analytical engine.');
    }

    // Build dataset registry by lowercase name
    const tableMap: Record<string, Dataset> = {};
    for (const ds of datasets) {
      const sanitizedName = ds.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      tableMap[sanitizedName] = ds;
      tableMap[ds.fileName.toLowerCase().replace(/[^a-z0-9_]/g, '_')] = ds;
    }

    // Parse simple components
    const fromMatch = cleanQuery.match(/FROM\s+([a-zA-Z0-9_`"']+)/i);
    if (!fromMatch) {
      throw new Error('Could not identify source table in FROM clause.');
    }

    const requestedTable = fromMatch[1].replace(/[`'"]/g, '').toLowerCase();
    // Match table or pick first available
    const sourceDs = tableMap[requestedTable] || datasets.find(d => {
      const n = d.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      return n.includes(requestedTable) || requestedTable.includes(n);
    }) || datasets[0];

    if (!sourceDs) {
      throw new Error(`Table '${requestedTable}' not found in active datasets.`);
    }

    let currentRows: Record<string, any>[] = [...sourceDs.data];

    // Check for JOIN clause (e.g. JOIN customers ON sales.customer_id = customers.id)
    const joinMatch = cleanQuery.match(/JOIN\s+([a-zA-Z0-9_]+)\s+(?:ON\s+([a-zA-Z0-9_.]+)\s*=\s*([a-zA-Z0-9_.]+))/i);
    if (joinMatch) {
      const joinTable = joinMatch[1].toLowerCase();
      const leftKey = joinMatch[2].split('.').pop() || '';
      const rightKey = joinMatch[3].split('.').pop() || '';

      const targetDs = tableMap[joinTable] || datasets.find(d => d.name.toLowerCase().includes(joinTable));
      if (targetDs) {
        const joined: Record<string, any>[] = [];
        const rightLookup = new Map<string, Record<string, any>>();
        for (const r of targetDs.data) {
          const val = getRowValue(r, rightKey);
          if (val !== undefined) {
            rightLookup.set(String(val), r);
          }
        }

        for (const lRow of currentRows) {
          const lVal = getRowValue(lRow, leftKey);
          const match = lVal !== undefined ? rightLookup.get(String(lVal)) : undefined;
          if (match) {
            joined.push({ ...lRow, ...match });
          }
        }
        currentRows = joined;
      }
    }

    // Check WHERE clause
    const whereMatch = cleanQuery.match(/WHERE\s+(.*?)(?=\s+(GROUP|ORDER|LIMIT|$))/i);
    if (whereMatch) {
      const condition = whereMatch[1].trim();
      currentRows = currentRows.filter(row => evaluateCondition(row, condition));
    }

    // Check GROUP BY clause
    const groupMatch = cleanQuery.match(/GROUP\s+BY\s+(.*?)(?=\s+(ORDER|LIMIT|$))/i);
    const selectMatch = cleanQuery.match(/SELECT\s+(.*?)\s+FROM/i);
    const selectFields = selectMatch ? selectMatch[1].trim() : '*';

    if (groupMatch) {
      const rawGroupCol = groupMatch[1].trim().split(',')[0].trim().replace(/[`'"]/g, '');
      const groups = new Map<string, Record<string, any>[]>();

      for (const row of currentRows) {
        const rawVal = getRowValue(row, rawGroupCol);
        const key = rawVal !== null && rawVal !== undefined && String(rawVal).trim() !== '' 
          ? String(rawVal).trim() 
          : 'Unknown / Other';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(row);
      }

      const aggregatedRows: Record<string, any>[] = [];
      for (const [key, rows] of groups.entries()) {
        const aggRow: Record<string, any> = { [rawGroupCol]: key, record_count: rows.length };

        // Parse SUM(...)
        const sumMatches = selectFields.match(/SUM\((.*?)\)(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?/gi);
        if (sumMatches) {
          for (const s of sumMatches) {
            const inner = s.match(/SUM\((.*?)\)(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?/i);
            if (inner) {
              const col = inner[1].trim().replace(/[`'"]/g, '');
              const alias = inner[2] || `total_${col.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
              const total = rows.reduce((acc, r) => {
                const val = Number(getRowValue(r, col));
                return acc + (isNaN(val) ? 0 : val);
              }, 0);
              aggRow[alias] = Number(total.toFixed(2));
            }
          }
        }

        // Parse AVG(...)
        const avgMatches = selectFields.match(/AVG\((.*?)\)(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?/gi);
        if (avgMatches) {
          for (const a of avgMatches) {
            const inner = a.match(/AVG\((.*?)\)(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?/i);
            if (inner) {
              const col = inner[1].trim().replace(/[`'"]/g, '');
              const alias = inner[2] || `avg_${col.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
              const valid = rows
                .map(r => Number(getRowValue(r, col)))
                .filter(n => !isNaN(n));
              const avg = valid.length > 0 ? valid.reduce((acc, v) => acc + v, 0) / valid.length : 0;
              aggRow[alias] = Number(avg.toFixed(2));
            }
          }
        }

        // Parse COUNT(*) or COUNT(col)
        const countMatches = selectFields.match(/COUNT\((.*?)\)(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?/gi);
        if (countMatches) {
          for (const c of countMatches) {
            const inner = c.match(/COUNT\((.*?)\)(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?/i);
            if (inner) {
              const col = inner[1].trim().replace(/[`'"]/g, '');
              const alias = inner[2] || 'count';
              if (col === '*') {
                aggRow[alias] = rows.length;
              } else {
                const valid = rows.filter(r => {
                  const val = getRowValue(r, col);
                  return val !== null && val !== undefined && String(val).trim() !== '';
                });
                aggRow[alias] = valid.length;
              }
            }
          }
        }

        aggregatedRows.push(aggRow);
      }
      currentRows = aggregatedRows;
    }

    // Check ORDER BY clause
    const orderMatch = cleanQuery.match(/ORDER\s+BY\s+([a-zA-Z0-9_`"']+)(?:\s+(ASC|DESC))?/i);
    if (orderMatch) {
      const orderCol = orderMatch[1].trim().replace(/[`'"]/g, '');
      const isDesc = (orderMatch[2] || 'ASC').toUpperCase() === 'DESC';
      currentRows.sort((a, b) => {
        const valA = getRowValue(a, orderCol);
        const valB = getRowValue(b, orderCol);
        if (typeof valA === 'number' && typeof valB === 'number') {
          return isDesc ? valB - valA : valA - valB;
        }
        return isDesc
          ? String(valB || '').localeCompare(String(valA || ''))
          : String(valA || '').localeCompare(String(valB || ''));
      });
    }

    // Check LIMIT clause
    const limitMatch = cleanQuery.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
      const limitVal = parseInt(limitMatch[1], 10);
      currentRows = currentRows.slice(0, limitVal);
    } else {
      // Default cap to 500 rows for memory safety
      currentRows = currentRows.slice(0, 500);
    }

    const columns = currentRows.length > 0 ? Object.keys(currentRows[0]) : [];

    return {
      columns,
      rows: currentRows,
      rowCount: currentRows.length,
      executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
    };
  } catch (err: any) {
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
      error: err.message || 'Error executing SQL expression',
    };
  }
}

function evaluateCondition(row: Record<string, any>, condition: string): boolean {
  try {
    // Handle IS NOT NULL
    const notNullMatch = condition.match(/([a-zA-Z0-9_`"']+)\s+IS\s+NOT\s+NULL/i);
    if (notNullMatch) {
      const col = notNullMatch[1].replace(/[`'"]/g, '');
      const val = getRowValue(row, col);
      return val !== null && val !== undefined && String(val).trim() !== '';
    }

    // Handle comparison e.g. column > 100 or column = 'Value'
    const opMatch = condition.match(/([a-zA-Z0-9_`"']+)\s*(=|!=|<>|>|<|>=|<=)\s*(.*)/i);
    if (opMatch) {
      const col = opMatch[1].trim().replace(/[`'"]/g, '');
      const op = opMatch[2] === '<>' ? '!=' : opMatch[2];
      let expected = opMatch[3].trim().replace(/^['"]|['"]$/g, '');
      const actual = getRowValue(row, col);

      if (typeof actual === 'number' || (!isNaN(Number(actual)) && !isNaN(Number(expected)))) {
        const numAct = Number(actual);
        const numExp = Number(expected);
        if (op === '=') return numAct === numExp;
        if (op === '!=') return numAct !== numExp;
        if (op === '>') return numAct > numExp;
        if (op === '<') return numAct < numExp;
        if (op === '>=') return numAct >= numExp;
        if (op === '<=') return numAct <= numExp;
      } else {
        const strAct = String(actual || '').toLowerCase();
        const strExp = expected.toLowerCase();
        if (op === '=') return strAct === strExp;
        if (op === '!=') return strAct !== strExp;
      }
    }
    return true;
  } catch {
    return true;
  }
}
