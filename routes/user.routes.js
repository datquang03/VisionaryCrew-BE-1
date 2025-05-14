import express from "express";
import {
  register,
  login,
  verifyEmail,
  getUser,
  getAllUsers,
} from "../controllers/user.controllers.js";
import { admin, protectRouter } from "../middlewares/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/verify-email/:token", verifyEmail);
router.get("/:id", protectRouter, getUser);

// ADMIN ROUTER
router.get("/", protectRouter, admin, getAllUsers);

export default router;
