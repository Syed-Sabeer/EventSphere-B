const mongoose = require('mongoose');

const ExhibitorSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  companyName: String,
  products: [String],
  documents: [String],
  logo: String,
  description: String,
  contactInfo: String,
  booth: { type: mongoose.Schema.Types.ObjectId, ref: 'Booth' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('Exhibitor', ExhibitorSchema);
