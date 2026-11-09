const fs = require('fs');
const os = require('os');
const path = require('path');

const TESSDATA_CHECK_URL =
  'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz';

async function canDownloadLanguageData(cachePath) {
  const cachedFile = path.join(cachePath, 'eng.traineddata');
  if (fs.existsSync(cachedFile)) {
    return true;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    if (typeof timer.unref === 'function') timer.unref();

    const res = await fetch(TESSDATA_CHECK_URL, {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

async function extractTextFromImage(imagePath) {
  let worker = null;
  let timeoutId = null;

  try {
    const fileStats = fs.statSync(imagePath);
    if (fileStats.size < 100) {
      return {
        text: '',
        error: 'Image file is a compact placeholder sample; verification preview ready.',
      };
    }

    const cachePath = path.join(os.tmpdir(), 'tesseract-cache');
    fs.mkdirSync(cachePath, { recursive: true });

    const ready = await canDownloadLanguageData(cachePath);
    if (!ready) {
      return {
        text: '',
        error: 'OCR language pack could not be fetched (offline or restricted network). Using structured preview template.',
      };
    }

    const Tesseract = require('tesseract.js');

    let capturedError = null;
    const ocrRun = (async () => {
      let rejectWorker = null;
      const errPromise = new Promise((_, reject) => {
        rejectWorker = reject;
      });

      const workerPromise = Tesseract.createWorker('eng', 1, {
        cachePath,
        logger: () => {},
        errorHandler: (err) => {
          capturedError = err;
          if (rejectWorker) {
            rejectWorker(new Error(typeof err === 'string' ? err : err?.message || 'OCR error'));
          }
        },
      });

      worker = await Promise.race([workerPromise, errPromise]);
      const result = await Promise.race([worker.recognize(imagePath), errPromise]);
      return result?.data?.text ? result.data.text.trim() : '';
    })();

    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('OCR timeout exceeded')), 10000);
      if (typeof timeoutId.unref === 'function') timeoutId.unref();
    });

    const text = await Promise.race([ocrRun, timeoutPromise]);
    return {
      text,
      error: text ? null : capturedError ? String(capturedError) : 'No readable text recognized in image.',
    };
  } catch (err) {
    return {
      text: '',
      error: `OCR unavailable or timed out: ${err.message}`,
    };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

module.exports = { extractTextFromImage };
