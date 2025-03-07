const mongoose = require('mongoose');

const healthMetricsSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  height: { type: Number, default: null },
  bmi: { type: Number, default: null },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('HealthMetrics', healthMetricsSchema); 