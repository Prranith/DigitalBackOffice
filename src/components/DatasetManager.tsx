import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Plus, 
  Sparkles, 
  Database, 
  GitMerge,
  ArrowRight,
  ShieldCheck,
  X
} from 'lucide-react';
import { Dataset } from '../types';
import { parseCSVString } from '../services/dataEngine/csvParser';
import { loadSampleDataset } from '../services/sampleDatasets';

interface DatasetManagerProps {
  isOpen: boolean;
  onClose: () => void;
  datasets: Dataset[];
  activeDatasetId: string;
  setActiveDatasetId: (id: string) => void;
  onAddDataset: (dataset: Dataset) => void;
  onRemoveDataset: (id: string) => void;
}

export const DatasetManager: React.FC<DatasetManagerProps> = ({
  isOpen,
  onClose,
  datasets,
  activeDatasetId,
  setActiveDatasetId,
  onAddDataset,
  onRemoveDataset,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [joinLeftDs, setJoinLeftDs] = useState<string>(datasets[0]?.id || '');
  const [joinRightDs, setJoinRightDs] = useState<string>(datasets[1]?.id || '');
  const [joinLeftKey, setJoinLeftKey] = useState<string>('');
  const [joinRightKey, setJoinRightKey] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
          throw new Error(`File '${file.name}' is not a CSV. Please upload standard .csv files.`);
        }
        const text = await file.text();
        const dataset = await parseCSVString(text, file.name);
        onAddDataset(dataset);
        setActiveDatasetId(dataset.id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error processing CSV file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadSample = async (type: 'ecommerce' | 'saas' | 'supply_chain') => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const sample = await loadSampleDataset(type);
      onAddDataset(sample);
      setActiveDatasetId(sample.id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error loading sample dataset');
    } finally {
      setIsProcessing(false);
    }
  };

  // Cross-table join generator
  const handlePerformJoin = () => {
    const leftDs = datasets.find(d => d.id === joinLeftDs);
    const rightDs = datasets.find(d => d.id === joinRightDs);
    if (!leftDs || !rightDs || !joinLeftKey || !joinRightKey) return;

    setIsProcessing(true);
    try {
      const rightMap = new Map<string, Record<string, any>>();
      for (const row of rightDs.data) {
        rightMap.set(String(row[joinRightKey]), row);
      }

      const joinedRows: Record<string, any>[] = [];
      for (const leftRow of leftDs.data) {
        const keyVal = String(leftRow[joinLeftKey]);
        const match = rightMap.get(keyVal);
        if (match) {
          joinedRows.push({ ...leftRow, ...match });
        }
      }

      if (joinedRows.length === 0) {
        throw new Error(`No matching records found between '${joinLeftKey}' and '${joinRightKey}'.`);
      }

      // Convert back to CSV text & parse
      const keys = Object.keys(joinedRows[0]);
      const csvHeader = keys.join(',');
      const csvRows = joinedRows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(',')).join('\n');
      const csvString = `${csvHeader}\n${csvRows}`;

      parseCSVString(csvString, `${leftDs.name}_JOIN_${rightDs.name}.csv`).then(newDs => {
        onAddDataset(newDs);
        setActiveDatasetId(newDs.id);
        setIsProcessing(false);
      });
    } catch (e: any) {
      setErrorMessage(e.message || 'Error executing table join');
      setIsProcessing(false);
    }
  };

  const selectedLeft = datasets.find(d => d.id === joinLeftDs);
  const selectedRight = datasets.find(d => d.id === joinRightDs);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Dataset Management & Ingestion</h2>
              <p className="text-xs text-slate-400">Upload multiple CSV files, load enterprise samples, or join datasets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFileUpload(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition ${
              isDragging
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-slate-700/80 bg-slate-950/50 hover:border-indigo-500/50 hover:bg-slate-950/80'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".csv"
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 ring-1 ring-indigo-500/30 group-hover:scale-110 transition duration-300">
              <Upload className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-semibold text-white">
              {isProcessing ? 'Processing & Validating CSV Schema...' : 'Drop CSV files here or click to browse'}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Supports multi-file upload, automatic delimiter sniffing, and schema profiling
            </p>
          </div>

          {/* Quick Load Sample Datasets */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Instant Enterprise Sample Datasets
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                disabled={isProcessing}
                onClick={() => handleLoadSample('ecommerce')}
                className="flex flex-col text-left rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 hover:border-indigo-500/40 hover:bg-slate-800/40 transition group"
              >
                <span className="text-xs font-semibold text-white group-hover:text-indigo-300">Global E-Commerce Sales</span>
                <span className="text-[11px] text-slate-400 mt-1">1,000+ orders across 4 regions with sales, profit, categories</span>
                <span className="mt-2 text-[10px] font-mono text-emerald-400">11 columns • Sales & Margins</span>
              </button>

              <button
                disabled={isProcessing}
                onClick={() => handleLoadSample('saas')}
                className="flex flex-col text-left rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 hover:border-indigo-500/40 hover:bg-slate-800/40 transition group"
              >
                <span className="text-xs font-semibold text-white group-hover:text-indigo-300">SaaS MRR & Churn Analytics</span>
                <span className="text-[11px] text-slate-400 mt-1">Subscription tiers, usage hours, NPS scores, and churn tags</span>
                <span className="mt-2 text-[10px] font-mono text-indigo-400">11 columns • MRR & Retention</span>
              </button>

              <button
                disabled={isProcessing}
                onClick={() => handleLoadSample('supply_chain')}
                className="flex flex-col text-left rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 hover:border-indigo-500/40 hover:bg-slate-800/40 transition group"
              >
                <span className="text-xs font-semibold text-white group-hover:text-indigo-300">Supply Chain Logistics</span>
                <span className="text-[11px] text-slate-400 mt-1">Origin warehouses, shipping carriers, lead times, defect rates</span>
                <span className="mt-2 text-[10px] font-mono text-cyan-400">9 columns • Operations & SLA</span>
              </button>
            </div>
          </div>

          {/* Active Datasets List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Active Ingested Datasets ({datasets.length})
              </h3>
            </div>
            <div className="space-y-2">
              {datasets.map((d) => (
                <div
                  key={d.id}
                  className={`flex items-center justify-between rounded-xl border p-3.5 transition ${
                    d.id === activeDatasetId
                      ? 'border-indigo-500/60 bg-indigo-950/20'
                      : 'border-slate-800 bg-slate-950/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-indigo-400">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{d.name}</span>
                        {d.id === activeDatasetId && (
                          <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-medium text-indigo-300">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        {d.rowCount.toLocaleString()} rows • {d.columnCount} columns • {(d.sizeBytes / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400 ring-1 ring-emerald-500/20">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Score: {d.qualityScore}%</span>
                    </div>

                    {d.id !== activeDatasetId && (
                      <button
                        onClick={() => setActiveDatasetId(d.id)}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
                      >
                        Set Active
                      </button>
                    )}

                    {datasets.length > 1 && (
                      <button
                        onClick={() => onRemoveDataset(d.id)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 transition"
                        title="Remove dataset"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Multi-File Cross-Table JOIN Assistant (Bonus) */}
          {datasets.length >= 2 && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="flex items-center gap-2 mb-3">
                <GitMerge className="h-4 w-4 text-violet-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Cross-Table Join Engine (Bonus Feature)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Merge two loaded tables into a synthesized unified dataset based on a common matching column.
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Left Table & Key */}
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-slate-400">Primary Table (Left)</label>
                  <select
                    value={joinLeftDs}
                    onChange={(e) => {
                      setJoinLeftDs(e.target.value);
                      setJoinLeftKey('');
                    }}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200"
                  >
                    {datasets.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  <select
                    value={joinLeftKey}
                    onChange={(e) => setJoinLeftKey(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200"
                  >
                    <option value="">Select Join Column...</option>
                    {selectedLeft?.columns.map(c => (
                      <option key={c.name} value={c.name}>{c.name} ({c.type})</option>
                    ))}
                  </select>
                </div>

                {/* Right Table & Key */}
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-slate-400">Secondary Table (Right)</label>
                  <select
                    value={joinRightDs}
                    onChange={(e) => {
                      setJoinRightDs(e.target.value);
                      setJoinRightKey('');
                    }}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200"
                  >
                    {datasets.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  <select
                    value={joinRightKey}
                    onChange={(e) => setJoinRightKey(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200"
                  >
                    <option value="">Select Join Column...</option>
                    {selectedRight?.columns.map(c => (
                      <option key={c.name} value={c.name}>{c.name} ({c.type})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  disabled={!joinLeftKey || !joinRightKey || joinLeftDs === joinRightDs}
                  onClick={handlePerformJoin}
                  className="flex items-center gap-2 rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <GitMerge className="h-3.5 w-3.5" />
                  <span>Execute Multi-Table Join</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-800 px-6 py-4 bg-slate-950/60">
          <button
            onClick={onClose}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-md shadow-indigo-600/20"
          >
            Done & Return to Analyst
          </button>
        </div>
      </div>
    </div>
  );
};
