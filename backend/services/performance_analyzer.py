from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
import models
import schemas
from services.marks_calculator import JEE_CHAPTER_UNIT_MAP, classify_accuracy

def compute_and_save_test_analysis(test: models.Test, db: Session):
    """
    Computes overall accuracy, attempt rate, chapter performances, and subject breakdowns for a saved test.
    """
    # 1. Update Test Overall Metrics
    total_q = test.total_questions or 75
    subject_results = db.query(models.SubjectResult).filter(models.SubjectResult.test_id == test.id).all()
    questions = db.query(models.QuestionResult).filter(models.QuestionResult.test_id == test.id).all()

    total_attempted = sum(s.attempted for s in subject_results) if subject_results else 0
    total_correct = sum(s.correct for s in subject_results) if subject_results else 0
    total_marks = sum(s.total_marks for s in subject_results) if subject_results else test.marks_obtained

    test.marks_obtained = total_marks
    if total_attempted > 0:
        test.attempt_rate = round((total_attempted / total_q * 100), 2) if total_q > 0 else 0.0
        test.overall_accuracy = round((total_correct / total_attempted * 100), 2)
    else:
        test.overall_accuracy = round((total_marks / test.max_marks * 100), 2) if test.max_marks > 0 else 0.0
        test.attempt_rate = 100.0 if total_marks > 0 else 0.0

    # 2. Compute Chapter Performance from Question Results
    db.query(models.ChapterPerformance).filter(models.ChapterPerformance.test_id == test.id).delete()

    if questions:
        chapter_dict: Dict[tuple, Dict[str, Any]] = {}
        for q in questions:
            key = (q.subject, q.chapter or "General")
            if key not in chapter_dict:
                unit = JEE_CHAPTER_UNIT_MAP.get(q.chapter, (q.subject, "Core Syllabus"))[1]
                chapter_dict[key] = {
                    "subject": q.subject,
                    "chapter_name": q.chapter or "General",
                    "unit_category": unit,
                    "total_questions": 0,
                    "attempted": 0,
                    "correct": 0,
                    "incorrect": 0,
                    "unattempted": 0,
                    "marks": 0.0,
                }
            entry = chapter_dict[key]
            entry["total_questions"] += 1
            if q.status == "Correct":
                entry["attempted"] += 1
                entry["correct"] += 1
                entry["marks"] += (q.marks if q.marks != 0 else 4.0)
            elif q.status == "Incorrect":
                entry["attempted"] += 1
                entry["incorrect"] += 1
                entry["marks"] += (q.marks if q.marks != 0 else -1.0)
            else:
                entry["unattempted"] += 1

        for data in chapter_dict.values():
            acc = round((data["correct"] / data["attempted"] * 100), 2) if data["attempted"] > 0 else 0.0
            classification = classify_accuracy(acc) if data["attempted"] > 0 else "Unattempted"

            chap_perf = models.ChapterPerformance(
                test_id=test.id,
                subject=data["subject"],
                chapter_name=data["chapter_name"],
                unit_category=data["unit_category"],
                total_questions=data["total_questions"],
                attempted=data["attempted"],
                correct=data["correct"],
                incorrect=data["incorrect"],
                unattempted=data["unattempted"],
                marks=data["marks"],
                accuracy=acc,
                classification=classification
            )
            db.add(chap_perf)
    elif subject_results:
        # Fallback for manual mark entries (e.g. HSC or manual JEE entries)
        for s in subject_results:
            acc = s.accuracy if s.accuracy > 0 else (s.percentage if s.percentage > 0 else round((s.total_marks / 100.0) * 100, 2))
            classification = classify_accuracy(acc)
            chap_perf = models.ChapterPerformance(
                test_id=test.id,
                subject=s.subject,
                chapter_name=f"{s.subject} Overall Syllabus",
                unit_category=f"{s.subject} Core",
                total_questions=s.total_questions or 25,
                attempted=s.attempted or (s.total_questions or 25),
                correct=s.correct or int((acc / 100.0) * (s.total_questions or 25)),
                incorrect=s.incorrect or 0,
                unattempted=s.unattempted or 0,
                marks=s.total_marks,
                accuracy=acc,
                classification=classification
            )
            db.add(chap_perf)

    db.commit()

def get_time_management_stats(test_id: int, db: Session) -> Dict[str, Any]:
    test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not test:
        return {}

    questions = db.query(models.QuestionResult).filter(models.QuestionResult.test_id == test_id).all()
    subject_results = db.query(models.SubjectResult).filter(models.SubjectResult.test_id == test_id).all()

    total_duration_sec = (test.duration_minutes or 180) * 60
    subject_times = {s.subject: s.time_spent_seconds for s in subject_results}

    has_question_times = any((q.time_spent_seconds or 0) > 0 for q in questions)
    
    time_correct = sum(q.time_spent_seconds or 0 for q in questions if q.status == "Correct")
    time_incorrect = sum(q.time_spent_seconds or 0 for q in questions if q.status == "Incorrect")
    time_unattempted = sum(q.time_spent_seconds or 0 for q in questions if q.status == "Unattempted")
    
    # Questions taking more than 3.5 minutes (210 seconds)
    excessive_time_qs = [
        {
            "question_number": q.question_number,
            "subject": q.subject,
            "chapter": q.chapter,
            "status": q.status,
            "time_spent": q.time_spent_seconds,
            "difficulty": q.difficulty
        }
        for q in questions if (q.time_spent_seconds or 0) > 210
    ]

    attempted_qs = [q for q in questions if q.status in ("Correct", "Incorrect")]
    avg_time_per_q = round(sum(q.time_spent_seconds or 0 for q in attempted_qs) / len(attempted_qs), 1) if attempted_qs else 0.0

    return {
        "test_name": test.test_name,
        "total_duration_minutes": test.duration_minutes,
        "subject_times": subject_times,
        "has_question_level_timing": has_question_times,
        "avg_time_per_attempted_seconds": avg_time_per_q,
        "time_spent_correct_seconds": time_correct,
        "time_spent_incorrect_seconds": time_incorrect,
        "time_spent_unattempted_seconds": time_unattempted,
        "excessive_time_questions_count": len(excessive_time_qs),
        "excessive_time_questions": excessive_time_qs[:10]
    }
