export type ColumnType = 'number' | 'string' | 'date' | 'boolean' | 'categorical';

export interface ColumnMetadata {
  name: string;
  type: ColumnType;
  sampleValues: (string | number | boolean | null)[];
  nullCount: number;
  distinctCount: number;
  totalCount: number;
  min?: number | string;
  max?: number | string;
  mean?: number;
  median?: number;
  stdDev?: number;
  topCategories?: { value: string; count: number; percentage: number }[];
}

export interface Dataset {
  id: string;
  name: string;
  fileName: string;
  sizeBytes: number;
  rowCount: number;
  columnCount: number;
  columns: ColumnMetadata[];
  data: Record<string, any>[];
  createdAt: number;
  qualityScore: number;
}

export interface DataQualityIssue {
  column: string;
  type: 'missing_values' | 'high_cardinality' | 'constant_column' | 'type_mismatch' | 'duplicates';
  severity: 'high' | 'medium' | 'low';
  message: string;
  impactPercentage: number;
}

export interface DataQualityReport {
  overallScore: number; // 0 - 100
  letterGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  totalRows: number;
  totalColumns: number;
  duplicateRowCount: number;
  duplicateRowPercentage: number;
  completenessPercentage: number;
  issues: DataQualityIssue[];
  columnHealth: Record<string, { completeness: number; validity: number; distinctValues: number }>;
}

export interface AnomalyItem {
  id: string;
  rowIndex: number;
  column: string;
  value: any;
  method: 'z-score' | 'iqr' | 'domain-rule';
  score: number;
  explanation: string;
  severity: 'critical' | 'warning' | 'info';
  rowData: Record<string, any>;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
  group?: string;
  color?: string;
  metadata?: Record<string, any>;
}

export interface ChartConfig {
  type: 'bar' | 'horizontal-bar' | 'line' | 'area' | 'pie' | 'donut' | 'scatter' | 'histogram';
  title: string;
  description?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  data: ChartDataPoint[];
  colorScheme?: 'indigo' | 'emerald' | 'violet' | 'amber' | 'rose' | 'cyan';
  trendLine?: boolean;
}

export interface ForecastPoint {
  period: string;
  historical?: number;
  forecast?: number;
  upperBound?: number;
  lowerBound?: number;
}

export interface ForecastResult {
  metric: string;
  timeColumn: string;
  historicalPeriods: number;
  forecastPeriods: number;
  growthRatePercentage: number;
  confidenceScore: number;
  rSquared?: number;
  points: ForecastPoint[];
  summary: string;
}

export interface AnalysisReasoningStep {
  step: number;
  title: string;
  description: string;
  details?: string;
}

export interface AgentThought {
  id: string;
  phase: 'intent' | 'semantic_search' | 'sql_execution' | 'statistical_audit' | 'chart_synthesis' | 'conclusion';
  title: string;
  detail: string;
  status: 'pending' | 'running' | 'completed';
  timestamp: number;
  durationMs?: number;
  data?: any;
}

export interface AnalysisResult {
  id: string;
  query: string;
  summary: string;
  insights: string[];
  reasoningSteps: AnalysisReasoningStep[];
  isRelated?: boolean;
  unrelatedReason?: string;
  sqlQuery?: string;
  pandasCode?: string;
  chart?: ChartConfig;
  anomalies?: AnomalyItem[];
  forecast?: ForecastResult;
  recommendations?: string[];
  agentThoughts?: AgentThought[];
  executedQueryOutput?: {
    columns: string[];
    rows: Record<string, any>[];
    rowCount: number;
    executionTimeMs: number;
    error?: string;
  };
  telemetry: {
    latencyMs: number;
    cached: boolean;
    idempotencyKey?: string;
    model: string;
    timestamp: number;
    tokenEstimate?: {
      prompt: number;
      completion: number;
      total: number;
    };
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  analysisResult?: AnalysisResult;
  timestamp: number;
  status?: 'sending' | 'analyzing' | 'done' | 'error';
  errorMessage?: string;
}

export interface KPICard {
  id: string;
  label: string;
  value: string | number;
  formattedValue: string;
  changePercentage?: number;
  trend?: 'up' | 'down' | 'neutral';
  secondaryText?: string;
  iconName?: string;
  accentColor?: string;
}

export interface ExecutiveDashboard {
  id: string;
  datasetId: string;
  datasetName: string;
  generatedAt: number;
  executiveBriefing: string;
  kpis: KPICard[];
  charts: ChartConfig[];
  topDrivers: { label: string; impact: string; category: string }[];
  risksAndOpportunities: { type: 'risk' | 'opportunity'; title: string; description: string }[];
}

export interface ExecutionLog {
  id: string;
  timestamp: number;
  type: 'query' | 'cache' | 'sql' | 'anomaly' | 'system';
  message: string;
  durationMs?: number;
  status: 'success' | 'warning' | 'error' | 'info';
  metadata?: Record<string, any>;
}
