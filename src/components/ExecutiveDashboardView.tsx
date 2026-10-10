import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Award, 
  ShieldCheck, 
  AlertTriangle, 
  Lightbulb, 
  Download, 
  Sparkles,
  BarChart3,
  LineChart,
  Zap
} from 'lucide-react';
import { Dataset, ExecutiveDashboard } from '../types';
import { generateExecutiveDashboard } from '../services/dashboardService';
import { generateTrendForecast } from '../services/dataEngine/forecastingEngine';

interface ExecutiveDashboardViewProps {
  dataset: Dataset;
  onNavigateToChat: (initialPrompt?: string) => void;
}

export const ExecutiveDashboardView: React.FC<ExecutiveDashboardViewProps> = ({
  dataset,
  onNavigateToChat,
}) => {
  const dashboard: ExecutiveDashboard = React.useMemo(() => {
    return generateExecutiveDashboard(dataset);
  }, [dataset]);

  const forecast = React.useMemo(() => {
    return generateTrendForecast(dataset);
  }, [dataset]);

  const getKPIIcon = (iconName?: string) => {
    switch (iconName) {
      case 'DollarSign': return <DollarSign className="h-5 w-5 text-indigo-400" />;
      case 'TrendingUp': return <TrendingUp className="h-5 w-5 text-emerald-400" />;
      case 'Award': return <Award className="h-5 w-5 text-violet-400" />;
      default: return <ShieldCheck className="h-5 w-5 text-cyan-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-16">
      {/* Executive Briefing Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-950 via-zinc-900/90 to-zinc-950 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400">
                Automated Executive Briefing
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {dataset.name} Performance Intelligence
            </h2>
            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              {dashboard.executiveBriefing}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateToChat('Give me a full executive briefing and strategic recommendations on this dataset')}
              className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-zinc-200 transition shadow-lg shadow-white/5"
            >
              <Sparkles className="h-4 w-4 text-black" />
              Deep-Dive with AI
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {dashboard.kpis.map((kpi) => (
          <div
            key={kpi.id}
            className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 backdrop-blur-sm shadow-md hover:border-zinc-700 transition"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-400">{kpi.label}</p>
                <h3 className="mt-1 text-2xl font-bold tracking-tight text-white font-mono">
                  {kpi.formattedValue}
                </h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 ring-1 ring-zinc-800">
                {getKPIIcon(kpi.iconName)}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-zinc-850 pt-3 text-[11px]">
              <div className="flex items-center gap-1">
                {kpi.trend === 'up' && <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />}
                {kpi.trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-rose-400" />}
                <span className={kpi.trend === 'up' ? 'text-emerald-400 font-medium' : 'text-zinc-400'}>
                  {kpi.changePercentage ? `+${kpi.changePercentage}%` : ''}
                </span>
              </div>
              <span className="text-zinc-500 truncate max-w-[140px] font-mono">{kpi.secondaryText}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts & Breakdown Showcase */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {dashboard.charts.slice(0, 2).map((chart, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 flex flex-col justify-between shadow-lg"
          >
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white">{chart.title}</h4>
                <span className="rounded bg-zinc-850 px-2 py-0.5 text-[10px] font-semibold text-zinc-300 font-mono border border-zinc-800">
                  {chart.type.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">{chart.description}</p>
            </div>

            {/* Render Bars */}
            <div className="mt-6 space-y-2.5">
              {chart.data.slice(0, 5).map((dp, i) => {
                const max = Math.max(...chart.data.map(d => d.value), 1);
                const pct = (dp.value / max) * 100;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-300 font-medium">{dp.label}</span>
                      <span className="font-mono text-white font-semibold">{dp.value.toLocaleString()}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-900 overflow-hidden border border-zinc-850">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Predictive Time-Series Forecasting Showcase (Bonus & Core Intelligence) */}
      {forecast && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-850 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <LineChart className="h-4 w-4 text-sky-400" />
                <h4 className="text-sm font-bold text-white">Statistical Trend & Predictive Runway Forecast</h4>
                <span className="rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 text-[10px] font-mono">
                  OLS Regression
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Metric: <span className="text-zinc-200 font-medium">{forecast.metric}</span> by chronological intervals ({forecast.timeColumn})
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="rounded-xl bg-zinc-900/80 px-3 py-1.5 border border-zinc-800 text-zinc-300">
                Growth Rate: <span className={forecast.growthRatePercentage >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {forecast.growthRatePercentage >= 0 ? '+' : ''}{forecast.growthRatePercentage.toFixed(1)}%
                </span>
              </div>
              <div className="rounded-xl bg-zinc-900/80 px-3 py-1.5 border border-zinc-800 text-zinc-300">
                Confidence: <span className="text-white font-bold">{forecast.confidenceScore}% R²</span>
              </div>
            </div>
          </div>

          {/* Forecast Points Bars/Pills */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
            {forecast.points.map((pt, idx) => {
              const isProjected = pt.forecast !== undefined;
              const val = isProjected ? pt.forecast! : pt.historical!;
              return (
                <div
                  key={idx}
                  className={`rounded-xl border p-3 flex flex-col justify-between ${
                    isProjected
                      ? 'border-sky-500/40 bg-sky-500/5'
                      : 'border-zinc-800 bg-zinc-900/60'
                  }`}
                >
                  <span className={`text-[10px] font-mono uppercase truncate ${isProjected ? 'text-sky-300 font-bold' : 'text-zinc-400'}`}>
                    {pt.period}
                  </span>
                  <div className="mt-2">
                    <span className="text-xs font-mono font-bold text-white">
                      {Math.round(val).toLocaleString()}
                    </span>
                    {isProjected && pt.lowerBound && pt.upperBound && (
                      <span className="text-[9px] font-mono text-zinc-500 block truncate">
                        ±{Math.round((pt.upperBound - pt.lowerBound) / 2).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Drivers & Risks/Opportunities Matrix */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Growth Drivers */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-4 w-4 text-violet-400" />
            <h4 className="text-sm font-bold text-white">Top Contributing Drivers</h4>
          </div>
          <div className="space-y-3">
            {dashboard.topDrivers.map((driver, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl border border-zinc-850 bg-zinc-900/60 p-3"
              >
                <div>
                  <p className="text-xs font-semibold text-white">{driver.label}</p>
                  <p className="text-[11px] text-zinc-400">{driver.category}</p>
                </div>
                <span className="font-mono text-xs font-semibold text-emerald-400">
                  {driver.impact}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Risks & Opportunities */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-4 w-4 text-amber-400" />
            <h4 className="text-sm font-bold text-white">Strategic Risks & Opportunities</h4>
          </div>
          <div className="space-y-3">
            {dashboard.risksAndOpportunities.map((item, idx) => (
              <div
                key={idx}
                className={`rounded-xl border p-3 text-xs ${
                  item.type === 'opportunity'
                    ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-200'
                    : 'border-amber-500/20 bg-amber-500/5 text-amber-200'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  {item.type === 'opportunity' ? (
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  )}
                  <span>{item.title}</span>
                </div>
                <p className="mt-1 text-[11px] text-zinc-300 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
