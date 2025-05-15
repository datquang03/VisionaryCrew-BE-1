import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/user.models.js";

// Generate token
export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

// Protect router
export const protectRouter = asyncHandler(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
      if (!req.user) {
        return res
          .status(401)
          .json({ message: "Không tìm thấy user với token này" });
      }
      next();
    } catch (error) {
      console.error("Token verification error:", error);
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }
  } else {
    return res.status(401).json({ message: "Chưa đăng nhập" });
  }
});

// Admin middleware
export const admin = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Chỉ dành cho admin" });
  }
});

// Doctor middleware
export const doctor = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.role === "doctor") {
    next();
  } else {
    res.status(403).json({ message: "Chỉ dành cho bác sĩ" });
  }
});

// Admin or Doctor middleware
export const restrictToAdminOrDoctor = asyncHandler(async (req, res, next) => {
  if (req.user && ["admin", "doctor"].includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ message: "Yêu cầu quyền admin hoặc bác sĩ" });
  }
});
