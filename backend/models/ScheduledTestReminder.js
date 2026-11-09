const mongoose = require('mongoose');
const { applyJsonTransform } = require('./schemaHelpers');

const scheduledTestReminderSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  test_title: { type: String, required: true },
  exam_type: { type: String, default: 'JEE Main' },
  scheduled_date: { type: String, required: true },
  scheduled_time: { type: String, default: '09:00 AM' },
  duration_minutes: { type: Number, default: 180 },
  syllabus_chapters: { type: String, default: null },
  is_completed: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});

applyJsonTransform(scheduledTestReminderSchema);

module.exports = mongoose.model('ScheduledTestReminder', scheduledTestReminderSchema);
