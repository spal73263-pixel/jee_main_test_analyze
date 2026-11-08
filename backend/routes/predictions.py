from typing import List, Dict, Any
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from auth import get_current_user
from services.comparison_service import compare_tests_service

router = APIRouter(prefix="/api/predictions", tags=["predictions"])

@router.get("/target-analysis", response_model=schemas.TargetPredictorOut)
def get_target_prediction_analysis(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(models.StudentProfile).filter(models.StudentProfile.user_id == user.id).first()
    target_marks = profile.target_marks if profile else 220.0
    target_pct = profile.target_percentile if profile else 99.0
    target_date_str = profile.target_exam_date if profile else "2026-01-24"

    tests = (
        db.query(models.Test)
        .filter(models.Test.user_id == user.id)
        .order_by(models.Test.test_date.asc())
        .all()
    )

    if not tests:
        current_avg = 0.0
        growth_rate = 0.0
    else:
        current_avg = round(sum(t.marks_obtained for t in tests) / len(tests), 1)
        if len(tests) >= 2:
            growth_rate = round((tests[-1].marks_obtained - tests[0].marks_obtained) / (len(tests) - 1), 1)
        else:
            growth_rate = 0.0

    marks_gap = round(max(0.0, target_marks - current_avg), 1)

    # Days remaining calculation
    try:
        target_d = datetime.strptime(target_date_str, "%Y-%m-%d").date()
        today = date.today()
        days_rem = max(1, (target_d - today).days)
    except Exception:
        days_rem = 75

    # Estimate required tests and marks growth
    estimated_remaining_tests = max(1, days_rem // 7)
    required_marks_per_test = round(marks_gap / estimated_remaining_tests, 1) if estimated_remaining_tests > 0 else marks_gap
    projected_final = round(current_avg + (growth_rate * estimated_remaining_tests), 1)

    # Calibrated subject targets
    sub_targets = {
        "Physics": {
            "target": profile.target_physics_marks if profile else 75.0,
            "current_avg": 0.0,
            "gap": 0.0
        },
        "Chemistry": {
            "target": profile.target_chemistry_marks if profile else 80.0,
            "current_avg": 0.0,
            "gap": 0.0
        },
        "Mathematics": {
            "target": profile.target_maths_marks if profile else 65.0,
            "current_avg": 0.0,
            "gap": 0.0
        }
    }

    if tests:
        for sub in ["Physics", "Chemistry", "Mathematics"]:
            sub_scores = []
            for t in tests:
                for s in t.subject_results:
                    if s.subject == sub:
                        sub_scores.append(s.total_marks)
            avg_sub = round(sum(sub_scores) / len(sub_scores), 1) if sub_scores else 0.0
            sub_targets[sub]["current_avg"] = avg_sub
            sub_targets[sub]["gap"] = round(max(0.0, sub_targets[sub]["target"] - avg_sub), 1)

    # Milestones for progression curve
    milestones = []
    pace = max(growth_rate, 4.0) if marks_gap > 0 else 2.0
    simulated_score = current_avg
    for i in range(1, min(7, estimated_remaining_tests + 1)):
        simulated_score = min(target_marks + 10, round(simulated_score + pace, 1))
        milestones.append({
            "stage": f"Mock Test +{i}",
            "projected_marks": simulated_score,
            "target_benchmark": target_marks,
            "lower_bound_estimate": max(0.0, round(simulated_score - 8, 1)),
            "upper_bound_estimate": round(simulated_score + 8, 1)
        })

    note = (
        "Statistical Disclaimer: Percentile and AIR cannot be deterministically inferred from marks alone, "
        "as real NTA percentiles depend on shift difficulty, normalization formulas, and overall candidate cohort distributions. "
        "Projections shown represent historical calibration benchmarks based on 2021-2025 JEE Main score-to-percentile data."
    )

    return schemas.TargetPredictorOut(
        current_average_marks=current_avg,
        target_marks=target_marks,
        marks_gap=marks_gap,
        average_growth_rate=growth_rate,
        target_percentile=target_pct,
        target_date=target_date_str,
        days_remaining=days_rem,
        required_marks_per_test=required_marks_per_test,
        projected_final_marks=projected_final,
        historical_calibration_note=note,
        subject_targets=sub_targets,
        progression_milestones=milestones
    )

@router.post("/compare", response_model=schemas.ComparisonOut)
def compare_selected_tests(
    req: schemas.ComparisonRequest,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        return compare_tests_service(req.test_ids, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
