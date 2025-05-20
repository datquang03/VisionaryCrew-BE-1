import express from "express";
import { createComment, deleteComment, getCommentsByBlogId, updateComment } from "../controllers/comment.controller.js";
import { protectRouter } from "../middlewares/auth.js";

const router = express.Router();

router.post("/:blogId", protectRouter, createComment);
router.get("/:blogId", getCommentsByBlogId);
router.put("/:blogId/:commentId", protectRouter, updateComment);
router.delete("/:blogId/:commentId", protectRouter, deleteComment);

export default router;