from datetime import datetime
from sqlalchemy import (
    Column, Integer, Float, String, Text, Boolean, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    profile = relationship("StudentProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    tests = relationship("Test", back_populates="user", cascade="all, delete-orphan")
    study_plans = relationship("StudyPlan", back_populates="user", cascade="all, delete-orphan")
    ai_recommendations = relationship("AIRecommendation", back_populates="user", cascade="all, delete-orphan")
    weak_topic_reminders = relationship("WeakTopicReminder", back_populates="user", cascade="all, delete-orphan")


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    target_year = Column(Integer, default=2026)
    target_attempt = Column(String(50), default="January & April")
    target_percentile = Column(Float, default=99.0)
    target_marks = Column(Float, default=220.0)
    target_physics_marks = Column(Float, default=75.0)
    target_chemistry_marks = Column(Float, default=80.0)
    target_maths_marks = Column(Float, default=65.0)
    daily_study_hours = Column(Float, default=6.5)
    target_exam_date = Column(String(50), default="2026-01-24")

    user = relationship("User", back_populates="profile")


class Test(Base):
    __tablename__ = "tests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    test_name = Column(String(255), nullable=False)
    test_id_code = Column(String(100), nullable=True)
    test_date = Column(String(50), nullable=False)
    test_type = Column(String(50), default="Mock Test")
    shift = Column(String(50), default="Shift 1")
    duration_minutes = Column(Integer, default=180)
    total_questions = Column(Integer, default=75)
    max_marks = Column(Float, default=300.0)
    marks_obtained = Column(Float, default=0.0)
    official_percentile = Column(Float, nullable=True)
    official_rank = Column(Integer, nullable=True)
    overall_accuracy = Column(Float, default=0.0)
    attempt_rate = Column(Float, default=0.0)
    file_name = Column(String(255), nullable=True)
    file_path = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="tests")
    subject_results = relationship("SubjectResult", back_populates="test", cascade="all, delete-orphan")
    question_results = relationship("QuestionResult", back_populates="test", cascade="all, delete-orphan")
    chapter_performances = relationship("ChapterPerformance", back_populates="test", cascade="all, delete-orphan")
    ai_recommendation = relationship("AIRecommendation", back_populates="test", uselist=False, cascade="all, delete-orphan")


class SubjectResult(Base):
    __tablename__ = "subject_results"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("tests.id"), nullable=False, index=True)
    subject = Column(String(50), nullable=False)  # Physics, Chemistry, Mathematics
    total_questions = Column(Integer, default=25)
    attempted = Column(Integer, default=0)
    correct = Column(Integer, default=0)
    incorrect = Column(Integer, default=0)
    unattempted = Column(Integer, default=0)
    positive_marks = Column(Float, default=0.0)
    negative_marks = Column(Float, default=0.0)
    total_marks = Column(Float, default=0.0)
    accuracy = Column(Float, default=0.0)
    percentage = Column(Float, default=0.0)
    time_spent_seconds = Column(Integer, default=0)

    test = relationship("Test", back_populates="subject_results")


class QuestionResult(Base):
    __tablename__ = "question_results"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("tests.id"), nullable=False, index=True)
    question_number = Column(Integer, nullable=False)
    subject = Column(String(50), nullable=False)
    chapter = Column(String(100), nullable=True)
    topic = Column(String(100), nullable=True)
    question_type = Column(String(20), default="MCQ")
    difficulty = Column(String(20), default="Medium")  # Easy, Medium, Hard
    selected_answer = Column(String(50), nullable=True)
    correct_answer = Column(String(50), nullable=True)
    status = Column(String(30), default="Unattempted")  # Correct, Incorrect, Unattempted
    marks = Column(Float, default=0.0)
    time_spent_seconds = Column(Integer, default=0)

    test = relationship("Test", back_populates="question_results")


class ChapterPerformance(Base):
    __tablename__ = "chapter_performances"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("tests.id"), nullable=False, index=True)
    subject = Column(String(50), nullable=False)
    chapter_name = Column(String(100), nullable=False)
    unit_category = Column(String(100), nullable=True)
    total_questions = Column(Integer, default=0)
    attempted = Column(Integer, default=0)
    correct = Column(Integer, default=0)
    incorrect = Column(Integer, default=0)
    unattempted = Column(Integer, default=0)
    marks = Column(Float, default=0.0)
    accuracy = Column(Float, default=0.0)
    classification = Column(String(30), default="Average")  # Strong, Average, Weak

    test = relationship("Test", back_populates="chapter_performances")


class StudyPlan(Base):
    __tablename__ = "study_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    generated_date = Column(DateTime, default=datetime.utcnow)
    week_start_date = Column(String(50), nullable=False)
    is_active = Column(Boolean, default=True)
    summary = Column(Text, nullable=True)

    user = relationship("User", back_populates="study_plans")
    tasks = relationship("StudyTask", back_populates="plan", cascade="all, delete-orphan")


class StudyTask(Base):
    __tablename__ = "study_tasks"

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("study_plans.id"), nullable=False, index=True)
    day_of_week = Column(String(30), nullable=False)  # Monday, Tuesday, ...
    subject = Column(String(50), nullable=False)
    chapter = Column(String(100), nullable=False)
    task_description = Column(Text, nullable=False)
    duration_minutes = Column(Integer, default=90)
    practice_questions = Column(Integer, default=20)
    revision_topics = Column(Text, nullable=True)
    is_completed = Column(Boolean, default=False)

    plan = relationship("StudyPlan", back_populates="tasks")


class AIRecommendation(Base):
    __tablename__ = "ai_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("tests.id"), unique=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    overall_summary = Column(Text, nullable=False)
    subject_wise_analysis = Column(Text, nullable=False)
    strong_topics = Column(Text, nullable=False)
    weak_topics = Column(Text, nullable=False)
    repeated_mistakes = Column(Text, nullable=True)
    negative_marking_analysis = Column(Text, nullable=False)
    time_management_analysis = Column(Text, nullable=False)
    comparison_with_previous = Column(Text, nullable=True)
    improvement_areas = Column(Text, nullable=False)
    revision_topics = Column(Text, nullable=False)
    recommended_questions = Column(Text, nullable=False)
    seven_day_plan = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="ai_recommendations")
    test = relationship("Test", back_populates="ai_recommendation")


class WeakTopicReminder(Base):
    __tablename__ = "weak_topic_reminders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    subject = Column(String(50), nullable=False)
    chapter_name = Column(String(100), nullable=False)
    marks_lost = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    exam_type = Column(String(50), default="JEE Main")  # JEE Main, JEE Advanced, Board Exam Class 12th
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="weak_topic_reminders")

