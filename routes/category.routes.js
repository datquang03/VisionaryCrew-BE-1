import express from "express";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  searchCategories,
  deleteAllCategories,
} from "../controllers/blog/blog.categories.controllers.js";
import {
  admin,
  protectRouter,
  restrictToAdminOrDoctor,
} from "../middlewares/auth.js";

const router = express.Router();

// Public routes
router.get("/", getAllCategories);
router.get("/search", searchCategories);
router.get("/:id", getCategoryById);

// Admin và Doctor routes
router.post("/", protectRouter, restrictToAdminOrDoctor, createCategory);
router.patch("/:id", protectRouter, restrictToAdminOrDoctor, updateCategory);
router.delete("/:id", protectRouter, restrictToAdminOrDoctor, deleteCategory);
router.delete("/", protectRouter, admin, deleteAllCategories);

export default router;
