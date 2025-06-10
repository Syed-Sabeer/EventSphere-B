const mongoose = require('mongoose');

const ScheduleSchema = new mongoose.Schema({
  expo: { type: mongoose.Schema.Types.ObjectId, ref: 'Expo' },
  title: String,
  timeSlot: String,
  speakers: [String],
  topic: String,
  location: String,
}, { timestamps: true });

module.exports = mongoose.model('Schedule', ScheduleSchema);
