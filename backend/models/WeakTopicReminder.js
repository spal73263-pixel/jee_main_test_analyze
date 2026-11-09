const mongoose = require('mongoose');
const { applyJsonTransform } = require('./schemaHelpers');

const weakTopicReminderSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  subject: { type: String, required: true },
  chapter_name: { type: String, required: true },
  marks_lost: { type: Number, default: 0.0 },
  notes: { type: String, default: null },
  exam_type: { type: String, default: 'JEE Main' },
  is_resolved: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});

applyJsonTransform(weakTopicReminderSchema);

module.exports = mongoose.model('WeakTopicReminder', weakTopicReminderSchema);
