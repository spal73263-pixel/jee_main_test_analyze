const mongoose = require('mongoose');
const { applyJsonTransform } = require('./schemaHelpers');

const chapterPerformanceSchema = new mongoose.Schema({
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
  chapter_name: { type: String, required: true },
  unit_category: { type: String, default: null },
  total_questions: { type: Number, default: 0 },
  attempted: { type: Number, default: 0 },
  correct: { type: Number, default: 0 },
  incorrect: { type: Number, default: 0 },
  unattempted: { type: Number, default: 0 },
  marks: { type: Number, default: 0.0 },
  accuracy: { type: Number, default: 0.0 },
  classification: { type: String, default: 'Average' },
});

applyJsonTransform(chapterPerformanceSchema);

module.exports = mongoose.model('ChapterPerformance', chapterPerformanceSchema);
