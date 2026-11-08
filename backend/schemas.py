from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

# --- Auth & User Schemas ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str
    target_year: Optional[int] = 2026
    target_marks: Optional[float] = 220.0
    target_percentile: Optional[float] = 99.0

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"

class TokenData(BaseModel):
    email: Optional[str] = None

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=6)

class StudentProfileBase(BaseModel):
    target_year: int = 2026
    target_attempt: str = "January & April"
    target_percentile: float = 99.0
    target_marks: float = 220.0
    target_physics_marks: float = 75.0
    target_chemistry_marks: float = 80.0
    target_maths_marks: float = 65.0
    daily_study_hours: float = 6.5
    target_exam_date: str = "2026-01-24"

class StudentProfileUpdate(StudentProfileBase):
    pass

class StudentProfileOut(StudentProfileBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    created_at: datetime
    profile: Optional[StudentProfileOut] = None

    class Config:
        from_attributes = True


# --- Subject & Question Schemas ---
class SubjectResultInput(BaseModel):
    subject: str
    total_questions: int = 25
    attempted: int = 0
    correct: int = 0
    incorrect: int = 0
    unattempted: int = 0
    positive_marks: float = 0.0
    negative_marks: float = 0.0
    total_marks: float = 0.0
    accuracy: float = 0.0
    percentage: float = 0.0
    time_spent_seconds: int = 0

class SubjectResultOut(SubjectResultInput):
    id: int
    test_id: int

    class Config:
        from_attributes = True

class QuestionResultInput(BaseModel):
    question_number: int
    subject: str
    chapter: Optional[str] = "General"
    topic: Optional[str] = None
    question_type: str = "MCQ"
    difficulty: str = "Medium"
    selected_answer: Optional[str] = None
    correct_answer: Optional[str] = None
    status: str = "Unattempted"
    marks: float = 0.0
    time_spent_seconds: Optional[int] = 0

class QuestionResultOut(QuestionResultInput):
    id: int
    test_id: int

    class Config:
        from_attributes = True

class ChapterPerformanceOut(BaseModel):
    id: int
    test_id: int
    subject: str
    chapter_name: str
    unit_category: Optional[str] = None
    total_questions: int
    attempted: int
    correct: int
    incorrect: int
    unattempted: int
    marks: float
    accuracy: float
    classification: str

    class Config:
        from_attributes = True


# --- Test Schemas ---
class TestCreate(BaseModel):
    test_name: str
    test_id_code: Optional[str] = None
    test_date: str
    test_type: str = "Mock Test"
    shift: str = "Shift 1"
    duration_minutes: int = 180
    total_questions: int = 75
    max_marks: float = 300.0
    marks_obtained: float = 0.0
    official_percentile: Optional[float] = None
    official_rank: Optional[int] = None
    notes: Optional[str] = None
    subjects: List[SubjectResultInput] = []
    questions: Optional[List[QuestionResultInput]] = []

class TestSummaryOut(BaseModel):
    id: int
    test_name: str
    test_id_code: Optional[str] = None
    test_date: str
    test_type: str
    shift: str
    duration_minutes: int
    total_questions: int
    max_marks: float
    marks_obtained: float
    official_percentile: Optional[float] = None
    official_rank: Optional[int] = None
    overall_accuracy: float
    attempt_rate: float
    created_at: datetime
    subject_marks: Optional[Dict[str, float]] = None

    class Config:
        from_attributes = True

class AIRecommendationOut(BaseModel):
    id: int
    test_id: int
    overall_summary: str
    subject_wise_analysis: str
    strong_topics: str
    weak_topics: str
    repeated_mistakes: Optional[str] = None
    negative_marking_analysis: str
    time_management_analysis: str
    comparison_with_previous: Optional[str] = None
    improvement_areas: str
    revision_topics: str
    recommended_questions: str
    seven_day_plan: str
    created_at: datetime

    class Config:
        from_attributes = True

class TestDetailOut(TestSummaryOut):
    subject_results: List[SubjectResultOut] = []
    question_results: List[QuestionResultOut] = []
    chapter_performances: List[ChapterPerformanceOut] = []
    ai_recommendation: Optional[AIRecommendationOut] = None

    class Config:
        from_attributes = True


# --- Extraction & Preview Schemas ---
class ExtractedDataPreview(BaseModel):
    test_name: str
    test_date: str
    test_type: str = "Mock Test"
    shift: str = "Shift 1"
    duration_minutes: int = 180
    total_questions: int = 75
    max_marks: float = 300.0
    marks_obtained: float = 0.0
    official_percentile: Optional[float] = None
    official_rank: Optional[int] = None
    subjects: List[SubjectResultInput] = []
    questions: List[QuestionResultInput] = []
    extraction_source: str = "unknown"
    confidence_level: str = "high"  # high, medium, partial
    warnings: List[str] = []
    missing_fields: List[str] = []
    validation_status: str = "valid"  # valid, needs_review, invalid


# --- Study Planner Schemas ---
class StudyTaskOut(BaseModel):
    id: int
    plan_id: int
    day_of_week: str
    subject: str
    chapter: str
    task_description: str
    duration_minutes: int
    practice_questions: int
    revision_topics: Optional[str] = None
    is_completed: bool

    class Config:
        from_attributes = True

class StudyPlanOut(BaseModel):
    id: int
    title: str
    generated_date: datetime
    week_start_date: str
    is_active: bool
    summary: Optional[str] = None
    tasks: List[StudyTaskOut] = []

    class Config:
        from_attributes = True


# --- Dashboard & Predictor Schemas ---
class DashboardOverview(BaseModel):
    total_tests: int
    average_marks: float
    highest_marks: float
    lowest_marks: float
    average_accuracy: float
    latest_test_score: float
    latest_test_name: Optional[str] = None
    latest_test_date: Optional[str] = None
    overall_improvement: float
    average_percentile: Optional[float] = None
    marks_history: List[Dict[str, Any]]
    subject_comparison: List[Dict[str, Any]]
    accuracy_history: List[Dict[str, Any]]
    question_status_breakdown: Dict[str, int]
    weak_topics_count: int
    strong_topics_count: int

class TargetPredictorOut(BaseModel):
    current_average_marks: float
    target_marks: float
    marks_gap: float
    average_growth_rate: float
    target_percentile: float
    target_date: str
    days_remaining: int
    required_marks_per_test: float
    projected_final_marks: float
    historical_calibration_note: str
    subject_targets: Dict[str, Dict[str, float]]
    progression_milestones: List[Dict[str, Any]]

class ComparisonRequest(BaseModel):
    test_ids: List[int]

class ComparisonOut(BaseModel):
    tests: List[TestDetailOut]
    deltas: Dict[str, Any]
    primary_contributor: str
    metrics_comparison: List[Dict[str, Any]]

# --- Weak Topic Reminder Schemas ---
class WeakTopicReminderCreate(BaseModel):
    subject: str
    chapter_name: str
    marks_lost: float = 0.0
    notes: Optional[str] = None
    exam_type: str = "JEE Main"

class WeakTopicReminderOut(BaseModel):
    id: int
    user_id: int
    subject: str
    chapter_name: str
    marks_lost: float
    notes: Optional[str] = None
    exam_type: str
    is_resolved: bool
    created_at: datetime

    class Config:
        from_attributes = True

