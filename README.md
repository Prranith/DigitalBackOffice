# InsightPulse AI - Enterprise AI Data Analyst
**Client:** Digital Back Office Ltd.  
**Role:** AI Engineer Production Assignment  

An enterprise-grade, full-stack AI Data Analyst platform that empowers business teams, analysts, and executives to upload one or more CSV files and perform high-level natural language analytics, automated dashboard synthesis, SQL/Pandas code generation, statistical anomaly detection, and time-series forecasting.

---

## 🏛️ System Architecture

```
+-------------------------------------------------------------------------------+
|                             InsightPulse Client (React 19)                    |
|                                                                               |
|  +-------------------+  +-------------------+  +----------------------------+ |
|  | Natural Language  |  | Virtualized Data  |  | SVG Interactive Chart     | |
|  | Analytics Chat    |  | Grid & Filter     |  | Studio (Bar, Line, Donut)  | |
|  +-------------------+  +-------------------+  +----------------------------+ |
|  +-------------------+  +-------------------+  +----------------------------+ |
|  | 1-Click Executive |  | Data Hygiene &    |  | In-Browser SQL             | |
|  | KPI Dashboard     |  | Quality Audit     |  | Execution Playground       | |
|  +-------------------+  +-------------------+  +----------------------------+ |
+-------------------------------------------------------------------------------+
                                      │
            HTTP/REST (Headers: x-idempotency-key, x-cache)
                                      ▼
+-------------------------------------------------------------------------------+
|                       Full-Stack Backend (Node.js / Express)                  |
|                                                                               |
|  +-------------------------------------+  +--------------------------------+  |
|  |   LRU Cache & Idempotency Engine    |  |   Statistical Outlier Engine   |  |
|  |   - Sub-millisecond duplicate skip  |  |   - Z-score (sigma > 2.8)      |  |
|  |   - TTL Expiry & Memory Guard       |  |   - IQR interquartile fences   |  |
|  +-------------------------------------+  +--------------------------------+  |
|                                                                               |
|  +-------------------------------------+  +--------------------------------+  |
|  |   Firebase Authentication & Auth    |  |   Google Gemini AI Engine      |  |
|  |   - Google OAuth / Zero-Trust Rules |  |   - gemini-3.8-flash               |  |
|  |   - Firestore Session Sync          |  |   - Structured JSON reasoning  |  |
|  +-------------------------------------+  +--------------------------------+  |
+-------------------------------------------------------------------------------+
```

---

## 🚀 Key Production Features

### 1. Multi-CSV Upload & Schema Ingestion
- Drag-and-drop ingestion with delimiter auto-detection (`csvParser.ts`).
- Schema profiling: data types (`number`, `string`, `date`, `categorical`, `boolean`), cardinality, min/max, mean, median, standard deviation, and missing values.
- **Cross-Table JOIN Engine**: Merge multiple uploaded files on matching keys (e.g. `order_id`, `customer_id`).

### 2. Natural Language Conversational Analyst
- Structured Chain-of-Thought reasoning breakdown.
- Automatically generates:
  - Executive Business Summaries
  - 3–5 Key Metric Drivers
  - Embedded SVG Visualizations
  - ANSI SQL Queries
  - Idiomatic Pandas Code snippets
  - Statistical Outlier Analysis & Recommendations

### 3. Scalability, Caching & Idempotency
- **Idempotency Header Support (`x-idempotency-key`)**: Prevents duplicate executions during network retries or concurrent requests.
- **In-Memory LRU Cache with TTL**: Sub-millisecond response times for repeated or identical queries.
- **Telemetry & Observability Panel**: Live monitoring of cache hit rate (%), request latency (ms), active cached keys, and real-time execution logs.

### 4. Interactive Data Grid with Pagination
- Paginated table supporting 10, 25, 50, 100 rows per page.
- Universal search filter across all records and columns.
- Clickable column sorting (ASC / DESC).
- Column Inspector popover displaying statistical distributions and top frequency bins.
- One-click CSV export.

### 5. Automated Executive Dashboard
- One-click synthesis of executive KPIs (Total Volume, Average Ticket, Top Growth Driver, Data Quality Score).
- Categorical and temporal run-rate charts.
- Top contributing drivers and strategic risk/opportunity matrix.

### 6. Statistical Outlier & Data Hygiene Audit
- **Data Quality Score**: Calculates overall hygiene grade (A+, A, B, C, D, F) based on completeness, uniqueness, and duplicate rows.
- **Anomaly Engine**: Scans data using both Z-score standardization and IQR fences with configurable sensitivity. Explains why each anomaly was flagged and its operational risk.

### 7. In-Browser SQL Execution Playground
- Run ANSI SQL queries (`SELECT`, `WHERE`, `GROUP BY`, `ORDER BY`, `LIMIT`, `JOIN`) directly in the browser against loaded CSV datasets.
- Instant execution feedback with millisecond latency counter.

### 8. Firebase Authentication
- Integrated Google Sign-In with persistent session tracking.
- Hardened `firestore.rules` adhering to Zero-Trust ABAC principles.

---

## 📦 Getting Started

### Prerequisites
- Node.js 20+
- npm or bun

### Local Development
```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Ensure GEMINI_API_KEY is defined

# 3. Start development server (Port 3000)
npm run dev
```

### Production Build & Run
```bash
npm run build
npm start
```

### Docker Deployment
```bash
docker build -t insightpulse-ai .
docker run -p 3000:3000 -e GEMINI_API_KEY="your_api_key" insightpulse-ai
```

---

## 🎯 Pre-Loaded Enterprise Datasets
The application comes pre-loaded with 3 rich test datasets so you can test immediately with 1 click:
1. **Global E-Commerce Sales**: 1,000+ orders across 4 continents with profit margins, discounts, customer segments, and regional categories.
2. **SaaS MRR & Churn Analytics**: Subscription tiers, usage hours, NPS scores, and churn statuses.
3. **Supply Chain Logistics**: Warehouses, delivery carriers, shipping costs, and defect rates.
