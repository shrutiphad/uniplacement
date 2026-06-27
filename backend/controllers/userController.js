const User = require('../models/User');
const { cloudinary, upload } = require('../config/cloudinary');
const { successResponse, errorResponse } = require('../utils/response');

//  Update Profile 

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, department, semester, cgpa, skills, bio, linkedIn, github, phone } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (department) updateData.department = department;
    if (semester) updateData.semester = Number(semester);
    if (cgpa) updateData.cgpa = Number(cgpa);
    if (skills) updateData.skills = Array.isArray(skills) ? skills : skills.split(',').map((s) => s.trim());
    if (bio) updateData.bio = bio;
    if (linkedIn) updateData.linkedIn = linkedIn;
    if (github) updateData.github = github;
    if (phone) updateData.phone = phone;

    const user = await User.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
      runValidators: true,
    });
    if (!user) return errorResponse(res, 'User not found', 404);

    // Recalculate profile completeness
    user.isProfileComplete = user.checkProfileComplete();
    await user.save({ validateBeforeSave: false });

    return successResponse(res, { user }, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
};

//  Upload Resume 
exports.uploadResume = async (req, res, next) => {
  try {
    if (!req.file) return errorResponse(res, 'No file uploaded', 400);

    const user = await User.findById(req.user.id);
    if (!user) return errorResponse(res, 'User not found', 404);

    // Delete old resume from Cloudinary if exists
    if (user.resumePublicId) {
      await cloudinary.uploader.destroy(user.resumePublicId, { resource_type: 'raw' });
    }

    user.resumeURL = req.file.path;
    user.resumePublicId = req.file.filename;
    user.isProfileComplete = user.checkProfileComplete();
    await user.save({ validateBeforeSave: false });

    return successResponse(res, {
      resumeURL: user.resumeURL,
      user,
    }, 'Resume uploaded successfully');
  } catch (error) {
    next(error);
  }
};

//  Get All Students (Admin) 
exports.getAllStudents = async (req, res, next) => {
  try {
    const { department, semester, minCgpa, search, page = 1, limit = 20 } = req.query;
    const query = { role: 'student' };

    if (department) query.department = department;
    if (semester) query.semester = Number(semester);
    if (minCgpa) query.cgpa = { $gte: Number(minCgpa) };
    if (search) query.name = { $regex: search, $options: 'i' };

    const students = await User.find(query)
      .select('-password -refreshToken')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    return successResponse(res, { students, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

//  Get Student by ID (Admin) 
exports.getStudentById = async (req, res, next) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: 'student' }).select('-password -refreshToken');
    if (!student) return errorResponse(res, 'Student not found', 404);
    return successResponse(res, { student });
  } catch (error) {
    next(error);
  }
};