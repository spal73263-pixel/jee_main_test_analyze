from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from auth import get_current_user
from services.performance_analyzer import get_time_management_stats

router = APIRouter(prefix="/api/tests", tags=["tests"])

@router.get("", response_model=List[schemas.TestSummaryOut])
def get_user_tests(
    search: Optional[str] = None,
    test_type: Optional[str] = None,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.Test).filter(models.Test.user_id == user.id)

    if search:
        query = query.filter(models.Test.test_name.ilike(f"%{search}%"))
    if test_type and test_type != "All":
        query = query.filter(models.Test.test_type == test_type)

    tests = query.order_by(models.Test.test_date.desc(), models.Test.created_at.desc()).all()

    # Populate subject_marks shorthand
    results = []
    for t in tests:
        sub_dict = {s.subject: s.total_marks for s in t.subject_results}
        summary = schemas.TestSummaryOut.from_orm(t)
        summary.subject_marks = sub_dict
        results.append(summary)

    return results

@router.get("/{test_id}", response_model=schemas.TestDetailOut)
def get_test_detail(
    test_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    test = db.query(models.Test).filter(
        models.Test.id == test_id,
        models.Test.user_id == user.id
    ).first()

    if not test:
        raise HTTPException(status_code=404, detail="Test not found.")

    return test

@router.delete("/{test_id}")
def delete_test(
    test_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    test = db.query(models.Test).filter(
        models.Test.id == test_id,
        models.Test.user_id == user.id
    ).first()

    if not test:
        raise HTTPException(status_code=404, detail="Test not found.")

    db.delete(test)
    db.commit()
    return {"message": "Test successfully deleted."}

@router.get("/{test_id}/time")
def get_test_time_analytics(
    test_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    test = db.query(models.Test).filter(
        models.Test.id == test_id,
        models.Test.user_id == user.id
    ).first()

    if not test:
        raise HTTPException(status_code=404, detail="Test not found.")

    return get_time_management_stats(test_id, db)
