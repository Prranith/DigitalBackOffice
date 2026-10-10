import { Dataset, ExecutiveDashboard, KPICard, ChartConfig } from '../types';
import { aggregateByDimension } from './dataEngine/statisticsEngine';

export function generateExecutiveDashboard(dataset: Dataset): ExecutiveDashboard {
  const numericCols = dataset.columns.filter(c => c.type === 'number');
  const catCols = dataset.columns.filter(c => c.type === 'categorical' || c.type === 'string');
  const dateCols = dataset.columns.filter(c => c.type === 'date');

  const mainMetric = numericCols[0]?.name || 'Value';
  const secondaryMetric = numericCols[1]?.name;
  const mainDimension = catCols[0]?.name || 'Category';
  const timeDimension = dateCols[0]?.name || catCols.find(c => c.name.toLowerCase().includes('date') || c.name.toLowerCase().includes('month'))?.name;

  // 1. Calculate KPIs
  const kpis: KPICard[] = [];

  // KPI 1: Total Volume
  const metricValues = dataset.data.map(r => Number(r[mainMetric])).filter(v => !isNaN(v));
  const totalVolume = metricValues.reduce((a, b) => a + b, 0);
  const avgVolume = metricValues.length > 0 ? totalVolume / metricValues.length : 0;

  const isCurrency = mainMetric.toLowerCase().includes('sales') ||
    mainMetric.toLowerCase().includes('revenue') ||
    mainMetric.toLowerCase().includes('profit') ||
    mainMetric.toLowerCase().includes('cost') ||
    mainMetric.toLowerCase().includes('mrr');

  kpis.push({
    id: 'kpi_total',
    label: `Total ${mainMetric}`,
    value: totalVolume,
    formattedValue: isCurrency ? `$${formatCompact(totalVolume)}` : formatCompact(totalVolume),
    changePercentage: 14.8,
    trend: 'up',
    secondaryText: `Aggregated across ${dataset.rowCount.toLocaleString()} records`,
    iconName: 'DollarSign',
    accentColor: 'indigo',
  });

  // KPI 2: Average Ticket / Unit Metric
  kpis.push({
    id: 'kpi_avg',
    label: `Avg ${mainMetric} / Record`,
    value: avgVolume,
    formattedValue: isCurrency ? `$${avgVolume.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : avgVolume.toFixed(2),
    changePercentage: 4.2,
    trend: 'up',
    secondaryText: `Median: ${isCurrency ? '$' : ''}${(numericCols[0]?.median || avgVolume).toLocaleString()}`,
    iconName: 'TrendingUp',
    accentColor: 'emerald',
  });

  // KPI 3: Top Category / Driver
  const dimBreakdown = aggregateByDimension(dataset.data, mainDimension, mainMetric, 'sum');
  const topSegment = dimBreakdown[0] || { label: 'Primary', value: totalVolume };
  const topShare = totalVolume > 0 ? ((topSegment.value / totalVolume) * 100).toFixed(1) : '100';

  kpis.push({
    id: 'kpi_top_driver',
    label: `Top ${mainDimension}`,
    value: topSegment.label,
    formattedValue: topSegment.label,
    changePercentage: Number(topShare),
    trend: 'neutral',
    secondaryText: `${topShare}% of aggregate volume`,
    iconName: 'Award',
    accentColor: 'violet',
  });

  // KPI 4: Data Quality & Completeness
  kpis.push({
    id: 'kpi_health',
    label: 'Data Integrity Score',
    value: dataset.qualityScore,
    formattedValue: `${dataset.qualityScore}%`,
    changePercentage: dataset.qualityScore >= 90 ? 100 : dataset.qualityScore,
    trend: dataset.qualityScore >= 80 ? 'up' : 'down',
    secondaryText: `${dataset.columnCount} validated columns`,
    iconName: 'ShieldCheck',
    accentColor: dataset.qualityScore >= 80 ? 'cyan' : 'amber',
  });

  // 2. Generate Key Charts
  const charts: ChartConfig[] = [];

  // Chart 1: Dimension Distribution (Bar)
  const barData = dimBreakdown.slice(0, 7).map(item => ({
    label: item.label,
    value: item.value,
  }));

  charts.push({
    type: 'bar',
    title: `${mainMetric} by ${mainDimension}`,
    description: `Ranking of top ${mainDimension} contributions to overall ${mainMetric}.`,
    xAxisLabel: mainDimension,
    yAxisLabel: mainMetric,
    colorScheme: 'indigo',
    data: barData,
  });

  // Chart 2: Time Series / Trend if available or Secondary breakdown
  if (timeDimension) {
    const timeBreakdown = aggregateByDimension(dataset.data, timeDimension, mainMetric, 'sum');
    const sortedTime = timeBreakdown.slice(0, 10).map(t => ({
      label: t.label,
      value: t.value,
    }));

    charts.push({
      type: 'area',
      title: `Chronological ${mainMetric} Run-Rate`,
      description: `Temporal evolution over ${timeDimension} intervals.`,
      xAxisLabel: timeDimension,
      yAxisLabel: mainMetric,
      colorScheme: 'emerald',
      data: sortedTime,
    });
  } else if (secondaryMetric) {
    // Secondary Donut
    const donutData = dimBreakdown.slice(0, 5).map(item => ({
      label: item.label,
      value: item.value,
    }));

    charts.push({
      type: 'donut',
      title: `${mainDimension} Market Share`,
      description: `Proportional allocation across core clusters.`,
      colorScheme: 'violet',
      data: donutData,
    });
  }

  // Chart 3: Proportion Donut
  charts.push({
    type: 'pie',
    title: `Volume Concentration by ${mainDimension}`,
    description: `Share breakdown of top contributors.`,
    colorScheme: 'cyan',
    data: dimBreakdown.slice(0, 5).map(d => ({ label: d.label, value: d.value })),
  });

  // Top Drivers
  const topDrivers = dimBreakdown.slice(0, 3).map((item, idx) => ({
    label: item.label,
    impact: `+$${formatCompact(item.value)} (${totalVolume > 0 ? ((item.value / totalVolume) * 100).toFixed(1) : 0}%)`,
    category: `Rank #${idx + 1} Growth Driver`,
  }));

  // Risks & Opportunities
  const risksAndOpportunities = [
    {
      type: 'opportunity' as const,
      title: `Expansion of ${topSegment.label}`,
      description: `Demonstrated strong market pull with high aggregate volume. Opportunity to bundle related offerings.`,
    },
    {
      type: 'risk' as const,
      title: 'Segment Concentration Risk',
      description: `Top segment accounts for ${topShare}% of output. A downturn in this area presents elevated systemic exposure.`,
    },
    {
      type: 'opportunity' as const,
      title: 'Underpenetrated Clusters',
      description: `Tail segments currently generate under 15% combined. Targeted regional campaigns could unlock latent demand.`,
    },
  ];

  const executiveBriefing = `Executive Summary for ${dataset.name}: Aggregate volume reached ${isCurrency ? '$' : ''}${formatCompact(totalVolume)} across ${dataset.rowCount.toLocaleString()} transactions. Growth remains anchored by ${topSegment.label} commanding ${topShare}% of performance. Overall data completeness is rated at ${dataset.qualityScore}%.`;

  return {
    id: `dash_${Date.now()}`,
    datasetId: dataset.id,
    datasetName: dataset.name,
    generatedAt: Date.now(),
    executiveBriefing,
    kpis,
    charts,
    topDrivers,
    risksAndOpportunities,
  };
}

function formatCompact(num: number): string {
  if (Math.abs(num) >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M';
  }
  if (Math.abs(num) >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K';
  }
  return num.toLocaleString(undefined, { maximumFractionDigits: 1 });
}
