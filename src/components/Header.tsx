import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Database, 
  BarChart3, 
  Table2, 
  LayoutDashboard, 
  ShieldCheck, 
  Terminal, 
  Activity, 
  LogIn, 
  LogOut, 
  ChevronDown,
  Layers,
  Upload,
  MessageSquare
} from 'lucide-react';
import { Dataset } from '../types';
import { auth, signInWithGoogle, logOut } from '../services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

interface HeaderProps {
  activeTab: 'chat' | 'grid' | 'charts' | 'dashboard' | 'quality' | 'sql';
  setActiveTab: (tab: 'chat' | 'grid' | 'charts' | 'dashboard' | 'quality' | 'sql') => void;
  datasets: Dataset[];
  activeDatasetId: string;
  setActiveDatasetId: (id: string) => void;
  onToggleObservability: () => void;
  isObservabilityOpen: boolean;
  onOpenUploadModal: () => void;
  currentUser?: any;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  datasets,
  activeDatasetId,
  setActiveDatasetId,
  onToggleObservability,
  isObservabilityOpen,
  onOpenUploadModal,
  currentUser,
  onSignOut,
}) => {
  const [internalUser, setInternalUser] = useState<User | null>(null);
  const [isDatasetDropdownOpen, setIsDatasetDropdownOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setInternalUser(u);
    });
    return () => unsubscribe();
  }, []);

  const user = currentUser || internalUser;

  const activeDataset = datasets.find(d => d.id === activeDatasetId) || datasets[0];

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Google Sign-In error:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await logOut();
      if (onSignOut) {
        onSignOut();
      }
    } catch (err) {
      console.error('Sign-Out error:', err);
    }
  };

  const navItems = [
    { id: 'chat', label: 'Analyst', icon: MessageSquare },
    { id: 'grid', label: 'Grid', icon: Table2 },
    { id: 'charts', label: 'Charts', icon: BarChart3 },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'quality', label: 'Audit', icon: ShieldCheck },
    { id: 'sql', label: 'SQL', icon: Terminal },
  ] as const;

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-900 bg-black/95 backdrop-blur-2xl">
      <div className="w-full px-3 sm:px-6 flex h-14 items-center justify-between gap-2">
        {/* Left: Brand (Single-line, No Wrapping) */}
        <div className="shrink-0 flex items-center gap-2.5 whitespace-nowrap">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-white shadow-inner">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold tracking-tight text-white font-sans whitespace-nowrap">
              DigitalBackOffice AI
            </span>
            <span className="hidden xl:inline text-[9px] font-mono text-zinc-500 font-medium px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-850">
              Enterprise
            </span>
          </div>
        </div>

        {/* Center: Sleek Segmented Pill Navigation (Grok Style, Compact) */}
        <nav className="shrink-0 flex items-center rounded-full border border-zinc-800/80 bg-zinc-950/80 p-0.5 sm:p-1 shadow-inner">
          {navItems.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 sm:gap-1.5 rounded-full px-2 sm:px-3 py-1 text-xs transition duration-150 whitespace-nowrap ${
                  isActive
                    ? 'bg-zinc-800 text-white font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 font-medium'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Dataset Switcher Pill & Actions */}
        <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
          {/* Dataset Switcher Pill */}
          <div className="relative">
            <button
              onClick={() => setIsDatasetDropdownOpen(!isDatasetDropdownOpen)}
              className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-950/90 px-2.5 sm:px-3 py-1 text-xs text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-900"
            >
              <Database className="h-3 w-3 text-zinc-400 shrink-0" />
              <span className="max-w-[85px] sm:max-w-[120px] md:max-w-[140px] truncate font-medium text-white">
                {activeDataset ? activeDataset.name : 'Select Data'}
              </span>
              {activeDataset && (
                <span className="text-[10px] font-mono text-zinc-400 hidden lg:inline">
                  {activeDataset.rowCount.toLocaleString()}
                </span>
              )}
              <ChevronDown className="h-3 w-3 text-zinc-500 shrink-0" />
            </button>

            {/* Dataset Dropdown Menu */}
            {isDatasetDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl ring-1 ring-black/80 z-50">
                <div className="px-2.5 py-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-500">
                  Active Ingested Datasets ({datasets.length})
                </div>

                <div className="max-h-56 space-y-1 overflow-y-auto py-1">
                  {datasets.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => {
                        setActiveDatasetId(d.id);
                        setIsDatasetDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs transition text-left ${
                        d.id === activeDatasetId
                          ? 'bg-zinc-800 text-white font-medium'
                          : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                      }`}
                    >
                      <div className="truncate">
                        <div className="truncate font-semibold">{d.name}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {d.rowCount.toLocaleString()} rows • {d.columnCount} cols
                        </div>
                      </div>
                      <span className="rounded-full bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 text-[9px] font-mono text-zinc-400">
                        {d.qualityScore}% Q
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mt-2 border-t border-zinc-900 pt-2">
                  <button
                    onClick={() => {
                      setIsDatasetDropdownOpen(false);
                      onOpenUploadModal();
                    }}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-800 py-1.5 text-xs font-medium text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900 hover:text-white transition"
                  >
                    <Upload className="h-3 w-3" />
                    <span>Upload New CSV</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Observability Telemetry Button */}
          <button
            onClick={onToggleObservability}
            className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border transition ${
              isObservabilityOpen
                ? 'border-white bg-white text-black'
                : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-white hover:bg-zinc-900'
            }`}
            title="System Telemetry & Query Observability"
          >
            <Activity className="h-3.5 w-3.5" />
          </button>

          {/* Firebase Authentication / User Session */}
          {user ? (
            <div className="flex items-center gap-1 sm:gap-2 rounded-full border border-zinc-800 bg-zinc-950 py-0.5 pl-0.5 pr-2">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="h-6 w-6 rounded-full border border-zinc-700 object-cover"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-white">
                  {user.displayName ? user.displayName[0] : 'U'}
                </div>
              )}
              <span className="text-xs font-medium text-zinc-200 max-w-[65px] truncate hidden sm:inline">
                {user.displayName?.split(' ')[0] || 'User'}
              </span>
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="text-zinc-500 hover:text-zinc-300 transition ml-0.5"
              >
                <LogOut className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-950 px-2.5 sm:px-3 py-1 text-xs font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900 hover:text-white"
            >
              <LogIn className="h-3 w-3" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
