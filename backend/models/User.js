const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'student'],
      default: 'student',
    },
    department: { type: String, trim: true },
    semester: { type: Number, min: 1, max: 8 },
    cgpa: { type: Number, min: 0, max: 10 },
    skills: [{ type: String, trim: true }],
    resumeURL: { type: String },
    resumePublicId: { type: String }, // Cloudinary public_id for deletion
    readinessScore: { type: Number, default: 0 },
    bio: { type: String, maxlength: 500 },
    linkedIn: { type: String },
    github: { type: String },
    phone: { type: String },
    isProfileComplete: { type: Boolean, default: false },
    refreshToken: { type: String, select: false },
  },
  { timestamps: true }
);

// Hash password before save 
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

//  Compare password 
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

//  Check profile completeness 
userSchema.methods.checkProfileComplete = function () {
  return !!(this.department && this.semester && this.cgpa && this.skills.length > 0 && this.resumeURL);
};

module.exports = mongoose.models.User || mongoose.model("User", userSchema);