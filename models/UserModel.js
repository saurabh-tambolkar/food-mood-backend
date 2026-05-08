const mongoose = require("mongoose");

const UserSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique:true
  },
  mobileNumber: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
   profileImage: {
    url: { type: String },
    public_id: { type: String },
    mimetype: { type: String },
    size: { type: Number }
  },
  otp: {
    type: String,
    required: true,
  },
  otpExpiresOn: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["admin", "user"],
    default: "user",
  },
  verified: {
    type: Boolean,
    default: false,
  },
},{timestamps:true});

const User = mongoose.model("User",UserSchema);
module.exports= User;
  