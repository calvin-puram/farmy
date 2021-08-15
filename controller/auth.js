const { promisify } = require("util");
const crypto = require("crypto");
const axios = require("axios");
const jwtDecode = require("jwt-decode");
const gravatar = require("gravatar");
const normalize = require("normalize-url");

const Users = require("../model/User");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const sendEmail = require("../utils/email");
const getFacebookUserData = require("../utils/getfacebookuserdata");
const getAccessTokenFromCode = require("../utils/getFacebookAccessToken");

const sendToken = (user, res, req, statusCode) => {
  req.session.user = user;

  user.password = undefined;
  res.status(statusCode).json({
    success: true,
  });
};

//@desc   Register Users
//@route  Get api/v1/users/signup
//@access public
exports.signup = catchAsync(async (req, res, next) => {
  const {
    name,
    email,
    password,
    passwordConfirm,
    passwordChangeAt,
    role,
    passwordResetExpires,
    passwordResetToken,
  } = req.body;

  const checkUser = await Users.findOne({ email });

  if (checkUser) {
    return new AppError("user already in the database", 400);
  }

  const avatar = normalize(
    gravatar.url(email, {
      s: "200",
      r: "pg",
      d: "mm",
    }),
    { forceHttps: true }
  );

  const user = await Users.create({
    name,
    email,
    password,
    photo: "avatar",
    passwordConfirm,
    passwordChangeAt,
    role,
    passwordResetExpires,
    passwordResetToken,
  });

  sendToken(user, res, req, 201);
});

//@desc   login Users
//@route  Get api/v1/users/login
//@access public
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("email and password are required", 400));
  }

  const user = await Users.findOne({ email }).select("+password");

  if (!user || !(await user.comparePassword(password, user.password))) {
    return next(new AppError("Invalid credential", 401));
  }

  sendToken(user, res, req, 201);
});

//@desc   social login
//@route  Get api/v1/auth/social
//@access public
exports.social = catchAsync(async (req, res, next) => {
  const userdata = {
    client_id: req.body.client_id,
    redirect_uri: req.body.redirect_uri,
    code: req.body.code,
  };

  if (req.params.provider === "google") {
    userdata.client_secret = process.env.GOOGLE_CLIENT_SECRET;
    userdata.grant_type = "authorization_code";

    try {
      const { data } = await axios.post(
        "https://oauth2.googleapis.com/token",
        userdata
      );
      const user = jwtDecode(data.id_token);
      const checkUser = await Users.findOne({ email: user.email });

      if (!checkUser) {
        const newUser = await Users.create({
          name: user.name,
          email: user.email,
          photo: user.picture,
          password: user.at_hash,
          passwordConfirm: user.at_hash,
        });

        return sendToken(newUser, res, req, 201);
      }

      sendToken(checkUser, res, req, 201);
    } catch (err) {
      if (err) {
        return next(new AppError(err.response.data.error_description, 400));
      }
    }
  }

  if (req.params.provider === "facebook") {
    userdata.client_secret = process.env.FACEBOOK_CLIENT_SECRET;

    try {
      const accessToken = await getAccessTokenFromCode(userdata);

      const user = await getFacebookUserData(accessToken);
      console.log(user);
      if (!user.email) {
        return next(new AppError("user email not found", 400));
      }

      const checkUser = await Users.findOne({ email: user.email });

      if (!checkUser) {
        const newUser = await Users.create({
          name: `${user.first_name} ${user.last_name}`,
          email: user.email,
          photo: user.picture.data.url,
          password: user.id,
          passwordConfirm: user.id,
        });

        return sendToken(newUser, res, req, 201);
      }

      sendToken(checkUser, res, req, 201);
    } catch (err) {
      if (err) {
        return next(new AppError(err.response.data.error.message, 400));
      }
    }
  }
});

//@desc   Forgot Password
//@route  POST api/v1/users/forgotPassword
//@access public
exports.forgotPassword = catchAsync(async (req, res, next) => {
  if (!req.body.email) {
    return res.status(400).json({
      success: false,
      msg: "email field is required",
    });
  }

  const user = await Users.findOne({ email: req.body.email });

  if (!user) {
    return new AppError("this email is not registered", 401);
  }

  const resetToken = user.forgotPasswordToken();
  await user.save({ validateBeforeSave: false });

  const reply = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/resetPassword/${resetToken}`;

  const message = `You recently requested for a password reset. You can submit a PATCH request to this URL \n ${reply}. If you don't know anything about this please ignore`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Password Reset Token <expires in 10mins time",
      message,
    });

    res.status(200).json({
      success: true,
      msg: "your password reset token has been sent to your email",
    });
  } catch (err) {
    console.log(err);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError("your reset token could not be sent. Please try again", 500)
    );
  }
});

//@desc   reset Password
//@route  PATCH api/v1/users/resetPassword
//@access public
exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await Users.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError("Invalid Credentials", 401));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  sendToken(user, res, req, 200);
});

//@desc   update Password
//@route  PATCH api/v1/users/updatePassword
//@access private
exports.updatePassword = catchAsync(async (req, res, next) => {
  if (req.body.newPassword !== req.body.passwordConfirm) {
    return next(new AppError("Password do not match", 400));
  }
  const { currentPassword, newPassword, passwordConfirm } = req.body;
  if (!currentPassword || !newPassword || !passwordConfirm) {
    return next(new AppError("All fields are required", 400));
  }

  const user = await Users.findById(req.user._id).select("+password");

  if (!(await user.comparePassword(currentPassword, user.password))) {
    return next(new AppError("Invalid credentials", 400));
  }

  user.password = newPassword;
  user.passwordConfirm = passwordConfirm;
  await user.save();

  sendToken(user, res, req, 200);
});
