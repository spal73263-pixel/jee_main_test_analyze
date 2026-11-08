from typing import List, Dict, Any
from sqlalchemy.orm import Session
import models
import schemas

def compare_tests_service(test_ids: List[int], db: Session) -> schemas.ComparisonOut:
    """
    Compares two or more tests chronologically or by selection order.
    Calculates deltas and determines primary growth driver.
    """
    if len(test_ids) < 2:
        raise ValueError("At least two test IDs are required for comparison.")

    tests = (
        db.query(models.Test)
        .filter(models.Test.id.in_(test_ids))
        .all()
    )
    # Sort in order of provided IDs or test date
    tests_sorted = sorted(tests, key=lambda t: t.test_date)
    
    if len(tests_sorted) < 2:
        raise ValueError("Could not find the specified tests in database.")

    first_test = tests_sorted[0]
    last_test = tests_sorted[-1]

    # Calculate subject deltas
    def get_subject_marks(t: models.Test) -> Dict[str, float]:
        res = {"Physics": 0.0, "Chemistry": 0.0, "Mathematics": 0.0}
        for s in t.subject_results:
            res[s.subject] = s.total_marks
        return res

    first_sub = get_subject_marks(first_test)
    last_sub = get_subject_marks(last_test)

    sub_deltas = {
        sub: round(last_sub.get(sub, 0.0) - first_sub.get(sub, 0.0), 2)
        for sub in ["Physics", "Chemistry", "Mathematics"]
    }

    # Primary growth contributor
    primary_contributor = max(sub_deltas.items(), key=lambda x: x[1])[0]
    total_delta = round(last_test.marks_obtained - first_test.marks_obtained, 2)
    accuracy_delta = round(last_test.overall_accuracy - first_test.overall_accuracy, 2)
    attempt_delta = round(last_test.attempt_rate - first_test.attempt_rate, 2)

    deltas = {
        "total_marks": total_delta,
        "overall_accuracy": accuracy_delta,
        "attempt_rate": attempt_delta,
        "subject_deltas": sub_deltas,
        "first_test_name": first_test.test_name,
        "last_test_name": last_test.test_name,
    }

    metrics_comparison = []
    for t in tests_sorted:
        sub_dict = get_subject_marks(t)
        metrics_comparison.append({
            "test_id": t.id,
            "test_name": t.test_name,
            "test_date": t.test_date,
            "total_marks": t.marks_obtained,
            "accuracy": t.overall_accuracy,
            "attempt_rate": t.attempt_rate,
            "physics_marks": sub_dict.get("Physics", 0.0),
            "chemistry_marks": sub_dict.get("Chemistry", 0.0),
            "maths_marks": sub_dict.get("Mathematics", 0.0),
            "percentile": t.official_percentile
        })

    # Convert tests to TestDetailOut schemas
    test_details = [schemas.TestDetailOut.from_orm(t) for t in tests_sorted]

    return schemas.ComparisonOut(
        tests=test_details,
        deltas=deltas,
        primary_contributor=primary_contributor,
        metrics_comparison=metrics_comparison
    )
