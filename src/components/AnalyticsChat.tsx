import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  Terminal, 
  AlertTriangle, 
  ChevronDown, 
  ChevronRight, 
  Copy, 
  Check, 
  Download, 
  ArrowRight,
  Brain,
  CheckCircle2,
  Play,
  Table2,
  Clock,
  ArrowDown,
  Info,
  FileQuestion,
  Database
} from 'lucide-react';
import { AnalysisResult, ChatMessage, Dataset, AgentThought } from '../types';
import { runAgenticAnalysis } from '../services/agent/analystAgent';
import { InteractiveChart } from './charts/InteractiveChart';
import { executeSQLQuery } from '../services/dataEngine/sqlExecutor';

interface AnalyticsChatProps {
  dataset: Dataset;
  allDatasets: Dataset[];
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onOpenSQL: (sqlQuery: string) => void;
  onAddLog: (type: 'query' | 'cache' | 'sql' | 'anomaly' | 'system', message: string, durationMs?: number, status?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const AnalyticsChat: React.FC<AnalyticsChatProps> = ({
  dataset,
  allDatasets,
  messages,
  setMessages,
  onOpenSQL,
  onAddLog,
}) => {
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [liveThoughts, setLiveThoughts] = useState<AgentThought[]>([]);
  const [liveProgress, setLiveProgress] = useState<string>('');
  const [streamingText, setStreamingText] = useState<string>('');
  const [openThinkingMap, setOpenThinkingMap] = useState<Record<string, boolean>>({});
  const [openQueryEditorMap, setOpenQueryEditorMap] = useState<Record<string, boolean>>({});
  const [editedSQLMap, setEditedSQLMap] = useState<Record<string, string>>({});
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  
  // Robust user-controlled scroll state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isUserNearBottom, setIsUserNearBottom] = useState(true);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setIsUserNearBottom(distanceFromBottom < 100);
  };

  const scrollToBottom = (force = false) => {
    if (force || isUserNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [messages, liveThoughts, streamingText]);

  // Dynamic quick prompts adapted to the ACTIVE dataset's columns
  const quickPrompts = React.useMemo(() => {
    const cols = dataset.columns.map(c => c.name);
    const catCol = dataset.columns.find(c => c.type === 'categorical' || c.type === 'string')?.name || cols[0];
    const numCol = dataset.columns.find(c => c.type === 'number')?.name;
    const dateCol = dataset.columns.find(c => c.type === 'date' || c.name.toLowerCase().includes('date'))?.name;

    const list: string[] = [];
    if (catCol && numCol) {
      list.push(`Which ${catCol} generated the highest ${numCol}?`);
    } else if (catCol) {
      list.push(`Show top distribution by ${catCol}.`);
    }

    if (dateCol && numCol) {
      list.push(`Show timeline trend for ${numCol}.`);
    } else if (dateCol) {
      list.push(`What is the distribution over ${dateCol}?`);
    }

    if (numCol) {
      list.push(`What is the average and total ${numCol}?`);
    }

    list.push(`Detect anomalies in '${dataset.name}'.`);
    list.push(`Summarize key patterns in this dataset.`);
    list.push(`Generate verified SQL for top records.`);

    return list.slice(0, 6);
  }, [dataset]);

  const handleSendMessage = async (promptToSend?: string) => {
    const text = (promptToSend || inputPrompt).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      status: 'sending',
    };

    setMessages(prev => [...prev, userMessage]);
    setInputPrompt('');
    setIsLoading(true);
    setIsUserNearBottom(true);
    setLiveThoughts([]);
    setLiveProgress('Analyzing dataset schema & intent...');
    setStreamingText('');

    // Scroll immediately to show the user's sent message
    setTimeout(() => scrollToBottom(true), 50);

    const startTime = performance.now();
    try {
      const result: AnalysisResult = await runAgenticAnalysis(
        text,
        [dataset, ...allDatasets.filter(d => d.id !== dataset.id)],
        {
          onThought: (thought) => {
            setLiveThoughts(prev => [...prev, thought]);
          },
          onProgress: (statusText) => {
            setLiveProgress(statusText);
          },
        }
      );

      // Letter-by-letter streaming in ChatGPT style
      const fullText = result.summary;
      let currentIdx = 0;
      setStreamingText('');

      await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          currentIdx += 3;
          if (currentIdx >= fullText.length) {
            setStreamingText(fullText);
            clearInterval(interval);
            resolve();
          } else {
            setStreamingText(fullText.slice(0, currentIdx));
          }
        }, 16);
      });

      const duration = Math.round(performance.now() - startTime);

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_a`,
        role: 'assistant',
        content: result.summary,
        analysisResult: result,
        timestamp: Date.now(),
        status: 'done',
      };

      setMessages(prev => [...prev, assistantMessage]);
      setOpenThinkingMap(prev => ({ ...prev, [assistantMessage.id]: true }));

      onAddLog(
        result.telemetry.cached ? 'cache' : 'query',
        `DigitalBackOffice AI: "${text.slice(0, 45)}..." [${result.telemetry.model}] (${duration}ms)`,
        duration,
        result.isRelated === false ? 'warning' : 'success'
      );
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_err`,
        role: 'assistant',
        content: `Error during agent analysis: ${err.message || 'Server error'}. Please try again.`,
        timestamp: Date.now(),
        status: 'error',
      };
      setMessages(prev => [...prev, errorMessage]);
      onAddLog('query', `Agent analysis failed: ${err.message}`, 0, 'error');
    } finally {
      setIsLoading(false);
      setStreamingText('');
      setLiveThoughts([]);
    }
  };

  const handleReRunQueryInChat = (messageId: string, currentSQL: string) => {
    const customQuery = editedSQLMap[messageId] || currentSQL;
    const queryResult = executeSQLQuery(customQuery, [dataset, ...allDatasets]);

    setMessages(prev => prev.map(m => {
      if (m.id === messageId && m.analysisResult) {
        return {
          ...m,
          analysisResult: {
            ...m.analysisResult,
            sqlQuery: customQuery,
            executedQueryOutput: queryResult,
            chart: m.analysisResult.chart ? {
              ...m.analysisResult.chart,
              data: queryResult.rows.map(r => {
                const keys = Object.keys(r);
                return {
                  label: String(r[keys[0]] || 'N/A'),
                  value: Number(r[keys[1]] || r[keys[keys.length - 1]]) || 0,
                };
              }),
            } : undefined,
          },
        };
      }
      return m;
    }));

    onAddLog('sql', `Re-executed query in chat (${queryResult.executionTimeMs}ms)`, queryResult.executionTimeMs, 'success');
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const exportReport = (result: AnalysisResult) => {
    const content = `# AI Business Analysis Report
Platform: DigitalBackOffice AI (Digital Back Office Ltd)
Dataset: ${dataset.name}
Generated: ${new Date().toLocaleString()}
Query: ${result.query}

## Executive Summary
${result.summary}

## Key Insights
${result.insights.map(i => `- ${i}`).join('\n')}

${result.sqlQuery ? `## ANSI SQL\n\`\`\`sql\n${result.sqlQuery}\n\`\`\`\n` : ''}

## Strategic Recommendations
${(result.recommendations || []).map(r => `- ${r}`).join('\n')}
`;

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${dataset.name}_report_${Date.now()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden">
      {/* Scrollable Messages Viewport with Explicit Bounded Height (Spans full width, scrollbar at very right) */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 w-full overflow-y-auto pb-36 px-3 sm:px-6 lg:px-8"
      >
        <div className="max-w-4xl mx-auto w-full space-y-6 pt-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[440px] text-center p-6 my-auto">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-white shadow-2xl">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-white tracking-tight font-sans">
              DigitalBackOffice AI Data Analyst
            </h2>
            <p className="mt-1.5 max-w-md text-xs text-zinc-400 leading-relaxed">
              Ask questions directly against <span className="text-zinc-200 font-medium">&apos;{dataset.name}&apos;</span>. The agent validates query intent against the uploaded schema, runs verified SQL in memory, and prevents external hallucinations.
            </p>

            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
              <Database className="h-3 w-3" />
              <span>{dataset.rowCount.toLocaleString()} rows • {dataset.columnCount} columns active</span>
            </div>

            {/* Quick Suggestions Chips (Adapted to actual uploaded columns) */}
            <div className="mt-7 w-full max-w-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="flex items-center justify-between rounded-xl border border-zinc-850 bg-zinc-950/90 p-3 text-xs text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-white transition group shadow-sm"
                  >
                    <span className="truncate">{prompt}</span>
                    <ArrowRight className="h-3 w-3 text-zinc-600 group-hover:text-white shrink-0 ml-2 transition" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            const result = msg.analysisResult;
            const isThinkingOpen = openThinkingMap[msg.id];
            const isEditingSQL = openQueryEditorMap[msg.id];
            const thoughts = result?.agentThoughts || [];
            const queryOutput = result?.executedQueryOutput;
            const isUnrelated = result?.isRelated === false;

            return (
              <div
                key={msg.id}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {isUser ? (
                  /* User Message */
                  <div className="max-w-xl rounded-2xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm text-zinc-100 shadow-md">
                    <p className="font-normal leading-relaxed">{msg.content}</p>
                    <span className="text-[10px] text-zinc-500 mt-1 block text-right font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ) : (
                  /* Assistant Message */
                  <div className="w-full max-w-4xl space-y-4 rounded-2xl border border-zinc-850 bg-zinc-950/90 p-5 shadow-2xl backdrop-blur-xl">
                    {/* Header Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-900 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-white">
                          <Brain className="h-3.5 w-3.5 text-zinc-300" />
                        </div>
                        <span className="text-xs font-bold text-white tracking-wide font-sans">DigitalBackOffice AI</span>
                        <span className="rounded-full bg-zinc-900 border border-zinc-800 px-2 py-0.2 text-[9px] font-mono text-zinc-400">
                          {dataset.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isUnrelated ? (
                          <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-mono text-amber-400">
                            OUT OF DATASET SCOPE
                          </span>
                        ) : result?.telemetry ? (
                          <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-mono text-zinc-400 border border-zinc-850">
                            {result.telemetry.cached ? 'CACHE' : 'GROUND TRUTH'} • {result.telemetry.latencyMs}ms
                          </span>
                        ) : null}
                        {result && !isUnrelated && (
                          <button
                            onClick={() => exportReport(result)}
                            className="flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 hover:text-white transition"
                          >
                            <Download className="h-3 w-3 text-zinc-400" />
                            <span>Export</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Subtle ChatGPT/Grok Style Thinking Section */}
                    {thoughts.length > 0 && (
                      <div className="rounded-xl border border-zinc-850 bg-black/40 overflow-hidden">
                        <button
                          onClick={() => setOpenThinkingMap(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                          className="w-full flex items-center justify-between px-3.5 py-1.5 text-left text-[11px] font-medium text-zinc-400 hover:text-zinc-200 transition"
                        >
                          <div className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                            <span className="font-mono text-zinc-400">
                              Thought for {((result?.telemetry?.latencyMs || 1000) / 1000).toFixed(1)} seconds
                            </span>
                          </div>
                          {isThinkingOpen ? <ChevronDown className="h-3.5 w-3.5 text-zinc-500" /> : <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />}
                        </button>

                        {isThinkingOpen && (
                          <div className="border-t border-zinc-900 p-3 space-y-1.5 bg-black/60 font-mono text-[11px] text-zinc-400 leading-relaxed">
                            {thoughts.map((th) => (
                              <div key={th.id} className="flex items-start gap-2">
                                <span className="text-zinc-600 select-none">&bull;</span>
                                <div className="flex-1">
                                  <span className="text-zinc-300 font-semibold">{th.title}: </span>
                                  <span className="text-zinc-400">{th.detail}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* UNRELATED / OUT OF SCOPE WARNING CARD */}
                    {isUnrelated ? (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
                        <div className="flex items-start gap-2.5">
                          <FileQuestion className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <h4 className="text-xs font-semibold text-amber-200">
                              Data Not Found / Question Unrelated to Uploaded File
                            </h4>
                            <p className="text-xs text-zinc-300 leading-relaxed">
                              {result?.summary || msg.content}
                            </p>
                          </div>
                        </div>

                        {/* Available Columns in Active File */}
                        <div className="pt-2 border-t border-zinc-800/80">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                            Available Columns in &apos;{dataset.name}&apos;:
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {dataset.columns.map((c) => (
                              <button
                                key={c.name}
                                onClick={() => handleSendMessage(`Analyze the distribution of column '${c.name}'`)}
                                className="rounded-md border border-zinc-800 bg-zinc-900/90 px-2 py-0.5 text-[11px] font-mono text-zinc-300 hover:border-zinc-700 hover:text-white transition"
                              >
                                {c.name} <span className="text-[9px] text-zinc-500">({c.type})</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Executive Summary */}
                        <div>
                          <h4 className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                            Executive Summary
                          </h4>
                          <p className="text-sm font-normal text-zinc-100 leading-relaxed">
                            {result?.summary || msg.content}
                          </p>
                        </div>

                        {/* Data-Driven Findings */}
                        {result?.insights && result.insights.length > 0 && (
                          <div className="rounded-xl border border-zinc-850 bg-zinc-900/40 p-4 space-y-2">
                            <h4 className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                              Verified Ground-Truth Findings
                            </h4>
                            <ul className="space-y-1.5 text-xs text-zinc-300">
                              {result.insights.map((insight, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="flex h-1.5 w-1.5 rounded-full bg-white mt-1.5 shrink-0" />
                                  <span className="leading-relaxed">{insight}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Interactive Chart Directly Inside the Message */}
                        {result?.chart && result.chart.data && result.chart.data.length > 0 && (
                          <div className="space-y-1.5">
                            <InteractiveChart config={result.chart} />
                          </div>
                        )}

                        {/* Executed SQL Output Table */}
                        {queryOutput && queryOutput.rows.length > 0 && (
                          <div className="rounded-xl border border-zinc-850 bg-zinc-950 overflow-hidden shadow-inner">
                            <div className="flex items-center justify-between border-b border-zinc-900 px-3.5 py-2 bg-zinc-900/50 text-xs">
                              <div className="flex items-center gap-2">
                                <Table2 className="h-3.5 w-3.5 text-zinc-400" />
                                <span className="font-semibold text-white font-mono text-[11px]">Executed Query Output</span>
                                <span className="rounded-full bg-zinc-900 border border-zinc-800 px-2 py-0.2 text-[9px] text-zinc-400 font-mono">
                                  {queryOutput.rowCount} rows • {queryOutput.executionTimeMs}ms
                                </span>
                              </div>

                              <button
                                onClick={() => setOpenQueryEditorMap(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                                className="text-[11px] text-zinc-400 hover:text-white font-medium transition"
                              >
                                {isEditingSQL ? 'Hide Query' : 'Modify SQL'}
                              </button>
                            </div>

                            {/* In-chat SQL Editor */}
                            {isEditingSQL && (
                              <div className="p-3 border-b border-zinc-900 bg-zinc-900/80 space-y-2">
                                <textarea
                                  value={editedSQLMap[msg.id] !== undefined ? editedSQLMap[msg.id] : result?.sqlQuery || ''}
                                  onChange={(e) => setEditedSQLMap(prev => ({ ...prev, [msg.id]: e.target.value }))}
                                  rows={4}
                                  className="w-full rounded-lg border border-zinc-800 bg-black p-2.5 font-mono text-[11px] text-zinc-200 focus:outline-none focus:border-zinc-600"
                                />
                                <div className="flex justify-end">
                                  <button
                                    onClick={() => handleReRunQueryInChat(msg.id, result?.sqlQuery || '')}
                                    className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-black hover:bg-zinc-200 transition"
                                  >
                                    <Play className="h-3 w-3 fill-current" />
                                    <span>Re-run SQL</span>
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Tabular Output */}
                            <div className="overflow-x-auto max-h-48">
                              <table className="w-full text-left font-mono text-[11px]">
                                <thead>
                                  <tr className="border-b border-zinc-900 text-zinc-400 bg-zinc-900/20">
                                    {queryOutput.columns.map((c) => (
                                      <th key={c} className="py-1.5 px-3 font-semibold text-zinc-300">
                                        {c}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-900/60">
                                  {queryOutput.rows.slice(0, 8).map((row, rIdx) => (
                                    <tr key={rIdx} className="hover:bg-zinc-900/40">
                                      {queryOutput.columns.map((c) => (
                                        <td key={c} className="py-1.5 px-3 text-zinc-200 whitespace-nowrap">
                                          {row[c] !== null && row[c] !== undefined ? String(row[c]) : 'null'}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* ANSI SQL Code Snippet */}
                        {result?.sqlQuery && (
                          <div className="rounded-xl border border-zinc-850 bg-black overflow-hidden">
                            <div className="flex items-center justify-between border-b border-zinc-900 px-3.5 py-1.5 text-xs bg-zinc-950">
                              <div className="flex items-center gap-1.5">
                                <Terminal className="h-3 w-3 text-zinc-400" />
                                <span className="font-mono font-bold text-zinc-300 text-[11px]">ANSI SQL</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleCopyCode(result.sqlQuery || '', `sql_${msg.id}`)}
                                  className="flex items-center gap-1 rounded bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-300 hover:text-white"
                                >
                                  {copiedCodeId === `sql_${msg.id}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                  <span>{copiedCodeId === `sql_${msg.id}` ? 'Copied' : 'Copy'}</span>
                                </button>
                                <button
                                  onClick={() => onOpenSQL(result.sqlQuery!)}
                                  className="text-[10px] font-medium text-zinc-400 hover:text-white transition"
                                >
                                  Open in Studio &rarr;
                                </button>
                              </div>
                            </div>
                            <pre className="p-3.5 font-mono text-[11px] text-zinc-300 overflow-x-auto whitespace-pre">
                              {result.sqlQuery}
                            </pre>
                          </div>
                        )}

                        {/* Anomalies Alert */}
                        {result?.anomalies && result.anomalies.length > 0 && (
                          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3.5 space-y-2">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                              <h4 className="text-xs font-bold text-rose-200">
                                Flagged Statistical Anomalies ({result.anomalies.length})
                              </h4>
                            </div>
                            <div className="space-y-1.5">
                              {result.anomalies.slice(0, 3).map((anom, idx) => (
                                <div key={idx} className="rounded-lg bg-black/60 p-2 text-xs border border-rose-500/20">
                                  <div className="flex justify-between font-mono text-[10px] text-rose-300">
                                    <span>Row #{anom.rowIndex} • {anom.column}</span>
                                    <span>Score: {anom.score} ({anom.method})</span>
                                  </div>
                                  <p className="mt-0.5 text-zinc-400 text-[11px]">{anom.explanation}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Strategic Recommendations */}
                        {result?.recommendations && result.recommendations.length > 0 && (
                          <div className="rounded-xl border border-zinc-850 bg-zinc-900/30 p-3.5 space-y-1">
                            <h4 className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                              Strategic Recommendations
                            </h4>
                            <ul className="space-y-1 text-xs text-zinc-300">
                              {result.recommendations.map((rec, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-zinc-500 font-bold">&bull;</span>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Live Loading State (Grok-style Round Spinner & Streaming Thoughts) */}
        {isLoading && (
          <div className="w-full space-y-3 rounded-2xl border border-zinc-850 bg-zinc-950/90 p-5 shadow-2xl backdrop-blur-xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-3">
                <div className="relative h-5 w-5">
                  <svg className="grok-spinner h-5 w-5" viewBox="0 0 50 50">
                    <circle className="stroke-zinc-800" cx="25" cy="25" r="20" fill="none" strokeWidth="4" />
                    <circle className="grok-spinner-circle stroke-white" cx="25" cy="25" r="20" fill="none" strokeWidth="4" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white tracking-wide">DigitalBackOffice AI</span>
                    <span className="text-[10px] font-mono text-zinc-500 italic">Thinking...</span>
                  </div>
                  <p className="text-[11px] font-mono text-zinc-400">{liveProgress || 'Reasoning...'}</p>
                </div>
              </div>

              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                Ground-Truth Pipeline
              </span>
            </div>

            {/* Live Streaming Thoughts in Light Font */}
            <div className="space-y-1.5 py-1 font-mono text-[11px] text-zinc-400 leading-relaxed">
              {liveThoughts.map((th) => (
                <div key={th.id} className="flex items-start gap-2">
                  <span className="text-zinc-600 select-none">&bull;</span>
                  <div className="flex-1">
                    <span className="text-zinc-300 font-medium">{th.title}: </span>
                    <span className="text-zinc-400">{th.detail}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Live Typewriter Streaming Block */}
            {streamingText && (
              <div className="mt-2 rounded-xl border border-zinc-850 bg-black/80 p-3.5 text-xs text-zinc-100 leading-relaxed font-sans">
                {streamingText}
                <span className="typewriter-cursor" />
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating Scroll-to-Bottom Button if user scrolled up */}
      {!isUserNearBottom && messages.length > 0 && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-16 right-6 z-40 flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-xs text-zinc-200 shadow-xl backdrop-blur-md hover:bg-zinc-800 transition"
        >
          <ArrowDown className="h-3.5 w-3.5" />
          <span>Latest</span>
        </button>
      )}

      {/* FIXED PINNED BOTTOM INPUT BAR (Never Moves When Entering Queries!) */}
      <div className="absolute bottom-0 inset-x-0 pt-4 pb-2 bg-gradient-to-t from-black via-black/95 to-transparent z-30 pointer-events-auto">
        <div className="max-w-4xl mx-auto w-full px-1">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl backdrop-blur-2xl"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder={`Ask DigitalBackOffice AI about ${dataset.name}...`}
              className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
              disabled={isLoading}
            />

            <button
              type="submit"
              disabled={!inputPrompt.trim() || isLoading}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-black hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-sm shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
