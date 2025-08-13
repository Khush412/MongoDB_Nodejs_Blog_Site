const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    action: { type: String, required: true },
    details: { type: String, required: true },
    icon: { type: String, default: 'info-circle' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Log', logSchema);
