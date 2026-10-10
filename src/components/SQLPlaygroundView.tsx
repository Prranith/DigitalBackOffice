import React, { useState } from 'react';
import { 
  Play, 
  Copy, 
  Check, 
  Terminal, 
  Database, 
  Clock, 
  AlertCircle, 
  Code2, 
  Sparkles,
  Layers
} from 'lucide-react';
import { Dataset } from '../types';
import { executeSQLQuery, SQLQueryResult } from '../services/dataEngine/sqlExecutor';

interface SQLPlaygroundViewProps {
  datasets: Dataset[];
  initialQuery?: string;
}

export const SQLPlaygroundView: React.FC<SQLPlaygroundViewProps> = ({
  datasets,
  initialQuery,
}) => {
  const primaryDs = datasets[0];
  const primaryTableName = (primaryDs?.name || 'dataset').toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const mainMetric = primaryDs?.columns.find(c => c.type === 'number')?.name || 'Sales';
  const mainDim = primaryDs?.columns.find(c => c.type !== 'number')?.name || 'Category';

  const defaultSQL = initialQuery || `SELECT 
    ${mainDim},
    COUNT(*) AS total_orders,
    SUM(${mainMetric}) AS total_${mainMetric.toLowerCase()},
    AVG(${mainMetric}) AS avg_${mainMetric.toLowerCase()}
FROM ${primaryTableName}
WHERE ${mainMetric} IS NOT NULL
GROUP BY ${mainDim}
ORDER BY total_${mainMetric.toLowerCase()} DESC
LIMIT 10;`;

  const [query, setQuery] = useState(defaultSQL);
  const [pandasMode, setPandasMode] = useState(false);
  const [queryResult, setQueryResult] = useState<SQLQueryResult | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleRunQuery = () => {
    const result = executeSQLQuery(query, datasets);
    setQueryResult(result);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(query);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const sampleQueries = [
    {
      title: 'Top Group Contributions',
      sql: `SELECT ${mainDim}, SUM(${mainMetric}) AS total_${mainMetric.toLowerCase()} FROM ${primaryTableName} GROUP BY ${mainDim} ORDER BY total_${mainMetric.toLowerCase()} DESC LIMIT 5;`,
    },
    {
      title: 'High Value Outliers',
      sql: `SELECT * FROM ${primaryTableName} WHERE ${mainMetric} > 500 ORDER BY ${mainMetric} DESC LIMIT 10;`,
    },
    {
      title: 'Record Aggregations',
      sql: `SELECT COUNT(*) AS total_count, AVG(${mainMetric}) AS average_val FROM ${primaryTableName};`,
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-full max-w-7xl mx-auto w-full pb-16">
      {/* Left: Schema Explorer */}
      <div className="w-full lg:w-72 shrink-0 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-4 shadow-md">
        <div className="flex items-center gap-2 border-b border-zinc-850 pb-3">
          <Database className="h-4 w-4 text-indigo-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Active Schema Tree</h3>
        </div>

        <div className="space-y-3 max-h-[70vh] overflow-y-auto scrollbar-thin">
          {datasets.map((ds) => {
            const safeName = ds.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
            return (
              <div key={ds.id} className="rounded-xl border border-zinc-850 bg-zinc-900/60 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-zinc-100 truncate">{safeName}</span>
                  <span className="text-[10px] text-zinc-500 font-mono">{ds.rowCount} rows</span>
                </div>
                <div className="space-y-1 font-mono text-[11px] max-h-40 overflow-y-auto pl-1 scrollbar-thin">
                  {ds.columns.map(c => (
                    <div key={c.name} className="flex justify-between text-zinc-400">
                      <span className="truncate max-w-[120px]">{c.name}</span>
                      <span className="text-[10px] text-zinc-500 uppercase">{c.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Sample Queries */}
        <div className="pt-2 border-t border-zinc-850 space-y-2">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block font-mono">Templates</span>
          {sampleQueries.map((q, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(q.sql);
                setQueryResult(null);
              }}
              className="w-full text-left rounded-lg bg-zinc-900/60 p-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-850 border border-zinc-850 transition"
            >
              {q.title}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Code Editor & Result Grid */}
      <div className="flex-1 flex flex-col space-y-4 min-w-0">
        {/* Editor Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 overflow-hidden flex flex-col shadow-xl">
          {/* Editor Header Bar */}
          <div className="flex items-center justify-between border-b border-zinc-850 px-4 py-2.5 bg-black">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-bold text-white font-mono">SQL Query Playground</span>
              <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300 font-mono border border-zinc-700">
                In-Memory Client Engine
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 hover:text-white transition"
              >
                {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{isCopied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={handleRunQuery}
                className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-zinc-200 transition shadow-md shadow-white/5"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Run Query</span>
              </button>
            </div>
          </div>

          {/* Text Area Code Editor */}
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={7}
            className="w-full resize-y bg-black p-4 font-mono text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none selection:bg-zinc-800"
            placeholder="Write ANSI SQL query (SELECT, FROM, WHERE, GROUP BY, ORDER BY, LIMIT)..."
          />
        </div>

        {/* Execution Results View */}
        {queryResult && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 overflow-hidden flex flex-col shadow-inner">
            <div className="flex items-center justify-between border-b border-zinc-850 px-4 py-2.5 bg-black text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">Query Results</span>
                <span className="rounded bg-zinc-850 px-2 py-0.5 text-[11px] text-zinc-300 font-mono border border-zinc-800">
                  {queryResult.rowCount} rows
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-400 font-mono text-[11px]">
                <Clock className="h-3.5 w-3.5 text-emerald-400" />
                <span>Execution: {queryResult.executionTimeMs} ms</span>
              </div>
            </div>

            {queryResult.error ? (
              <div className="p-6 flex items-center gap-3 text-rose-300 text-xs">
                <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
                <div>
                  <p className="font-semibold text-rose-200">Execution Error:</p>
                  <p className="mt-0.5 font-mono">{queryResult.error}</p>
                </div>
              </div>
            ) : queryResult.rows.length > 0 ? (
              <div className="overflow-x-auto max-h-[500px] scrollbar-thin">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-black text-zinc-400 sticky top-0 z-10">
                      {queryResult.columns.map((c) => (
                        <th key={c} className="px-3.5 py-2.5 font-semibold font-mono text-zinc-300">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850 font-mono text-[11px]">
                    {queryResult.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-zinc-900/50">
                        {queryResult.columns.map((c) => (
                          <td key={c} className="px-3.5 py-2 text-zinc-200 whitespace-nowrap">
                            {row[c] !== null && row[c] !== undefined ? String(row[c]) : 'null'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-zinc-400">
                Query executed successfully with 0 matching rows.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
