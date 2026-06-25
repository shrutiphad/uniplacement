const mongoose = require('mongoose');
const resumeVectorSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    roleId:    { type: mongoose.Schema.Types.ObjectId, index: true },  // for JD vectors
    type:      { type: String, enum: ['resume', 'jd'], default: 'resume' },
    vector:    { type: [Number], required: true },          // 1536-dim float array
    resumeText:{ type: String, maxlength: 10000 },          // truncated source text
    metadata:  {
      parsedSkills: [String],
      department:   String,
      cgpa:         Number,
      seniorityLevel: String,
      resumeQualityScore: Number,
    },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Compound index for faster lookup
resumeVectorSchema.index({ userId: 1, type: 1 });
resumeVectorSchema.index({ roleId: 1, type: 1 });

module.exports = mongoose.models.ResumeVector || mongoose.model('ResumeVector', resumeVectorSchema);