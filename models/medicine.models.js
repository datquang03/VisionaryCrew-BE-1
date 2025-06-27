import mongoose from "mongoose";

const { Schema } = mongoose;
const MedicineSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    dosage: {
      type: String,
      required: true,
      trim: true,
    },
    sideEffects: {
      type: String,
      trim: true,
    },
    manufacturer: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
    },
    image: {
      type: String,
      trim: true,
      required: true,
    },
  },
  { timestamps: true }
);
export default mongoose.model("Medicine", MedicineSchema);
