import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Download, 
  SlidersHorizontal,
  Info,
  Hash,
  Calendar,
  Type,
  CheckSquare,
  Sparkles
} from 'lucide-react';
import { Dataset, ColumnMetadata, ColumnType } from '../types';

interface DataGridProps {
  dataset: Dataset;
  onAskAboutColumn?: (colName: string) => void;
}

export const DataGrid: React.FC<DataGridProps> = ({ dataset, onAskAboutColumn }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selectedColumnStats, setSelectedColumnStats] = useState<ColumnMetadata | null>(null);

  // Filter & Sort
  const filteredAndSortedData = useMemo(() => {
    let result = [...dataset.data];

    // 1. Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(row => {
        return Object.values(row).some(val => 
          val !== null && val !== undefined && String(val).toLowerCase().includes(term)
        );
      });
    }

    // 2. Sorting
    if (sortColumn) {
      result.sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];

        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }

    return result;
  }, [dataset.data, searchTerm, sortColumn, sortDirection]);

  // Pagination
  const totalRows = filteredAndSortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedData = filteredAndSortedData.slice(startIndex, startIndex + pageSize);

  const handleSort = (colName: string) => {
    if (sortColumn === colName) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
      }
    } else {
      setSortColumn(colName);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const exportCurrentViewToCSV = () => {
    const keys = dataset.columns.map(c => c.name);
    const header = keys.join(',');
    const rows = filteredAndSortedData.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(',')).join('\n');
    const blob = new Blob([`${header}\n${rows}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${dataset.name}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTypeIcon = (type: ColumnType) => {
    switch (type) {
      case 'number': return <Hash className="h-3 w-3 text-emerald-400" />;
      case 'date': return <Calendar className="h-3 w-3 text-cyan-400" />;
      case 'boolean': return <CheckSquare className="h-3 w-3 text-amber-400" />;
      default: return <Type className="h-3 w-3 text-indigo-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Controls: Search, Page Size, Export */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={`Search across all ${dataset.rowCount.toLocaleString()} rows and ${dataset.columnCount} columns...`}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/90 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Page size picker */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300">
            <span className="text-slate-400">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-transparent font-medium text-white focus:outline-none cursor-pointer"
            >
              <option value={10} className="bg-slate-900">10</option>
              <option value={15} className="bg-slate-900">15</option>
              <option value={25} className="bg-slate-900">25</option>
              <option value={50} className="bg-slate-900">50</option>
              <option value={100} className="bg-slate-900">100</option>
            </select>
          </div>

          <button
            onClick={exportCurrentViewToCSV}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-700 hover:bg-slate-800 transition"
          >
            <Download className="h-3.5 w-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Interactive Table Container */}
      <div className="flex-1 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm flex flex-col shadow-inner">
        <div className="overflow-x-auto flex-1 scrollbar-thin">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 sticky top-0 z-10">
                <th className="px-3.5 py-3 font-semibold text-slate-400 w-12 text-center">#</th>
                {dataset.columns.map((col) => {
                  const isSorted = sortColumn === col.name;
                  return (
                    <th
                      key={col.name}
                      className="px-3.5 py-3 font-semibold text-slate-300 select-none group whitespace-nowrap"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => handleSort(col.name)}
                          className="flex items-center gap-1.5 hover:text-white transition font-medium"
                        >
                          {getTypeIcon(col.type)}
                          <span>{col.name}</span>
                          {isSorted ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="h-3.5 w-3.5 text-indigo-400" />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5 text-indigo-400" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-slate-500 opacity-0 group-hover:opacity-100 transition" />
                          )}
                        </button>

                        <button
                          onClick={() => setSelectedColumnStats(col)}
                          title="View column statistics"
                          className="text-slate-400 hover:text-indigo-400 p-0.5 rounded transition"
                        >
                          <Info className="h-3 w-3" />
                        </button>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {paginatedData.length > 0 ? (
                paginatedData.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className="hover:bg-slate-800/40 transition-colors duration-150 odd:bg-slate-950/20"
                  >
                    <td className="px-3.5 py-2.5 text-center text-slate-400 select-none">
                      {startIndex + rowIdx + 1}
                    </td>
                    {dataset.columns.map((col) => {
                      const val = row[col.name];
                      const isNull = val === null || val === undefined;
                      const isNumeric = col.type === 'number';

                      return (
                        <td
                          key={col.name}
                          className={`px-3.5 py-2.5 whitespace-nowrap ${
                            isNull
                              ? 'text-slate-600 italic'
                              : isNumeric
                              ? 'text-indigo-200'
                              : 'text-slate-300'
                          }`}
                        >
                          {isNull ? 'null' : typeof val === 'number' ? val.toLocaleString() : String(val)}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={dataset.columns.length + 1}
                    className="py-12 text-center text-slate-400"
                  >
                    No records found matching your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/80 px-4 py-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>
              Showing <span className="font-medium text-white">{totalRows > 0 ? startIndex + 1 : 0}</span> to{' '}
              <span className="font-medium text-white">{Math.min(startIndex + pageSize, totalRows)}</span> of{' '}
              <span className="font-medium text-white">{totalRows.toLocaleString()}</span> entries
            </span>
            {searchTerm && (
              <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] text-indigo-300">
                Filtered from {dataset.rowCount.toLocaleString()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={safeCurrentPage === 1}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="px-2 text-xs font-medium text-white">
              Page {safeCurrentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={safeCurrentPage === totalPages}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Column Statistics Drawer / Modal */}
      {selectedColumnStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {getTypeIcon(selectedColumnStats.type)}
                <h3 className="font-bold text-white text-sm">{selectedColumnStats.name}</h3>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 uppercase">
                  {selectedColumnStats.type}
                </span>
              </div>
              <button
                onClick={() => setSelectedColumnStats(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-slate-950/60 p-2.5 border border-slate-800/60">
                  <span className="text-[10px] text-slate-400 uppercase">Total Records</span>
                  <p className="font-semibold text-white mt-0.5">{selectedColumnStats.totalCount.toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-slate-950/60 p-2.5 border border-slate-800/60">
                  <span className="text-[10px] text-slate-400 uppercase">Unique Values</span>
                  <p className="font-semibold text-white mt-0.5">{selectedColumnStats.distinctCount.toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-slate-950/60 p-2.5 border border-slate-800/60">
                  <span className="text-[10px] text-slate-400 uppercase">Null / Missing</span>
                  <p className="font-semibold text-white mt-0.5">
                    {selectedColumnStats.nullCount.toLocaleString()} ({((selectedColumnStats.nullCount / selectedColumnStats.totalCount) * 100).toFixed(1)}%)
                  </p>
                </div>
                <div className="rounded-xl bg-slate-950/60 p-2.5 border border-slate-800/60">
                  <span className="text-[10px] text-slate-400 uppercase">Completeness</span>
                  <p className="font-semibold text-emerald-400 mt-0.5">
                    {(100 - (selectedColumnStats.nullCount / selectedColumnStats.totalCount) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              {selectedColumnStats.type === 'number' && (
                <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60 space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Mean (Average):</span>
                    <span className="text-white font-semibold">{selectedColumnStats.mean?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Median (50th %):</span>
                    <span className="text-white font-semibold">{selectedColumnStats.median?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Std Deviation:</span>
                    <span className="text-white font-semibold">{selectedColumnStats.stdDev?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Minimum:</span>
                    <span className="text-white font-semibold">{selectedColumnStats.min?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Maximum:</span>
                    <span className="text-white font-semibold">{selectedColumnStats.max?.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {selectedColumnStats.topCategories && selectedColumnStats.topCategories.length > 0 && (
                <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60 space-y-2">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Top Frequency Distribution</span>
                  <div className="space-y-1.5">
                    {selectedColumnStats.topCategories.map(cat => (
                      <div key={cat.value} className="space-y-0.5">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-300 truncate max-w-[200px]">{cat.value}</span>
                          <span className="text-slate-400">{cat.percentage}% ({cat.count})</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${cat.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex gap-2">
              {onAskAboutColumn && (
                <button
                  onClick={() => {
                    onAskAboutColumn(selectedColumnStats.name);
                    setSelectedColumnStats(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Ask AI About This Column
                </button>
              )}
              <button
                onClick={() => setSelectedColumnStats(null)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
