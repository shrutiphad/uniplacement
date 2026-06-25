const mongoose = require('mongoose');
const jdAnalysisSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    roleId:    { type: mongoose.Schema.Types.ObjectId, required: true },
    roleTitle: String,

    // AI analysis results
    roleLevel:         String,
    primaryTechStack:  [String],
    secondaryTechStack:[String],
    domainKnowledge:   [String],
    mustHaveSkills:    [String],
    niceToHaveSkills:  [String],
    interviewTopics:   [mongoose.Schema.Types.Mixed],
    estimatedDifficulty: String,
    preparationWeeks:  Number,
    salaryInsight:     String,
    roleDescription:   String,
    keyResponsibilities:[String],
    growthPotential:   String,
    redFlags:          [String],
    companyCultureHints:[String],
    topKeywords:       [String],

    // RAG metadata
    jdEmbeddingStored: { type: Boolean, default: false },
    analyzedAt:        { type: Date, default: Date.now },
    jdHash:            String,  // MD5 of JD text — for cache invalidation
  },
  { timestamps: true }
);

jdAnalysisSchema.index({ companyId: 1, roleId: 1 }, { unique: true });

module.exports = mongoose.models.JDAnalysis || mongoose.model('JDAnalysis', jdAnalysisSchema);