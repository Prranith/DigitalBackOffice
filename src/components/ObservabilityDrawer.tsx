import React, { useState, useEffect } from 'react';
import { 
  X, 
  Activity, 
  Zap, 
  RotateCcw, 
  Clock, 
  Layers, 
  CheckCircle, 
  Database,
  Server,
  Trash2
} from 'lucide-react';
import { ExecutionLog } from '../types';

interface ObservabilityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logs: ExecutionLog[];
  onClearLogs: () => void;
}

export const ObservabilityDrawer: React.FC<ObservabilityDrawerProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
}) => {
  const [stats, setStats] = useState<any>({
    hits: 0,
    misses: 0,
    idempotentHits: 0,
    totalRequests: 0,
    hitRatePercentage: 0,
    entries: 0,
    uptimeSeconds: 0,
  });

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/cache/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStats();
      const interval = setInterval(fetchStats, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleClearCache = async () => {
    try {
      await fetch('/api/cache/clear', { method: 'POST' });
      fetchStats();
    } catch {
      // Fail safely
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-sm">
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md border-l border-slate-800 bg-slate-900 p-6 shadow-2xl flex flex-col justify-between">
          <div className="space-y-6 flex-1 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Activity className="h-4 w-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">System Observability & Cache</h3>
                  <p className="text-[11px] text-slate-400">Telemetry metrics, idempotency, and logs</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Cache & Idempotency Metrics */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  High-Concurrency Cache
                </span>
                <button
                  onClick={handleClearCache}
                  className="flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700 transition"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Purge Cache</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Cache Hit Rate</span>
                  <p className="text-xl font-bold text-emerald-400 font-mono mt-0.5">
                    {stats.hitRatePercentage || 0}%
                  </p>
                  <span className="text-[10px] text-slate-500">
                    {stats.hits} hits • {stats.misses} misses
                  </span>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Idempotency Hits</span>
                  <p className="text-xl font-bold text-indigo-400 font-mono mt-0.5">
                    {stats.idempotentHits || 0}
                  </p>
                  <span className="text-[10px] text-slate-500">Deduplicated requests</span>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Cached Keys</span>
                  <p className="text-lg font-bold text-white font-mono mt-0.5">
                    {stats.entries || 0} <span className="text-xs font-normal text-slate-500">/ 500 max</span>
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Active Engine</span>
                  <p className="text-sm font-bold text-white font-mono mt-1 flex items-center gap-1.5">
                    <Server className="h-3.5 w-3.5 text-cyan-400" />
                    <span>gemini-3.8-flash</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Execution Logs Timeline */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Real-Time Execution Logs ({logs.length})
                </span>
                {logs.length > 0 && (
                  <button
                    onClick={onClearLogs}
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-rose-400"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-2.5 text-xs font-mono"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className={`font-semibold uppercase ${
                          log.status === 'success' ? 'text-emerald-400' : log.status === 'warning' ? 'text-amber-400' : 'text-slate-400'
                        }`}>
                          [{log.type}]
                        </span>
                        <span className="text-slate-500">
                          {log.durationMs ? `${log.durationMs}ms` : ''} • {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-slate-300 mt-1 font-sans text-xs">{log.message}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">
                    No execution events recorded yet. Run queries or inspect data to see telemetry events.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4 mt-4 text-[11px] text-slate-500 text-center">
            InsightPulse Observability • Sub-millisecond Idempotency Enforcement
          </div>
        </div>
      </div>
    </div>
  );
};
