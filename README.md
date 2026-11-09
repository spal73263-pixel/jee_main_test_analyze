# JEE Main, JEE Advanced & HSC Class 12th AI Test Analysis Dashboard

A full-featured React + Node.js educational web application for JEE Main, JEE Advanced, and HSC Class 12th aspirants. All student accounts, entered tests, diagnostic reports, weak topic reminders, comparisons, and weekly study schedules persist **directly in browser storage (`localStorage`) on the web page** — **zero external database or environment variables required**.

---

## 🌟 Key Features

### 1. Manual Exam Marks & Multi-Format Scorecard Extraction
- **Manual Marks Entry**:
  - **JEE Main** & **JEE Advanced**: Physics, Chemistry, Mathematics (direct marks or auto-calculated +4/-1 via Correct/Incorrect inputs).
  - **HSC / Board Exam Class 12th**: 6 dedicated subjects (**Mathematics**, **Computer Science 1 (CS 1)**, **Computer Science 2 (CS 2)**, **English**, **Physics**, **Chemistry**).
- **Supported Upload Formats**: Coaching PDFs (Allen, Resonance, FIITJEE, NTA scorecards), spreadsheets (`.csv`, `.xlsx`, `.xls`), and score screenshots (`.png`, `.jpg`, `.jpeg`).
- **Interactive Preview Verification Modal**: Review and edit extracted subject breakdown fields before saving and generating AI analysis.

### 2. Main Dashboard & KPI Overview
- 8 Performance Metric Cards: Tests Attempted, Average Marks, Highest Marks, Lowest Marks, Average Accuracy, Avg Percentile, Latest Test Score, and Overall Improvement.
- Recharts Visualizations: Marks Progression Line Chart, Attempt Quality Donut Chart, Subject-Wise Comparison Bar Chart, and Accuracy & Attempt Rate Area Chart.

### 3. Test Analysis & AI Diagnostic Report
- Exam switcher tabs for **All Examinations**, **JEE Main**, **JEE Advanced**, and **Board Exam Class 12th**.
- Subject breakdown cards, diagnostic report (strengths, weaknesses, negative marking penalty recovery, improvement roadmap), and filterable Question-Level Log.

### 4. Weak Topics & Persistent Marks Reminders Notebook
- Automatic classification into **Weak (<50%)**, **Average (50–79%)**, and **Strong (≥80%)** chapters plus repeated mistake alerts.
- Log custom weak topic & marks lost reminders (`Subject`, `Chapter Name`, `Marks Lost`, `Exam Context`, `Revision Notes`) with resolve toggles and deletion.

### 5. Multi-Test Comparison Engine & Weekly Study Planner
- Select 2+ tests side-by-side to evaluate total marks deltas, subject deltas, score/accuracy growth curves, and the **Primary Growth Contributor** subject.
- Plan weekly study sessions by **Day (Mon–Sun)**, **Subject**, **Chapter**, **Study Hours**, and **Practice PYQs**, plus schedule upcoming mock test notifications.

---

## 🛠️ Architecture (Zero Database Required)

- **Browser Storage (`localStorage`)**: Accounts, student profiles, logged tests, diagnostic reports, weak topic reminders, and study schedules are persisted directly on the web page cleanly (`frontend/src/services/localStore.js`).
- **React 18 + Vite**: Tailwind CSS, Recharts, Lucide React, React Router v6.
- **Stateless Express Service (`backend/`)**: Optional lightweight REST endpoint (`POST /api/uploads/process`, `GET /api/health`) for PDF, Excel, and OCR screenshot extraction without any database connection.

---

## 🚀 Quick Start & Deployment

### Deploy on Vercel (Zero Environment Variables)
Root `vercel.json` deploys both `frontend` (Vite SPA) and `backend` (stateless Express file parser) in a single project:
1. Import `spal73263-pixel/jee_main_test_analyze` on Vercel keeping **Root Directory** as `./`.
2. Click **Deploy** — **no `MONGODB_URI`, database, or secret env vars required**.

### 1-Click Windows Launch
Double-click `Open_JEE_Analyzer.bat` in the root folder to build the frontend if needed, start `http://localhost:8000`, and open your browser.

### Docker Compose
```bash
docker compose up --build
```
Open `http://localhost:8000`.

---

## 🔑 Default Student Account

- **Name**: `Om Pal`
- **Email**: `demo@jeemain.ai`
- **Password**: `password123`
*(Click **"Quick Fill Om Pal Account"** on `/login` — starts completely clean so you enter your own tests and plans, or register a new student account.)*
