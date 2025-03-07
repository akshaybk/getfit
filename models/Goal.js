const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  userId: String,
  targetWeight: Number,
});

module.exports = mongoose.model('Goal', goalSchema); 