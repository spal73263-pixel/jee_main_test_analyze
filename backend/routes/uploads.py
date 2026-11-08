import os
import shutil
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from auth import get_current_user
from config import UPLOAD_DIR
from services.result_parser import parse_uploaded_file
from services.marks_calculator import validate_test_data
from services.performance_analyzer import compute_and_save_test_analysis
from services.ai_recommendation import generate_ai_recommendation_report

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

ALLOWED_EXTENSIONS = {".pdf", ".csv", ".xlsx", ".xls", ".png", ".jpg", ".jpeg"}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB

@router.post("/process", response_model=schemas.ExtractedDataPreview)
async def upload_and_process_result(
    file: UploadFile = File(...),
    user: models.User = Depends(get_current_user)
):
    """
    Step 1-6 of workflow:
    Accepts uploaded scorecard (PDF/Image/CSV/Excel), detects format, extracts data,
    validates, and returns an editable preview for the student to inspect/confirm.
    """
    ext = os.path.splitext(file.filename.lower())[1]
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed: PDF, PNG, JPG, CSV, Excel (XLSX/XLS)."
        )

    # Secure file save
    unique_name = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        preview = parse_uploaded_file(file_path, file.filename)
        return preview
    except Exception as e:
        # If parsing completely fails, return an empty template with warning so student can fill in values
        return schemas.ExtractedDataPreview(
            test_name=os.path.splitext(file.filename)[0].replace("_", " ").title(),
            test_date="2026-01-20",
            test_type="Mock Test",
            shift="Shift 1",
            duration_minutes=180,
            total_questions=75,
            max_marks=300.0,
            marks_obtained=0.0,
            subjects=[
                schemas.SubjectResultInput(subject="Physics", total_questions=25, attempted=0, correct=0, incorrect=0, unattempted=25),
                schemas.SubjectResultInput(subject="Chemistry", total_questions=25, attempted=0, correct=0, incorrect=0, unattempted=25),
                schemas.SubjectResultInput(subject="Mathematics", total_questions=25, attempted=0, correct=0, incorrect=0, unattempted=25)
            ],
            questions=[],
            extraction_source="Manual Fallback",
            confidence_level="partial",
            warnings=[f"Automated extraction had difficulty reading formatting: {str(e)}. Please review the fields below."],
            missing_fields=["Automatic extraction failed; please review fields manually"],
            validation_status="needs_review"
        )

@router.post("/confirm", response_model=schemas.TestDetailOut)
def confirm_and_save_test(
    test_in: schemas.TestCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Step 9-10 of workflow:
    Saves verified results to database, performs chapter aggregation,
    and automatically triggers the complete test analysis and AI report.
    """
    # 1. Validation checks
    is_valid, warnings = validate_test_data(test_in)

    # Calculate overall accuracy & attempt rate
    total_q = test_in.total_questions or sum(s.total_questions for s in test_in.subjects) or 75
    total_att = sum(s.attempted for s in test_in.subjects) if test_in.subjects else 0
    total_corr = sum(s.correct for s in test_in.subjects) if test_in.subjects else 0
    total_marks = sum(s.total_marks for s in test_in.subjects) if test_in.subjects else test_in.marks_obtained

    if total_att > 0:
        overall_acc = round((total_corr / total_att * 100), 2)
        attempt_rate = round((total_att / total_q * 100), 2)
    else:
        overall_acc = round((total_marks / test_in.max_marks * 100), 2) if test_in.max_marks > 0 else 0.0
        attempt_rate = 100.0 if total_marks > 0 else 0.0

    # 2. Create Test record
    db_test = models.Test(
        user_id=user.id,
        test_name=test_in.test_name,
        test_id_code=test_in.test_id_code,
        test_date=test_in.test_date,
        test_type=test_in.test_type,
        shift=test_in.shift,
        duration_minutes=test_in.duration_minutes,
        total_questions=total_q,
        max_marks=test_in.max_marks,
        marks_obtained=total_marks,
        official_percentile=test_in.official_percentile,
        official_rank=test_in.official_rank,
        overall_accuracy=overall_acc,
        attempt_rate=attempt_rate,
        notes=test_in.notes
    )
    db.add(db_test)
    db.commit()
    db.refresh(db_test)

    # 3. Create Subject records
    for sub in test_in.subjects:
        db_sub = models.SubjectResult(
            test_id=db_test.id,
            subject=sub.subject,
            total_questions=sub.total_questions,
            attempted=sub.attempted,
            correct=sub.correct,
            incorrect=sub.incorrect,
            unattempted=sub.unattempted,
            positive_marks=sub.positive_marks,
            negative_marks=sub.negative_marks,
            total_marks=sub.total_marks,
            accuracy=sub.accuracy,
            percentage=sub.percentage,
            time_spent_seconds=sub.time_spent_seconds
        )
        db.add(db_sub)

    # 4. Create Question records if provided
    if test_in.questions:
        for q in test_in.questions:
            db_q = models.QuestionResult(
                test_id=db_test.id,
                question_number=q.question_number,
                subject=q.subject,
                chapter=q.chapter,
                topic=q.topic,
                question_type=q.question_type,
                difficulty=q.difficulty,
                selected_answer=q.selected_answer,
                correct_answer=q.correct_answer,
                status=q.status,
                marks=q.marks,
                time_spent_seconds=q.time_spent_seconds
            )
            db.add(db_q)

    db.commit()

    # 5. Compute Chapter Performance and AI recommendations
    compute_and_save_test_analysis(db_test, db)
    generate_ai_recommendation_report(db_test.id, db)

    db.refresh(db_test)
    return db_test
