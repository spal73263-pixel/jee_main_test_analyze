const mongoose = require('mongoose');
const { applyJsonTransform } = require('./schemaHelpers');

const studentProfileSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  target_year: { type: Number, default: 2026 },
  target_attempt: { type: String, default: 'January & April' },
  target_percentile: { type: Number, default: 99.0 },
  target_marks: { type: Number, default: 220.0 },
  target_physics_marks: { type: Number, default: 75.0 },
  target_chemistry_marks: { type: Number, default: 80.0 },
  target_maths_marks: { type: Number, default: 65.0 },
  daily_study_hours: { type: Number, default: 6.5 },
  target_exam_date: { type: String, default: '2026-01-24' },
});

applyJsonTransform(studentProfileSchema);

module.exports = mongoose.model('StudentProfile', studentProfileSchema);
