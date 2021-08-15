const AppError = require("../utils/appError");

module.exports = (req, res, next) => {
  const { user } = req.session;

  if (!user) {
    return next(new AppError("unauthorized", 401));
  }

  req.user = user;
  next();
};
