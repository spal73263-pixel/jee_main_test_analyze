const mongoose = require('mongoose');
const { applyJsonTransform } = require('./schemaHelpers');

const subjectResultSchema = new mongoose.Schema({
  test_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    required: true,
    index: true,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  subject: { type: String, required: true },
  total_questions: { type: Number, default: 25 },
  attempted: { type: Number, default: 0 },
  correct: { type: Number, default: 0 },
  incorrect: { type: Number, default: 0 },
  unattempted: { type: Number, default: 0 },
  positive_marks: { type: Number, default: 0.0 },
  negative_marks: { type: Number, default: 0.0 },
  total_marks: { type: Number, default: 0.0 },
  accuracy: { type: Number, default: 0.0 },
  percentage: { type: Number, default: 0.0 },
  time_spent_seconds: { type: Number, default: 0 },
});

applyJsonTransform(subjectResultSchema);

module.exports = mongoose.model('SubjectResult', subjectResultSchema);
