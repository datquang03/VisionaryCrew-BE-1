import mongoose from "mongoose";

const { Schema } = mongoose;

const CategorySchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
      required: true,
    },
  },
  { timestamps: true }
);

// Tạo text index để hỗ trợ tìm kiếm theo tên
CategorySchema.index({ name: "text" });

export default mongoose.model("Category", CategorySchema);
