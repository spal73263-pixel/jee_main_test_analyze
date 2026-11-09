const mongoose = require('mongoose');
const { applyJsonTransform } = require('./schemaHelpers');

const questionResultSchema = new mongoose.Schema({
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
  question_number: { type: Number, required: true },
  subject: { type: String, required: true },
  chapter: { type: String, default: 'General' },
  topic: { type: String, default: null },
  question_type: { type: String, default: 'MCQ' },
  difficulty: { type: String, default: 'Medium' },
  selected_answer: { type: String, default: null },
  correct_answer: { type: String, default: null },
  status: { type: String, default: 'Unattempted' },
  marks: { type: Number, default: 0.0 },
  time_spent_seconds: { type: Number, default: 0 },
});

applyJsonTransform(questionResultSchema);

module.exports = mongoose.model('QuestionResult', questionResultSchema);
