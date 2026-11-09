const mongoose = require('mongoose');
const { applyJsonTransform } = require('./schemaHelpers');

const studyPlanSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: { type: String, required: true },
  generated_date: { type: Date, default: Date.now },
  week_start_date: { type: String, required: true },
  is_active: { type: Boolean, default: true },
  summary: { type: String, default: null },
});

applyJsonTransform(studyPlanSchema);

module.exports = mongoose.model('StudyPlan', studyPlanSchema);
