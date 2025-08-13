const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  siteTitle: String,
  siteDescription: String,
  logoUrl: String,
  contactEmail: String,
  googleAnalyticsID: String,
  allowRegistration: { type: Boolean, default: true },
  defaultUserRole: { type: String, enum: ['User', 'Moderator', 'Admin'], default: 'User' }
});

module.exports = mongoose.model('Setting', settingSchema);
