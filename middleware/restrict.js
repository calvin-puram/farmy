//@desc  user role access
//@route middleware
module.exports = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(401).json({
        success: false,
        msg: "You are not authorize to perform this action",
      });
    }
    next();
  };
};
