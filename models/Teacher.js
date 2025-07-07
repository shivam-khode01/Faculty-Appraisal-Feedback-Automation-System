const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  name: { type: String, required: true },
  designation: { type: String, required: true },
  department: { type: String, required: true },

  expectedHours: { type: Number, default: 20 },
  hoursTaught: { type: Number, default: 0 },
  studentFeedback: { type: Number, default: 0 },

  papers: [{
    title: String,
    journalCorpus: String,
    quartile: String,
    year: Number
  }],

  workshops: [{
    title: String,
    conductedBy: String,
    mode: String
  }],

  awards: [{
    name: String,
    by: String,
    year: Number
  }],

  domain: {
    type: String,
    enum: ['AIA', 'Cybersecurity', 'Big Data', 'AIEC', 'Cloud Computing', 'Core'],
    required: true
  },

  adminRating: { type: Number, default: 0 },
  finalRating: { type: Number, default: 0 }
});

module.exports = mongoose.model('Teacher', teacherSchema);
