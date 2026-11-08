from typing import List, Dict, Any, Tuple
import schemas

# Standard JEE Main chapter to Unit mapping
JEE_CHAPTER_UNIT_MAP = {
    # Physics
    "Units and Measurements": ("Physics", "Units & Measurements"),
    "Kinematics": ("Physics", "Mechanics"),
    "Laws of Motion": ("Physics", "Mechanics"),
    "Work, Energy and Power": ("Physics", "Mechanics"),
    "Rotational Motion": ("Physics", "Mechanics"),
    "Gravitation": ("Physics", "Mechanics"),
    "Properties of Solids and Liquids": ("Physics", "Mechanics"),
    "Thermodynamics": ("Physics", "Thermodynamics"),
    "Kinetic Theory of Gases": ("Physics", "Thermodynamics"),
    "Oscillations and Waves": ("Physics", "Waves and Oscillations"),
    "Electrostatics": ("Physics", "Electrodynamics"),
    "Current Electricity": ("Physics", "Electrodynamics"),
    "Magnetic Effects of Current and Magnetism": ("Physics", "Electrodynamics"),
    "Electromagnetic Induction and AC": ("Physics", "Electrodynamics"),
    "Electromagnetic Waves": ("Physics", "Electrodynamics"),
    "Optics": ("Physics", "Optics"),
    "Dual Nature of Matter and Radiation": ("Physics", "Modern Physics"),
    "Atoms and Nuclei": ("Physics", "Modern Physics"),
    "Electronic Devices": ("Physics", "Modern Physics"),
    
    # Chemistry
    "Some Basic Concepts of Chemistry": ("Chemistry", "Physical Chemistry"),
    "Atomic Structure": ("Chemistry", "Physical Chemistry"),
    "Chemical Thermodynamics": ("Chemistry", "Physical Chemistry"),
    "Chemical Equilibrium": ("Chemistry", "Physical Chemistry"),
    "Ionic Equilibrium": ("Chemistry", "Physical Chemistry"),
    "Redox Reactions and Electrochemistry": ("Chemistry", "Physical Chemistry"),
    "Chemical Kinetics": ("Chemistry", "Physical Chemistry"),
    "Solutions": ("Chemistry", "Physical Chemistry"),
    "Periodic Table and Periodicity": ("Chemistry", "Inorganic Chemistry"),
    "Chemical Bonding and Molecular Structure": ("Chemistry", "Inorganic Chemistry"),
    "p-Block Elements": ("Chemistry", "Inorganic Chemistry"),
    "d- and f-Block Elements": ("Chemistry", "Inorganic Chemistry"),
    "Coordination Compounds": ("Chemistry", "Inorganic Chemistry"),
    "General Organic Chemistry": ("Chemistry", "Organic Chemistry"),
    "Hydrocarbons": ("Chemistry", "Organic Chemistry"),
    "Haloalkanes and Haloarenes": ("Chemistry", "Organic Chemistry"),
    "Alcohols, Phenols and Ethers": ("Chemistry", "Organic Chemistry"),
    "Aldehydes, Ketones and Carboxylic Acids": ("Chemistry", "Organic Chemistry"),
    "Amines and Nitrogen Compounds": ("Chemistry", "Organic Chemistry"),
    "Biomolecules": ("Chemistry", "Organic Chemistry"),
    
    # Mathematics
    "Sets, Relations and Functions": ("Mathematics", "Algebra"),
    "Complex Numbers and Quadratic Equations": ("Mathematics", "Algebra"),
    "Matrices and Determinants": ("Mathematics", "Matrices & Determinants"),
    "Permutations and Combinations": ("Mathematics", "Algebra"),
    "Binomial Theorem": ("Mathematics", "Algebra"),
    "Sequence and Series": ("Mathematics", "Algebra"),
    "Limits, Continuity and Differentiability": ("Mathematics", "Calculus"),
    "Differential Calculus": ("Mathematics", "Calculus"),
    "Integral Calculus": ("Mathematics", "Calculus"),
    "Differential Equations": ("Mathematics", "Calculus"),
    "Coordinate Geometry (Lines & Circles)": ("Mathematics", "Coordinate Geometry"),
    "Conic Sections": ("Mathematics", "Coordinate Geometry"),
    "Vectors and 3D Geometry": ("Mathematics", "Vectors and 3D Geometry"),
    "Trigonometry": ("Mathematics", "Trigonometry"),
    "Statistics and Probability": ("Mathematics", "Probability & Statistics"),
}

def classify_accuracy(accuracy: float) -> str:
    if accuracy >= 80.0:
        return "Strong"
    elif accuracy >= 50.0:
        return "Average"
    else:
        return "Weak"

def calculate_subject_metrics(
    questions: List[schemas.QuestionResultInput],
    subject_name: str
) -> schemas.SubjectResultInput:
    sub_qs = [q for q in questions if q.subject.strip().lower() == subject_name.strip().lower()]
    total_q = len(sub_qs)
    
    attempted = sum(1 for q in sub_qs if q.status.lower() in ("correct", "incorrect"))
    correct = sum(1 for q in sub_qs if q.status.lower() == "correct")
    incorrect = sum(1 for q in sub_qs if q.status.lower() == "incorrect")
    unattempted = sum(1 for q in sub_qs if q.status.lower() == "unattempted")
    
    # Standard marking (+4 / -1) unless custom marks are specified in questions
    pos_marks = 0.0
    neg_marks = 0.0
    for q in sub_qs:
        if q.status.lower() == "correct":
            pos_marks += (q.marks if q.marks > 0 else 4.0)
        elif q.status.lower() == "incorrect":
            neg_marks += abs(q.marks if q.marks != 0 else 1.0)
            
    total_marks = pos_marks - neg_marks
    accuracy = round((correct / attempted * 100), 2) if attempted > 0 else 0.0
    max_subject_marks = total_q * 4.0 if total_q > 0 else 100.0
    percentage = round((total_marks / max_subject_marks * 100), 2) if max_subject_marks > 0 else 0.0
    time_spent = sum(q.time_spent_seconds or 0 for q in sub_qs)
    
    return schemas.SubjectResultInput(
        subject=subject_name,
        total_questions=total_q if total_q > 0 else 25,
        attempted=attempted,
        correct=correct,
        incorrect=incorrect,
        unattempted=unattempted,
        positive_marks=pos_marks,
        negative_marks=neg_marks,
        total_marks=total_marks,
        accuracy=accuracy,
        percentage=percentage,
        time_spent_seconds=time_spent
    )

def validate_test_data(
    test_data: schemas.TestCreate
) -> Tuple[bool, List[str]]:
    warnings = []
    
    # 1. Total marks vs max marks
    if test_data.marks_obtained > test_data.max_marks:
        warnings.append(f"Marks obtained ({test_data.marks_obtained}) exceeds maximum marks ({test_data.max_marks}).")
        
    # 2. Check subject marks summation
    if test_data.subjects:
        subjects_total = sum(s.total_marks for s in test_data.subjects)
        if abs(subjects_total - test_data.marks_obtained) > 1.0:
            warnings.append(
                f"Sum of subject marks ({subjects_total}) differs from total marks obtained ({test_data.marks_obtained})."
            )
            
        # 3. Check question counts
        for sub in test_data.subjects:
            if sub.attempted != (sub.correct + sub.incorrect):
                warnings.append(
                    f"{sub.subject}: Attempted count ({sub.attempted}) != Correct ({sub.correct}) + Incorrect ({sub.incorrect})."
                )
            if sub.total_questions != (sub.attempted + sub.unattempted):
                warnings.append(
                    f"{sub.subject}: Total questions ({sub.total_questions}) != Attempted ({sub.attempted}) + Unattempted ({sub.unattempted})."
                )
                
    return (len(warnings) == 0, warnings)
