const mongoose = require('mongoose');
const { applyJsonTransform } = require('./schemaHelpers');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  hashed_password: {
    type: String,
    required: true,
  },
  full_name: {
    type: String,
    required: true,
    trim: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

applyJsonTransform(userSchema);

module.exports = mongoose.model('User', userSchema);
