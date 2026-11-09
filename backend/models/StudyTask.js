const mongoose = require('mongoose');
const { applyJsonTransform } = require('./schemaHelpers');

const studyTaskSchema = new mongoose.Schema({
  plan_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudyPlan',
    required: true,
    index: true,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  day_of_week: { type: String, required: true },
  subject: { type: String, required: true },
  chapter: { type: String, required: true },
  task_description: { type: String, required: true },
  duration_minutes: { type: Number, default: 90 },
  practice_questions: { type: Number, default: 20 },
  revision_topics: { type: String, default: null },
  is_completed: { type: Boolean, default: false },
});

applyJsonTransform(studyTaskSchema);

module.exports = mongoose.model('StudyTask', studyTaskSchema);
