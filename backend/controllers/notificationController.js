const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../utils/response');

// Create a notification (internal use)
const createNotification = async (userId, { type, title, message, link, meta }) => {
  try {
    return await Notification.create({ userId, type, title, message, link, meta });
  } catch (err) {
    console.error('[Notification] create error:', err.message);
  }
};

// GET /api/notifications
exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const query = { userId: req.user.id };
    if (unreadOnly === 'true') query.read = false;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Notification.countDocuments({ userId: req.user.id, read: false }),
    ]);

    return successResponse(res, { notifications, unreadCount });
  } catch (error) { next(error); }
};

// PUT /api/notifications/:id/read
exports.markRead = async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { read: true });
    return successResponse(res, {}, 'Marked as read');
  } catch (error) { next(error); }
};

// PUT /api/notifications/read-all
exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user.id, read: false }, { read: true });
    return successResponse(res, {}, 'All notifications marked as read');
  } catch (error) { next(error); }
};

// DELETE /api/notifications/:id
exports.deleteNotification = async (req, res, next) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    return successResponse(res, {}, 'Notification deleted');
  } catch (error) { next(error); }
};

exports.createNotification = createNotification;