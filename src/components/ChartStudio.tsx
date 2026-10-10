import React, { useState } from 'react';
import { 
  BarChart3, 
  LineChart as LineChartIcon, 
  PieChart as PieChartIcon, 
  ScatterChart as ScatterIcon, 
  Download, 
  Maximize2, 
  Sliders,
  Sparkles,
  TrendingUp,
  Layers
} from 'lucide-react';
import { ChartConfig, ChartDataPoint, Dataset } from '../types';
import { aggregateByDimension, computeHistogramBins } from '../services/dataEngine/statisticsEngine';

interface ChartStudioProps {
  dataset: Dataset;
  presetChart?: ChartConfig;
}

const VIBRANT_CHART_COLORS = [
  '#6366f1', // Purple
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink / Rose
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
  '#84cc16', // Lime
  '#3b82f6', // Blue
];

export const ChartStudio: React.FC<ChartStudioProps> = ({ dataset, presetChart }) => {
  const numericCols = dataset.columns.filter(c => c.type === 'number');
  const catCols = dataset.columns.filter(c => c.type === 'categorical' || c.type === 'string');
  const dateCols = dataset.columns.filter(c => c.type === 'date');

  const [chartType, setChartType] = useState<ChartConfig['type']>(presetChart?.type || 'bar');
  const [selectedDimension, setSelectedDimension] = useState<string>(
    presetChart?.xAxisLabel || catCols[0]?.name || (dateCols[0]?.name || 'Category')
  );
  const [selectedMetric, setSelectedMetric] = useState<string>(
    presetChart?.yAxisLabel || numericCols[0]?.name || 'Value'
  );
  const [selectedColorScheme, setSelectedColorScheme] = useState<ChartConfig['colorScheme']>('indigo');
  const [aggregation, setAggregation] = useState<'sum' | 'avg' | 'count'>('sum');
  const [hoveredPoint, setHoveredPoint] = useState<ChartDataPoint | null>(null);

  // Compute live data points based on selection or fallback to preset
  const chartData: ChartDataPoint[] = React.useMemo(() => {
    if (presetChart && chartType === presetChart.type && !selectedDimension) {
      return presetChart.data;
    }

    if (chartType === 'histogram') {
      const values = dataset.data.map(r => Number(r[selectedMetric])).filter(v => !isNaN(v));
      const bins = computeHistogramBins(values, 8);
      return bins.map(b => ({ label: b.label, value: b.count }));
    }

    const aggregated = aggregateByDimension(dataset.data, selectedDimension, selectedMetric, aggregation);
    return aggregated.slice(0, 10).map(item => ({
      label: item.label,
      value: item.value,
    }));
  }, [dataset.data, chartType, selectedDimension, selectedMetric, aggregation, presetChart]);

  const colorPalettes = {
    indigo: { primary: '#6366f1', secondary: '#818cf8', gradient: 'from-indigo-600 to-violet-500', bg: 'bg-indigo-500' },
    emerald: { primary: '#10b981', secondary: '#34d399', gradient: 'from-emerald-600 to-teal-500', bg: 'bg-emerald-500' },
    violet: { primary: '#8b5cf6', secondary: '#a78bfa', gradient: 'from-violet-600 to-purple-500', bg: 'bg-violet-500' },
    amber: { primary: '#f59e0b', secondary: '#fbbf24', gradient: 'from-amber-600 to-orange-500', bg: 'bg-amber-500' },
    rose: { primary: '#f43f5e', secondary: '#fb7185', gradient: 'from-rose-600 to-pink-500', bg: 'bg-rose-500' },
    cyan: { primary: '#06b6d4', secondary: '#22d3ee', gradient: 'from-cyan-600 to-blue-500', bg: 'bg-cyan-500' },
  };

  const palette = colorPalettes[selectedColorScheme || 'indigo'];

  const maxValue = Math.max(...chartData.map(d => d.value), 1);
  const totalSum = chartData.reduce((acc, d) => acc + d.value, 0);

  // Render SVG Charts
  const renderSVGChart = () => {
    const width = 640;
    const height = 300;
    const padding = { top: 30, right: 30, bottom: 50, left: 60 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    if (chartType === 'bar' || chartType === 'histogram') {
      const barWidth = Math.max(14, Math.min(50, chartW / chartData.length - 12));
      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = padding.top + chartH * (1 - pct);
            const val = maxValue * pct;
            return (
              <g key={i}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#334155" strokeDasharray="4 4" strokeWidth="0.8" />
                <text x={padding.left - 8} y={y + 3} textAnchor="end" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                  {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : Math.round(val)}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {chartData.map((d, i) => {
            const barH = (d.value / maxValue) * chartH;
            const x = padding.left + (i * (chartW / chartData.length)) + ((chartW / chartData.length - barWidth) / 2);
            const y = padding.top + chartH - barH;
            const isHovered = hoveredPoint?.label === d.label;

            return (
              <g key={i} onMouseEnter={() => setHoveredPoint(d)} onMouseLeave={() => setHoveredPoint(null)} className="cursor-pointer transition-all">
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(2, barH)}
                  rx="4"
                  fill={isHovered ? palette.secondary : palette.primary}
                  className="transition-colors duration-200"
                />
                <text
                  x={x + barWidth / 2}
                  y={height - padding.bottom + 18}
                  textAnchor="middle"
                  fill={isHovered ? '#ffffff' : '#94a3b8'}
                  fontSize="10"
                  className="font-medium"
                >
                  {d.label.length > 10 ? `${d.label.slice(0, 8)}…` : d.label}
                </text>
              </g>
            );
          })}
        </svg>
      );
    }

    if (chartType === 'line' || chartType === 'area') {
      const stepX = chartData.length > 1 ? chartW / (chartData.length - 1) : chartW;
      const points = chartData.map((d, i) => ({
        x: padding.left + i * stepX,
        y: padding.top + chartH - (d.value / maxValue) * chartH,
        data: d,
      }));

      const pathString = points.reduce((acc, pt, i) => {
        return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
      }, '');

      const areaString = `${pathString} L ${points[points.length - 1]?.x || 0} ${padding.top + chartH} L ${padding.left} ${padding.top + chartH} Z`;

      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={palette.primary} stopOpacity="0.4" />
              <stop offset="100%" stopColor={palette.primary} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = padding.top + chartH * (1 - pct);
            const val = maxValue * pct;
            return (
              <g key={i}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#334155" strokeDasharray="4 4" strokeWidth="0.8" />
                <text x={padding.left - 8} y={y + 3} textAnchor="end" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                  {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : Math.round(val)}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          {chartType === 'area' && <path d={areaString} fill="url(#areaGradient)" />}

          {/* Line Path */}
          <path d={pathString} fill="none" stroke={palette.primary} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data Nodes */}
          {points.map((pt, i) => {
            const isHovered = hoveredPoint?.label === pt.data.label;
            return (
              <g key={i} onMouseEnter={() => setHoveredPoint(pt.data)} onMouseLeave={() => setHoveredPoint(null)} className="cursor-pointer">
                <circle cx={pt.x} cy={pt.y} r={isHovered ? 6 : 4} fill={palette.primary} stroke="#0f172a" strokeWidth="2" className="transition-all" />
                <text x={pt.x} y={height - padding.bottom + 18} textAnchor="middle" fill={isHovered ? '#ffffff' : '#94a3b8'} fontSize="10">
                  {pt.data.label.length > 8 ? `${pt.data.label.slice(0, 7)}…` : pt.data.label}
                </text>
              </g>
            );
          })}
        </svg>
      );
    }

    if (chartType === 'scatter') {
      const xNumeric = numericCols.find(c => c.name === selectedDimension) || numericCols[0];
      const yNumeric = numericCols.find(c => c.name === selectedMetric) || numericCols[1] || numericCols[0];
      
      const pts = dataset.data.slice(0, 40).map((r, i) => {
        const xVal = Number(r[xNumeric?.name || '']) || i;
        const yVal = Number(r[yNumeric?.name || '']) || 0;
        const label = String(r[catCols[0]?.name || ''] || `Item ${i + 1}`);
        return { x: xVal, y: yVal, label };
      }).filter(p => !isNaN(p.x) && !isNaN(p.y));

      const maxX = Math.max(...pts.map(p => p.x), 1);
      const maxY = Math.max(...pts.map(p => p.y), 1);

      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = padding.top + chartH * (1 - pct);
            const valY = maxY * pct;
            return (
              <g key={i}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#27272a" strokeDasharray="3 3" strokeWidth="0.8" />
                <text x={padding.left - 8} y={y + 3.5} textAnchor="end" fill="#71717a" fontSize="9.5" fontFamily="monospace">
                  {valY >= 1000 ? `${(valY / 1000).toFixed(1)}k` : Math.round(valY)}
                </text>
              </g>
            );
          })}

          {/* Scatter points */}
          {pts.map((pt, i) => {
            const cx = padding.left + (pt.x / maxX) * chartW;
            const cy = padding.top + chartH - (pt.y / maxY) * chartH;
            const isHovered = hoveredPoint?.label === pt.label;
            const color = VIBRANT_CHART_COLORS[i % VIBRANT_CHART_COLORS.length];

            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredPoint({ label: `${pt.label} (${pt.x}, ${pt.y})`, value: pt.y })}
                onMouseLeave={() => setHoveredPoint(null)}
                className="cursor-pointer transition-all"
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 7 : 4.5}
                  fill={color}
                  stroke="#000000"
                  strokeWidth="1.5"
                  className="transition-all"
                  style={{ filter: isHovered ? 'drop-shadow(0 0 6px rgba(255,255,255,0.8))' : undefined }}
                />
              </g>
            );
          })}

          {/* Labels */}
          <text x={width / 2} y={height - 8} textAnchor="middle" fill="#71717a" fontSize="10" fontFamily="monospace">
            X: {xNumeric?.name} →
          </text>
        </svg>
      );
    }

    if (chartType === 'pie' || chartType === 'donut') {
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = 95;
      const innerRadius = chartType === 'donut' ? 55 : 0;

      const colors = VIBRANT_CHART_COLORS;
      let cumulativeAngle = 0;

      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          {chartData.map((d, i) => {
            const sliceAngle = totalSum > 0 ? (d.value / totalSum) * 2 * Math.PI : 0;
            const startAngle = cumulativeAngle;
            const endAngle = cumulativeAngle + sliceAngle;
            cumulativeAngle += sliceAngle;

            const x1 = centerX + radius * Math.cos(startAngle);
            const y1 = centerY + radius * Math.sin(startAngle);
            const x2 = centerX + radius * Math.cos(endAngle);
            const y2 = centerY + radius * Math.sin(endAngle);

            const x3 = centerX + innerRadius * Math.cos(endAngle);
            const y3 = centerY + innerRadius * Math.sin(endAngle);
            const x4 = centerX + innerRadius * Math.cos(startAngle);
            const y4 = centerY + innerRadius * Math.sin(startAngle);

            const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

            const dPath = innerRadius === 0
              ? `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`
              : `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`;

            const color = colors[i % colors.length];
            const isHovered = hoveredPoint?.label === d.label;

            return (
              <path
                key={i}
                d={dPath}
                fill={color}
                stroke="#0f172a"
                strokeWidth="2"
                onMouseEnter={() => setHoveredPoint(d)}
                onMouseLeave={() => setHoveredPoint(null)}
                className="cursor-pointer transition-transform hover:opacity-90"
                style={{ transformOrigin: `${centerX}px ${centerY}px`, transform: isHovered ? 'scale(1.04)' : 'scale(1)' }}
              />
            );
          })}

          {chartType === 'donut' && (
            <text x={centerX} y={centerY} textAnchor="middle" dominantBaseline="middle" fill="#f8fafc" fontSize="12" fontWeight="bold">
              {hoveredPoint ? `${hoveredPoint.label}` : 'Total'}
            </text>
          )}
        </svg>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col min-h-full space-y-5 max-w-7xl mx-auto w-full pb-14">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3.5 backdrop-blur-md shadow-md">
        {/* Chart Type Picker */}
        <div className="flex items-center gap-1 rounded-xl bg-black p-1 border border-zinc-850">
          <button
            onClick={() => setChartType('bar')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              chartType === 'bar' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Bar</span>
          </button>
          <button
            onClick={() => setChartType('line')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              chartType === 'line' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <LineChartIcon className="h-3.5 w-3.5" />
            <span>Line</span>
          </button>
          <button
            onClick={() => setChartType('area')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              chartType === 'area' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Area</span>
          </button>
          <button
            onClick={() => setChartType('donut')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              chartType === 'donut' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <PieChartIcon className="h-3.5 w-3.5" />
            <span>Donut</span>
          </button>
          <button
            onClick={() => setChartType('scatter')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              chartType === 'scatter' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ScatterIcon className="h-3.5 w-3.5" />
            <span>Scatter</span>
          </button>
          <button
            onClick={() => setChartType('histogram')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              chartType === 'histogram' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Histogram</span>
          </button>
        </div>

        {/* Dimension & Metric Selectors */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400 font-mono text-[11px]">X-Axis:</span>
            <select
              value={selectedDimension}
              onChange={(e) => setSelectedDimension(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-zinc-100 focus:outline-none focus:border-zinc-700"
            >
              {dataset.columns.filter(c => c.type !== 'number').map(c => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400 font-mono text-[11px]">Metric:</span>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-zinc-100 focus:outline-none focus:border-zinc-700"
            >
              {numericCols.map(c => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400 font-mono text-[11px]">Agg:</span>
            <select
              value={aggregation}
              onChange={(e) => setAggregation(e.target.value as any)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-zinc-100 focus:outline-none focus:border-zinc-700 font-mono text-[11px]"
            >
              <option value="sum">SUM</option>
              <option value="avg">AVG</option>
              <option value="count">COUNT</option>
            </select>
          </div>
        </div>

        {/* Color Palette Switcher */}
        <div className="flex items-center gap-1.5">
          {(['indigo', 'emerald', 'violet', 'amber', 'rose', 'cyan'] as const).map(color => (
            <button
              key={color}
              onClick={() => setSelectedColorScheme(color)}
              className={`h-4 w-4 rounded-full transition ${colorPalettes[color].bg} ${
                selectedColorScheme === color ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : 'opacity-60 hover:opacity-100'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main Chart Canvas & Inspection */}
      <div className="relative rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 flex flex-col justify-between shadow-2xl">
        {/* Title Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-white">
              {presetChart?.title || `${aggregation.toUpperCase()}(${selectedMetric}) by ${selectedDimension}`}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {presetChart?.description || `Visualizing top performance groups across ${dataset.name}`}
            </p>
          </div>

          {hoveredPoint && (
            <div className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 shadow-md">
              <span className="font-semibold">{hoveredPoint.label}:</span>
              <span className="font-mono font-bold text-white">
                {hoveredPoint.value.toLocaleString()}
              </span>
              {totalSum > 0 && (
                <span className="text-[10px] text-zinc-400">
                  ({((hoveredPoint.value / totalSum) * 100).toFixed(1)}%)
                </span>
              )}
            </div>
          )}
        </div>

        {/* SVG Graphic */}
        <div className="flex items-center justify-center my-6 min-h-[320px]">
          {renderSVGChart()}
        </div>

        {/* Legend / Breakdown Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 border-t border-zinc-850 pt-4">
          {chartData.map((d, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoveredPoint(d)}
              onMouseLeave={() => setHoveredPoint(null)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-mono cursor-pointer transition ${
                hoveredPoint?.label === d.label
                  ? 'bg-zinc-800 text-white ring-1 ring-zinc-600'
                  : 'bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-850'
              }`}
            >
              <div
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: VIBRANT_CHART_COLORS[i % VIBRANT_CHART_COLORS.length] }}
              />
              <span>{d.label}:</span>
              <span className="font-semibold text-zinc-200">{d.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
