import express from "express";
import {
  createBlog,
  deleteAllBlogs,
  deleteBlog,
  getAllBlogs,
  getBlogById,
  getMostLikedBlogs,
  searchBlogs,
  updateBlog,
} from "../controllers/blog/blog.controllers.js";
import { protectRouter, restrictToAdminOrDoctor } from "../middlewares/auth.js";

const router = express.Router();
router.get("/", getAllBlogs);
router.get("/most-liked", getMostLikedBlogs);
router.get("/search", searchBlogs);
router.get("/:id", getBlogById);

// ADMIN VS DOCTOR
router.post("/", protectRouter, restrictToAdminOrDoctor, createBlog);
router.patch("/:id", protectRouter, restrictToAdminOrDoctor, updateBlog);
router.delete("/:id", protectRouter, restrictToAdminOrDoctor, deleteBlog);
router.delete("/", protectRouter, restrictToAdminOrDoctor, deleteAllBlogs);

export default router;
