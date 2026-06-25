const mongoose = require('mongoose');

const timelineSchema = new mongoose.Schema({
  status: { type: String, required: true },
  message: { type: String },
  timestamp: { type: Date, default: Date.now },
});

const applicationSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    fitScore: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['Applied', 'Under Review', 'Shortlisted', 'Rejected', 'Selected'],
      default: 'Applied',
    },
    timeline: [timelineSchema],
    aiAnalysis: {
      extractedSkills: [String],
      missingSkills: [String],
      suggestions: [String],
      summary: String,
    },
    appliedAt: { type: Date, default: Date.now },
    lastUpdatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Prevent duplicate applications
applicationSchema.index({ studentId: 1, companyId: 1, roleId: 1 }, { unique: true });

//  timeline entry on status change
applicationSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    this.timeline.push({ status: this.status, timestamp: new Date() });
    this.lastUpdatedAt = new Date();
  }
  next();
});

module.exports = mongoose.models.Application || mongoose.model('Application', applicationSchema);