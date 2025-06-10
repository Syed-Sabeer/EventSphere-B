const mongoose = require('mongoose');

const AttendeeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  registeredExpos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Expo' }],
  bookmarkedSessions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Schedule' }],
}, { timestamps: true });

module.exports = mongoose.model('Attendee', AttendeeSchema);
