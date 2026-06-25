const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type:    { type: String, enum: ['application_update', 'new_drive', 'ai_complete', 'shortlisted', 'selected', 'system'], default: 'system' },
  title:   { type: String, required: true },
  message: { type: String, required: true },
  link:    { type: String },
  read:    { type: Boolean, default: false, index: true },
  meta:    { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);