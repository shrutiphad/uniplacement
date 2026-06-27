const Company = require('../models/Company');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/response');

//  Create Company (Admin) 
exports.createCompany = async (req, res, next) => {
  try {
    const company = await Company.create({ ...req.body, createdBy: req.user.id });
    return successResponse(res, { company }, 'Company created successfully', 201);
  } catch (error) {
    next(error);
  }
};

//  Get All Companies 
exports.getAllCompanies = async (req, res, next) => {
  try {
    const { search, isActive, page = 1, limit = 12 } = req.query;
    const query = {};
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) query.name = { $regex: search, $options: 'i' };

    const companies = await Company.find(query)
      .populate('createdBy', 'name')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ driveSchedule: 1, createdAt: -1 });

    const total = await Company.countDocuments(query);
    return successResponse(res, { companies, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

//  Get Company by ID 
exports.getCompanyById = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id).populate('createdBy', 'name');
    if (!company) return errorResponse(res, 'Company not found', 404);

    // Attach eligible student count if admin
    let eligibleCount = null;
    if (req.user?.role === 'admin') {
      eligibleCount = await getEligibleCount(company);
    }

    return successResponse(res, { company, eligibleCount });
  } catch (error) {
    next(error);
  }
};

//  Update Company (Admin) 
exports.updateCompany = async (req, res, next) => {
  try {
    const company = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!company) return errorResponse(res, 'Company not found', 404);
    return successResponse(res, { company }, 'Company updated successfully');
  } catch (error) {
    next(error);
  }
};

//  Delete Company (Admin) 
exports.deleteCompany = async (req, res, next) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);
    if (!company) return errorResponse(res, 'Company not found', 404);
    return successResponse(res, {}, 'Company deleted successfully');
  } catch (error) {
    next(error);
  }
};

//  Add Role to Company (Admin) 
exports.addRole = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return errorResponse(res, 'Company not found', 404);
    company.roles.push(req.body);
    await company.save();
    return successResponse(res, { company }, 'Role added successfully', 201);
  } catch (error) {
    next(error);
  }
};

//  Update Role 
exports.updateRole = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.companyId);
    if (!company) return errorResponse(res, 'Company not found', 404);

    const role = company.roles.id(req.params.roleId);
    if (!role) return errorResponse(res, 'Role not found', 404);

    Object.assign(role, req.body);
    await company.save();
    return successResponse(res, { company }, 'Role updated successfully');
  } catch (error) {
    next(error);
  }
};

//  Delete Role 
exports.deleteRole = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.companyId);
    if (!company) return errorResponse(res, 'Company not found', 404);
    company.roles.pull({ _id: req.params.roleId });
    await company.save();
    return successResponse(res, {}, 'Role deleted successfully');
  } catch (error) {
    next(error);
  }
};

//  Post Update 
exports.postUpdate = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return errorResponse(res, 'Company not found', 404);
    company.updates.push({ ...req.body, postedBy: req.user.id });
    await company.save();
    return successResponse(res, { company }, 'Update posted');
  } catch (error) {
    next(error);
  }
};

//  Check Eligibility for a Student 
exports.checkEligibility = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return errorResponse(res, 'Company not found', 404);

    const student = await User.findById(req.user.id);
    if (!student) return errorResponse(res, 'User not found', 404);
    const eligibilityMap = {};

    company.roles.forEach((role) => {
      const criteria = role.eligibilityCriteria;
      let eligible = true;
      const reasons = [];

      if (criteria.minCGPA && student.cgpa < criteria.minCGPA) {
        eligible = false;
        reasons.push(`CGPA ${student.cgpa} < required ${criteria.minCGPA}`);
      }
      if (criteria.allowedDepartments?.length && !criteria.allowedDepartments.includes(student.department)) {
        eligible = false;
        reasons.push(`Department ${student.department} not in allowed list`);
      }
      if (criteria.allowedSemesters?.length && !criteria.allowedSemesters.includes(student.semester)) {
        eligible = false;
        reasons.push(`Semester ${student.semester} not eligible`);
      }

      eligibilityMap[role._id] = { eligible, reasons, roleTitle: role.roleTitle };
    });

    return successResponse(res, { eligibilityMap });
  } catch (error) {
    next(error);
  }
};

//Count eligible students for a company 
async function getEligibleCount(company) {
  if (!company.roles.length) return 0;
  const role = company.roles[0]; // Use first role's criteria as representative
  const criteria = role.eligibilityCriteria;
  const query = { role: 'student' };

  if (criteria?.minCGPA) query.cgpa = { $gte: criteria.minCGPA };
  if (criteria?.allowedDepartments?.length) query.department = { $in: criteria.allowedDepartments };
  if (criteria?.allowedSemesters?.length) query.semester = { $in: criteria.allowedSemesters };

  return User.countDocuments(query);
}