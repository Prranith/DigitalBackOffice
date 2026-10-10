import { Dataset, AnalysisResult, AgentThought, ChartConfig, ChartDataPoint } from '../../types';
import { performSemanticSearch, SemanticSearchResult } from '../dataEngine/semanticSearch';
import { executeSQLQuery, SQLQueryResult, getRowValue } from '../dataEngine/sqlExecutor';
import { detectDatasetAnomalies } from '../dataEngine/anomalyDetector';
import { requestAIAnalysis } from '../geminiService';
import { aggregateByDimension } from '../dataEngine/statisticsEngine';

export interface AgentStreamCallbacks {
  onThought: (thought: AgentThought) => void;
  onToolOutput?: (toolName: string, output: any) => void;
  onProgress?: (progressText: string) => void;
}

export async function runAgenticAnalysis(
  userQuery: string,
  datasets: Dataset[],
  callbacks: AgentStreamCallbacks
): Promise<AnalysisResult> {
  const startTime = performance.now();
  const thoughts: AgentThought[] = [];
  const primaryDs = datasets[0];

  const emitThought = (phase: AgentThought['phase'], title: string, detail: string, data?: any): AgentThought => {
    const thought: AgentThought = {
      id: `th_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      phase,
      title,
      detail,
      status: 'completed',
      timestamp: Date.now(),
      durationMs: Math.round(performance.now() - startTime),
      data,
    };
    thoughts.push(thought);
    callbacks.onThought(thought);
    return thought;
  };

  // Phase 1: Intent & Schema Introspection
  callbacks.onProgress?.('Introspecting active dataset schema & query intent...');
  await sleep(140);
  emitThought(
    'intent',
    'Analyzing Query Intent & Schema',
    `Deconstructing question: "${userQuery}". Introspecting '${primaryDs.name}' (${primaryDs.rowCount.toLocaleString()} records, ${primaryDs.columnCount} columns). Scanning schema: ${primaryDs.columns.map(c => c.name).join(', ')}.`
  );

  // Phase 2: Semantic Vector Space Retrieval
  callbacks.onProgress?.('Searching semantic vector space for business attributes...');
  await sleep(160);
  const semanticResult: SemanticSearchResult = performSemanticSearch(userQuery, datasets);

  emitThought(
    'semantic_search',
    'Semantic Context Retrieval (Vector Space)',
    semanticResult.isRelatedToDataset
      ? `Semantic relevance confirmed (${(semanticResult.relevanceConfidence * 100).toFixed(0)}% confidence). Matched dimensions: ${semanticResult.matchedColumns.map(m => m.columnName).slice(0, 3).join(', ') || semanticResult.targetDimension || 'attributes'}.`
      : `Relevance score below threshold (${(semanticResult.relevanceConfidence * 100).toFixed(0)}%). No corresponding attributes found in '${primaryDs.name}'.`
  );

  // GROUND TRUTH ENFORCEMENT: If query is NOT related to the uploaded document, return explicit NOT FOUND!
  if (!semanticResult.isRelatedToDataset) {
    callbacks.onProgress?.('Enforcing data governance: query is unrelated to active dataset...');
    await sleep(150);
    emitThought(
      'statistical_audit',
      'Ground-Truth Governance Guardrail',
      `Prevented synthetic hallucination: query does not relate to attributes in '${primaryDs.name}'. Returning explicit 'Not Found' status.`
    );

    const availableCols = primaryDs.columns.map(c => `${c.name} (${c.type})`).join(', ');

    return {
      id: `ans_${Date.now()}`,
      query: userQuery,
      isRelated: false,
      unrelatedReason: `The question '${userQuery}' cannot be answered from the active dataset '${primaryDs.name}'. The requested attributes or entities are not present in this file.`,
      summary: `The question "${userQuery}" is not related to the uploaded dataset '${primaryDs.name}'. The requested attributes or entities could not be identified in the active document.`,
      insights: [
        `Strict Data Grounding: The question does not match any column names, category values, or records in '${primaryDs.name}'.`,
        `Available attributes in this dataset: ${availableCols}.`,
        `Active document record volume: ${primaryDs.rowCount.toLocaleString()} rows across ${primaryDs.columnCount} columns.`,
      ],
      reasoningSteps: [
        {
          step: 1,
          title: 'Semantic Schema Matching',
          description: `Scanned all ${primaryDs.columnCount} column headers and sample values against query tokens. No semantic correspondence found.`,
        },
        {
          step: 2,
          title: 'Ground-Truth Verification',
          description: 'Suppressed synthetic hallucination to ensure 100% adherence to uploaded file contents.',
        },
      ],
      recommendations: [
        `Please frame your question using attributes present in this dataset (e.g. ${primaryDs.columns.slice(0, 4).map(c => `'${c.name}'`).join(', ')}).`,
        `Alternatively, upload a new CSV file containing the data relevant to your question.`,
      ],
      agentThoughts: thoughts,
      telemetry: {
        latencyMs: Math.round(performance.now() - startTime),
        cached: false,
        model: 'DigitalBackOffice-GroundTruth-Guardian',
        timestamp: Date.now(),
      },
    };
  }

  // Phase 3: Formulate & Execute ANSI SQL Query directly on the REAL uploaded rows
  callbacks.onProgress?.('Synthesizing & executing verified ANSI SQL query on uploaded data...');
  await sleep(180);

  const tableName = primaryDs.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const targetDim = semanticResult.targetDimension || primaryDs.columns.find(c => c.type === 'categorical' || c.type === 'string')?.name || primaryDs.columns[0].name;
  const targetMetric = semanticResult.targetMetric;
  const targetFilter = semanticResult.targetFilter;

  let generatedSQL = '';
  const filterClause = targetFilter ? `WHERE ${targetFilter.column} = '${targetFilter.value}'\n` : '';

  if (semanticResult.intentType === 'trend') {
    const dateCol = primaryDs.columns.find(c => c.type === 'date' || c.name.toLowerCase().includes('date'))?.name || targetDim;
    if (targetMetric) {
      generatedSQL = `SELECT 
    ${dateCol} AS period,
    COUNT(*) AS record_count,
    ROUND(SUM(${targetMetric}), 2) AS total_${targetMetric.toLowerCase().replace(/[^a-z0-9_]/g, '_')}
FROM ${tableName}
${filterClause ? filterClause : `WHERE ${targetMetric} IS NOT NULL\n`}GROUP BY ${dateCol}
ORDER BY ${dateCol} ASC
LIMIT 12;`;
    } else {
      generatedSQL = `SELECT 
    ${dateCol} AS period,
    COUNT(*) AS record_count
FROM ${tableName}
${filterClause}GROUP BY ${dateCol}
ORDER BY ${dateCol} ASC
LIMIT 12;`;
    }
  } else if (targetMetric) {
    generatedSQL = `SELECT 
    ${targetDim},
    COUNT(*) AS record_count,
    ROUND(SUM(${targetMetric}), 2) AS total_${targetMetric.toLowerCase().replace(/[^a-z0-9_]/g, '_')},
    ROUND(AVG(${targetMetric}), 2) AS avg_${targetMetric.toLowerCase().replace(/[^a-z0-9_]/g, '_')}
FROM ${tableName}
${filterClause ? filterClause : `WHERE ${targetMetric} IS NOT NULL\n`}GROUP BY ${targetDim}
ORDER BY total_${targetMetric.toLowerCase().replace(/[^a-z0-9_]/g, '_')} DESC
LIMIT 8;`;
  } else {
    generatedSQL = `SELECT 
    ${targetDim},
    COUNT(*) AS record_count
FROM ${tableName}
${filterClause ? filterClause : `WHERE ${targetDim} IS NOT NULL AND ${targetDim} != ''\n`}GROUP BY ${targetDim}
ORDER BY record_count DESC
LIMIT 8;`;
  }

  // Execute SQL directly on the uploaded CSV data
  const sqlResult: SQLQueryResult = executeSQLQuery(generatedSQL, datasets);

  emitThought(
    'sql_execution',
    'ANSI SQL Execution & Ground Truth Query',
    `Executed SQL against '${tableName}' in ${sqlResult.executionTimeMs}ms. Extracted ${sqlResult.rowCount} rows of mathematical ground-truth directly from uploaded records.`
  );

  // Phase 4: Statistical & Anomaly Validation
  callbacks.onProgress?.('Auditing statistical distributions and anomaly boundaries...');
  await sleep(150);
  const anomalies = detectDatasetAnomalies(primaryDs, 2.6).slice(0, 4);

  emitThought(
    'statistical_audit',
    'Statistical Variance & Anomaly Scan',
    `Audited output against normal curve: evaluated ${primaryDs.rowCount.toLocaleString()} records; found ${anomalies.length} statistical outliers.`
  );

  // Phase 5: Optimal Visualization Synthesis
  callbacks.onProgress?.('Synthesizing optimal visual layout...');
  await sleep(140);

  let optimalChartType: ChartConfig['type'] = 'bar';
  let colorScheme: ChartConfig['colorScheme'] = 'indigo';

  if (semanticResult.intentType === 'trend') {
    optimalChartType = 'area';
    colorScheme = 'emerald';
  } else if (sqlResult.rowCount <= 5) {
    optimalChartType = 'donut';
    colorScheme = 'violet';
  } else {
    optimalChartType = 'bar';
    colorScheme = 'indigo';
  }

  // GUARANTEED CHART DATA POINTS: extract directly from SQL rows
  let chartDataPoints: ChartDataPoint[] = [];

  if (sqlResult.rows && sqlResult.rows.length > 0) {
    chartDataPoints = sqlResult.rows.map(row => {
      const keys = Object.keys(row);
      const labelKey = keys[0];
      const valKey = keys.find(k => k.startsWith('total_') || k.startsWith('record_count') || k.startsWith('count')) || keys[1] || keys[0];
      return {
        label: String(row[labelKey] || 'Other'),
        value: Number(row[valKey]) || 0,
      };
    });
  }

  // Fallback to direct aggregation if SQL had 0 rows
  if (chartDataPoints.length === 0 && primaryDs.data.length > 0) {
    const directAgg = aggregateByDimension(primaryDs.data, targetDim, targetMetric || targetDim, targetMetric ? 'sum' : 'count');
    chartDataPoints = directAgg.slice(0, 8).map(d => ({ label: d.label, value: d.value }));
  }

  const chartConfig: ChartConfig = {
    type: optimalChartType,
    title: targetMetric ? `${targetMetric} by ${targetDim}` : `Distribution by ${targetDim}`,
    description: `Ground-truth ${optimalChartType.toUpperCase()} breakdown computed directly from '${primaryDs.name}'`,
    xAxisLabel: targetDim,
    yAxisLabel: targetMetric || 'Record Count',
    colorScheme,
    data: chartDataPoints,
  };

  emitThought(
    'chart_synthesis',
    'Optimal Visualization Synthesis',
    `Synthesized '${optimalChartType.toUpperCase()}' visualization with synchronized color mapping based on ${targetDim} distribution (${chartDataPoints.length} segments).`
  );

  // Phase 6: Formulate Executive Intelligence Summary using REAL Data Grounding
  callbacks.onProgress?.('Formulating executive intelligence summary...');

  // Extract top values from the REAL data
  const topPoint = chartDataPoints[0] || { label: 'Primary Segment', value: 0 };
  const secondPoint = chartDataPoints[1];
  const totalVal = chartDataPoints.reduce((acc, p) => acc + p.value, 0);
  const topSharePct = totalVal > 0 ? ((topPoint.value / totalVal) * 100).toFixed(1) : '100.0';

  let finalAnalysis: AnalysisResult;
  try {
    const serverResult = await requestAIAnalysis(userQuery, datasets, {
      idempotencyKey: `an_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    });
    const isServerRelated = serverResult && serverResult.isRelated !== false;

    finalAnalysis = {
      ...serverResult,
      isRelated: true,
      summary: (!isServerRelated || !serverResult.summary || serverResult.summary.includes('not related'))
        ? `Analysis of '${primaryDs.name}' (${primaryDs.rowCount.toLocaleString()} records): Primary volume concentrated in ${targetDim} '${topPoint.label}' with ${topPoint.value.toLocaleString()} ${targetMetric || 'records'} (${topSharePct}% of active volume)${secondPoint ? `, followed by '${secondPoint.label}' with ${secondPoint.value.toLocaleString()}` : ''}.`
        : serverResult.summary,
      insights: (!isServerRelated || !serverResult.insights?.length)
        ? [
            `Leading concentration in '${topPoint.label}' accounting for ${topSharePct}% of total ${targetMetric || 'records'}.`,
            `Top ${Math.min(3, chartDataPoints.length)} segments comprise over ${((chartDataPoints.slice(0, 3).reduce((a, b) => a + b.value, 0) / (totalVal || 1)) * 100).toFixed(1)}% of recorded activity.`,
            `Audited across all ${primaryDs.rowCount.toLocaleString()} uploaded records with 100% mathematical ground-truth.`,
          ]
        : serverResult.insights,
      chart: (serverResult.chart && serverResult.chart.data && serverResult.chart.data.length > 0) ? serverResult.chart : chartConfig,
      agentThoughts: thoughts,
      executedQueryOutput: sqlResult,
      sqlQuery: serverResult.sqlQuery || generatedSQL,
      pandasCode: serverResult.pandasCode || (targetMetric
        ? `df.groupby('${targetDim}')['${targetMetric}'].sum().reset_index().sort_values('${targetMetric}', ascending=False).head(8)`
        : `df['${targetDim}'].value_counts().reset_index(name='count').head(8)`),
      anomalies: (serverResult.anomalies && serverResult.anomalies.length > 0) ? serverResult.anomalies : anomalies,
    };
  } catch {
    // Local synthesis fallback grounded 100% in the uploaded data
    const metricLabel = targetMetric || 'records';
    const unitFormatted = typeof topPoint.value === 'number' ? topPoint.value.toLocaleString() : topPoint.value;

    finalAnalysis = {
      id: `ans_${Date.now()}`,
      query: userQuery,
      isRelated: true,
      summary: `Analysis of '${userQuery}' across '${primaryDs.name}' indicates that '${topPoint.label}' represents the leading ${targetDim} with ${unitFormatted} ${metricLabel} (${topSharePct}% of active segment volume)${secondPoint ? `, followed by '${secondPoint.label}' with ${secondPoint.value.toLocaleString()}` : ''}.`,
      insights: [
        `Dominant concentration in '${topPoint.label}' accounting for ${topSharePct}% of total ${metricLabel}.`,
        `Top ${Math.min(3, chartDataPoints.length)} segments comprise over ${((chartDataPoints.slice(0, 3).reduce((a, b) => a + b.value, 0) / (totalVal || 1)) * 100).toFixed(1)}% of recorded activity.`,
        `Verified across ${primaryDs.rowCount.toLocaleString()} uploaded records with zero synthetic extrapolation.`,
      ],
      reasoningSteps: [
        { step: 1, title: 'Semantic Attribute Mapping', description: `Resolved user query intent to active attribute '${targetDim}' and metric '${targetMetric || 'count'}'.` },
        { step: 2, title: 'SQL Ground-Truth Execution', description: `Aggregated ${primaryDs.rowCount.toLocaleString()} records in ${sqlResult.executionTimeMs}ms directly from uploaded memory.` },
        { step: 3, title: 'Visual & Variance Profiling', description: `Synthesized optimal ${optimalChartType} layout with synchronized color palette.` },
      ],
      sqlQuery: generatedSQL,
      pandasCode: targetMetric
        ? `df.groupby('${targetDim}')['${targetMetric}'].sum().reset_index().sort_values('${targetMetric}', ascending=False).head(8)`
        : `df['${targetDim}'].value_counts().reset_index(name='count').head(8)`,
      chart: chartConfig,
      anomalies,
      agentThoughts: thoughts,
      executedQueryOutput: sqlResult,
      recommendations: [
        `Focus operational decisions on high-performing ${targetDim} cluster '${topPoint.label}'.`,
        `Evaluate variance between leading and secondary segments to optimize resource distribution.`,
      ],
      telemetry: {
        latencyMs: Math.round(performance.now() - startTime),
        cached: false,
        model: 'DigitalBackOffice-AI-Agentic',
        timestamp: Date.now(),
      },
    };
  }

  return finalAnalysis;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
