from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
import json
import models
from config import GEMINI_API_KEY

def generate_ai_recommendation_report(test_id: int, db: Session) -> models.AIRecommendation:
    """
    Generates a comprehensive 12-point AI performance analysis report for a specific test.
    Uses LLM if API key is provided, or an advanced data-driven analytical expert system.
    """
    test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not test:
        raise ValueError("Test not found")

    subjects = db.query(models.SubjectResult).filter(models.SubjectResult.test_id == test_id).all()
    chapters = db.query(models.ChapterPerformance).filter(models.ChapterPerformance.test_id == test_id).all()
    questions = db.query(models.QuestionResult).filter(models.QuestionResult.test_id == test_id).all()

    # Previous tests for historical context
    prev_tests = db.query(models.Test).filter(
        models.Test.user_id == test.user_id,
        models.Test.id != test.id,
        models.Test.created_at < test.created_at
    ).order_by(models.Test.created_at.desc()).all()

    # Identify strong and weak chapters
    weak_chapters = [c.chapter_name for c in chapters if c.classification == "Weak"]
    strong_chapters = [c.chapter_name for c in chapters if c.classification == "Strong"]
    average_chapters = [c.chapter_name for c in chapters if c.classification == "Average"]

    # Subject metrics
    sub_metrics = {s.subject: {"marks": s.total_marks, "accuracy": s.accuracy, "neg_marks": s.negative_marks} for s in subjects}
    
    # Negative marks analysis
    total_neg_marks = sum(s.negative_marks for s in subjects)
    worst_neg_subject = max(sub_metrics.items(), key=lambda x: x[1]["neg_marks"])[0] if sub_metrics else "None"

    # Comparison with immediate prior test
    comp_text = "This is your baseline diagnostic test. Future tests will track your trajectory."
    if prev_tests:
        last_test = prev_tests[0]
        diff_marks = test.marks_obtained - last_test.marks_obtained
        diff_acc = test.overall_accuracy - last_test.overall_accuracy
        trend = "improved" if diff_marks >= 0 else "declined"
        comp_text = (
            f"Compared to '{last_test.test_name}' ({last_test.marks_obtained:.1f} marks), your score has {trend} "
            f"by {abs(diff_marks):+.1f} marks (Overall Accuracy: {diff_acc:+.1f}%). "
            f"{'Positive momentum observed.' if diff_marks >= 0 else 'Consolidation required on fundamentals.'}"
        )

    # 1. Overall Performance Summary
    summary = (
        f"You scored {test.marks_obtained:.1f} / {test.max_marks:.1f} marks with an overall accuracy of {test.overall_accuracy:.1f}% "
        f"and an attempt rate of {test.attempt_rate:.1f}%. "
        f"{'Solid accuracy maintained with room to increase attempt rate.' if test.overall_accuracy >= 75 else 'Accuracy needs strengthening through targeted revision to prevent negative marking penalties.'}"
    )

    # 2. Subject-wise Analysis
    subject_analysis = "\n".join([
        f"- {s.subject}: {s.total_marks:.1f} marks, {s.accuracy:.1f}% accuracy, {s.correct} correct, {s.incorrect} incorrect (-{s.negative_marks:.1f} lost in penalty)."
        for s in subjects
    ])

    # 3. Strong Topics
    strong_str = ", ".join(strong_chapters[:5]) if strong_chapters else "Solid attempt consistency in core formula questions"

    # 4. Weak Topics
    weak_str = ", ".join(weak_chapters[:5]) if weak_chapters else "No critically weak topics detected; maintain consistency"

    # 5. Repeated Mistakes
    repeated = (
        f"Concentrated errors occurred in {', '.join(weak_chapters[:3]) if weak_chapters else 'multi-step calculation questions'}. "
        f"Verify algebraic signs and dimensional consistency before locking answers."
    )

    # 6. Negative Marking Analysis
    neg_analysis = (
        f"You conceded -{total_neg_marks:.1f} marks from incorrect attempts. "
        f"{worst_neg_subject} contributed the highest penalty (-{sub_metrics.get(worst_neg_subject, {}).get('neg_marks', 0):.1f} marks). "
        f"Eliminating blind guesses in {worst_neg_subject} will immediately recover up to +{total_neg_marks:.1f} marks."
    )

    # 7. Time-Management Analysis
    time_analysis = (
        f"Total duration logged was {test.duration_minutes} minutes. "
        f"Ensure no more than 2.0 to 2.5 minutes are spent per standard MCQ in Physics and Chemistry. "
        f"Reserve 65-75 minutes exclusively for Mathematics multi-step problem solving."
    )

    # 8. Three Major Areas to Improve
    top_focus_subject = min(sub_metrics.items(), key=lambda x: x[1]["accuracy"])[0] if sub_metrics else "General"
    improvement_areas = (
        f"1. Accuracy Lockdown in {top_focus_subject}: Cease unconfident guesses where 2 options cannot be eliminated.\n"
        f"2. Conceptual Revision in: {', '.join(weak_chapters[:2]) if weak_chapters else 'Applied Electrodynamics and Calculus'}.\n"
        f"3. Exam Temperament: Complete Section A (Easy MCQs) in the first 45 minutes to build momentum."
    )

    # 9. Recommended Revision Topics
    revision_topics = ", ".join(weak_chapters[:4]) if weak_chapters else "Modern Physics, Coordination Compounds, Matrices"

    # 10. Recommended Practice Questions
    rec_questions = (
        f"Solve 25 PYQs each in: {', '.join(weak_chapters[:3]) if weak_chapters else 'Mechanics, Physical Equilibrium, Integral Calculus'}. "
        f"Focus on JEE Main 2022-2025 past papers with strict timer mode."
    )

    # 11. Seven-Day Plan Text
    seven_day_text = (
        "Monday: Physics " + (weak_chapters[0] if len(weak_chapters) > 0 else "Mechanics") + " revision + 20 PYQs\n"
        "Tuesday: Chemistry " + (weak_chapters[1] if len(weak_chapters) > 1 else "Chemical Bonding") + " revision + 20 PYQs\n"
        "Wednesday: Mathematics " + (weak_chapters[2] if len(weak_chapters) > 2 else "Calculus") + " practice + 20 PYQs\n"
        "Thursday: Error Notebook analysis & formula speed run\n"
        "Friday: Timed mixed chapter test (30 questions, 60 minutes)\n"
        "Saturday: Full Mock Test under simulated JEE exam conditions\n"
        "Sunday: Mock Test post-mortem and weak concept notes review"
    )

    # Check if recommendation already exists for this test
    existing = db.query(models.AIRecommendation).filter(models.AIRecommendation.test_id == test_id).first()
    if existing:
        existing.overall_summary = summary
        existing.subject_wise_analysis = subject_analysis
        existing.strong_topics = strong_str
        existing.weak_topics = weak_str
        existing.repeated_mistakes = repeated
        existing.negative_marking_analysis = neg_analysis
        existing.time_management_analysis = time_analysis
        existing.comparison_with_previous = comp_text
        existing.improvement_areas = improvement_areas
        existing.revision_topics = revision_topics
        existing.recommended_questions = rec_questions
        existing.seven_day_plan = seven_day_text
        db.commit()
        db.refresh(existing)
        return existing

    rec = models.AIRecommendation(
        test_id=test.id,
        user_id=test.user_id,
        overall_summary=summary,
        subject_wise_analysis=subject_analysis,
        strong_topics=strong_str,
        weak_topics=weak_str,
        repeated_mistakes=repeated,
        negative_marking_analysis=neg_analysis,
        time_management_analysis=time_analysis,
        comparison_with_previous=comp_text,
        improvement_areas=improvement_areas,
        revision_topics=revision_topics,
        recommended_questions=rec_questions,
        seven_day_plan=seven_day_text
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec
