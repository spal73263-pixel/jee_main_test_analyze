from typing import List
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/api/study-planner", tags=["study-planner"])

@router.get("", response_model=schemas.StudyPlanOut)
def get_current_study_plan(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    plan = (
        db.query(models.StudyPlan)
        .filter(models.StudyPlan.user_id == user.id, models.StudyPlan.is_active == True)
        .order_by(models.StudyPlan.generated_date.desc())
        .first()
    )

    if not plan:
        plan = generate_dynamic_plan(user, db)

    return plan

@router.post("/generate", response_model=schemas.StudyPlanOut)
def regenerate_study_plan(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Deactivate older plans
    old_plans = db.query(models.StudyPlan).filter(models.StudyPlan.user_id == user.id).all()
    for p in old_plans:
        p.is_active = False
    db.commit()

    return generate_dynamic_plan(user, db)

@router.put("/tasks/{task_id}/toggle")
def toggle_task_completion(
    task_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    task = (
        db.query(models.StudyTask)
        .join(models.StudyPlan)
        .filter(models.StudyTask.id == task_id, models.StudyPlan.user_id == user.id)
        .first()
    )

    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    task.is_completed = not task.is_completed
    db.commit()
    db.refresh(task)
    return {"id": task.id, "is_completed": task.is_completed}

@router.post("/tasks", response_model=schemas.StudyTaskOut)
def add_custom_study_task(
    task_in: schemas.StudyTaskCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    plan = (
        db.query(models.StudyPlan)
        .filter(models.StudyPlan.user_id == user.id, models.StudyPlan.is_active == True)
        .order_by(models.StudyPlan.generated_date.desc())
        .first()
    )
    if not plan:
        plan = generate_dynamic_plan(user, db)

    duration_mins = int(task_in.duration_hours * 60)
    desc = task_in.task_description or f"Study {task_in.chapter} ({task_in.duration_hours} hrs) + {task_in.practice_questions} practice questions."

    task = models.StudyTask(
        plan_id=plan.id,
        day_of_week=task_in.day_of_week,
        subject=task_in.subject,
        chapter=task_in.chapter,
        task_description=desc,
        duration_minutes=duration_mins,
        practice_questions=task_in.practice_questions,
        revision_topics=task_in.revision_topics or f"Focus on {task_in.chapter} core problems.",
        is_completed=False
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@router.delete("/tasks/{task_id}")
def delete_study_task(
    task_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    task = (
        db.query(models.StudyTask)
        .join(models.StudyPlan)
        .filter(models.StudyTask.id == task_id, models.StudyPlan.user_id == user.id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    db.delete(task)
    db.commit()
    return {"message": "Study task deleted."}

# --- Scheduled Mock Test Reminders Endpoints ---
@router.get("/tests", response_model=List[schemas.ScheduledTestOut])
def get_scheduled_tests(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return (
        db.query(models.ScheduledTestReminder)
        .filter(models.ScheduledTestReminder.user_id == user.id)
        .order_by(models.ScheduledTestReminder.scheduled_date.asc())
        .all()
    )

@router.post("/tests", response_model=schemas.ScheduledTestOut)
def schedule_test_reminder(
    test_in: schemas.ScheduledTestCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rem = models.ScheduledTestReminder(
        user_id=user.id,
        test_title=test_in.test_title,
        exam_type=test_in.exam_type,
        scheduled_date=test_in.scheduled_date,
        scheduled_time=test_in.scheduled_time,
        duration_minutes=test_in.duration_minutes,
        syllabus_chapters=test_in.syllabus_chapters,
        is_completed=False
    )
    db.add(rem)
    db.commit()
    db.refresh(rem)
    return rem

@router.delete("/tests/{test_id}")
def delete_scheduled_test(
    test_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rem = (
        db.query(models.ScheduledTestReminder)
        .filter(models.ScheduledTestReminder.id == test_id, models.ScheduledTestReminder.user_id == user.id)
        .first()
    )
    if not rem:
        raise HTTPException(status_code=404, detail="Scheduled test not found.")
    db.delete(rem)
    db.commit()
    return {"message": "Scheduled test deleted."}

@router.put("/tests/{test_id}/toggle")
def toggle_scheduled_test(
    test_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rem = (
        db.query(models.ScheduledTestReminder)
        .filter(models.ScheduledTestReminder.id == test_id, models.ScheduledTestReminder.user_id == user.id)
        .first()
    )
    if not rem:
        raise HTTPException(status_code=404, detail="Scheduled test not found.")
    rem.is_completed = not rem.is_completed
    db.commit()
    db.refresh(rem)
    return rem


def generate_dynamic_plan(user: models.User, db: Session) -> models.StudyPlan:
    # Fetch user weak chapters
    chapters = (
        db.query(models.ChapterPerformance)
        .join(models.Test)
        .filter(models.Test.user_id == user.id)
        .all()
    )

    # Find chapters with lowest accuracy
    chap_acc = {}
    for c in chapters:
        if c.attempted > 0:
            key = (c.subject, c.chapter_name)
            if key not in chap_acc:
                chap_acc[key] = {"correct": 0, "attempted": 0}
            chap_acc[key]["correct"] += c.correct
            chap_acc[key]["attempted"] += c.attempted

    weak_list = []
    for (sub, chap), d in chap_acc.items():
        acc = (d["correct"] / d["attempted"]) * 100
        if acc < 65:
            weak_list.append((sub, chap, acc))
    weak_list.sort(key=lambda x: x[2])

    # Default fallback syllabus topics if student hasn't logged many tests yet
    default_rotation = [
        ("Physics", "Rotational Motion", "Moment of inertia theorems and rolling dynamics with PYQs"),
        ("Chemistry", "Chemical Bonding and Molecular Structure", "Hybridization, molecular orbital theory, and dipole moments"),
        ("Mathematics", "Integral Calculus", "Definite integration properties and reduction formulas"),
        ("Physics", "Current Electricity", "Kirchhoff's loop rules, potentiometer, and RC circuit transients"),
        ("Chemistry", "General Organic Chemistry", "Resonance structures, hyperconjugation, and acidity orders"),
        ("Mathematics", "Matrices and Determinants", "Cramer's rule, inverse properties, and system of equations"),
        ("All Subjects", "Full Mock Test", "Timed 3-hour examination under strict exam conditions")
    ]

    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    today_str = date.today().strftime("%Y-%m-%d")

    plan = models.StudyPlan(
        user_id=user.id,
        title=f"7-Day Targeted Recovery Plan (Week of {today_str})",
        week_start_date=today_str,
        is_active=True,
        summary="Focused high-yield revision schedule addressing topics with high negative marking and low accuracy."
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)

    for i, day in enumerate(days):
        if i < len(weak_list):
            sub, chap, acc = weak_list[i]
            desc = f"Concept revision ({acc:.0f}% accuracy in recent tests) + 25 timed practice problems."
        else:
            sub, chap, desc = default_rotation[i % len(default_rotation)]

        task = models.StudyTask(
            plan_id=plan.id,
            day_of_week=day,
            subject=sub,
            chapter=chap,
            task_description=desc,
            duration_minutes=90 if day != "Saturday" else 180,
            practice_questions=25 if day != "Saturday" else 75,
            revision_topics="Formulas, short-notes, and 2021-2025 PYQ error questions.",
            is_completed=False
        )
        db.add(task)

    db.commit()
    db.refresh(plan)
    return plan
