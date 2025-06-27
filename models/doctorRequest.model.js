// models/doctorRequest.model.js
import mongoose from "mongoose";

const { Schema } = mongoose;
const DoctorRequestSchema = new Schema(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    message: {
      type: String,
      trim: true,
    },
    rejectionMessage: {
      type: String,
      trim: true,
    }, 
  },
  { timestamps: true }
);

export default mongoose.model("DoctorRequest", DoctorRequestSchema);