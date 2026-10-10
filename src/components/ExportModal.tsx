import React from 'react';
import { Download, X, Printer, FileText, Check } from 'lucide-react';
import { Dataset, AnalysisResult } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset;
  latestAnalysis?: AnalysisResult | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  dataset,
  latestAnalysis,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadMarkdown = () => {
    const text = `# Executive Analytics Dossier
Dataset: ${dataset.name} (${dataset.rowCount.toLocaleString()} rows, ${dataset.columnCount} columns)
Generated: ${new Date().toLocaleString()}

## Overall Health Score
Quality Index: ${dataset.qualityScore}%

${latestAnalysis ? `## Latest Query Analysis
Query: "${latestAnalysis.query}"
Summary: ${latestAnalysis.summary}

### Key Insights
${latestAnalysis.insights.map(i => `- ${i}`).join('\n')}

${latestAnalysis.sqlQuery ? `### SQL Query\n\`\`\`sql\n${latestAnalysis.sqlQuery}\n\`\`\`\n` : ''}
${latestAnalysis.pandasCode ? `### Pandas Code\n\`\`\`python\n${latestAnalysis.pandasCode}\n\`\`\`\n` : ''}

### Strategic Recommendations
${(latestAnalysis.recommendations || []).map(r => `- ${r}`).join('\n')}
` : ''}

---
Digital Back Office Ltd. - InsightPulse AI Platform
`;

    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', `${dataset.name}_Analytics_Report.md`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Export Executive Analytics Dossier</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="my-5 space-y-3 text-xs text-slate-300">
          <p>
            Export the complete intelligence briefing for <span className="text-white font-semibold">&apos;{dataset.name}&apos;</span> including data health scores, key driver charts, SQL queries, and strategic recommendations.
          </p>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Dataset Name:</span>
              <span className="text-white font-medium">{dataset.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Records & Schema:</span>
              <span className="text-white">{dataset.rowCount.toLocaleString()} rows • {dataset.columnCount} columns</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Integrity Score:</span>
              <span className="text-emerald-400 font-bold">{dataset.qualityScore}%</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={handleDownloadMarkdown}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-semibold text-white hover:bg-slate-700 transition"
          >
            <Download className="h-4 w-4 text-indigo-400" />
            <span>Download .MD</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-md shadow-indigo-600/20"
          >
            <Printer className="h-4 w-4" />
            <span>Print / PDF View</span>
          </button>
        </div>
      </div>
    </div>
  );
};
