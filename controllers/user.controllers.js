import User from "../models/user.models.js";
import bcrypt from "bcryptjs";
import asyncHandler from "express-async-handler";
import { generateToken } from "../middlewares/auth.js";
import crypto from "crypto";
import { sendVerificationEmail } from "../utils/sendVerificationEmail.js";
import moment from "moment";
import mongoose from "mongoose";

//register
export const register = asyncHandler(async (req, res) => {
  try {
    const { username, email, phone, password, dateOfBirth } = req.body;

    // Kiểm tra định dạng dateOfBirth
    let parsedDateOfBirth;

    if (typeof dateOfBirth === "string") {
      // Try DD-MM-YYYY format
      if (moment(dateOfBirth, "DD-MM-YYYY", true).isValid()) {
        parsedDateOfBirth = moment(dateOfBirth, "DD-MM-YYYY").toDate();
      }
      // Try YYYY-MM-DD format
      else if (moment(dateOfBirth, "YYYY-MM-DD", true).isValid()) {
        parsedDateOfBirth = moment(dateOfBirth, "YYYY-MM-DD").toDate();
      } else {
        return res.status(400).json({
          message:
            "Ngày sinh không hợp lệ (định dạng DD-MM-YYYY hoặc YYYY-MM-DD)",
        });
      }
    } else {
      parsedDateOfBirth = new Date(dateOfBirth);
    }
    // Kiểm tra ngày hợp lệ
    if (isNaN(parsedDateOfBirth.getTime())) {
      return res.status(400).json({ message: "Ngày sinh không hợp lệ" });
    }

    const userExistedEmail = await User.findOne({ email });
    if (userExistedEmail) {
      return res.status(400).json({ message: "Email đã được sử dụng" });
    }
    const userExistedUsername = await User.findOne({ username });
    if (userExistedUsername) {
      return res.status(400).json({ message: "Tài khoản đã được sử dụng" });
    }
    const userExistedPhone = await User.findOne({ phone });
    if (userExistedPhone) {
      return res.status(400).json({ message: "Số điện thoại đã được sử dụng" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verifyToken = crypto.randomBytes(32).toString("hex");

    const newUser = await User.create({
      username,
      email,
      phone,
      password: hashedPassword,
      dateOfBirth: parsedDateOfBirth,
      verifyToken,
      isVerified: false,
    });

    await sendVerificationEmail(email, verifyToken);

    res.status(201).json({
      message:
        "Tạo tài khoản thành công. Vui lòng kiểm tra email để xác minh tài khoản.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//login
export const login = asyncHandler(async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username }).select(
      "+password"
    );

    if (!user) {
      return res.status(401).json({ message: "Không tìm thấy người dùng" });
    }

    const isMatch = await bcrypt.compare(req.body.password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Sai mật khẩu" });
    }

    if (!user.isVerified) {
      return res
        .status(401)
        .json({ message: "Vui lòng xác minh email trước khi đăng nhập." });
    }

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      dateOfBirth: user.dateOfBirth,
      isVerified: user.isVerified,
      balance: user.balance,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//verify email
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ message: "Email không hợp lệ." });
  }

  console.log("Received verification request:", { token, email }); // Debug log

  // Find and update the user atomically
  const user = await User.findOneAndUpdate(
    { email, verifyToken: token, isVerified: false }, // Match user with token and not yet verified
    { $set: { isVerified: true, verifyToken: undefined } }, // Update status
    { new: true } // Return the updated document
  );

  if (!user) {
    // Check if the user exists and is already verified
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.isVerified) {
      console.log("User already verified:", email); // Debug log
      return res.status(400).json({ message: "Mã xác thực đã hết hạn." });
    }
    console.log("Invalid token or user not found:", { email, token }); // Debug log
    return res
      .status(400)
      .json({ message: "Mã xác thực không hợp lệ hoặc đã hết hạn." });
  }

  console.log("Verification successful for:", email); // Debug log
  res.status(200).json({ message: "Xác minh tài khoản thành công." });
});
//get user
export const getUser = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    // Kiểm tra ID hợp lệ
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "ID người dùng không hợp lệ" });
    }

    const user = await User.findById(id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ADMIN ROUTE
//get all users
export const getAllUsers = asyncHandler(async (req, res) => {
  try {
    // Thêm phân trang
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Lấy danh sách người dùng, loại bỏ trường nhạy cảm
    const users = await User.find()
      .select("-password") // Loại bỏ password và verifyToken
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // Sắp xếp mới nhất trước

    // Kiểm tra nếu không có người dùng
    if (users.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    // Trả về kết quả với thông tin phân trang
    res.status(200).json({
      users,
      page,
      limit,
      total: await User.countDocuments(),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
