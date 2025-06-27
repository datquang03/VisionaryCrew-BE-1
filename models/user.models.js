import mongoose from "mongoose";

const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    avatar: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ["user", "doctor", "admin"],
      default: "user",
    },
    balance: {
      type: Number,
      default: 0,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifyToken: {
      type: String,
    },
    verifyTokenExpires: {
      type: Date,
    },
    resetPasswordCode: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
    emailVerificationCode: {
      type: String,
    },
    emailVerificationExpires: {
      type: Date,
    },
    tempEmail: {
      type: String,
    },
    likedBlogs: [
      {
        type: Schema.Types.ObjectId,
        ref: "Blog",
      },
    ],
    conversations: [
      {
        type: Schema.Types.ObjectId,
        ref: "Message",
      },
    ],
    savedMedicalRecords: [
      {
        type: Schema.Types.ObjectId,
        ref: "MedicalRecord",
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
