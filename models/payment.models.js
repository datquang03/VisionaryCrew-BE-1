import mongoose from "mongoose";

const { Schema } = mongoose;

const PaymentSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    doctor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    doctorShare: {
      type: Number,
      required: true,
      min: 0,
    },
    adminShare: {
      type: Number,
      required: true,
      min: 0,
    },
    serviceType: {
      type: String,
      enum: ["consultation", "appointment", "video", "message", "other"],
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Payment", PaymentSchema);