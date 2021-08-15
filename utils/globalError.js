const AppError = require("./appError");

//send error in development
const sendErrorDev = (error, res) => {
  res.status(error.statusCode).json({
    status: error.status,
    error,
    stack: error.stack,
    msg: error.message,
  });
};

// send error in production
const sendErrorProd = (error, res) => {
  if (error.isOperational) {
    res.status(error.statusCode).json({
      status: error.status,
      msg: error.message,
    });
  } else {
    //something unexpected happens
    console.log(error);
    res.status(500).json({
      status: "fail",
      msg: "something unexpected occur. please try again later",
    });
  }
};

// handle cast error
const handleCastError = (error) => {
  const message = `this ${error.path}: ${error.value} is not valid`;
  return new AppError(message, 400);
};

// handle duplicate error
const handleDuplicateError = () => {
  // const value = error.errmsg.match(/(?<=")[^"]*(?=")/)[0];
  const message = `duplicate field entry `;
  return new AppError(message, 400);
};

// handle validation error
const handleValidationError = (error) => {
  const message = Object.values(error.errors).join(", ");
  return new AppError(message, 400);
};

// handle invalid token
const handleInvalidToken = () => new AppError("Invalid credential", 401);
// handle expired token
const handleExpiredToken = () =>
  new AppError("your Credential has expired. Please login again", 401);

module.exports = (err, req, res, next) => {
  err.status = err.status || "error";
  err.statusCode = err.statusCode || 500;

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === "production") {
    let error = { ...err };
    error.message = err.message;

    if (error.name === "CastError") error = handleCastError(error);
    if (error.code === 11000) error = handleDuplicateError(error);
    if (error.name === "ValidationError") error = handleValidationError(error);
    if (error.name === "JsonWebTokenError") error = handleInvalidToken();
    if (error.name === "TokenExpiredError") error = handleExpiredToken();

    sendErrorProd(error, res);
  }
};
