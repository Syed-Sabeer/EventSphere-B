const mongoose = require('mongoose');

const BoothSchema = new mongoose.Schema({
  expo: { type: mongoose.Schema.Types.ObjectId, ref: 'Expo' },
  number: String,
  location: String,
  exhibitor: { type: mongoose.Schema.Types.ObjectId, ref: 'Exhibitor' },
  details: String,
}, { timestamps: true });

module.exports = mongoose.model('Booth', BoothSchema);
