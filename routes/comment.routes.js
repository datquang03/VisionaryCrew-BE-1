import express from "express";
import { createComment, getCommentsByBlogId, updateComment } from "../controllers/comment.controller.js";
import { protectRouter } from "../middlewares/auth.js";

const router = express.Router();

router.post("/:blogId", protectRouter, createComment);
router.get("/:blogId", getCommentsByBlogId);
router.put("/:blogId/:commentId", protectRouter, updateComment);

export default router;