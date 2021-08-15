const crypto = require("crypto");
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const { Schema } = mongoose;

const UserSchema = new Schema({
  name: {
    type: String,
    trim: true,
    required: [true, "a name is required"],
  },
  email: {
    type: String,
    lower: true,
    unique: true,
    required: [true, "email is required"],
    validate: [validator.isEmail, "Invalid email. Try again"],
  },
  photo: String,
  password: {
    type: String,
    required: [true, "password is required"],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, "please confirm your password"],
    validate: {
      validator: function (val) {
        return val === this.password;
      },
      message: "password do not match",
    },
  },
  role: {
    type: String,
    enum: ["user", "lead-guide", "guide", "admin"],
    default: "user",
  },
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
  passwordChangeAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// hash password
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

// set password change time
UserSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();
  this.passwordChangeAt = Date.now() - 1000;
  next();
});

//show only active set to true
UserSchema.pre(/^findBy/, function (next) {
  this.find({ active: true });
  next();
});

// compare password
UserSchema.methods.comparePassword = async (
  candidatePassword,
  userPassword
) => {
  return await bcrypt.compare(candidatePassword, userPassword);
};

//check password
UserSchema.methods.checkpassword = function (jwtTimestamp) {
  if (this.passwordChangeAt) {
    const convertTime = parseInt(this.passwordChangeAt.getTime() / 1000, 10);
    return jwtTimestamp < convertTime;
  }
  return false;
};

//send forgot password token
UserSchema.methods.forgotPasswordToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const Users = mongoose.model("Users", UserSchema);
module.exports = Users;
