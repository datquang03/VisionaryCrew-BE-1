import express from "express";
import {
  register,
  login,
  verifyEmail,
  verifyProfileEmailCode,
  requestPasswordReset,
  resetPassword,
  updateProfile,
  getUser,
  getAllUsers,
  addLikedBlog,
  unlikedSingleBlog,
  unlikedAllBlogs,
  getLikedBlogsById,
  resetPasswordByOldPassword,
  getDoctors,
  savedMedicalRecord,
  getAllSavedMedicalRecordsById
} from "../controllers/user.controllers.js";
import { admin, protectRouter } from "../middlewares/auth.js";

const router = express.Router();

// PUBLIC ROUTER
router.post("/register", register);
router.post("/login", login);
router.get("/verify-email/:token", verifyEmail);
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);
router.get("/doctors", getDoctors);
router.get("/:id", getUser);

// USER ROUTER
router.patch("/profile", protectRouter, updateProfile);
router.post(
  "/verify-profile-email-code",
  protectRouter,
  verifyProfileEmailCode
);
router.post("/like", protectRouter, addLikedBlog);
router.post("/record/save", protectRouter, savedMedicalRecord);
router.get("/record/save/:id",protectRouter, getAllSavedMedicalRecordsById)
router.get("/like/:id", protectRouter, getLikedBlogsById);
router.delete("/like/:blogId", protectRouter, unlikedSingleBlog);
router.delete("/like", protectRouter, unlikedAllBlogs);
router.post(
  "/reset-password-by-old",
  protectRouter,
  resetPasswordByOldPassword
);

// ADMIN ROUTER
router.get("/", protectRouter, admin, getAllUsers);

export default router;
