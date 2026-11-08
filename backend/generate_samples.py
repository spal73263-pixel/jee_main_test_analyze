import os
import csv
import pandas as pd
from PIL import Image, ImageDraw, ImageFont
import pypdfium2

OUTPUT_DIR = r"c:\jee_main_test_analyzer\sample_tests"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 1. Create CSV mock test result
csv_path = os.path.join(OUTPUT_DIR, "allen_mock_test_result.csv")
with open(csv_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["Question Number", "Subject", "Chapter", "Question Type", "Difficulty", "Selected Answer", "Correct Answer", "Status", "Marks", "Time (seconds)"])
    
    # Physics 1-25
    phy_chaps = ["Kinematics", "Laws of Motion", "Work, Energy and Power", "Rotational Motion", "Thermodynamics", "Current Electricity", "Optics", "Modern Physics"]
    for q in range(1, 26):
        status = "Correct" if q % 4 != 0 else ("Incorrect" if q % 8 != 0 else "Unattempted")
        marks = 4.0 if status == "Correct" else (-1.0 if status == "Incorrect" else 0.0)
        writer.writerow([q, "Physics", phy_chaps[q % len(phy_chaps)], "MCQ" if q <= 20 else "Numerical", "Medium", "B" if status != "Unattempted" else "", "B" if status == "Correct" else "A", status, marks, 120 + (q * 3)])
        
    # Chemistry 26-50
    chem_chaps = ["Chemical Bonding", "Thermodynamics", "Chemical Kinetics", "General Organic Chemistry", "Coordination Compounds", "Solutions"]
    for q in range(26, 51):
        status = "Correct" if q % 5 != 0 else ("Incorrect" if q % 10 != 0 else "Unattempted")
        marks = 4.0 if status == "Correct" else (-1.0 if status == "Incorrect" else 0.0)
        writer.writerow([q, "Chemistry", chem_chaps[q % len(chem_chaps)], "MCQ" if q <= 45 else "Numerical", "Easy" if q % 2 == 0 else "Medium", "A" if status != "Unattempted" else "", "A" if status == "Correct" else "C", status, marks, 90 + (q * 2)])
        
    # Mathematics 51-75
    math_chaps = ["Matrices and Determinants", "Sequence and Series", "Integral Calculus", "Differential Equations", "Vectors and 3D Geometry", "Complex Numbers"]
    for q in range(51, 76):
        status = "Correct" if q % 3 != 0 else ("Incorrect" if q % 6 != 0 else "Unattempted")
        marks = 4.0 if status == "Correct" else (-1.0 if status == "Incorrect" else 0.0)
        writer.writerow([q, "Mathematics", math_chaps[q % len(math_chaps)], "MCQ" if q <= 70 else "Numerical", "Hard" if q % 2 == 0 else "Medium", "C" if status != "Unattempted" else "", "C" if status == "Correct" else "D", status, marks, 160 + (q * 2)])

print(f"Created {csv_path}")

# 2. Create Excel mock test result
excel_path = os.path.join(OUTPUT_DIR, "resonance_test_result.xlsx")
summary_data = {
    "Subject": ["Physics", "Chemistry", "Mathematics"],
    "Total Questions": [25, 25, 25],
    "Attempted": [20, 22, 18],
    "Correct": [16, 18, 12],
    "Incorrect": [4, 4, 6],
    "Unattempted": [5, 3, 7],
    "Positive Marks": [64.0, 72.0, 48.0],
    "Negative Marks": [4.0, 4.0, 6.0],
    "Total Marks": [60.0, 68.0, 42.0],
    "Accuracy": [80.0, 81.8, 66.7],
    "Time Spent (sec)": [3600, 3200, 4000]
}
summary_df = pd.DataFrame(summary_data)

questions_df = pd.read_csv(csv_path)

with pd.ExcelWriter(excel_path, engine="openpyxl") as writer:
    summary_df.to_excel(writer, sheet_name="Subject Summary", index=False)
    questions_df.to_excel(writer, sheet_name="Question Analysis", index=False)

print(f"Created {excel_path}")

# 3. Create PDF mock scorecard
# We can generate a clean PDF with pdfplumber/fitz or simple python script using ReportLab/matplotlib/pypdfium2/Pillow
pdf_img = Image.new("RGB", (1240, 1754), color=(255, 255, 255))
draw = ImageDraw.Draw(pdf_img)

# Draw simulated NTA scorecard
draw.rectangle([40, 40, 1200, 1714], outline=(30, 41, 59), width=3)
draw.rectangle([50, 50, 1190, 180], fill=(241, 245, 249))
draw.text((70, 70), "NATIONAL TESTING AGENCY (NTA) - JEE MAIN SCORE CARD", fill=(15, 23, 42))
draw.text((70, 110), "Examination: JEE Main Mock Simulation 2026 | Shift: Morning (09:00 AM to 12:00 PM)", fill=(71, 85, 105))
draw.text((70, 140), "Candidate Name: Aarav Sharma | Roll Number: 260310084920 | Date: 2026-01-15", fill=(71, 85, 105))

# Subject Summary Table
headers = ["Subject", "Total Q", "Attempted", "Correct", "Incorrect", "Marks Obtained", "Subject Percentile"]
row_y = 240
draw.rectangle([70, row_y, 1170, row_y + 40], fill=(226, 232, 240))
x_positions = [80, 260, 400, 540, 680, 820, 1000]

for idx, h in enumerate(headers):
    draw.text((x_positions[idx], row_y + 10), h, fill=(15, 23, 42))

sample_rows = [
    ["Physics", "25", "21", "17", "4", "64.0", "98.15"],
    ["Chemistry", "25", "23", "20", "3", "77.0", "99.04"],
    ["Mathematics", "25", "18", "13", "5", "47.0", "96.40"],
    ["Total", "75", "62", "50", "12", "188.0", "98.72"]
]

for row in sample_rows:
    row_y += 50
    bg = (248, 250, 252) if row[0] != "Total" else (224, 231, 255)
    draw.rectangle([70, row_y, 1170, row_y + 40], fill=bg, outline=(203, 213, 225))
    for idx, cell in enumerate(row):
        draw.text((x_positions[idx], row_y + 10), cell, fill=(15, 23, 42) if row[0] != "Total" else (67, 56, 202))

# Question sample rows
draw.text((70, 500), "DETAILED QUESTION LEVEL LOG (Section A & B)", fill=(15, 23, 42))
q_head = ["Q.No", "Subject", "Type", "Status", "Mark", "Time(s)"]
q_x = [80, 200, 400, 600, 800, 1000]
row_y = 530
draw.rectangle([70, row_y, 1170, row_y + 35], fill=(226, 232, 240))
for idx, h in enumerate(q_head):
    draw.text((q_x[idx], row_y + 8), h, fill=(15, 23, 42))

for q in range(1, 16):
    row_y += 40
    st = "Correct" if q % 3 != 0 else "Incorrect"
    m = "4.0" if st == "Correct" else "-1.0"
    sub = "Physics" if q <= 5 else ("Chemistry" if q <= 10 else "Mathematics")
    draw.rectangle([70, row_y, 1170, row_y + 35], fill=(255, 255, 255), outline=(226, 232, 240))
    vals = [str(q), sub, "MCQ", st, m, "115"]
    for idx, cell in enumerate(vals):
        draw.text((q_x[idx], row_y + 8), cell, fill=(15, 23, 42))

pdf_path = os.path.join(OUTPUT_DIR, "nta_jee_main_scorecard.pdf")
pdf_img.save(pdf_path, "PDF", resolution=150.0)
print(f"Created {pdf_path}")

# 4. Create Screenshot Image
img_path = os.path.join(OUTPUT_DIR, "mock_scorecard_screenshot.png")
pdf_img.save(img_path, "PNG")
print(f"Created {img_path}")
