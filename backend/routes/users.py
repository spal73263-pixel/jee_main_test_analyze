from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta

import models
import schemas
from database import get_db
from auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user
)
from config import ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(prefix="/api/users", tags=["users"])

@router.post("/register", response_model=schemas.Token)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    hashed_pw = get_password_hash(user_in.password)
    new_user = models.User(
        email=user_in.email,
        hashed_password=hashed_pw,
        full_name=user_in.full_name
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create default profile
    profile = models.StudentProfile(
        user_id=new_user.id,
        target_year=user_in.target_year or 2026,
        target_marks=user_in.target_marks or 220.0,
        target_percentile=user_in.target_percentile or 99.0
    )
    db.add(profile)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(
        data={"sub": new_user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return schemas.Token(
        access_token=access_token,
        token_type="bearer",
        user=schemas.UserOut.from_orm(new_user)
    )

@router.post("/login", response_model=schemas.Token)
def login(login_in: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == login_in.email).first()
    if not user or not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return schemas.Token(
        access_token=access_token,
        token_type="bearer",
        user=schemas.UserOut.from_orm(user)
    )

@router.get("/me", response_model=schemas.UserOut)
def get_current_user_profile(user: models.User = Depends(get_current_user)):
    return user

@router.put("/profile", response_model=schemas.StudentProfileOut)
def update_profile(
    profile_in: schemas.StudentProfileUpdate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(models.StudentProfile).filter(models.StudentProfile.user_id == user.id).first()
    if not profile:
        profile = models.StudentProfile(user_id=user.id)
        db.add(profile)

    for field, val in profile_in.dict().items():
        setattr(profile, field, val)

    db.commit()
    db.refresh(profile)
    return profile

@router.post("/forgot-password")
def forgot_password(req: schemas.PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user:
        # Prevent email enumeration by returning a success message regardless
        return {"message": "If this email is registered, password reset instructions have been sent."}

    # Generate a simple reset token
    reset_token = create_access_token(data={"sub": user.email, "type": "reset"}, expires_delta=timedelta(hours=1))
    return {
        "message": "Password reset token generated successfully.",
        "reset_token": reset_token
    }

@router.post("/reset-password")
def reset_password(req: schemas.PasswordResetConfirm, db: Session = Depends(get_db)):
    import jwt
    from config import JWT_SECRET, JWT_ALGORITHM

    try:
        payload = jwt.decode(req.token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=400, detail="Invalid token.")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.hashed_password = get_password_hash(req.new_password)
    db.commit()
    return {"message": "Password successfully updated."}
