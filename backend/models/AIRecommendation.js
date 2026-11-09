const mongoose = require('mongoose');
const { applyJsonTransform } = require('./schemaHelpers');

const aiRecommendationSchema = new mongoose.Schema({
  test_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    required: true,
    unique: true,
    index: true,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  overall_summary: { type: String, required: true },
  subject_wise_analysis: { type: String, required: true },
  strong_topics: { type: String, required: true },
  weak_topics: { type: String, required: true },
  repeated_mistakes: { type: String, default: null },
  negative_marking_analysis: { type: String, required: true },
  time_management_analysis: { type: String, required: true },
  comparison_with_previous: { type: String, default: null },
  improvement_areas: { type: String, required: true },
  revision_topics: { type: String, required: true },
  recommended_questions: { type: String, required: true },
  seven_day_plan: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

applyJsonTransform(aiRecommendationSchema);

module.exports = mongoose.model('AIRecommendation', aiRecommendationSchema);
