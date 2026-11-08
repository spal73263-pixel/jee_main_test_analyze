from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

import models
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/api/subjects", tags=["subjects"])

@router.get("/breakdown")
def get_subject_deep_dive(
    subject: Optional[str] = Query(None, description="Physics, Chemistry, or Mathematics"),
    test_id: Optional[int] = Query(None),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = (
        db.query(models.ChapterPerformance)
        .join(models.Test)
        .filter(models.Test.user_id == user.id)
    )

    if test_id:
        query = query.filter(models.ChapterPerformance.test_id == test_id)
    if subject:
        query = query.filter(models.ChapterPerformance.subject == subject)

    records = query.all()

    # Aggregate by chapter
    grouped: Dict[str, Dict[str, Any]] = {}
    for r in records:
        if r.chapter_name not in grouped:
            grouped[r.chapter_name] = {
                "chapter_name": r.chapter_name,
                "subject": r.subject,
                "unit_category": r.unit_category or "Core",
                "total_questions": 0,
                "attempted": 0,
                "correct": 0,
                "incorrect": 0,
                "marks": 0.0,
            }
        grouped[r.chapter_name]["total_questions"] += r.total_questions
        grouped[r.chapter_name]["attempted"] += r.attempted
        grouped[r.chapter_name]["correct"] += r.correct
        grouped[r.chapter_name]["incorrect"] += r.incorrect
        grouped[r.chapter_name]["marks"] += r.marks

    chapter_list = []
    for ch, d in grouped.items():
        acc = round((d["correct"] / d["attempted"] * 100), 1) if d["attempted"] > 0 else 0.0
        d["accuracy"] = acc
        d["classification"] = "Strong" if acc >= 80 else ("Average" if acc >= 50 else "Weak")
        chapter_list.append(d)

    # Unit category aggregation
    units: Dict[str, Dict[str, Any]] = {}
    for item in chapter_list:
        unit = item["unit_category"]
        if unit not in units:
            units[unit] = {"unit_name": unit, "total_questions": 0, "attempted": 0, "correct": 0, "incorrect": 0, "marks": 0.0}
        units[unit]["total_questions"] += item["total_questions"]
        units[unit]["attempted"] += item["attempted"]
        units[unit]["correct"] += item["correct"]
        units[unit]["incorrect"] += item["incorrect"]
        units[unit]["marks"] += item["marks"]

    unit_list = []
    for u, ud in units.items():
        acc = round((ud["correct"] / ud["attempted"] * 100), 1) if ud["attempted"] > 0 else 0.0
        ud["accuracy"] = acc
        unit_list.append(ud)

    return {
        "chapters": sorted(chapter_list, key=lambda x: x["accuracy"]),
        "units": sorted(unit_list, key=lambda x: x["accuracy"]),
        "subject": subject
    }
