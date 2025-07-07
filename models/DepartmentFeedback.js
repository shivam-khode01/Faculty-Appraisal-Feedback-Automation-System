// models/DepartmentFeedback.js
const mongoose = require('mongoose');

const departmentFeedbackSchema = new mongoose.Schema({
  department: { type: String, required: true },
  feedback: { type: String, required: true },
  generatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DepartmentFeedback', departmentFeedbackSchema);
