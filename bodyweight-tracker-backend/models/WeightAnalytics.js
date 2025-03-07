const mongoose = require('mongoose');

const weightAnalyticsSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  weeklyAverage: Number,
  monthlyAverage: Number,
  weightChangeRate: Number, // kg per week
  predictedGoalDate: Date,
  streakDays: { type: Number, default: 0 },
  lastWeighIn: Date,
  weightFluctuation: {
    daily: Number,
    weekly: Number
  },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('WeightAnalytics', weightAnalyticsSchema); 