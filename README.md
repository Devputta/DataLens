<div align="center">

# ✨ DataLens

### Turn raw data into clear, interactive insights.

**A modern analytics dashboard for exploring datasets, visualizing trends, and creating shareable reports.**

<p>
  <img alt="License: Apache 2.0" src="https://img.shields.io/badge/License-Apache%202.0-blue.svg">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-Ready-3178C6?logo=typescript&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Built%20with-Vite-646CFF?logo=vite&logoColor=white">
</p>

</div>

---

## Overview

DataLens is a browser-based analytics and data-visualization workspace. It provides an interactive dashboard for inspecting datasets, tracking key metrics, customizing charts, and exporting reports.

The app includes a sample SaaS revenue dataset so the dashboard can be explored immediately, along with tools for loading data and working with dashboard views.

## Features

- **Interactive dashboard** — KPI cards and responsive charts generated from the active dataset.
- **Dataset exploration** — inspect records in a table and work with supported uploaded data.
- **Filtering** — search records and refine views with available filters.
- **Data quality profiling** — review dataset structure and data-quality insights.
- **Chart customization** — adjust chart presentation and manage the dashboard layout.
- **Saved dashboard snapshots** — save and restore named layout configurations in the browser.
- **Automated reports and exports** — create report outputs and export dashboard data or visuals using the available app tools.
- **Theme and currency settings** — customize the display.
- **Live demo data mode** — simulate incoming records to see dashboard metrics update.

> DataLens is an analytics and visualization interface, not a substitute for validating business-critical data or decisions. Export formats and supported file types depend on the current implementation.

## Preview

Add a screenshot or short demo GIF here when one is available:

```text
docs/images/datalens-preview.png
```

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Motion
- Lucide React
- XLSX and jsPDF for supported data/report exports
- Gemini integration dependency (configure credentials securely if using AI-backed functionality)

## Getting Started

### Requirements

- Node.js (use a current LTS release)
- npm

### 1. Get the project

```bash
git clone <YOUR_REPOSITORY_URL>
cd <YOUR_PROJECT_DIRECTORY>
```

Or download and extract the project ZIP.

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env.local` and update the values required by your environment.

**Windows Command Prompt:**
```bat
copy .env.example .env.local
```

**PowerShell:**
```powershell
Copy-Item .env.example .env.local
```

**macOS / Linux:**
```bash
cp .env.example .env.local
```

Set `GEMINI_API_KEY` only if the AI-backed functionality you use requires it. Keep real credentials private and never commit `.env.local`. `APP_URL` should be set to the deployed application URL when needed.

### 4. Start the development server

```bash
npm run dev
```

Open the local URL printed by Vite in your terminal (the project’s configured development port is `3000`).

### 5. Create a production build

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

Run the TypeScript check:

```bash
npm run lint
```

## Deployment

DataLens is a Vite frontend and can be deployed to static hosting platforms such as Vercel, Netlify, or Cloudflare Pages, provided any required server-side integrations are configured for production.

Typical build settings:

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Output directory | `dist` |

If a feature requires a secret API key, do not place that secret in a public client-side environment variable or bundle. Use a trusted server-side endpoint or the hosting platform’s secure secret configuration, and verify the integration’s architecture before deploying.

## Project Structure

```text
.
├── src/
│   ├── components/       # Dashboard, charts, tables, reports, and dialogs
│   ├── context/          # Theme and currency context
│   ├── types/            # Analytics data types
│   ├── utils/            # Parsing, profiling, charting, and export helpers
│   ├── App.tsx           # Main application
│   └── main.tsx          # Application entry point
├── .env.example          # Environment variable template
├── package.json
├── vite.config.ts
├── LICENSE
├── README.md
└── SECURITY.md
```

## Data and Privacy

- Use sample or non-sensitive data while evaluating the app.
- Before uploading confidential or regulated data, review the code and hosting configuration to understand where data is processed and stored.
- Browser storage may be used for saved dashboard snapshots. Avoid using shared devices for sensitive work.
- Do not commit datasets, credentials, access tokens, or private exports to source control.

## Security

Please read [SECURITY.md](SECURITY.md) for vulnerability reporting guidance. Do not publish exploit details or credentials in a public issue.

## Contributing

Contributions are welcome. Before opening a pull request:

1. Open an issue to describe the change or bug.
2. Keep changes focused and explain the motivation.
3. Run `npm run lint` and `npm run build`.
4. Include screenshots for user-interface changes when practical.
5. Never include secrets or private data in commits.

## License

This project is licensed under the [Apache License 2.0](LICENSE).

---

<div align="center">

Made for clearer, more confident data exploration. ✨

</div>
