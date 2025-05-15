import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    tempEmail: { type: String }, // Lưu email tạm thời khi cập nhật
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    dateOfBirth: { type: Date, required: true },
    avatar: { type: String },
    description: { type: String },
    isVerified: { type: Boolean, default: false },
    verifyToken: { type: String },
    emailVerificationCode: { type: String },
    emailVerificationExpires: { type: Date },
    resetPasswordCode: { type: String },
    resetPasswordExpires: { type: Date },
    balance: { type: Number, default: 0 },
    role: { type: String, default: "user" },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
