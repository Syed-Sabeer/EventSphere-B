const mongoose = require('mongoose');

const ExpoSchema = new mongoose.Schema({
  title: String,
  date: Date,
  location: String,
  description: String,
  theme: String,
  booths: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booth' }],
  schedule: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Schedule' }],
}, { timestamps: true });

module.exports = mongoose.model('Expo', ExpoSchema);
