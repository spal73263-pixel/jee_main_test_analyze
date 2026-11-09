# JEE Main, JEE Advanced & HSC Class 12th AI Test Analysis Dashboard (MERN Stack)

A full-stack **MERN (MongoDB, Express.js, React, Node.js)** educational web application designed for JEE Main, JEE Advanced, and HSC Class 12th aspirants. The platform empowers students to manually log subject marks or upload mock test scorecards (**PDF, Screenshot OCR, CSV, or Excel**), inspect question-level and 12-point AI diagnostic reports, track weak topic & marks reminders, compare test-to-test growth curves, and plan weekly study hours with browser mock test notifications.

---

## 🌟 Key Features

### 1. Manual Exam Marks & Multi-Format Scorecard Extraction
- **Manual Marks Entry**:
  - **JEE Main** & **JEE Advanced**: Physics, Chemistry, Mathematics (supports direct marks or auto-calculated +4/-1 via Correct/Incorrect inputs).
  - **HSC / Board Exam Class 12th**: 6 dedicated subjects (**Mathematics**, **Computer Science 1 (CS 1)**, **Computer Science 2 (CS 2)**, **English**, **Physics**, **Chemistry**).
- **Supported Upload Formats**: Coaching PDFs (Allen, Resonance, FIITJEE, NTA scorecards), spreadsheets (`.csv`, `.xlsx`, `.xls`), and score screenshots (`.png`, `.jpg`, `.jpeg`).
- **Interactive Preview Verification Modal**: Review and edit extracted subject breakdown fields before saving and generating AI analysis.

### 2. Main Dashboard & KPI Overview
- 8 Performance Metric Cards: Tests Attempted, Average Marks, Highest Marks, Lowest Marks, Average Accuracy, Avg Percentile, Latest Test Score, and Overall Improvement.
- Recharts Visualizations: Marks Progression Line Chart, Attempt Quality Donut Chart, Subject-Wise Comparison Bar Chart, and Accuracy & Attempt Rate Area Chart.

### 3. Test Analysis & 12-Point AI Diagnostic Report
- Exam switcher tabs for **All Examinations**, **JEE Main**, **JEE Advanced**, and **Board Exam Class 12th**.
- Subject breakdown cards, 12-point diagnostic breakdown (strengths, weaknesses, negative marking penalty recovery, improvement roadmap), and filterable Question-Level Log.

### 4. Weak Topics & Persistent Marks Reminders Notebook
- Automatic classification into **Weak (<50%)**, **Average (50–79%)**, and **Strong (≥80%)** chapters plus repeated mistake alerts.
- Log custom weak topic & marks lost reminders (`Subject`, `Chapter Name`, `Marks Lost`, `Exam Context`, `Revision Notes`) with resolve toggles and deletion.

### 5. Multi-Test Comparison Engine
- Select 2+ tests side-by-side to evaluate total marks deltas, subject deltas, score/accuracy growth curves, and the **Primary Growth Contributor** subject.

### 6. Weekly Study Planner & Mock Test Notifications
- Plan weekly study sessions by **Day (Mon–Sun)**, **Subject**, **Chapter**, **Study Hours**, and **Practice PYQs** with day filtering and 1-click **AI Auto-Plan** regeneration.
- Schedule upcoming mock tests (`JEE Main`, `JEE Advanced`, `Board Exam Class 12th`) with **TODAY / TOMORROW** countdown badges and live Browser Web Notifications.

### 7. Test History & Print/PDF Export
- Filterable chronological table of logged examinations with quick analysis navigation and Print / PDF export.

---

## 🛠️ Technology Stack (MERN)

- **MongoDB & Mongoose**: Cloud MongoDB Atlas (`MONGODB_URI`), local `mongod` (`mongodb://127.0.0.1:27017/jee_analyzer`), plus automatic embedded local MongoDB fallback for zero-setup Windows execution.
- **Express.js & Node.js**: Modular REST API (`/api/*`), JWT authentication (`bcryptjs` + `jsonwebtoken`), `multer` uploads, `csv-parse`, `xlsx`, `pdf-parse`, and `tesseract.js` OCR.
- **React 18 + Vite**: Tailwind CSS, Recharts, Lucide React, Axios, React Router v6.

---

## 🚀 Quick Start & Local Execution

### 1-Click Windows Launch
Double-click `Open_JEE_Analyzer.bat` in the root folder to automatically install any missing packages, build the React frontend if needed, launch the MERN server on `http://localhost:8000`, and open your browser.

### Manual Local Development

**Terminal 1 — Backend (Express + MongoDB):**
```bash
cd backend
npm install
npm run dev
```
*(Optional: run `npm run seed:reset` to reset and re-seed the demo student data. Note: `server.js` automatically seeds the demo account on first run if missing.)*

**Terminal 2 — Frontend (React + Vite):**
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`.

---

## 🔑 Demo Account Credentials

- **Email**: `demo@jeemain.ai`
- **Password**: `password123`
*(Or click "Fill Pre-Seeded Demo Student Account" on the login screen.)*

---

## 🌐 Deployment

### Option 1: Single-Project Vercel Services Deployment (Frontend + Backend Together)
Root `vercel.json` configures **Vercel Services** (`backend` Express + `frontend` Vite) in one Vercel project:
1. Import `spal73263-pixel/jee_main_test_analyze` on Vercel keeping **Root Directory** as `./`.
2. Add Environment Variable `MONGODB_URI` (from a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster) and `JWT_SECRET`.
3. Click **Deploy** (routes `/api/(.*)` and `/static/(.*)` to `backend`, and `/(.*)` to `frontend`).

### Option 2: Docker Compose (MERN + MongoDB Container)
```bash
docker compose up --build
```
Open `http://localhost:8000`.

### Option 3: Render Blueprint
Connect `spal73263-pixel/jee_main_test_analyze` on Render using `render.yaml` (`Dockerfile`) and set `MONGODB_URI` to your MongoDB Atlas URI.
