const mongoose = require('mongoose');
const { applyJsonTransform } = require('./schemaHelpers');

const testSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  test_name: { type: String, required: true, trim: true },
  test_id_code: { type: String, default: null },
  test_date: { type: String, required: true },
  test_type: { type: String, default: 'Mock Test' },
  shift: { type: String, default: 'Shift 1' },
  duration_minutes: { type: Number, default: 180 },
  total_questions: { type: Number, default: 75 },
  max_marks: { type: Number, default: 300.0 },
  marks_obtained: { type: Number, default: 0.0 },
  official_percentile: { type: Number, default: null },
  official_rank: { type: Number, default: null },
  overall_accuracy: { type: Number, default: 0.0 },
  attempt_rate: { type: Number, default: 0.0 },
  file_name: { type: String, default: null },
  file_path: { type: String, default: null },
  notes: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
});

applyJsonTransform(testSchema);

module.exports = mongoose.model('Test', testSchema);
