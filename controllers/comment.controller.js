import asyncHandler from "express-async-handler";
import Blog from "../models/blog/blog.models.js";
import mongoose from "mongoose";

// Tạo comment mới trong bài blog
export const createComment = asyncHandler(async (req, res) => {
  const { blogId } = req.params;
  const { content } = req.body;

  // Kiểm tra các trường bắt buộc
  if (!content) {
    return res.status(400).json({ message: "Nội dung bình luận là bắt buộc" });
  }

  // Kiểm tra blog tồn tại
  if (!mongoose.isValidObjectId(blogId)) {
    return res.status(400).json({ message: "ID bài blog không hợp lệ" });
  }

  const blog = await Blog.findById(blogId);
  if (!blog) {
    return res.status(404).json({ message: "Không tìm thấy bài blog" });
  }

  // Tạo comment mới
  const comment = {
    username: req.user.username,
    avatar: req.user.avatar,
    content,
    userId: req.user._id,
  };

  // Thêm comment vào blog
  blog.comments.push(comment);
  await blog.save();

  res.status(201).json({
    message: "Thêm bình luận thành công",
    comment: blog.comments[blog.comments.length - 1], 
  });
});

// Lấy danh sách comment của bài blog
export const getCommentsByBlogId = asyncHandler(async (req, res) => {
  const { blogId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Kiểm tra blog tồn tại
  if (!mongoose.isValidObjectId(blogId)) {
    return res.status(400).json({ message: "ID bài blog không hợp lệ" });
  }

  const blog = await Blog.findById(blogId).select("comments");
  if (!blog) {
    return res.status(404).json({ message: "Không tìm thấy bài blog" });
  }

  // Lấy comments với phân trang
  const comments = blog.comments
    .slice(skip, skip + parseInt(limit))
    .map((comment) => ({
      _id: comment._id,
      username: comment.username,
      avatar: comment.avatar,
      content: comment.content,
      userId: comment.userId,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    }));

  res.status(200).json({
    comments,
    page: parseInt(page),
    limit: parseInt(limit),
    total: blog.comments.length,
  });
});

// Cập nhật comment
export const updateComment = asyncHandler(async (req, res) => {
  const { blogId, commentId } = req.params;
  const { content } = req.body;

  // Kiểm tra các trường bắt buộc
  if (!content) {
    return res.status(400).json({ message: "Nội dung bình luận là bắt buộc" });
  }

  // Kiểm tra blog và comment tồn tại
  if (!mongoose.isValidObjectId(blogId) || !mongoose.isValidObjectId(commentId)) {
    return res.status(400).json({ message: "ID bài blog hoặc bình luận không hợp lệ" });
  }

  const blog = await Blog.findById(blogId);
  if (!blog) {
    return res.status(404).json({ message: "Không tìm thấy bài blog" });
  }

  const comment = blog.comments.id(commentId);
  if (!comment) {
    return res.status(404).json({ message: "Không tìm thấy bình luận" });
  }

  // Kiểm tra quyền chỉnh sửa (chỉ người tạo comment hoặc admin)
  if (comment.userId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    return res.status(403).json({ message: "Bạn không có quyền chỉnh sửa bình luận này" });
  }

  // Cập nhật nội dung comment
  comment.content = content;
  comment.updatedAt = Date.now(); // Cập nhật thời gian chỉnh sửa
  await blog.save();

  res.status(200).json({
    message: "Cập nhật bình luận thành công",
    comment,
  });
});

// Xóa comment
export const deleteComment = asyncHandler(async (req, res) => {
  const { blogId, commentId } = req.params;

  // Kiểm tra blog và comment tồn tại
  if (!mongoose.isValidObjectId(blogId) || !mongoose.isValidObjectId(commentId)) {
    return res.status(400).json({ message: "ID bài blog hoặc bình luận không hợp lệ" });
  }

  const blog = await Blog.findById(blogId);
  if (!blog) {
    return res.status(404).json({ message: "Không tìm thấy bài blog" });
  }

  const comment = blog.comments.id(commentId);
  if (!comment) {
    return res.status(404).json({ message: "Không tìm thấy bình luận" });
  }

  // Kiểm tra quyền xóa (chỉ người tạo comment hoặc admin)
  if (comment.userId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    return res.status(403).json({ message: "Bạn không có quyền xóa bình luận này" });
  }

  // Xóa comment
  blog.comments.pull(commentId);
  await blog.save();

  res.status(200).json({ message: "Xóa bình luận thành công" });
});