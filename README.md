# JEE Main AI Test Analysis & Performance Dashboard

A full-stack, production-quality educational web application designed for JEE Main aspirants. The platform empowers students to upload mock test scorecards (in **PDF, Screenshot OCR, CSV, or Excel** formats), automatically extract and validate results, inspect question-level analytics, detect weak and strong syllabus chapters, manage exam pacing, compare test-to-test growth, track target percentile trajectories, and receive AI-generated personalized study plans.

---

## 🌟 Key Features

### 1. Multi-Format Mock Test Extraction & Verification System
- **Supported Formats**: Multi-page PDF reports (e.g. Allen, Resonance, FIITJEE, NTA scorecards), Spreadsheet logs (`.csv`, `.xlsx`), and Screenshot images (`.png`, `.jpg`).
- **Pipeline**:
  1. Automatic format detection.
  2. OCR preprocessing via **OpenCV** (adaptive thresholding, noise reduction) and text extraction.
  3. Structured tabular parsing via **pdfplumber** and **Pandas / OpenPyXL**.
  4. Marking scheme validation ($Total = Correct \times 4 - Incorrect \times 1$).
  5. **Human-in-the-Loop Preview & Verification**: An interactive review modal displays extracted fields and allows students to correct or verify uncertain values before saving.
  6. Automatic dashboard recalculation.

### 2. Main Dashboard & KPI Overview
- 8 Performance Metric Cards: Total Tests Attempted, Average Marks, Highest Marks, Lowest Marks, Average Accuracy, Official Percentile, Latest Test Score, and Overall Performance Improvement.
- Interactive Recharts Visualizations:
  - Marks Progression Line Chart (Physics, Chemistry, Maths trajectories).
  - Attempt Quality Donut Chart (Correct, Incorrect, Unattempted).
  - Subject-Wise Comparison Bar Chart (Average Marks & Negative Penalty Drain).
  - Accuracy & Attempt Rate Area Chart.

### 3. Subject & Chapter Deep Dives
- Dedicated Physics, Chemistry, and Mathematics tabs.
- Full JEE Main syllabus unit mapping:
  - **Physics**: Mechanics, Electrodynamics, Modern Physics, Optics, Thermodynamics, Waves and Oscillations, Units & Measurements.
  - **Chemistry**: Physical, Organic, and Inorganic Chemistry.
  - **Mathematics**: Calculus, Algebra, Coordinate Geometry, Trigonometry, Vectors & 3D Geometry, Probability & Statistics, Matrices.
- Search and filter chapters by syllabus category and mastery level.

### 4. Weak Topic & Mistake Diagnostic
- Threshold Classification:
  - **Strong**: $\ge 80\%$ accuracy
  - **Average**: $50\% - 79\%$ accuracy
  - **Weak**: $< 50\%$ accuracy
- Negative marking root causes and repeated mistake warnings with actionable recommendations.

### 5. Time Management Intelligence
- Exam pacing analysis (Total duration, average time per attempted question).
- Speed vs. accuracy evaluation.
- Detection of high-drain questions taking excessive time ($> 3.5$ minutes).
- Productive time vs. negative mistake time loss.

### 6. Multi-Test Comparison Engine
- Select any two or more tests to evaluate progress side-by-side.
- Score deltas, accuracy changes, and automatic identification of the **Primary Subject Contributor** driving growth.

### 7. Target Predictor & Milestones
- Set target marks, target percentile, and target exam attempt date.
- Score gap analysis and required growth rate per test.
- Calibrated growth trajectory model with uncertainty boundaries ($\pm 8$ Marks).
- **Statistical Disclaimer**: Clarifies that percentiles depend on shift difficulty and cohort normalization, distinguishing data-backed historical calibration from official NTA percentiles.

### 8. 7-Day Targeted Study Planner
- Dynamically generated weekly revision schedule mapped directly to the student's weakest chapters and error logs.
- Interactive task completion checkboxes with real-time weekly progress indicator.
- 1-Click regeneration based on newly uploaded mock test data.

### 9. Test History & PDF Export
- Filterable and searchable table of all recorded tests.
- Actions: Open Analysis, Compare Tests, Delete, and Print/Export PDF report.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Recharts, Lucide React, Axios, React Router v6.
- **Backend**: Python 3.14 / 3.10+, FastAPI, SQLAlchemy ORM, SQLite (default for instant local run) / PostgreSQL (production), PyJWT, Bcrypt, Pandas, NumPy, pdfplumber, OpenCV, Pillow, OpenPyXL.
- **Deployment**:
  - Frontend: Vercel / Netlify
  - Backend: Render / Railway / Docker
  - Database: PostgreSQL / Supabase

---

## 🚀 Quick Start & Local Execution

### 1. Backend Setup & Run

Open a terminal in the root directory:

```bash
cd backend

# Install dependencies (if not already installed)
pip install -r requirements.txt

# Run seed script to populate demo account and 3 realistic tests (128 -> 154 -> 184 marks)
python seed_data.py

# Start FastAPI server on port 8000
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Backend API will be accessible at `http://localhost:8000`.
Interactive Swagger API documentation: `http://localhost:8000/docs`.

### 2. Frontend Setup & Run

In a second terminal:

```bash
cd frontend

# Install dependencies (if not already installed)
npm install

# Start Vite dev server on port 5173
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## 🔑 Demo Account Credentials

Use the pre-seeded account to immediately explore all 12 pages with realistic historical data:

- **Email**: `demo@jeemain.ai`
- **Password**: `password123`
*(Or click the "Fill Pre-Seeded Demo Student Account" button on the login screen).*

---

## 📂 Pre-Loaded Sample Test Files for Uploading

Test files formatted for immediate upload testing are available in `/sample_tests`:
1. `allen_mock_test_result.csv` - Comprehensive 75-question mock test result.
2. `resonance_test_result.xlsx` - Multi-sheet Excel scorecard workbook.
3. `nta_jee_main_scorecard.pdf` - Multi-page simulated NTA scorecard report.
4. `mock_scorecard_screenshot.png` - Scorecard image screenshot for OCR testing.

*You can also click the 1-click test format buttons on the **Upload Test** page.*

---

## 🌐 Production Deployment Guide

### Backend (Render / Railway)
1. Set the Root Directory to `backend/`.
2. Build Command: `pip install -r requirements.txt`.
3. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`.
4. Environment Variables:
   - `DATABASE_URL`: Your PostgreSQL / Supabase connection string.
   - `JWT_SECRET`: A long random secret key.

### Frontend (Vercel / Netlify)
1. Set the Root Directory to `frontend/`.
2. Build Command: `npm run build`.
3. Output Directory: `dist`.
4. Add rewrites for Single Page Application routing:
   - In `vercel.json`:
     ```json
     {
       "rewrites": [{ "source": "/(.*)", "destination": "/" }]
     }
     ```
