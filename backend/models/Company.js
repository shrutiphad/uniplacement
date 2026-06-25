const mongoose = require('mongoose');

const eligibilitySchema = new mongoose.Schema({
  minCGPA: { type: Number, default: 0 },
  allowedDepartments: [{ type: String }], // empty = all departments
  allowedSemesters: [{ type: Number }],   // empty = all semesters
});

const roleSchema = new mongoose.Schema(
  {
    roleTitle: { type: String, required: true, trim: true },
    salaryPackage: { type: String, required: true }, // e.g. "12 LPA"
    eligibilityCriteria: { type: eligibilitySchema, default: {} },
    jobDescription: { type: String, required: true },
    responsibilities: [{ type: String }],
    requiredSkills: [{ type: String }],
    interviewRounds: [{ type: String }],
    openings: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const updateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    logo: { type: String }, // Cloudinary URL
    logoPublicId: { type: String },
    description: { type: String, required: true },
    website: { type: String },
    industry: { type: String },
    headquarters: { type: String },
    driveSchedule: { type: Date },
    driveVenue: { type: String },
    roles: [roleSchema],
    updates: [updateSchema],
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Virtual total openings
companySchema.virtual('totalOpenings').get(function () {
  return this.roles.reduce((sum, r) => sum + (r.openings || 1), 0);
});

module.exports = mongoose.models.Company || mongoose.model('Company', companySchema);