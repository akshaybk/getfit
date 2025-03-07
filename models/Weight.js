const mongoose = require('mongoose');

const weightSchema = new mongoose.Schema({
  userId: String,
  date: String,
  morningWeight: Number,
  nightWeight: Number,
});

module.exports = mongoose.model('Weight', weightSchema); 