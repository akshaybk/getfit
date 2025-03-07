const mongoose = require('mongoose');

const advancedHealthMetricsSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  date: { type: Date, default: Date.now },
  bodyFatPercentage: Number,
  waistCircumference: Number, // in cm
  waterWeight: Number, // in kg
  muscleMass: Number, // in kg
  sleepQuality: {
    hoursSlept: Number,
    quality: { type: Number, min: 1, max: 5 }, // 1-5 rating
    notes: String
  },
  measurements: {
    chest: Number,
    arms: Number,
    thighs: Number,
    hips: Number
  },
  energyLevel: { type: Number, min: 1, max: 10 },
  stressLevel: { type: Number, min: 1, max: 10 },
  notes: String,
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AdvancedHealthMetrics', advancedHealthMetricsSchema); 