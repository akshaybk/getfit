const mongoose = require('mongoose');

const transformationPhotoSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  photoUrl: {
    type: String,
    required: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String
  }
}, { timestamps: true });

// Add an index to help with querying photos by user
transformationPhotoSchema.index({ userId: 1, uploadDate: -1 });

module.exports = mongoose.model('TransformationPhoto', transformationPhotoSchema); 