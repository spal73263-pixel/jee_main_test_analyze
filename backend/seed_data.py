from datetime import datetime, timedelta
import random
from database import SessionLocal, Base, engine
import models
from auth import get_password_hash
from services.performance_analyzer import compute_and_save_test_analysis
from services.ai_recommendation import generate_ai_recommendation_report

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if demo user already exists
        user = db.query(models.User).filter(models.User.email == "demo@jeemain.ai").first()
        if user:
            print("Refreshing demo student tests & reminders...")
            db.delete(user)
            db.commit()

        print("Seeding demo JEE student user and realistic mock test history...")

        # 1. Create User
        user = models.User(
            email="demo@jeemain.ai",
            hashed_password=get_password_hash("password123"),
            full_name="Aarav Sharma"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # 2. Student Profile
        profile = models.StudentProfile(
            user_id=user.id,
            target_year=2026,
            target_attempt="January & April",
            target_percentile=99.2,
            target_marks=225.0,
            target_physics_marks=80.0,
            target_chemistry_marks=85.0,
            target_maths_marks=60.0,
            daily_study_hours=7.0,
            target_exam_date="2026-01-24"
        )
        db.add(profile)
        db.commit()

        # Chapter pools for realistic question generation
        physics_chapters = [
            ("Kinematics", "Mechanics", 120),
            ("Laws of Motion", "Mechanics", 130),
            ("Work, Energy and Power", "Mechanics", 140),
            ("Rotational Motion", "Mechanics", 190),
            ("Gravitation", "Mechanics", 110),
            ("Thermodynamics", "Thermodynamics", 145),
            ("Oscillations and Waves", "Waves and Oscillations", 160),
            ("Electrostatics", "Electrodynamics", 180),
            ("Current Electricity", "Electrodynamics", 130),
            ("Magnetic Effects of Current", "Electrodynamics", 150),
            ("Optics", "Optics", 175),
            ("Modern Physics", "Modern Physics", 100),
            ("Units and Measurements", "Units & Measurements", 90),
        ]

        chem_chapters = [
            ("Some Basic Concepts of Chemistry", "Physical Chemistry", 110),
            ("Atomic Structure", "Physical Chemistry", 115),
            ("Chemical Thermodynamics", "Physical Chemistry", 140),
            ("Chemical Equilibrium", "Physical Chemistry", 130),
            ("Solutions", "Physical Chemistry", 120),
            ("Redox Reactions and Electrochemistry", "Physical Chemistry", 135),
            ("Periodic Table and Periodicity", "Inorganic Chemistry", 75),
            ("Chemical Bonding and Molecular Structure", "Inorganic Chemistry", 85),
            ("Coordination Compounds", "Inorganic Chemistry", 95),
            ("General Organic Chemistry", "Organic Chemistry", 125),
            ("Hydrocarbons", "Organic Chemistry", 110),
            ("Aldehydes, Ketones and Carboxylic Acids", "Organic Chemistry", 130),
        ]

        maths_chapters = [
            ("Complex Numbers and Quadratic Equations", "Algebra", 170),
            ("Matrices and Determinants", "Matrices & Determinants", 140),
            ("Permutations and Combinations", "Algebra", 210),
            ("Sequence and Series", "Algebra", 150),
            ("Limits, Continuity and Differentiability", "Calculus", 180),
            ("Differential Calculus", "Calculus", 190),
            ("Integral Calculus", "Calculus", 220),
            ("Coordinate Geometry (Lines & Circles)", "Coordinate Geometry", 200),
            ("Vectors and 3D Geometry", "Vectors and 3D Geometry", 165),
            ("Statistics and Probability", "Probability & Statistics", 185),
        ]

        # 3 Tests definitions showing realistic progression:
        # Test 1: 128 / 300
        # Test 2: 154 / 300
        # Test 3: 184 / 300 (98.42 percentile)
        tests_data = [
            {
                "name": "JEE Main Diagnostic Mock 01",
                "date": "2025-10-12",
                "type": "JEE Main",
                "shift": "Morning",
                "percentile": 92.15,
                "rank": 98400,
                "phy_acc": 0.65,
                "chem_acc": 0.70,
                "math_acc": 0.50,
                "phy_att": 17,
                "chem_att": 20,
                "math_att": 14,
                "max_marks": 300.0
            },
            {
                "name": "Allen JEE Main Major 02",
                "date": "2025-10-26",
                "type": "JEE Main",
                "shift": "Evening",
                "percentile": 95.80,
                "rank": 52100,
                "phy_acc": 0.75,
                "chem_acc": 0.78,
                "math_acc": 0.58,
                "phy_att": 19,
                "chem_att": 21,
                "math_att": 15,
                "max_marks": 300.0
            },
            {
                "name": "NTA Full Syllabus Simulation 03",
                "date": "2025-11-05",
                "type": "JEE Main",
                "shift": "Morning",
                "percentile": 98.42,
                "rank": 19800,
                "phy_acc": 0.84,
                "chem_acc": 0.86,
                "math_acc": 0.68,
                "phy_att": 21,
                "chem_att": 22,
                "math_att": 17,
                "max_marks": 300.0
            },
            {
                "name": "JEE Advanced All India Simulation 01",
                "date": "2025-11-15",
                "type": "JEE Advanced",
                "shift": "Paper 1 & Paper 2",
                "percentile": 99.10,
                "rank": 4820,
                "phy_acc": 0.72,
                "chem_acc": 0.76,
                "math_acc": 0.62,
                "phy_att": 18,
                "chem_att": 19,
                "math_att": 15,
                "max_marks": 360.0
            },
            {
                "name": "CBSE Class 12 Pre-Board Exam 01",
                "date": "2025-12-02",
                "type": "Board Exam Class 12th",
                "shift": "Annual Theory",
                "percentile": 96.50,
                "rank": None,
                "phy_acc": 0.88,
                "chem_acc": 0.92,
                "math_acc": 0.84,
                "phy_att": 24,
                "chem_att": 24,
                "math_att": 23,
                "max_marks": 220.0
            }
        ]

        for t_idx, td in enumerate(tests_data):
            test = models.Test(
                user_id=user.id,
                test_name=td["name"],
                test_id_code=f"MOCK-2025-0{t_idx + 1}",
                test_date=td["date"],
                test_type=td["type"],
                shift=td["shift"],
                duration_minutes=180,
                total_questions=75,
                max_marks=td.get("max_marks", 300.0),
                official_percentile=td["percentile"],
                official_rank=td["rank"]
            )
            db.add(test)
            db.commit()
            db.refresh(test)

            # Generate questions for this test
            all_questions = []
            
            # Physics (Q 1 to 25)
            for qn in range(1, 26):
                chap_name, unit, base_time = physics_chapters[(qn - 1) % len(physics_chapters)]
                is_att = qn <= td["phy_att"]
                if is_att:
                    is_corr = random.random() < td["phy_acc"]
                    status = "Correct" if is_corr else "Incorrect"
                    marks = 4.0 if is_corr else -1.0
                    time_s = base_time + random.randint(-20, 45)
                else:
                    status = "Unattempted"
                    marks = 0.0
                    time_s = random.randint(10, 40)

                q = models.QuestionResult(
                    test_id=test.id,
                    question_number=qn,
                    subject="Physics",
                    chapter=chap_name,
                    topic=f"{chap_name} Core Application",
                    question_type="MCQ" if qn <= 20 else "Numerical",
                    difficulty="Easy" if qn % 3 == 1 else ("Medium" if qn % 3 == 2 else "Hard"),
                    selected_answer="Option B" if is_att else None,
                    correct_answer="Option B" if status == "Correct" else "Option C",
                    status=status,
                    marks=marks,
                    time_spent_seconds=time_s
                )
                db.add(q)
                all_questions.append(q)

            # Chemistry (Q 26 to 50)
            for qn in range(26, 51):
                idx = qn - 26
                chap_name, unit, base_time = chem_chapters[idx % len(chem_chapters)]
                is_att = (idx + 1) <= td["chem_att"]
                if is_att:
                    is_corr = random.random() < td["chem_acc"]
                    status = "Correct" if is_corr else "Incorrect"
                    marks = 4.0 if is_corr else -1.0
                    time_s = base_time + random.randint(-15, 30)
                else:
                    status = "Unattempted"
                    marks = 0.0
                    time_s = random.randint(10, 30)

                q = models.QuestionResult(
                    test_id=test.id,
                    question_number=qn,
                    subject="Chemistry",
                    chapter=chap_name,
                    topic=f"{chap_name} Reactions & Principles",
                    question_type="MCQ" if qn <= 45 else "Numerical",
                    difficulty="Easy" if qn % 3 == 1 else ("Medium" if qn % 3 == 2 else "Hard"),
                    selected_answer="Option A" if is_att else None,
                    correct_answer="Option A" if status == "Correct" else "Option D",
                    status=status,
                    marks=marks,
                    time_spent_seconds=time_s
                )
                db.add(q)
                all_questions.append(q)

            # Mathematics (Q 51 to 75)
            for qn in range(51, 76):
                idx = qn - 51
                chap_name, unit, base_time = maths_chapters[idx % len(maths_chapters)]
                is_att = (idx + 1) <= td["math_att"]
                if is_att:
                    is_corr = random.random() < td["math_acc"]
                    status = "Correct" if is_corr else "Incorrect"
                    marks = 4.0 if is_corr else -1.0
                    time_s = base_time + random.randint(-20, 60)
                else:
                    status = "Unattempted"
                    marks = 0.0
                    time_s = random.randint(15, 50)

                q = models.QuestionResult(
                    test_id=test.id,
                    question_number=qn,
                    subject="Mathematics",
                    chapter=chap_name,
                    topic=f"{chap_name} Problem Solving",
                    question_type="MCQ" if qn <= 70 else "Numerical",
                    difficulty="Medium" if qn % 2 == 1 else "Hard",
                    selected_answer="Option C" if is_att else None,
                    correct_answer="Option C" if status == "Correct" else "Option A",
                    status=status,
                    marks=marks,
                    time_spent_seconds=time_s
                )
                db.add(q)
                all_questions.append(q)

            db.commit()

            # Create Subject Results
            for sub_name in ["Physics", "Chemistry", "Mathematics"]:
                sub_qs = [q for q in all_questions if q.subject == sub_name]
                att = sum(1 for q in sub_qs if q.status in ("Correct", "Incorrect"))
                corr = sum(1 for q in sub_qs if q.status == "Correct")
                inc = sum(1 for q in sub_qs if q.status == "Incorrect")
                unatt = sum(1 for q in sub_qs if q.status == "Unattempted")
                pos_m = corr * 4.0
                neg_m = inc * 1.0
                tot_m = pos_m - neg_m
                acc = round((corr / att * 100), 2) if att > 0 else 0.0
                time_s = sum(q.time_spent_seconds for q in sub_qs)

                sr = models.SubjectResult(
                    test_id=test.id,
                    subject=sub_name,
                    total_questions=25,
                    attempted=att,
                    correct=corr,
                    incorrect=inc,
                    unattempted=unatt,
                    positive_marks=pos_m,
                    negative_marks=neg_m,
                    total_marks=tot_m,
                    accuracy=acc,
                    percentage=round(tot_m / 100.0 * 100, 2),
                    time_spent_seconds=time_s
                )
                db.add(sr)

            db.commit()

            # Compute chapter performance and AI recommendation
            compute_and_save_test_analysis(test, db)
            generate_ai_recommendation_report(test.id, db)

        # Seed initial Weak Topic Reminders
        reminders_data = [
            ("Physics", "Rotational Motion", -8.0, "Conceded negative marking in rolling without slipping torque balance", "JEE Main"),
            ("Chemistry", "Coordination Compounds", -4.0, "Splitting of d-orbitals in octahedral vs tetrahedral fields", "JEE Advanced"),
            ("Mathematics", "Differential Equations", -5.0, "Missed integrating factor in linear first order form", "Board Exam Class 12th"),
            ("Physics", "Current Electricity", -4.0, "Meter bridge and potentiometer circuit sensitivity derivations", "Board Exam Class 12th"),
            ("Mathematics", "Integral Calculus", -6.0, "Definite integral periodicity and King's property errors", "JEE Advanced")
        ]
        for sub, chap, ml, notes, et in reminders_data:
            rem = models.WeakTopicReminder(
                user_id=user.id,
                subject=sub,
                chapter_name=chap,
                marks_lost=ml,
                notes=notes,
                exam_type=et,
                is_resolved=False
            )
            db.add(rem)
        db.commit()

        print("Successfully seeded realistic JEE Main, JEE Advanced, Board Class 12th tests & weak topic reminders!")

    finally:
        db.close()

if __name__ == "__main__":
    seed()
