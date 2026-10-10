import { Dataset, ColumnMetadata } from '../../types';

export interface SemanticMatch {
  datasetName: string;
  columnName: string;
  columnType: string;
  similarityScore: number; // 0.0 - 1.0
  relevanceReason: string;
  sampleValues: (string | number | boolean | null)[];
}

export interface SemanticSearchResult {
  isRelatedToDataset: boolean;
  relevanceConfidence: number; // 0.0 - 1.0
  matchedColumns: SemanticMatch[];
  targetMetric?: string;
  targetDimension?: string;
  targetFilter?: { column: string; value: string };
  intentType: 'aggregation' | 'filter' | 'trend' | 'ranking' | 'overview' | 'anomalies' | 'unrelated';
  unrelatedReason?: string;
}

// Stopwords to ignore during semantic matching
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 
  'by', 'can', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 
  'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 
  'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 
  'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 
  'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 
  'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 
  'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 
  'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 
  'while', 'who', 'whom', 'why', 'with', 'you', 'your', 'yours', 'yourself', 'yourselves',
  'show', 'give', 'tell', 'display', 'generate', 'find', 'get', 'list', 'provide', 'please'
]);

// Analytical intents
const ANALYTICAL_INTENTS = new Set([
  'summary', 'summarize', 'summarise', 'overview', 'statistics', 'stats', 'count', 'total', 'sum', 'average', 
  'mean', 'median', 'distribution', 'breakdown', 'top', 'bottom', 'highest', 'lowest', 
  'best', 'worst', 'trend', 'trends', 'growth', 'monthly', 'yearly', 'annual', 'anomaly', 'outlier', 
  'anomalies', 'outliers', 'rows', 'columns', 'records', 'dataset', 'data', 'table', 'sql',
  'analyse', 'analyze', 'analysis', 'analyzing', 'analytics', 'eda', 'explore', 'exploration',
  'inspect', 'inspection', 'investigate', 'investigation', 'profile', 'profiling',
  'insight', 'insights', 'finding', 'findings', 'report', 'metrics', 'kpi', 'kpis',
  'evaluate', 'evaluation', 'review', 'examine', 'audit', 'query', 'file', 'csv', 'spreadsheet'
]);

const GENERIC_DATASET_ANALYSIS_PATTERNS: RegExp[] = [
  /\b(analys(e|is|ing)|analyz(e|ed|ing|er)|summari[sz](e|ing|ed)|overview|inspect|explore|profil(e|ing)|audit)\b/,
  /\b(what(\s+can)?\s+you\s+(find|see|tell|analy[sz]e)|tell\s+me\s+about|insights?)\b/,
];

// Domain synonyms
const SYNONYM_MAP: Record<string, string[]> = {
  revenue: ['sales', 'income', 'volume', 'amount', 'turnover', 'earnings', 'price', 'mrr', 'gross'],
  sales: ['revenue', 'volume', 'orders', 'purchases', 'units', 'transactions'],
  profit: ['margin', 'net', 'income', 'gain', 'earnings', 'spread'],
  cost: ['expense', 'spend', 'shipping_cost', 'price', 'fee', 'outlay', 'discount'],
  region: ['country', 'state', 'territory', 'location', 'area', 'hub', 'warehouse', 'destination', 'origin', 'city'],
  country: ['region', 'territory', 'nation', 'location', 'state'],
  customer: ['client', 'account', 'user', 'subscriber', 'buyer', 'consumer', 'company', 'name'],
  product: ['item', 'category', 'sku', 'sub_category', 'merchandise', 'device'],
  churn: ['cancellation', 'loss', 'attrition', 'drop', 'retention', 'inactive'],
  performance: ['nps', 'score', 'rating', 'defect', 'lead_time', 'delay', 'profit', 'sales'],
  time: ['date', 'order_date', 'signup_date', 'month', 'year', 'quarter', 'day', 'timestamp', 'period'],
  underperforming: ['low_profit', 'negative', 'churned', 'delayed', 'defect', 'loss', 'return'],
  employee: ['staff', 'worker', 'personnel', 'team', 'department', 'salary'],
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}

function computeTFIDFVector(tokens: string[], vocabulary: string[]): number[] {
  const counts: Record<string, number> = {};
  for (const t of tokens) {
    counts[t] = (counts[t] || 0) + 1;
  }
  return vocabulary.map(word => (counts[word] ? counts[word] / tokens.length : 0));
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dotProduct / denom;
}

export function performSemanticSearch(query: string, datasets: Dataset[]): SemanticSearchResult {
  const primaryDs = datasets[0];
  if (!primaryDs) {
    return {
      isRelatedToDataset: false,
      relevanceConfidence: 0,
      matchedColumns: [],
      intentType: 'unrelated',
      unrelatedReason: 'No dataset is currently loaded to evaluate the query.',
    };
  }

  const rawTokens = tokenize(query);
  const meaningfulTokens = rawTokens.filter(t => !STOP_WORDS.has(t));
  const queryLower = query.toLowerCase();
  const hasDatasetKeyword = /\b(dataset|data|file|csv|table|sheet)\b/.test(queryLower);

  // 1. Check for general analytical questions about this dataset
  const hasAnalyticalIntent = rawTokens.some(t => ANALYTICAL_INTENTS.has(t));
  const hasGenericAnalysisPhrase = GENERIC_DATASET_ANALYSIS_PATTERNS.some(rx => rx.test(queryLower));
  const isGenericDatasetQuery = 
    queryLower.includes('dataset') || 
    queryLower.includes('this data') || 
    queryLower.includes('the data') ||
    queryLower.includes('the file') ||
    queryLower.includes('given') ||
    queryLower.includes('uploaded') ||
    queryLower.includes('csv') ||
    queryLower.includes('table') ||
    queryLower.includes('summar') || 
    queryLower.includes('overview') ||
    queryLower.includes('all columns') ||
    queryLower.includes('how many rows') ||
    queryLower.includes('analyse') ||
    queryLower.includes('analyze') ||
    queryLower.includes('analysis') ||
    queryLower.includes('explore') ||
    queryLower.includes('inspect') ||
    queryLower.includes('insight') ||
    queryLower.includes('finding') ||
    queryLower.includes('tell me about') ||
    queryLower.includes('what can you') ||
    queryLower.includes('what is in') ||
    queryLower.includes('what does') ||
    (hasDatasetKeyword && hasGenericAnalysisPhrase) ||
    (hasGenericAnalysisPhrase && meaningfulTokens.length <= 6);

  // 2. Build vocabulary and documents for column search
  const vocabSet = new Set<string>();
  meaningfulTokens.forEach(t => vocabSet.add(t));

  const columnDocs: { 
    col: ColumnMetadata; 
    tokens: string[]; 
    exactTokens: Set<string>;
    sampleTokens: Set<string>;
  }[] = [];

  for (const col of primaryDs.columns) {
    const colNameTokens = tokenize(col.name);
    colNameTokens.forEach(t => vocabSet.add(t));

    // Expand with synonyms
    const synTokens: string[] = [];
    for (const ct of colNameTokens) {
      if (SYNONYM_MAP[ct]) {
        SYNONYM_MAP[ct].forEach(s => synTokens.push(...tokenize(s)));
      }
    }
    synTokens.forEach(t => vocabSet.add(t));

    // Sample value tokens
    const sampleTokensList: string[] = [];
    (col.sampleValues || []).slice(0, 10).forEach(v => {
      if (v !== null && v !== undefined) {
        tokenize(String(v)).forEach(st => sampleTokensList.push(st));
      }
    });
    (col.topCategories || []).slice(0, 5).forEach(c => {
      tokenize(String(c.value)).forEach(st => sampleTokensList.push(st));
    });
    sampleTokensList.forEach(t => vocabSet.add(t));

    const allTokens = [...colNameTokens, ...synTokens, ...sampleTokensList];
    columnDocs.push({
      col,
      tokens: allTokens,
      exactTokens: new Set(colNameTokens),
      sampleTokens: new Set(sampleTokensList),
    });
  }

  const vocabulary = Array.from(vocabSet);
  const queryVector = computeTFIDFVector(meaningfulTokens, vocabulary);

  const matchedColumns: SemanticMatch[] = [];
  let detectedFilter: { column: string; value: string } | undefined = undefined;

  for (const item of columnDocs) {
    const docVector = computeTFIDFVector(item.tokens, vocabulary);
    let score = cosineSimilarity(queryVector, docVector);

    const colLower = item.col.name.toLowerCase();

    // Check exact column name match
    if (queryLower.includes(colLower) || colLower.includes(queryLower)) {
      score = Math.max(score, 0.95);
    } else {
      // Check token intersection
      for (const t of meaningfulTokens) {
        if (item.exactTokens.has(t)) {
          score = Math.max(score, 0.85);
        }
      }
    }

    // Check if query mentions a specific value belonging to this column
    for (const val of (item.col.topCategories || []).map(c => String(c.value))) {
      if (val.length > 2 && queryLower.includes(val.toLowerCase())) {
        score = Math.max(score, 0.90);
        if (!detectedFilter) {
          detectedFilter = { column: item.col.name, value: val };
        }
      }
    }
    for (const val of (item.col.sampleValues || []).map(v => String(v))) {
      if (val.length > 2 && queryLower.includes(val.toLowerCase())) {
        score = Math.max(score, 0.85);
        if (!detectedFilter) {
          detectedFilter = { column: item.col.name, value: val };
        }
      }
    }

    // Synonym boost
    for (const t of meaningfulTokens) {
      if (SYNONYM_MAP[t]) {
        for (const syn of SYNONYM_MAP[t]) {
          if (item.exactTokens.has(syn)) {
            score = Math.max(score, 0.78);
          }
        }
      }
    }

    if (score >= 0.22) {
      let reason = `Aligned with '${item.col.name}'`;
      if (item.col.type === 'number') {
        reason = `Identified numerical metric '${item.col.name}'`;
      } else if (item.col.type === 'date') {
        reason = `Identified temporal dimension '${item.col.name}'`;
      } else if (item.col.type === 'categorical' || item.col.type === 'string') {
        reason = `Identified categorical dimension '${item.col.name}'`;
      }

      matchedColumns.push({
        datasetName: primaryDs.name,
        columnName: item.col.name,
        columnType: item.col.type,
        similarityScore: Number(score.toFixed(3)),
        relevanceReason: reason,
        sampleValues: item.col.sampleValues || [],
      });
    }
  }

  // Sort matched columns descending by score
  matchedColumns.sort((a, b) => b.similarityScore - a.similarityScore);

  // 3. Evaluate overall relevance confidence
  const maxScore = matchedColumns[0]?.similarityScore || 0;
  
  // Decide whether the query is truly related to the uploaded dataset
  let isRelatedToDataset = false;
  let relevanceConfidence = 0;

  if (matchedColumns.length > 0 && maxScore >= 0.20) {
    isRelatedToDataset = true;
    relevanceConfidence = maxScore;
  } else if (hasAnalyticalIntent || isGenericDatasetQuery) {
    // Queries like "analyse the given .csv file", "summarize data", "what insights can you find", etc.
    isRelatedToDataset = true;
    relevanceConfidence = Math.max(0.85, maxScore);
  } else if (meaningfulTokens.length === 0 && rawTokens.length > 0) {
    // Queries like "show data", "overview", etc.
    isRelatedToDataset = true;
    relevanceConfidence = 0.75;
  } else {
    // Check if query matches dataset name or any column token
    const datasetNameMatch = tokenize(primaryDs.name).some(t => queryLower.includes(t));
    if (datasetNameMatch) {
      isRelatedToDataset = true;
      relevanceConfidence = 0.80;
    } else {
      isRelatedToDataset = false;
      relevanceConfidence = maxScore;
    }
  }

  // Determine intent type
  let intentType: SemanticSearchResult['intentType'] = 'overview';
  if (!isRelatedToDataset) {
    intentType = 'unrelated';
  } else if (queryLower.includes('trend') || queryLower.includes('month') || queryLower.includes('time') || queryLower.includes('growth') || queryLower.includes('timeline')) {
    intentType = 'trend';
  } else if (queryLower.includes('top') || queryLower.includes('highest') || queryLower.includes('lowest') || queryLower.includes('rank') || queryLower.includes('best')) {
    intentType = 'ranking';
  } else if (queryLower.includes('anomaly') || queryLower.includes('outlier')) {
    intentType = 'anomalies';
  } else if (detectedFilter) {
    intentType = 'filter';
  } else if (matchedColumns.some(m => m.columnType === 'number')) {
    intentType = 'aggregation';
  }

  // Identify best target metric and dimension
  const targetMetric = matchedColumns.find(m => m.columnType === 'number')?.columnName ||
    primaryDs.columns.find(c => c.type === 'number' && !isTechnicalCol(c.name))?.name;

  // Identify best target dimension prioritizing meaningful business columns
  let targetDimension = matchedColumns.find(m => m.columnType !== 'number')?.columnName;
  if (!targetDimension) {
    const validCols = primaryDs.columns.filter(c => !isTechnicalCol(c.name));
    const businessKeywords = ['country', 'company', 'category', 'region', 'city', 'status', 'type', 'segment', 'department', 'industry', 'state', 'role', 'tier'];
    for (const kw of businessKeywords) {
      const found = validCols.find(c => c.name.toLowerCase().includes(kw));
      if (found) {
        targetDimension = found.name;
        break;
      }
    }
    if (!targetDimension) {
      targetDimension = validCols.find(c => c.type === 'categorical' || (c.distinctCount > 1 && c.distinctCount <= primaryDs.rowCount))?.name ||
        validCols[0]?.name ||
        primaryDs.columns[0]?.name;
    }
  }

  return {
    isRelatedToDataset,
    relevanceConfidence,
    matchedColumns,
    targetMetric,
    targetDimension,
    targetFilter: detectedFilter,
    intentType,
    unrelatedReason: !isRelatedToDataset
      ? `Query terms do not correlate with any columns, categories, or records in '${primaryDs.name}'.`
      : undefined,
  };
}

function isTechnicalCol(name: string): boolean {
  const low = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return low === 'index' || low === 'id' || low === 'rowid' || low === 'uuid' || low === 'phone' || low === 'phone1' || low === 'phone2' || low === 'email' || low === 'website' || low === 'url';
}
