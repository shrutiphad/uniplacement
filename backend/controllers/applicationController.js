const { notifyApplicationStatusChange } = require('../utils/notificationHelper');
const Application = require('../models/application');
const Company = require('../models/company');
const User = require('../models/user');
const { successResponse, errorResponse } = require('../utils/response');

//  Apply to a Role 
exports.applyToRole = async (req, res, next) => {
  try {
    const { companyId, roleId } = req.body;
    const student = await User.findById(req.user.id);
    if (!student) return errorResponse(res, 'User not found', 404);

    // Check profile completeness
    if (!student.resumeURL) {
      return errorResponse(res, 'Please upload your resume before applying', 400);
    }

    const company = await Company.findById(companyId);
    if (!company) return errorResponse(res, 'Company not found', 404);

    const role = company.roles.id(roleId);
    if (!role) return errorResponse(res, 'Role not found', 404);
    if (!role.isActive) return errorResponse(res, 'This role is no longer accepting applications', 400);

    // Server-side eligibility check
    const criteria = role.eligibilityCriteria;
    if (criteria?.minCGPA && student.cgpa < criteria.minCGPA) {
      return errorResponse(res, `Minimum CGPA required: ${criteria.minCGPA}. Your CGPA: ${student.cgpa}`, 403);
    }
    if (criteria?.allowedDepartments?.length && !criteria.allowedDepartments.includes(student.department)) {
      return errorResponse(res, 'Your department is not eligible for this role', 403);
    }
    if (criteria?.allowedSemesters?.length && !criteria.allowedSemesters.includes(student.semester)) {
      return errorResponse(res, 'Your semester is not eligible for this role', 403);
    }

    // Check for duplicate application
    const existing = await Application.findOne({ studentId: student._id, companyId, roleId });
    if (existing) return errorResponse(res, 'You have already applied to this role', 409);

    // Compute fit score from student skills vs role required skills
    const studentSkills = student.skills.map((s) => s.toLowerCase());
    const requiredSkills = role.requiredSkills.map((s) => s.toLowerCase());
    const matchingSkills = requiredSkills.filter((s) => studentSkills.includes(s));
    const fitScore = requiredSkills.length > 0
      ? Math.round((matchingSkills.length / requiredSkills.length) * 100)
      : 0;

    const application = await Application.create({
      studentId: student._id,
      companyId,
      roleId,
      fitScore,
      status: 'Applied',
      timeline: [{ status: 'Applied', message: 'Application submitted successfully', timestamp: new Date() }],
    });

    return successResponse(res, { application }, 'Application submitted successfully', 201);
  } catch (error) {
    next(error);
  }
};

// ─── Get My Applications (Student) ───────────────────────
exports.getMyApplications = async (req, res, next) => {
  try {
    const applications = await Application.find({ studentId: req.user.id })
      .populate('companyId', 'name logo description driveSchedule')
      .sort({ appliedAt: -1 });

    // Attach role details
    const enriched = applications.map((app) => {
      const company = app.companyId;
      const role = company?.roles?.id ? company.roles.id(app.roleId) : null;
      return { ...app.toObject(), roleDetails: role || null };
    });

    return successResponse(res, { applications: enriched });
  } catch (error) {
    next(error);
  }
};

//  Get All Applications (Admin) 
exports.getAllApplications = async (req, res, next) => {
  try {
    const { companyId, status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (companyId) query.companyId = companyId;
    if (status) query.status = status;

    const applications = await Application.find(query)
      .populate('studentId', 'name email department cgpa skills resumeURL')
      .populate('companyId', 'name logo')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ appliedAt: -1 });

    const total = await Application.countDocuments(query);
    return successResponse(res, { applications, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

//  Update Application Status (Admin) 
exports.updateApplicationStatus = async (req, res, next) => {
  try {
    const { status, message } = req.body;
    const validStatuses = ['Applied', 'Under Review', 'Shortlisted', 'Rejected', 'Selected'];
    if (!validStatuses.includes(status)) {
      return errorResponse(res, 'Invalid status', 400);
    }

    const application = await Application.findById(req.params.id);
    if (!application) return errorResponse(res, 'Application not found', 404);

    application.status = status;
    if (message) {
      application.timeline.push({ status, message, timestamp: new Date() });
    }
    application.lastUpdatedAt = new Date();
    await application.save();
    // Fire notification
    try { await notifyApplicationStatusChange(application.studentId, status, '', application._id); } catch(_) {}

    // Update student readiness score if selected
    if (status === 'Selected') {
      await User.findByIdAndUpdate(application.studentId, { $inc: { readinessScore: 10 } });
    }

    return successResponse(res, { application }, 'Application status updated');
  } catch (error) {
    next(error);
  }
};

//  Get Application by ID 
exports.getApplicationById = async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('studentId', 'name email department cgpa skills resumeURL')
      .populate('companyId', 'name logo description roles');
    if (!application) return errorResponse(res, 'Application not found', 404);

    // Students can only view their own
    if (req.user.role === 'student' && application.studentId._id.toString() !== req.user.id.toString()) {
      return errorResponse(res, 'Access denied', 403);
    }

    return successResponse(res, { application });
  } catch (error) {
    next(error);
  }
};

//  Withdraw Application (Student) 
exports.withdrawApplication = async (req, res, next) => {
  try {
    const application = await Application.findOne({ _id: req.params.id, studentId: req.user.id });
    if (!application) return errorResponse(res, 'Application not found', 404);
    if (!['Applied', 'Under Review'].includes(application.status)) {
      return errorResponse(res, 'Cannot withdraw at this stage', 400);
    }
    await application.deleteOne();
    return successResponse(res, {}, 'Application withdrawn successfully');
  } catch (error) {
    next(error);
  }
};