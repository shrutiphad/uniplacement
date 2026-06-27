const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { successResponse, errorResponse } = require('../utils/response');

//  Register students
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, department, semester } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, 'Email already registered', 409);
    }

    const user = await User.create({ name, email, password, department, semester, role: 'student' });

    const accessToken = generateAccessToken({ id: user._id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user._id });

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return successResponse(res, {
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isProfileComplete: user.isProfileComplete,
      },
    }, 'Registration successful', 201);
  } catch (error) {
    next(error);
  }
};

//  Login 
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password +refreshToken');
    if (!user || !(await user.comparePassword(password))) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    const accessToken = generateAccessToken({ id: user._id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user._id });

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return successResponse(res, {
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        cgpa: user.cgpa,
        skills: user.skills,
        resumeURL: user.resumeURL,
        readinessScore: user.readinessScore,
        isProfileComplete: user.isProfileComplete,
      },
    }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

//  Refresh Token 
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return errorResponse(res, 'Refresh token required', 400);

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id).select('+refreshToken +previousRefreshToken +previousRefreshTokenExpiresAt');
    if (!user) return errorResponse(res, 'Invalid refresh token', 401);

    // Normal case: token matches the current one on file → rotate as usual
    if (user.refreshToken === refreshToken) {
      const newAccessToken = generateAccessToken({ id: user._id, role: user.role });
      const newRefreshToken = generateRefreshToken({ id: user._id });

      await User.findByIdAndUpdate(user._id, {
        refreshToken: newRefreshToken,
        // Keep the just-superseded token valid for a short grace window — covers a second
        // open tab, or a request that was already in flight when this rotation happened,
        // so it doesn't get logged out just for being a few hundred ms behind.
        previousRefreshToken: refreshToken,
        previousRefreshTokenExpiresAt: new Date(Date.now() + 30 * 1000),
      });

      return successResponse(res, { accessToken: newAccessToken, refreshToken: newRefreshToken }, 'Token refreshed');
    }

    // Grace case: token matches the just-superseded one and we're still inside the window
    // → don't rotate again (that would just create the same race one step later), just
    // hand back the already-current refresh token so this tab/request catches up.
    if (
      user.previousRefreshToken === refreshToken &&
      user.previousRefreshTokenExpiresAt &&
      user.previousRefreshTokenExpiresAt.getTime() > Date.now()
    ) {
      const newAccessToken = generateAccessToken({ id: user._id, role: user.role });
      return successResponse(res, { accessToken: newAccessToken, refreshToken: user.refreshToken }, 'Token refreshed');
    }

    return errorResponse(res, 'Invalid refresh token', 401);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Refresh token expired. Please login again.', 401);
    }
    if (error.name === 'JsonWebTokenError') {
      return errorResponse(res, 'Invalid refresh token', 401);
    }
    next(error);
  }
};

//  Logout 
exports.logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { refreshToken: null });
    return successResponse(res, {}, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

//  Get Current User 
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password -refreshToken');
    if (!user) return errorResponse(res, 'User not found', 404);
    return successResponse(res, { user }, 'User fetched successfully');
  } catch (error) {
    next(error);
  }
};