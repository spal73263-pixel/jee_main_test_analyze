const fs = require('fs');
const pdfParse = require('pdf-parse');

async function extractTextAndTablesFromPdf(pdfPath) {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(dataBuffer);
    const rawText = data?.text || '';

    // Heuristic extraction of tabular lines from PDF text
    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const tables = [];
    const candidateRows = [];
    for (const line of lines) {
      const cells = line.split(/\s{2,}|\t|\|/).map((c) => c.trim()).filter(Boolean);
      if (cells.length >= 3) {
        candidateRows.push(cells);
      }
    }
    if (candidateRows.length >= 2) {
      tables.push(candidateRows);
    }

    return {
      raw_text: rawText,
      pages: [rawText],
      tables,
      error: null,
    };
  } catch (err) {
    console.error(`Error reading PDF ${pdfPath}:`, err.message);
    return {
      raw_text: '',
      pages: [],
      tables: [],
      error: err.message,
    };
  }
}

module.exports = { extractTextAndTablesFromPdf };
