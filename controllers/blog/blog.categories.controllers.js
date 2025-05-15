import asyncHandler from "express-async-handler";
import Category from "../../models/blog/blog.categories.models.js";
import Blog from "../../models/blog/blog.models.js";
import mongoose from "mongoose";

// create category
export const createCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ message: "Vui lòng đặt tên" });
  }
  if (!description) {
    return res.status(400).json({ message: "Điền mô tả" });
  }

  const existingCategory = await Category.findOne({ name });
  if (existingCategory) {
    return res.status(400).json({ message: "Danh mục đã tồn tại" });
  }

  const category = await Category.create({ name, description });
  res.status(201).json({
    message: "Tạo danh mục thành công",
    category,
  });
});

// get all categories
export const getAllCategories = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const categories = await Category.find()
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  if (!categories.length) {
    return res.status(404).json({ message: "Không tìm thấy danh mục nào" });
  }

  res.status(200).json({
    categories,
    page,
    limit,
    total: await Category.countDocuments(),
  });
});

// get category by id
export const getCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "ID danh mục không hợp lệ" });
  }

  const category = await Category.findById(id);
  if (!category) {
    return res.status(404).json({ message: "Không tìm thấy danh mục" });
  }

  res.status(200).json(category);
});

// update category
export const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body || {};

  if (!req.body) {
    return res
      .status(400)
      .json({ message: "Vui lòng cung cấp dữ liệu cập nhật" });
  }

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "ID danh mục không hợp lệ" });
  }

  if (!name) {
    return res.status(400).json({ message: "Tên danh mục là bắt buộc" });
  }

  const category = await Category.findById(id);
  if (!category) {
    return res.status(404).json({ message: "Không tìm thấy danh mục" });
  }

  // Kiểm tra tên danh mục mới có trùng không
  if (name !== category.name) {
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ message: "Tên danh mục đã tồn tại" });
    }
  }

  category.name = name;
  if (description) category.description = description; // Chỉ cập nhật nếu có
  await category.save();

  res.status(200).json({
    message: "Cập nhật danh mục thành công",
    category,
  });
});

// delete category
export const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "ID danh mục không hợp lệ" });
  }

  const category = await Category.findById(id);
  if (!category) {
    return res.status(404).json({ message: "Không tìm thấy danh mục" });
  }

  // Kiểm tra xem danh mục có được sử dụng trong blog không
  const blogCount = await Blog.countDocuments({ category: id });
  if (blogCount > 0) {
    return res.status(400).json({
      message: "Không thể xóa danh mục đang được sử dụng trong blog",
    });
  }

  await Category.findByIdAndDelete(id);

  res.status(200).json({ message: "Xóa danh mục thành công" });
});

// search categories by name
export const searchCategories = asyncHandler(async (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res
      .status(400)
      .json({ message: "Vui lòng cung cấp từ khóa tìm kiếm" });
  }

  const categories = await Category.find(
    { $text: { $search: query } },
    { score: { $meta: "textScore" } }
  )
    .sort({ score: { $meta: "textScore" } })
    .limit(10);

  if (!categories.length) {
    return res.status(404).json({ message: "Không tìm thấy danh mục phù hợp" });
  }

  res.status(200).json(categories);
});

// ADMIN ROUTE
// delete all categories
export const deleteAllCategories = asyncHandler(async (req, res) => {
  try {
    const categories = await Category.deleteMany({});
    if (!categories) {
      return res.status(404).json({ message: "Không tìm thấy danh mục" });
    }
    // count total categories delete
    res.status(200).json({
      message: `Xóa tất cả ${categories.deletedCount} danh mục thanh cong `,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
