import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  Copy, 
  FileCheck, 
  Zap, 
  Eye, 
  Info,
  Sparkles
} from 'lucide-react';
import { Dataset, DataQualityReport, AnomalyItem } from '../types';
import { analyzeDataQuality } from '../services/dataEngine/dataQualityService';
import { detectDatasetAnomalies } from '../services/dataEngine/anomalyDetector';

interface DataQualityAuditViewProps {
  dataset: Dataset;
  onAskAboutQuality?: (prompt: string) => void;
}

export const DataQualityAuditView: React.FC<DataQualityAuditViewProps> = ({
  dataset,
  onAskAboutQuality,
}) => {
  const [zThreshold, setZThreshold] = useState(2.8);
  const [activeSubTab, setActiveSubTab] = useState<'audit' | 'anomalies'>('audit');

  const report: DataQualityReport = React.useMemo(() => {
    return analyzeDataQuality(dataset);
  }, [dataset]);

  const anomalies: AnomalyItem[] = React.useMemo(() => {
    return detectDatasetAnomalies(dataset, zThreshold);
  }, [dataset, zThreshold]);

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A': return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
      case 'B': return 'text-indigo-400 border-indigo-500/40 bg-indigo-500/10';
      case 'C': return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
      default: return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-16">
      {/* Top Banner with Health Grade */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {/* Overall Grade Card */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 text-center shadow-md">
          <div className={`flex h-20 w-20 items-center justify-center rounded-2xl border-2 text-3xl font-extrabold ${getGradeColor(report.letterGrade)}`}>
            {report.letterGrade}
          </div>
          <h3 className="mt-3 text-sm font-bold text-white">Overall Health Score</h3>
          <p className="text-xs text-zinc-400 mt-0.5 font-mono">{report.overallScore} / 100 Quality Index</p>
        </div>

        {/* Completeness Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Data Completeness</span>
            <FileCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-2xl font-bold text-white font-mono">{report.completenessPercentage}%</h4>
            <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-850 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${report.completenessPercentage}%` }}
              />
            </div>
          </div>
          <p className="text-[11px] text-zinc-400 font-mono">Validated across {report.totalRows.toLocaleString()} rows</p>
        </div>

        {/* Duplicate Rows Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Duplicate Rows</span>
            <Copy className="h-4 w-4 text-indigo-400" />
          </div>
          <div>
            <h4 className="text-2xl font-bold text-white font-mono">{report.duplicateRowCount}</h4>
            <p className="text-xs text-zinc-400 mt-1 font-mono">{report.duplicateRowPercentage}% duplicate rate</p>
          </div>
          <p className="text-[11px] text-zinc-400">{report.duplicateRowCount === 0 ? 'Zero exact duplicates' : 'Potential row redundancy'}</p>
        </div>

        {/* Anomalies Detected Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Statistical Outliers</span>
            <Zap className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <h4 className="text-2xl font-bold text-white font-mono">{anomalies.length}</h4>
            <p className="text-xs text-zinc-400 mt-1 font-mono">Flagged (|z| &gt; {zThreshold})</p>
          </div>
          <button
            onClick={() => setActiveSubTab('anomalies')}
            className="text-left text-[11px] font-semibold text-zinc-300 hover:text-white transition"
          >
            Inspect Outliers &rarr;
          </button>
        </div>
      </div>

      {/* Sub Tabs: Data Audit vs Outlier Scan */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveSubTab('audit')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            activeSubTab === 'audit'
              ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-zinc-700'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Column Quality Audit</span>
        </button>
        <button
          onClick={() => setActiveSubTab('anomalies')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            activeSubTab === 'anomalies'
              ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-zinc-700'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
          }`}
        >
          <Zap className="h-3.5 w-3.5" />
          <span>Statistical Outlier Engine ({anomalies.length})</span>
        </button>
      </div>

      {activeSubTab === 'audit' ? (
        <div className="space-y-6">
          {/* Identified Quality Issues */}
          {report.issues.length > 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-md">
              <h4 className="text-sm font-bold text-white mb-3">Identified Schema & Hygiene Advisories</h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {report.issues.map((issue, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl border p-3.5 text-xs flex items-start gap-3 ${
                      issue.severity === 'high'
                        ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                        : issue.severity === 'medium'
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                        : 'border-zinc-700/50 bg-zinc-900/70 text-zinc-200'
                    }`}
                  >
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{issue.column}</span>
                        <span className="rounded bg-black/40 px-1.5 py-0.5 text-[10px] uppercase font-mono">
                          {issue.type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-zinc-300">{issue.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Column Breakdown Table */}
          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/70 shadow-md">
            <div className="px-6 py-4 border-b border-zinc-850 flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">Column-by-Column Health Breakdown</h4>
              <span className="text-xs text-zinc-400 font-mono">{dataset.columns.length} columns analyzed</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400 font-mono text-[11px]">
                    <th className="px-4 py-3 font-semibold">Column Name</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Completeness</th>
                    <th className="px-4 py-3 font-semibold">Null Count</th>
                    <th className="px-4 py-3 font-semibold">Distinct Values</th>
                    <th className="px-4 py-3 font-semibold">Sample Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850 font-mono text-[11px]">
                  {dataset.columns.map((col) => {
                    const health = report.columnHealth[col.name];
                    const completeness = health ? health.completeness : 100;
                    return (
                      <tr key={col.name} className="hover:bg-zinc-900/40 transition">
                        <td className="px-4 py-3 font-medium text-white">{col.name}</td>
                        <td className="px-4 py-3 text-zinc-400 uppercase">{col.type}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={completeness < 90 ? 'text-amber-400 font-semibold' : 'text-emerald-400'}>
                              {completeness}%
                            </span>
                            <div className="h-1.5 w-16 rounded-full bg-zinc-800 overflow-hidden hidden sm:block">
                              <div
                                className={`h-full rounded-full ${completeness < 90 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                                style={{ width: `${completeness}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-400">{col.nullCount}</td>
                        <td className="px-4 py-3 text-zinc-300">{col.distinctCount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-zinc-400 truncate max-w-[160px]">
                          {col.sampleValues[0] !== undefined ? String(col.sampleValues[0]) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Outlier & Anomaly Scan Tab */
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 shadow-md">
            <div>
              <h4 className="text-sm font-bold text-white">Statistical Outlier Sensitivity</h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                Adjust standard deviation sigma threshold (|z| score) for anomaly detection
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-300 font-mono font-bold">|z| &gt; {zThreshold}</span>
              <input
                type="range"
                min="2.0"
                max="4.0"
                step="0.2"
                value={zThreshold}
                onChange={(e) => setZThreshold(parseFloat(e.target.value))}
                className="w-32 accent-white cursor-pointer"
              />
            </div>
          </div>

          <div className="space-y-3">
            {anomalies.map((anom) => (
              <div
                key={anom.id}
                className={`rounded-2xl border p-4 transition shadow-md ${
                  anom.severity === 'critical'
                    ? 'border-rose-500/40 bg-rose-500/5'
                    : anom.severity === 'warning'
                    ? 'border-amber-500/40 bg-amber-500/5'
                    : 'border-zinc-800 bg-zinc-950/70'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase font-mono ${
                      anom.severity === 'critical' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {anom.severity}
                    </span>
                    <h5 className="text-xs font-bold text-white">
                      Row #{anom.rowIndex} • Column &apos;{anom.column}&apos;
                    </h5>
                  </div>
                  <div className="font-mono text-xs font-semibold text-zinc-300">
                    Value: <span className="text-white font-bold">{Number(anom.value).toLocaleString()}</span> (Z-Score: {anom.score})
                  </div>
                </div>

                <p className="mt-2 text-xs text-zinc-300 leading-relaxed font-sans">
                  {anom.explanation}
                </p>

                {/* Row Context Snapshot */}
                <div className="mt-3 rounded-xl bg-black/80 p-2.5 font-mono text-[11px] text-zinc-400 border border-zinc-850 overflow-x-auto">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Record Snapshot:</span>
                  <div className="flex gap-4">
                    {Object.entries(anom.rowData).slice(0, 5).map(([k, v]) => (
                      <span key={k}>
                        <span className="text-zinc-500">{k}:</span> <span className="text-zinc-300">{String(v)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
