import asyncHandler from "express-async-handler";
import Blog from "../../models/blog/blog.models.js";
import Category from "../../models/blog/blog.categories.models.js";
import mongoose from "mongoose";

// Tạo blog (admin hoặc doctor)
export const createBlog = asyncHandler(async (req, res) => {
  const { name, description, content, image, category } = req.body;

  // Kiểm tra các trường bắt buộc
  if (!name || !description || !content || !category) {
    return res
      .status(400)
      .json({ message: "Vui lòng điền đầy đủ các trường bắt buộc" });
  }
  const existedBlog = await Blog.findOne({ name });
  if (existedBlog) {
    return res.status(400).json({ message: "Tên bài blog đã tồn tại" });
  }
  const categoryExists = await Category.findById(category);
  if (!categoryExists) {
    return res.status(404).json({ message: "Danh mục không tồn tại" });
  }

  const blog = await Blog.create({
    name,
    description,
    content,
    image,
    category,
    author: req.user._id,
  });

  res.status(201).json({
    message: "Tạo bài blog thành công",
    blog,
  });
});

// Lấy tất cả blog (public, hỗ trợ phân trang và tìm kiếm)
export const getAllBlogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const blogs = await Blog.find({})
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 })
    .populate({ path: "category", select: "name description" })
    .populate({
      path: "author",
      select: "username avatar role",
    })
    .populate({ path: "likedUsers", select: "username avatar role" });

  if (!blogs.length) {
    return res.status(404).json({ message: "Không tìm thấy bài blog nào" });
  }

  res.status(200).json({
    blogs,
    page: parseInt(page),
    limit: parseInt(limit),
    total: await Blog.countDocuments({}),
  });
});

// Lấy blog theo ID (public)
export const getBlogById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const blog = await Blog.findById(id)
    .populate({ path: "category", select: "name description" })
    .populate({
      path: "author",
      select: "username avatar role",
    })
    .populate({ path: "likedUsers", select: "username avatar role" });

  if (!blog) {
    return res.status(404).json({ message: "Không tìm thấy bài blog" });
  }

  res.status(200).json(blog);
});

// Cập nhật blog (admin hoặc doctor)
export const updateBlog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, content, image, category } = req.body;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "ID bài blog không hợp lệ" });
  }

  const blog = await Blog.findById(id);
  if (!blog) {
    return res.status(404).json({ message: "Không tìm thấy bài blog" });
  }

  // Kiểm tra quyền
  if (!["admin", "doctor"].includes(req.user.role)) {
    return res.status(403).json({ message: "Yêu cầu quyền admin hoặc bác sĩ" });
  }

  // Kiểm tra author
  if (blog.author.toString() !== req.user._id.toString()) {
    return res
      .status(403)
      .json({ message: "Bạn không có quyền sửa bài blog này" });
  }

  // Kiểm tra category nếu được cập nhật
  if (category) {
    if (!mongoose.isValidObjectId(category)) {
      return res.status(400).json({ message: "ID danh mục không hợp lệ" });
    }
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(404).json({ message: "Danh mục không tồn tại" });
    }
  }

  // Cập nhật các trường
  blog.name = name || blog.name;
  blog.description = description || blog.description;
  blog.content = content || blog.content;
  blog.image = image || blog.image;
  blog.category = category || blog.category;

  await blog.save();

  res.status(200).json({
    message: "Cập nhật bài blog thành công",
    blog,
  });
});

// Xóa blog (admin hoặc doctor)
export const deleteBlog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const blog = await Blog.findById(id);
  if (!blog) {
    return res.status(404).json({ message: "Không tìm thấy bài blog" });
  }

  // Kiểm tra author
  if (blog.author.toString() !== req.user._id.toString()) {
    return res
      .status(403)
      .json({ message: "Bạn không có quyền xóa bài blog này" });
  }

  await Blog.findByIdAndDelete(id);

  res.status(200).json({ message: "Xóa bài blog thành công" });
});

// Tìm kiếm blog theo tên (public)
export const searchBlogs = asyncHandler(async (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res
      .status(400)
      .json({ message: "Vui lòng cung cấp từ khóa tìm kiếm" });
  }

  const blogs = await Blog.find(
    { $text: { $search: query } },
    { score: { $meta: "textScore" } }
  )
    .limit(10)
    .populate("category") // Populate full thông tin category
    .populate({
      path: "author",
      select: "-password", // Loại bỏ password
    });

  if (!blogs.length) {
    return res.status(404).json({ message: "Không tìm thấy bài blog phù hợp" });
  }

  res.status(200).json(blogs);
});

export const deleteAllBlogs = asyncHandler(async (req, res) => {
  try {
    const blogsInStore = await Blog.find({});
    if (!blogsInStore.length) {
      return res.status(404).json({ message: "Không tìm thấy bài blog nào" });
    }
    const blogs = await Blog.deleteMany({});
    // count total categories delete
    res.status(200).json({
      message: `Xóa tất cả ${blogs.deletedCount} danh mục thanh cong `,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
