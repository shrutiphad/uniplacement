const Application = require('../models/application');
const Company = require('../models/company');
const User = require('../models/user');
const { successResponse, errorResponse } = require('../utils/response');

//  Admin: Overview Stats 
exports.getAdminOverview = async (req, res, next) => {
  try {
    const [totalStudents, totalCompanies, totalApplications, selectedCount] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      Company.countDocuments({ isActive: true }),
      Application.countDocuments(),
      Application.countDocuments({ status: 'Selected' }),
    ]);

    return successResponse(res, {
      stats: { totalStudents, totalCompanies, totalApplications, selectedCount },
    });
  } catch (error) {
    next(error);
  }
};

//  Admin: Department Participation 
exports.getDepartmentParticipation = async (req, res, next) => {
  try {
    const data = await Application.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student',
        },
      },
      { $unwind: '$student' },
      {
        $group: {
          _id: '$student.department',
          applications: { $sum: 1 },
          selected: { $sum: { $cond: [{ $eq: ['$status', 'Selected'] }, 1, 0] } },
        },
      },
      { $sort: { applications: -1 } },
    ]);
    return successResponse(res, { data });
  } catch (error) {
    next(error);
  }
};

//  Admin: Applications per Company 
exports.getApplicationsPerCompany = async (req, res, next) => {
  try {
    const data = await Application.aggregate([
      {
        $group: {
          _id: '$companyId',
          total: { $sum: 1 },
          shortlisted: { $sum: { $cond: [{ $eq: ['$status', 'Shortlisted'] }, 1, 0] } },
          selected: { $sum: { $cond: [{ $eq: ['$status', 'Selected'] }, 1, 0] } },
          avgFitScore: { $avg: '$fitScore' },
        },
      },
      {
        $lookup: {
          from: 'companies',
          localField: '_id',
          foreignField: '_id',
          as: 'company',
        },
      },
      { $unwind: '$company' },
      {
        $project: {
          companyName: '$company.name',
          total: 1,
          shortlisted: 1,
          selected: 1,
          avgFitScore: { $round: ['$avgFitScore', 1] },
        },
      },
      { $sort: { total: -1 } },
    ]);
    return successResponse(res, { data });
  } catch (error) {
    next(error);
  }
};

// Admin: Fit Score Distribution 
exports.getFitScoreDistribution = async (req, res, next) => {
  try {
    const data = await Application.aggregate([
      {
        $bucket: {
          groupBy: '$fitScore',
          boundaries: [0, 20, 40, 60, 80, 101],
          default: 'Other',
          output: { count: { $sum: 1 } },
        },
      },
    ]);
    const labels = ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'];
    const formatted = data.map((d, i) => ({ range: labels[i] || 'Other', count: d.count }));
    return successResponse(res, { data: formatted });
  } catch (error) {
    next(error);
  }
};

//  Admin: Placement Trends (Monthly) 
exports.getPlacementTrends = async (req, res, next) => {
  try {
    const data = await Application.aggregate([
      {
        $group: {
          _id: { month: { $month: '$appliedAt' }, year: { $year: '$appliedAt' } },
          total: { $sum: 1 },
          selected: { $sum: { $cond: [{ $eq: ['$status', 'Selected'] }, 1, 0] } },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 },
    ]);
    return successResponse(res, { data });
  } catch (error) {
    next(error);
  }
};

// Student: Personal Analytics 
exports.getStudentAnalytics = async (req, res, next) => {
  try {
    const student = await User.findById(req.user.id);
    if (!student) return errorResponse(res, 'User not found', 404);

    const studentId = student._id;

    const applications = await Application.find({ studentId })
      .populate('companyId', 'name logo roles');

    const totalApplied = applications.length;
    const shortlisted = applications.filter((a) => a.status === 'Shortlisted').length;
    const selected = applications.filter((a) => a.status === 'Selected').length;
    const avgFitScore = totalApplied
      ? Math.round(applications.reduce((s, a) => s + a.fitScore, 0) / totalApplied)
      : 0;

    // Skill coverage: across all applied roles
    const allRequiredSkills = new Set();
    const studentSkills = new Set(student.skills.map((s) => s.toLowerCase()));
    const matchedSkills = new Set();

    applications.forEach((app) => {
      const company = app.companyId;
      if (company?.roles) {
        const role = company.roles.find((r) => r._id.toString() === app.roleId.toString());
        if (role) {
          role.requiredSkills.forEach((s) => {
            const lower = s.toLowerCase();
            allRequiredSkills.add(lower);
            if (studentSkills.has(lower)) matchedSkills.add(lower);
          });
        }
      }
    });

    const skillCoverage = allRequiredSkills.size > 0
      ? Math.round((matchedSkills.size / allRequiredSkills.size) * 100)
      : 0;

    // Readiness score
    const readinessScore = student.readinessScore || 0;

    return successResponse(res, {
      stats: { totalApplied, shortlisted, selected, avgFitScore, skillCoverage, readinessScore },
      applications: applications.map((a) => ({
        _id: a._id,
        companyName: a.companyId?.name,
        companyLogo: a.companyId?.logo,
        roleId: a.roleId,
        status: a.status,
        fitScore: a.fitScore,
        appliedAt: a.appliedAt,
        timeline: a.timeline,
      })),
    });
  } catch (error) {
    next(error);
  }
};
