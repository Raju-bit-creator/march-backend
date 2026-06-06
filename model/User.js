const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  // 2FA fields
  otp: { type: String },
  otpExpiresAt: { type: Date },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
