import jwt from "jsonwebtoken";
import User from "../models/user.models.js";

// generate token
export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

// protect router
export const protectRouter = async (req, res, next) => {
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
};
export const doctor = (req, res, next) => {
  if (req.user && req.user.role === "doctor") {
    next();
  } else {
    res.status(401).json({ message: "Chỉ dành cho bác sĩ" });
  }
};
export const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(401).json({ message: "Chỉ dành cho admin" });
  }
};
