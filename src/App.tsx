import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DatasetManager } from './components/DatasetManager';
import { AnalyticsChat } from './components/AnalyticsChat';
import { DataGrid } from './components/DataGrid';
import { ChartStudio } from './components/ChartStudio';
import { ExecutiveDashboardView } from './components/ExecutiveDashboardView';
import { DataQualityAuditView } from './components/DataQualityAuditView';
import { SQLPlaygroundView } from './components/SQLPlaygroundView';
import { ObservabilityDrawer } from './components/ObservabilityDrawer';
import { ExportModal } from './components/ExportModal';
import { AuthGateway } from './components/AuthGateway';
import { Dataset, ChatMessage, ExecutionLog } from './types';
import { loadDefaultSampleDataset } from './services/sampleDatasets';
import { testConnection, auth } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

import { ParticleBackground } from './components/common/ParticleBackground';

export default function App() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [activeDatasetId, setActiveDatasetId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'chat' | 'grid' | 'charts' | 'dashboard' | 'quality' | 'sql'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [isObservabilityOpen, setIsObservabilityOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [pendingSQL, setPendingSQL] = useState<string | undefined>(undefined);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [hasCompletedAuthGate, setHasCompletedAuthGate] = useState<boolean>(() => {
    return sessionStorage.getItem('insightpulse_session_authenticated') === 'true';
  });

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Initialize test connection to Firestore and load initial sample data
  useEffect(() => {
    testConnection();

    loadDefaultSampleDataset()
      .then((sampleDs) => {
        setDatasets([sampleDs]);
        setActiveDatasetId(sampleDs.id);
        addLog('system', `Preloaded enterprise dataset '${sampleDs.name}' (${sampleDs.rowCount} rows, ${sampleDs.columnCount} columns)`, 0, 'info');
      })
      .catch((err) => {
        console.error('Failed to load sample dataset:', err);
      })
      .finally(() => {
        setIsLoadingInitial(false);
      });
  }, []);

  const addLog = (
    type: 'query' | 'cache' | 'sql' | 'anomaly' | 'system',
    message: string,
    durationMs?: number,
    status: 'success' | 'warning' | 'error' | 'info' = 'info'
  ) => {
    const newLog: ExecutionLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      type,
      message,
      durationMs,
      status,
    };
    setLogs(prev => [newLog, ...prev.slice(0, 99)]);
  };

  const handleAddDataset = (newDs: Dataset) => {
    setDatasets(prev => {
      const filtered = prev.filter(d => d.id !== newDs.id);
      return [newDs, ...filtered];
    });
    addLog('system', `Ingested new dataset '${newDs.name}' with Quality Score ${newDs.qualityScore}%`, 0, 'success');
  };

  const handleRemoveDataset = (idToRemove: string) => {
    setDatasets(prev => {
      const next = prev.filter(d => d.id !== idToRemove);
      if (activeDatasetId === idToRemove && next.length > 0) {
        setActiveDatasetId(next[0].id);
      }
      return next;
    });
    addLog('system', `Dataset removed from active session`, 0, 'warning');
  };

  const handleOpenSQL = (sqlQuery: string) => {
    setPendingSQL(sqlQuery);
    setActiveTab('sql');
  };

  const activeDataset = datasets.find(d => d.id === activeDatasetId) || datasets[0];

  if (isLoadingInitial || isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="relative h-7 w-7">
            <svg className="grok-spinner h-7 w-7" viewBox="0 0 50 50">
              <circle className="stroke-zinc-800" cx="25" cy="25" r="20" fill="none" strokeWidth="4" />
              <circle className="grok-spinner-circle stroke-white" cx="25" cy="25" r="20" fill="none" strokeWidth="4" />
            </svg>
          </div>
          <p className="text-xs font-mono text-zinc-400">Bootstrapping DigitalBackOffice AI Platform...</p>
        </div>
      </div>
    );
  }

  // Enforce Authentication Gateway: Directly DO NOT show the main screen; after authentication only show the main screen
  if (!currentUser || !hasCompletedAuthGate) {
    return (
      <AuthGateway
        onAuthenticated={(user) => {
          setCurrentUser(user);
          setHasCompletedAuthGate(true);
          sessionStorage.setItem('insightpulse_session_authenticated', 'true');
          addLog('system', `Authenticated session for ${user?.displayName || user?.email || 'Executive Analyst'}`, 0, 'success');
        }}
      />
    );
  }

  return (
    <div className="flex h-screen flex-col bg-black text-zinc-100 font-sans selection:bg-zinc-800 overflow-hidden relative">
      <ParticleBackground />
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        datasets={datasets}
        activeDatasetId={activeDatasetId}
        setActiveDatasetId={setActiveDatasetId}
        onToggleObservability={() => setIsObservabilityOpen(prev => !prev)}
        isObservabilityOpen={isObservabilityOpen}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        currentUser={currentUser}
        onSignOut={() => {
          setCurrentUser(null);
          setHasCompletedAuthGate(false);
          sessionStorage.removeItem('insightpulse_session_authenticated');
          addLog('system', 'User signed out from enterprise session', 0, 'info');
        }}
      />

      {/* Main Workspace Viewport - Edge-to-Edge so scrollbars sit on the very right window edge */}
      <main className="flex-1 min-h-0 w-full flex flex-col relative z-10 overflow-hidden">
        {activeDataset ? (
          <div className="flex-1 min-h-0 h-full w-full flex flex-col overflow-hidden">
            {activeTab === 'chat' && (
              <div className="flex-1 min-h-0 h-full w-full flex flex-col overflow-hidden">
                <AnalyticsChat
                  dataset={activeDataset}
                  allDatasets={datasets}
                  messages={messages}
                  setMessages={setMessages}
                  onOpenSQL={handleOpenSQL}
                  onAddLog={addLog}
                />
              </div>
            )}

            {activeTab === 'grid' && (
              <div className="flex-1 min-h-0 h-full w-full overflow-hidden px-3 sm:px-6 py-3">
                <DataGrid
                  dataset={activeDataset}
                  onAskAboutColumn={(colName) => {
                    setActiveTab('chat');
                    setMessages(prev => [
                      ...prev,
                      {
                        id: `msg_${Date.now()}_u`,
                        role: 'user',
                        content: `Analyze the statistical distribution and business significance of column '${colName}'.`,
                        timestamp: Date.now(),
                      },
                    ]);
                  }}
                />
              </div>
            )}

            {/* Scrollable Container for Charts Tab - Extends to the very right edge */}
            {activeTab === 'charts' && (
              <div className="flex-1 min-h-0 h-full w-full overflow-y-auto overflow-x-hidden scrollbar-thin">
                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-24">
                  <ChartStudio dataset={activeDataset} />
                </div>
              </div>
            )}

            {/* Scrollable Container for Dashboard Tab - Extends to the very right edge */}
            {activeTab === 'dashboard' && (
              <div className="flex-1 min-h-0 h-full w-full overflow-y-auto overflow-x-hidden scrollbar-thin">
                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-24">
                  <ExecutiveDashboardView
                    dataset={activeDataset}
                    onNavigateToChat={(prompt) => {
                      setActiveTab('chat');
                      if (prompt) {
                        setMessages(prev => [
                          ...prev,
                          {
                            id: `msg_${Date.now()}_u`,
                            role: 'user',
                            content: prompt,
                            timestamp: Date.now(),
                          },
                        ]);
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {/* Scrollable Container for Audit Tab - Extends to the very right edge */}
            {activeTab === 'quality' && (
              <div className="flex-1 min-h-0 h-full w-full overflow-y-auto overflow-x-hidden scrollbar-thin">
                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-24">
                  <DataQualityAuditView
                    dataset={activeDataset}
                    onAskAboutQuality={(prompt) => {
                      setActiveTab('chat');
                      setMessages(prev => [
                        ...prev,
                        {
                          id: `msg_${Date.now()}_u`,
                          role: 'user',
                          content: prompt,
                          timestamp: Date.now(),
                        },
                      ]);
                    }}
                  />
                </div>
              </div>
            )}

            {/* Scrollable Container for SQL Tab - Extends to the very right edge */}
            {activeTab === 'sql' && (
              <div className="flex-1 min-h-0 h-full w-full overflow-y-auto overflow-x-hidden scrollbar-thin">
                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-24">
                  <SQLPlaygroundView
                    datasets={datasets}
                    initialQuery={pendingSQL}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 text-center py-20">
            <h3 className="text-base font-bold text-white">No Datasets Ingested</h3>
            <p className="text-xs text-zinc-400 mt-1 mb-4">Upload a CSV or load a sample dataset to begin analysis.</p>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-zinc-200 transition"
            >
              Upload CSV Dataset
            </button>
          </div>
        )}
      </main>

      {/* Dataset Manager Modal */}
      <DatasetManager
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        datasets={datasets}
        activeDatasetId={activeDatasetId}
        setActiveDatasetId={setActiveDatasetId}
        onAddDataset={handleAddDataset}
        onRemoveDataset={handleRemoveDataset}
      />

      {/* Observability Telemetry Drawer */}
      <ObservabilityDrawer
        isOpen={isObservabilityOpen}
        onClose={() => setIsObservabilityOpen(false)}
        logs={logs}
        onClearLogs={() => setLogs([])}
      />

      {/* Export Report Modal */}
      {activeDataset && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          dataset={activeDataset}
          latestAnalysis={messages.filter(m => m.analysisResult).pop()?.analysisResult}
        />
      )}
    </div>
  );
}
