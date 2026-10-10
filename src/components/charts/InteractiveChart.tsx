import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart as PieIcon, 
  Table2, 
  Layers
} from 'lucide-react';
import { ChartConfig, ChartDataPoint } from '../../types';

interface InteractiveChartProps {
  config: ChartConfig;
  className?: string;
}

// Radiant, high-contrast colors suitable for pure black Grok UI
const VIBRANT_SERIES_COLORS = [
  { fill: '#38bdf8', stroke: '#0284c7', glow: 'rgba(56, 189, 248, 0.4)' }, // Electric Sky
  { fill: '#818cf8', stroke: '#4f46e5', glow: 'rgba(129, 140, 248, 0.4)' }, // Indigo
  { fill: '#34d399', stroke: '#059669', glow: 'rgba(52, 211, 153, 0.4)' }, // Emerald
  { fill: '#fbbf24', stroke: '#d97706', glow: 'rgba(251, 191, 36, 0.4)' }, // Amber
  { fill: '#c084fc', stroke: '#9333ea', glow: 'rgba(192, 132, 252, 0.4)' }, // Violet
  { fill: '#f43f5e', stroke: '#be123c', glow: 'rgba(244, 63, 94, 0.4)' }, // Rose
  { fill: '#22d3ee', stroke: '#0891b2', glow: 'rgba(34, 211, 238, 0.4)' }, // Cyan
  { fill: '#a3e635', stroke: '#65a30d', glow: 'rgba(163, 230, 53, 0.4)' }, // Lime
];

export const InteractiveChart: React.FC<InteractiveChartProps> = ({ config, className = '' }) => {
  const [currentType, setCurrentType] = useState<ChartConfig['type']>(config.type || 'bar');
  const [showDataTable, setShowDataTable] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<ChartDataPoint | null>(null);

  const data = config.data || [];
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const totalSum = data.reduce((acc, d) => acc + d.value, 0);

  // XML-safe identifier for SVG gradients
  const safeId = (config.title || 'chart').replace(/[^a-zA-Z0-9]/g, '_');

  const width = 620;
  const height = 270;
  const padding = { top: 30, right: 25, bottom: 50, left: 55 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const renderSVG = () => {
    if (data.length === 0) {
      return (
        <div className="flex h-48 items-center justify-center text-xs text-zinc-500 font-mono">
          No records found for visual projection.
        </div>
      );
    }

    if (currentType === 'bar' || currentType === 'horizontal-bar') {
      const barWidth = Math.max(16, Math.min(48, chartW / data.length - 12));
      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
          <defs>
            {data.map((_, i) => {
              const color = VIBRANT_SERIES_COLORS[i % VIBRANT_SERIES_COLORS.length];
              return (
                <linearGradient key={i} id={`grad_${safeId}_${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color.fill} stopOpacity="1" />
                  <stop offset="100%" stopColor={color.stroke} stopOpacity="0.85" />
                </linearGradient>
              );
            })}
          </defs>

          {/* Grid lines */}
          {[0, 0.33, 0.66, 1].map((pct, i) => {
            const y = padding.top + chartH * (1 - pct);
            const val = maxValue * pct;
            return (
              <g key={i}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#27272a" strokeDasharray="3 3" strokeWidth="0.8" />
                <text x={padding.left - 8} y={y + 3.5} textAnchor="end" fill="#71717a" fontSize="9.5" fontFamily="monospace">
                  {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : Math.round(val)}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((d, i) => {
            const barH = Math.max(4, (d.value / maxValue) * chartH);
            const x = padding.left + (i * (chartW / data.length)) + ((chartW / data.length - barWidth) / 2);
            const y = padding.top + chartH - barH;
            const isHovered = hoveredPoint?.label === d.label;
            const color = VIBRANT_SERIES_COLORS[i % VIBRANT_SERIES_COLORS.length];

            return (
              <g 
                key={i} 
                onMouseEnter={() => setHoveredPoint(d)} 
                onMouseLeave={() => setHoveredPoint(null)} 
                className="cursor-pointer transition-all duration-200"
              >
                {/* Value on top of bar */}
                <text
                  x={x + barWidth / 2}
                  y={Math.max(16, y - 6)}
                  textAnchor="middle"
                  fill={isHovered ? '#ffffff' : color.fill}
                  fontSize="9.5"
                  fontFamily="monospace"
                  fontWeight="600"
                >
                  {d.value >= 1000 ? `${(d.value / 1000).toFixed(1)}k` : d.value}
                </text>

                {/* Bar rect */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  rx="5"
                  fill={`url(#grad_${safeId}_${i})`}
                  stroke={isHovered ? '#ffffff' : color.fill}
                  strokeWidth={isHovered ? '1.5' : '0.5'}
                  className="transition-all duration-150"
                  style={{ filter: isHovered ? `drop-shadow(0 0 8px ${color.glow})` : undefined }}
                />

                {/* X-axis Label */}
                <text
                  x={x + barWidth / 2}
                  y={height - padding.bottom + 18}
                  textAnchor="middle"
                  fill={isHovered ? '#ffffff' : '#a1a1aa'}
                  fontSize="9.5"
                  fontWeight="500"
                >
                  {d.label.length > 9 ? `${d.label.slice(0, 8)}…` : d.label}
                </text>
              </g>
            );
          })}
        </svg>
      );
    }

    if (currentType === 'line' || currentType === 'area') {
      const stepX = data.length > 1 ? chartW / (data.length - 1) : chartW;
      const pts = data.map((d, i) => ({
        x: padding.left + i * stepX,
        y: padding.top + chartH - (d.value / maxValue) * chartH,
        data: d,
        color: VIBRANT_SERIES_COLORS[i % VIBRANT_SERIES_COLORS.length],
      }));

      const pathStr = pts.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
      const areaStr = `${pathStr} L ${pts[pts.length - 1]?.x || 0} ${padding.top + chartH} L ${padding.left} ${padding.top + chartH} Z`;

      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
          <defs>
            <linearGradient id={`areaGrad_${safeId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.33, 0.66, 1].map((pct, i) => {
            const y = padding.top + chartH * (1 - pct);
            const val = maxValue * pct;
            return (
              <g key={i}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#27272a" strokeDasharray="3 3" strokeWidth="0.8" />
                <text x={padding.left - 8} y={y + 3.5} textAnchor="end" fill="#71717a" fontSize="9.5" fontFamily="monospace">
                  {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : Math.round(val)}
                </text>
              </g>
            );
          })}

          {currentType === 'area' && <path d={areaStr} fill={`url(#areaGrad_${safeId})`} />}
          <path d={pathStr} fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {pts.map((pt, i) => {
            const isHovered = hoveredPoint?.label === pt.data.label;
            return (
              <g key={i} onMouseEnter={() => setHoveredPoint(pt.data)} onMouseLeave={() => setHoveredPoint(null)} className="cursor-pointer">
                <circle cx={pt.x} cy={pt.y} r={isHovered ? 6 : 4} fill={pt.color.fill} stroke="#09090b" strokeWidth="2" />
                <text x={pt.x} y={height - padding.bottom + 18} textAnchor="middle" fill={isHovered ? '#ffffff' : '#a1a1aa'} fontSize="9.5">
                  {pt.data.label.length > 8 ? `${pt.data.label.slice(0, 7)}…` : pt.data.label}
                </text>
              </g>
            );
          })}
        </svg>
      );
    }

    if (currentType === 'donut' || currentType === 'pie') {
      const cx = width / 2;
      const cy = height / 2;
      const r = 88;
      const innerR = currentType === 'donut' ? 50 : 0;
      let cumulative = 0;

      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
          {data.map((d, i) => {
            const angle = totalSum > 0 ? (d.value / totalSum) * 2 * Math.PI : 0;
            const a0 = cumulative;
            const a1 = cumulative + angle;
            cumulative += angle;

            const x1 = cx + r * Math.cos(a0);
            const y1 = cy + r * Math.sin(a0);
            const x2 = cx + r * Math.cos(a1);
            const y2 = cy + r * Math.sin(a1);
            const x3 = cx + innerR * Math.cos(a1);
            const y3 = cy + innerR * Math.sin(a1);
            const x4 = cx + innerR * Math.cos(a0);
            const y4 = cy + innerR * Math.sin(a0);

            const large = angle > Math.PI ? 1 : 0;
            const pathD = innerR === 0
              ? `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
              : `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${large} 0 ${x4} ${y4} Z`;

            const color = VIBRANT_SERIES_COLORS[i % VIBRANT_SERIES_COLORS.length];
            const isHovered = hoveredPoint?.label === d.label;

            return (
              <path
                key={i}
                d={pathD}
                fill={color.fill}
                stroke="#09090b"
                strokeWidth="2.5"
                onMouseEnter={() => setHoveredPoint(d)}
                onMouseLeave={() => setHoveredPoint(null)}
                className="cursor-pointer transition-transform hover:opacity-90"
                style={{ 
                  transformOrigin: `${cx}px ${cy}px`, 
                  transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                  filter: isHovered ? `drop-shadow(0 0 10px ${color.glow})` : undefined
                }}
              />
            );
          })}

          {currentType === 'donut' && (
            <g>
              <text x={cx} y={cy - 6} textAnchor="middle" fill="#71717a" fontSize="9" fontFamily="monospace" className="uppercase">
                {hoveredPoint ? 'SELECTED' : 'TOTAL'}
              </text>
              <text x={cx} y={cy + 12} textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold" fontFamily="monospace">
                {hoveredPoint ? hoveredPoint.value.toLocaleString() : totalSum.toLocaleString()}
              </text>
            </g>
          )}
        </svg>
      );
    }

    return null;
  };

  return (
    <div className={`rounded-2xl border border-zinc-800/80 bg-zinc-950/90 p-5 shadow-2xl backdrop-blur-xl ${className}`}>
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-900 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-white tracking-wide font-sans">{config.title}</h4>
            <span className="rounded-full bg-zinc-900 border border-zinc-800 px-2 py-0.2 text-[9px] font-mono text-zinc-400 uppercase">
              {currentType}
            </span>
          </div>
          {config.description && (
            <p className="text-[11px] text-zinc-400 mt-0.5">{config.description}</p>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Chart Type Selector Pills */}
          <div className="flex items-center rounded-full bg-zinc-900/90 p-0.5 border border-zinc-800 text-[10px]">
            <button
              onClick={() => { setCurrentType('bar'); setShowDataTable(false); }}
              className={`rounded-full px-2.5 py-0.5 transition font-medium ${
                currentType === 'bar' && !showDataTable ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Bar
            </button>
            <button
              onClick={() => { setCurrentType('line'); setShowDataTable(false); }}
              className={`rounded-full px-2.5 py-0.5 transition font-medium ${
                currentType === 'line' && !showDataTable ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Line
            </button>
            <button
              onClick={() => { setCurrentType('area'); setShowDataTable(false); }}
              className={`rounded-full px-2.5 py-0.5 transition font-medium ${
                currentType === 'area' && !showDataTable ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Area
            </button>
            <button
              onClick={() => { setCurrentType('donut'); setShowDataTable(false); }}
              className={`rounded-full px-2.5 py-0.5 transition font-medium ${
                currentType === 'donut' && !showDataTable ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Donut
            </button>
          </div>

          <button
            onClick={() => setShowDataTable(prev => !prev)}
            className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
              showDataTable ? 'border-zinc-700 bg-zinc-800 text-white' : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            <Table2 className="h-3 w-3" />
            <span>Table</span>
          </button>
        </div>
      </div>

      {/* Main Canvas / Table */}
      {showDataTable ? (
        <div className="my-3 overflow-x-auto max-h-56">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-zinc-900 text-zinc-400">
                <th className="py-2 px-3 font-semibold">Segment ({config.xAxisLabel || 'Dimension'})</th>
                <th className="py-2 px-3 text-right font-semibold">Value ({config.yAxisLabel || 'Metric'})</th>
                <th className="py-2 px-3 text-right font-semibold">Distribution (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/80 text-[11px]">
              {data.map((d, i) => (
                <tr key={i} className="hover:bg-zinc-900/50">
                  <td className="py-2 px-3 text-zinc-200 font-sans font-medium flex items-center gap-2">
                    <span 
                      className="h-2 w-2 rounded-full shrink-0" 
                      style={{ backgroundColor: VIBRANT_SERIES_COLORS[i % VIBRANT_SERIES_COLORS.length].fill }} 
                    />
                    <span>{d.label}</span>
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-white">{d.value.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right text-sky-400 font-mono">
                    {totalSum > 0 ? ((d.value / totalSum) * 100).toFixed(1) : '0'}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative my-2 h-56 flex items-center justify-center">
          {renderSVG()}
        </div>
      )}

      {/* Dynamic Color Legend Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-900 pt-3 text-[11px]">
        <div className="flex flex-wrap gap-2">
          {data.slice(0, 6).map((d, i) => {
            const color = VIBRANT_SERIES_COLORS[i % VIBRANT_SERIES_COLORS.length];
            const isHovered = hoveredPoint?.label === d.label;
            return (
              <div
                key={i}
                onMouseEnter={() => setHoveredPoint(d)}
                onMouseLeave={() => setHoveredPoint(null)}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono cursor-pointer border transition ${
                  isHovered ? 'bg-zinc-900 border-zinc-600 text-white' : 'bg-zinc-950/60 border-zinc-850 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color.fill }} />
                <span>{d.label}:</span>
                <span className="text-zinc-200 font-bold">{d.value >= 1000 ? `${(d.value / 1000).toFixed(1)}k` : d.value}</span>
              </div>
            );
          })}
        </div>

        {hoveredPoint && (
          <div className="rounded-full bg-zinc-900 border border-zinc-800 px-2.5 py-0.5 text-[10px] font-mono text-zinc-300">
            Selected: <span className="font-bold text-white">{hoveredPoint.label}</span> ({hoveredPoint.value.toLocaleString()})
          </div>
        )}
      </div>
    </div>
  );
};
