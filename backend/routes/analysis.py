from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

@router.get("/dashboard", response_model=schemas.DashboardOverview)
def get_dashboard_overview(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tests = (
        db.query(models.Test)
        .filter(models.Test.user_id == user.id)
        .order_by(models.Test.test_date.asc(), models.Test.created_at.asc())
        .all()
    )

    if not tests:
        return schemas.DashboardOverview(
            total_tests=0,
            average_marks=0.0,
            highest_marks=0.0,
            lowest_marks=0.0,
            average_accuracy=0.0,
            latest_test_score=0.0,
            latest_test_name=None,
            latest_test_date=None,
            overall_improvement=0.0,
            average_percentile=None,
            marks_history=[],
            subject_comparison=[],
            accuracy_history=[],
            question_status_breakdown={"Correct": 0, "Incorrect": 0, "Unattempted": 0},
            weak_topics_count=0,
            strong_topics_count=0
        )

    total_tests = len(tests)
    marks_list = [t.marks_obtained for t in tests]
    avg_marks = round(sum(marks_list) / total_tests, 1)
    highest_marks = max(marks_list)
    lowest_marks = min(marks_list)
    avg_accuracy = round(sum(t.overall_accuracy for t in tests) / total_tests, 1)

    latest_test = tests[-1]
    first_test = tests[0]
    overall_improvement = round(latest_test.marks_obtained - first_test.marks_obtained, 1) if total_tests > 1 else 0.0

    percentiles = [t.official_percentile for t in tests if t.official_percentile is not None]
    avg_percentile = round(sum(percentiles) / len(percentiles), 2) if percentiles else None

    # Marks progression across tests
    marks_history = []
    accuracy_history = []
    for t in tests:
        sub_map = {s.subject: s.total_marks for s in t.subject_results}
        marks_history.append({
            "test_id": t.id,
            "test_name": t.test_name,
            "date": t.test_date,
            "total_marks": t.marks_obtained,
            "physics": sub_map.get("Physics", 0.0),
            "chemistry": sub_map.get("Chemistry", 0.0),
            "mathematics": sub_map.get("Mathematics", 0.0),
            "percentile": t.official_percentile
        })
        accuracy_history.append({
            "test_name": t.test_name,
            "date": t.test_date,
            "accuracy": t.overall_accuracy,
            "attempt_rate": t.attempt_rate
        })

    # Subject comparison aggregate
    subject_totals: Dict[str, Dict[str, float]] = {
        "Physics": {"marks": 0.0, "accuracy_sum": 0.0, "count": 0, "neg_marks": 0.0},
        "Chemistry": {"marks": 0.0, "accuracy_sum": 0.0, "count": 0, "neg_marks": 0.0},
        "Mathematics": {"marks": 0.0, "accuracy_sum": 0.0, "count": 0, "neg_marks": 0.0}
    }

    status_breakdown = {"Correct": 0, "Incorrect": 0, "Unattempted": 0}

    for t in tests:
        for s in t.subject_results:
            if s.subject in subject_totals:
                subject_totals[s.subject]["marks"] += s.total_marks
                subject_totals[s.subject]["accuracy_sum"] += s.accuracy
                subject_totals[s.subject]["neg_marks"] += s.negative_marks
                subject_totals[s.subject]["count"] += 1
            status_breakdown["Correct"] += s.correct
            status_breakdown["Incorrect"] += s.incorrect
            status_breakdown["Unattempted"] += s.unattempted

    subject_comparison = []
    for sub, data in subject_totals.items():
        cnt = data["count"] or 1
        subject_comparison.append({
            "subject": sub,
            "average_marks": round(data["marks"] / cnt, 1),
            "average_accuracy": round(data["accuracy_sum"] / cnt, 1),
            "total_negative_marks": round(data["neg_marks"], 1)
        })

    # Weak & Strong topics counts across recent tests
    all_chaps = (
        db.query(models.ChapterPerformance)
        .join(models.Test)
        .filter(models.Test.user_id == user.id)
        .all()
    )
    weak_count = sum(1 for c in all_chaps if c.classification == "Weak")
    strong_count = sum(1 for c in all_chaps if c.classification == "Strong")

    return schemas.DashboardOverview(
        total_tests=total_tests,
        average_marks=avg_marks,
        highest_marks=highest_marks,
        lowest_marks=lowest_marks,
        average_accuracy=avg_accuracy,
        latest_test_score=latest_test.marks_obtained,
        latest_test_name=latest_test.test_name,
        latest_test_date=latest_test.test_date,
        overall_improvement=overall_improvement,
        average_percentile=avg_percentile,
        marks_history=marks_history,
        subject_comparison=subject_comparison,
        accuracy_history=accuracy_history,
        question_status_breakdown=status_breakdown,
        weak_topics_count=weak_count,
        strong_topics_count=strong_count
    )

@router.get("/weak-topics")
def get_weak_topics_analysis(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Fetch all chapters from user's tests
    chapters = (
        db.query(models.ChapterPerformance)
        .join(models.Test)
        .filter(models.Test.user_id == user.id)
        .all()
    )

    if not chapters:
        return {
            "strong_topics": [],
            "average_topics": [],
            "weak_topics": [],
            "repeated_mistakes": [],
            "strongest_subject": "N/A",
            "weakest_subject": "N/A",
            "strongest_chapter": "N/A",
            "weakest_chapter": "N/A",
            "total_negative_marks": 0.0
        }

    # Aggregate by chapter
    agg: Dict[tuple, Dict[str, Any]] = {}
    for c in chapters:
        key = (c.subject, c.chapter_name)
        if key not in agg:
            agg[key] = {
                "subject": c.subject,
                "chapter_name": c.chapter_name,
                "unit_category": c.unit_category,
                "total_questions": 0,
                "attempted": 0,
                "correct": 0,
                "incorrect": 0,
                "marks": 0.0,
            }
        agg[key]["total_questions"] += c.total_questions
        agg[key]["attempted"] += c.attempted
        agg[key]["correct"] += c.correct
        agg[key]["incorrect"] += c.incorrect
        agg[key]["marks"] += c.marks

    strong = []
    average = []
    weak = []

    for item in agg.values():
        att = item["attempted"]
        corr = item["correct"]
        acc = round((corr / att * 100), 1) if att > 0 else 0.0
        item["accuracy"] = acc

        if acc >= 80.0 and att >= 2:
            strong.append(item)
        elif acc >= 50.0:
            average.append(item)
        else:
            weak.append(item)

    # Sort
    strong = sorted(strong, key=lambda x: x["accuracy"], reverse=True)
    weak = sorted(weak, key=lambda x: (x["accuracy"], -x["incorrect"]))

    # Subjects aggregation
    sub_perf: Dict[str, Dict[str, float]] = {}
    for item in agg.values():
        sub = item["subject"]
        if sub not in sub_perf:
            sub_perf[sub] = {"attempted": 0, "correct": 0}
        sub_perf[sub]["attempted"] += item["attempted"]
        sub_perf[sub]["correct"] += item["correct"]

    sub_acc = {
        s: (d["correct"] / d["attempted"] * 100) if d["attempted"] > 0 else 0
        for s, d in sub_perf.items()
    }
    strongest_sub = max(sub_acc.items(), key=lambda x: x[1])[0] if sub_acc else "N/A"
    weakest_sub = min(sub_acc.items(), key=lambda x: x[1])[0] if sub_acc else "N/A"

    strongest_chap = strong[0]["chapter_name"] if strong else "N/A"
    weakest_chap = weak[0]["chapter_name"] if weak else "N/A"

    repeated_mistakes = [
        {
            "chapter": w["chapter_name"],
            "subject": w["subject"],
            "incorrect_count": w["incorrect"],
            "accuracy": w["accuracy"],
            "recommendation": f"Revise fundamental concepts in {w['chapter_name']} and practice 20 standard formula application problems before attempting next mock."
        }
        for w in weak if w["incorrect"] >= 2
    ]

    return {
        "strong_topics": strong,
        "average_topics": average,
        "weak_topics": weak,
        "repeated_mistakes": repeated_mistakes,
        "strongest_subject": strongest_sub,
        "weakest_subject": weakest_sub,
        "strongest_chapter": strongest_chap,
        "weakest_chapter": weakest_chap,
        "total_weak_chapters": len(weak)
    }

# --- Weak Topic Reminder Endpoints ---
@router.get("/reminders", response_model=List[schemas.WeakTopicReminderOut])
def get_weak_topic_reminders(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return (
        db.query(models.WeakTopicReminder)
        .filter(models.WeakTopicReminder.user_id == user.id)
        .order_by(models.WeakTopicReminder.created_at.desc())
        .all()
    )

@router.post("/reminders", response_model=schemas.WeakTopicReminderOut)
def create_weak_topic_reminder(
    reminder_in: schemas.WeakTopicReminderCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    reminder = models.WeakTopicReminder(
        user_id=user.id,
        subject=reminder_in.subject,
        chapter_name=reminder_in.chapter_name,
        marks_lost=reminder_in.marks_lost,
        notes=reminder_in.notes,
        exam_type=reminder_in.exam_type
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder

@router.delete("/reminders/{reminder_id}")
def delete_weak_topic_reminder(
    reminder_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rem = (
        db.query(models.WeakTopicReminder)
        .filter(models.WeakTopicReminder.id == reminder_id, models.WeakTopicReminder.user_id == user.id)
        .first()
    )
    if not rem:
        raise HTTPException(status_code=404, detail="Reminder not found.")
    db.delete(rem)
    db.commit()
    return {"message": "Reminder deleted successfully."}

@router.put("/reminders/{reminder_id}/toggle")
def toggle_weak_topic_reminder(
    reminder_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rem = (
        db.query(models.WeakTopicReminder)
        .filter(models.WeakTopicReminder.id == reminder_id, models.WeakTopicReminder.user_id == user.id)
        .first()
    )
    if not rem:
        raise HTTPException(status_code=404, detail="Reminder not found.")
    rem.is_resolved = not rem.is_resolved
    db.commit()
    db.refresh(rem)
    return rem

