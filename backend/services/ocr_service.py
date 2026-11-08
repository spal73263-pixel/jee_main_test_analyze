import cv2
import numpy as np
from PIL import Image
import os
from typing import Dict, Any, Optional

def preprocess_image_for_ocr(image_path: str) -> np.ndarray:
    """
    Applies OpenCV preprocessing pipeline: grayscale, contrast stretching, bilateral filtering, and adaptive thresholding.
    """
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Unable to read image at {image_path}")

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Resize if image is small to improve OCR accuracy
    h, w = gray.shape
    if w < 1000:
        scaling_factor = 1000 / w
        gray = cv2.resize(gray, None, fx=scaling_factor, fy=scaling_factor, interpolation=cv2.INTER_CUBIC)

    # Denoise
    denoised = cv2.bilateralFilter(gray, 9, 75, 75)

    # Adaptive thresholding for clean black-on-white text
    thresh = cv2.adaptiveThreshold(
        denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 2
    )

    return thresh

def extract_text_from_image(image_path: str) -> Dict[str, Any]:
    """
    Attempts to extract text using OCR. Gracefully handles systems without tesseract binary.
    """
    preprocessed_path = image_path + ".preproc.png"
    text = ""
    error = None

    try:
        preproc_img = preprocess_image_for_ocr(image_path)
        cv2.imwrite(preprocessed_path, preproc_img)

        # Attempt pytesseract if available
        try:
            import pytesseract
            # Check default windows install location if not in PATH
            default_win_tess = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
            if os.path.exists(default_win_tess):
                pytesseract.pytesseract.tesseract_cmd = default_win_tess

            pil_img = Image.open(preprocessed_path)
            text = pytesseract.image_to_string(pil_img)
        except Exception as ocr_err:
            error = f"OCR binary unavailable: {ocr_err}"
    except Exception as e:
        error = f"Image preprocessing failed: {e}"
    finally:
        if os.path.exists(preprocessed_path):
            try:
                os.remove(preprocessed_path)
            except Exception:
                pass

    return {
        "text": text.strip() if text else "",
        "error": error
    }
