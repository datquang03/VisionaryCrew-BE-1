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
} from "../controllers/user.controllers.js";
import { admin, protectRouter } from "../middlewares/auth.js";

const router = express.Router();

// PUBLIC ROUTER
router.post("/register", register);
router.post("/login", login);
router.get("/verify-email/:token", verifyEmail);
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);
router.get("/:id", getUser);

// USER ROUTER
router.patch("/profile", protectRouter, updateProfile);
router.post(
  "/verify-profile-email-code",
  protectRouter,
  verifyProfileEmailCode
);

// ADMIN ROUTER
router.get("/", protectRouter, admin, getAllUsers);

export default router;
