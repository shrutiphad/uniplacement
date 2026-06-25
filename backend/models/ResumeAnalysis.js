const mongoose = require('mongoose');

const resumeAnalysisSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    roleId:    { type: mongoose.Schema.Types.ObjectId },

    // Parsed resume data
    parsedData: {
      name:            String,
      email:           String,
      phone:           String,
      linkedin:        String,
      github:          String,
      summary:         String,
      skills:          [String],
      technicalSkills: mongoose.Schema.Types.Mixed,
      education:       [mongoose.Schema.Types.Mixed],
      experience:      [mongoose.Schema.Types.Mixed],
      projects:        [mongoose.Schema.Types.Mixed],
      certifications:  [mongoose.Schema.Types.Mixed],
      achievements:    [String],
      totalExperienceMonths: Number,
      seniorityLevel:  String,
      resumeQualityScore: Number,
      parserConfidence: Number,
    },

    // Fit analysis
    fitScore:       { type: Number, default: 0 },
    semanticScore:  { type: Number, default: 0 },
    overallScore:   { type: Number, default: 0 },
    missingSkills:  [String],
    partialSkills:  [mongoose.Schema.Types.Mixed],
    suggestions:    [String],
    strengths:      [String],
    redFlags:       [String],
    summary:        String,

    // ATS
    atsScore:       mongoose.Schema.Types.Mixed,

    // Resume structure
    resumeStructureScore:    Number,
    resumeStructureFeedback: String,
    atsTips:                 [String],

    interviewReadiness: Number,
    confidenceLevel:    String,

    analyzedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

resumeAnalysisSchema.index({ studentId: 1, roleId: 1 });

module.exports = mongoose.models.ResumeAnalysis || mongoose.model('ResumeAnalysis', resumeAnalysisSchema);