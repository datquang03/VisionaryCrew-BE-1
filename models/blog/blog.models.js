import mongoose from "mongoose";

const { Schema } = mongoose;

// CommentSchema cho bình luận
const CommentSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
    },
    avatar: {
      type: String,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// BlogSchema cho bài blog
const BlogSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      trim: true,
      required: true,
    },
    likedUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    image: {
      type: String,
      trim: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    comments: [CommentSchema],
  },
  { timestamps: true }
);

// Tạo index để tối ưu truy vấn
BlogSchema.index({ author: 1, createdAt: -1 });
BlogSchema.index({ category: 1 });
BlogSchema.index({ likedUsers: 1 }); // Thêm index cho likedUsers
// Tạo text index để hỗ trợ tìm kiếm theo tên
BlogSchema.index({ name: "text" });

export default mongoose.model("Blog", BlogSchema);
