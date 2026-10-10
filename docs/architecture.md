# DigitalBackOffice AI Architecture

## System Overview

```mermaid
flowchart TB
    User[Business user or executive]
    UI[React 19 + Vite client]
    Auth[Firebase Authentication]
    Firestore[(Firestore)]
    Upload[CSV upload and schema profiler]
    Engine[In-browser data engine]
    SQL[ANSI SQL executor]
    Stats[Statistics and anomaly detector]
    Forecast[Forecasting engine]
    Views[Analyst, Grid, Charts, Dashboard, Audit, SQL]
    API[Express API]
    Cache[LRU cache and idempotency layer]
    Gemini[Google Gemini AI]

    User --> UI
    UI --> Auth
    Auth --> Firestore
    UI --> Upload
    Upload --> Engine
    Engine --> SQL
    Engine --> Stats
    Engine --> Forecast
    Engine --> Views
    UI --> API
    API --> Cache
    Cache --> Gemini
```

## Runtime Boundaries

- **Client:** React components own navigation, upload workflows, data visualization, SQL interaction, and executive reporting.
- **Data engine:** CSV parsing, profiling, SQL execution, statistics, anomaly detection, and forecasting run in memory in the browser.
- **Server:** Express exposes AI and operational endpoints, with cache and idempotency controls for repeated requests.
- **Identity and persistence:** Firebase Authentication handles Google or demo access. Firestore provides authenticated session and application data storage.
- **Deployment:** Vercel serves the built Vite application. Docker packages the same frontend and Express runtime for self-hosted deployment.
