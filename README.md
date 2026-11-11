# JEE Main, JEE Advanced & HSC Class 12th AI Test Analysis Dashboard

A full-stack React + Node.js/Express application for JEE Main, JEE Advanced, and HSC Class 12th aspirants with **real cross-device account sync**. When Om Pal enters test marks, weak chapters, study schedules, or HSC revision updates on his phone, parents or another phone signed into the **same account** immediately see the **exact same live dashboard and progress**.

---

## Key Features

### 1. Cross-Device Account & Cloud Sync
- Signed-in sessions authenticate via `Authorization: Bearer` tokens backed by real REST APIs (`/api/*`).
- Every test result, weak topic reminder, weekly study plan, scheduled mock test, profile update, and HSC revision chapter persists in shared server/cloud storage — **never trapped inside a single phone's browser cache**.
- Includes an instant **Sync** header button and automatic tab/window focus refresh so parents' phones stay up to date.

### 2. Exam Marks Entry & Multi-Format Scorecard Extraction
- **Manual Marks Entry**: **JEE Main** & **JEE Advanced** (Physics, Chemistry, Mathematics — direct marks or auto-calculated `+4 / -1` via Correct/Incorrect inputs).
- **Supported Upload Formats**: Coaching PDFs (Allen, Resonance, FIITJEE, NTA scorecards), spreadsheets (`.csv`, `.xlsx`, `.xls`), and score screenshots (`.png`, `.jpg`, `.jpeg`).
- **Interactive Preview Verification Modal**: Review and edit extracted subject breakdown fields before saving and generating AI analysis.

### 3. Main Dashboard, Test Analysis & HSC Revision Tracker
- **Dashboard Overview**: Tests Attempted, Highest Marks, Average Accuracy, Avg Percentile, Latest Test Score, Marks Progression chart, Attempt Quality donut, Subject Comparison bar chart, and Accuracy & Attempt Rate area chart.
- **Test Performance Deep Dive**: Subject breakdown cards, AI diagnostic strengths/weaknesses/roadmap, negative marking penalty recovery, and question-level filterable log.
- **Weak Topics & Reminders Notebook**: Automatic Weak (`<50%`), Average (`50-79%`), and Strong (`>=80%`) topic classification plus resolve-toggleable mistake reminders.
- **Multi-Test Comparison Engine & Weekly Study Planner**: Compare 2+ tests side-by-side and organize weekly study blocks & mock test countdown alerts.
- **HSC Class 12th Revision Tracker**: Track completed revision chapters and revision counts across **Physics**, **Maths**, **English**, **Chemistry**, and **CS**.

---

## Architecture & Supported Cloud Storage Drivers

- **Frontend (`frontend/`)**: React 18, Vite, Tailwind CSS, Recharts, Lucide React, React Router v6.
- **Backend (`backend/`)**: Express REST API (`routes/` + `services/workspaceService.js` + `services/cloudStore.js`).
- **Zero-Config Automatic Storage Detection** (`backend/config/env.js`):
  1. `MONGODB_URI` (MongoDB Atlas)
  2. `DATABASE_URL` / `POSTGRES_URL` (Neon Postgres / Supabase / Vercel Postgres)
  3. `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` / `KV_REST_API_URL` + `KV_REST_API_TOKEN` (Upstash Redis / Vercel KV)
  4. `BLOB_READ_WRITE_TOKEN` (Vercel Blob)
  5. `local-file` (`backend/.cloud-db.json`) automatically when running locally / via Docker without external env vars.

---

## Quick Start & Deployment

### Deploy on Vercel (Multi-Phone Cloud Sync)
Root [`vercel.json`](vercel.json) deploys `frontend` (Vite SPA) and `backend` (Express API) together:
1. Import this repository on Vercel keeping **Root Directory** as `./`.
2. In **Vercel Project Dashboard -> Storage**, connect **any one** managed store (for example **Upstash Redis**, **Neon Postgres**, or **Vercel Blob**), OR add `MONGODB_URI` under **Settings -> Environment Variables**.
3. Redeploy so the storage environment variables take effect across all devices.

### 1-Click Windows Launch
Double-click `Open_JEE_Analyzer.bat` in the root folder to build the frontend if needed, start `http://localhost:8000`, and open your browser.

### Docker Compose
```bash
docker compose up --build
```
Open `http://localhost:8000`.

---

## Default Student Account

- **Name**: `Om Pal`
- **Email**: `demo@jeemain.ai`
- **Password**: `password123`
*(Click **"Quick Fill Om Pal Account"** on `/login` — starts clean so you enter your own tests and plans, or register a new student account.)*
