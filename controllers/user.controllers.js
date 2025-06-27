import User from "../models/user.models.js";
import bcrypt from "bcryptjs";
import asyncHandler from "express-async-handler";
import { generateToken } from "../middlewares/auth.js";
import medicalRecord from "../models/medicalRecord.models.js";
import crypto from "crypto";
import moment from "moment";
import Blog from "../models/blog/blog.models.js";
import {
  sendVerificationEmail,
  sendResetPasswordEmail,
  sendProfileEmailVerificationCode,
} from "../utils/sendVerificationEmail.js";
import mongoose from "mongoose";

// Register
export const register = asyncHandler(async (req, res) => {
  try {
    const { username, email, phone, password, dateOfBirth } = req.body;

    // Kiểm tra định dạng dateOfBirth
    let parsedDateOfBirth;

    if (typeof dateOfBirth === "string") {
      if (moment(dateOfBirth, "DD-MM-YYYY", true).isValid()) {
        parsedDateOfBirth = moment(dateOfBirth, "DD-MM-YYYY").toDate();
      } else if (moment(dateOfBirth, "YYYY-MM-DD", true).isValid()) {
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
    const verifyTokenExpires = Date.now() + 15 * 60 * 1000; // 15 phút

    const newUser = await User.create({
      username,
      email,
      phone,
      password: hashedPassword,
      dateOfBirth: parsedDateOfBirth,
      verifyToken,
      verifyTokenExpires,
      isVerified: false,
    });

    // Gửi email xác minh
    await sendVerificationEmail(email, verifyToken);

    // Lên lịch xóa tài khoản nếu không xác minh trong 15 phút
    setTimeout(async () => {
      try {
        const user = await User.findById(newUser._id);
        if (user && !user.isVerified) {
          await User.deleteOne({ _id: user._id });
          console.log(`Tài khoản ${user.email} đã bị xóa vì không xác minh.`);
        }
      } catch (error) {
        console.error(`Lỗi khi xóa tài khoản ${newUser.email}:`, error);
      }
    }, 15 * 60 * 1000); // 15 phút

    res.status(201).json({
      message:
        "Tạo tài khoản thành công. Vui lòng kiểm tra email để xác minh tài khoản trong vòng 15 phút.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login
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
      description: user.description,
      likedBlogs: user.likedBlogs,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Verify email (không yêu cầu đăng nhập)
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  // Tìm người dùng với token
  const user = await User.findOne({ verifyToken: token });
  if (!user) {
    return res
      .status(400)
      .json({ message: "Mã xác thực không hợp lệ hoặc đã hết hạn." });
  }

  // Kiểm tra xem token đã hết hạn chưa
  if (user.verifyTokenExpires < Date.now()) {
    await User.deleteOne({ _id: user._id });
    return res.status(400).json({
      message:
        "Mã xác thực đã hết hạn. Tài khoản đã bị xóa. Vui lòng đăng ký lại.",
    });
  }

  // Kiểm tra trạng thái xác minh
  if (user.isVerified) {
    return res.status(400).json({ message: "Tài khoản đã được xác minh." });
  }

  // Cập nhật người dùng
  const updatedUser = await User.findOneAndUpdate(
    { verifyToken: token, isVerified: false },
    {
      $set: { isVerified: true },
      $unset: { verifyToken: "", verifyTokenExpires: "" }, // Xóa verifyToken và verifyTokenExpires
    },
    { new: true }
  );

  if (!updatedUser) {
    return res
      .status(500)
      .json({ message: "Lỗi khi cập nhật trạng thái xác minh." });
  }

  res.status(200).json({ message: "Xác minh tài khoản thành công." });
});

// Verify profile email code (yêu cầu đăng nhập)
export const verifyProfileEmailCode = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const userId = req.user._id; // Lấy từ middleware protect

  // Tìm người dùng
  const user = await User.findOne({
    _id: userId,
    emailVerificationCode: code,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user) {
    return res
      .status(400)
      .json({ message: "Mã xác minh không hợp lệ hoặc đã hết hạn." });
  }

  // Cập nhật email từ tempEmail và xóa các trường tạm thời
  const updatedUser = await User.findOneAndUpdate(
    { _id: userId, emailVerificationCode: code },
    {
      $set: {
        email: user.tempEmail,
        isVerified: true,
      },
      $unset: {
        tempEmail: "",

        emailVerificationCode: "",
        emailVerificationExpires: "",
      },
    },
    { new: true }
  );

  if (!updatedUser) {
    return res.status(500).json({ message: "Lỗi khi cập nhật email hồ sơ." });
  }

  res.status(200).json({ message: "Xác minh email hồ sơ thành công." });
});

// Request reset password
export const requestPasswordReset = asyncHandler(async (req, res) => {
  try {
    const { email } = req.body;

    // Kiểm tra email tồn tại
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy người dùng với email này" });
    }

    // Tạo mã reset 8 ký tự ngẫu nhiên
    const resetCode = crypto.randomBytes(4).toString("hex"); // 8 ký tự
    const resetCodeExpires = Date.now() + 15 * 60 * 1000; // Hết hạn sau 15 phút

    // Cập nhật user với mã reset và thời gian hết hạn
    user.resetPasswordCode = resetCode;
    user.resetPasswordExpires = resetCodeExpires;
    await user.save();

    // Gửi email chứa mã reset
    await sendResetPasswordEmail(email, resetCode);

    res.status(200).json({
      message: "Mã khôi phục mật khẩu đã được gửi qua email.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reset password
export const resetPassword = asyncHandler(async (req, res) => {
  try {
    const { resetCode, newPassword } = req.body;

    // Tìm user với mã reset
    const user = await User.findOne({
      resetPasswordCode: resetCode,
      resetPasswordExpires: { $gt: Date.now() },
    }).select("+password");

    if (!user) {
      return res.status(400).json({
        message: "Mã khôi phục không hợp lệ hoặc đã hết hạn",
      });
    }

    // Kiểm tra xem mật khẩu mới có trùng với mật khẩu hiện tại không
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        message: "Mật khẩu mới không được trùng với mật khẩu hiện tại",
      });
    }

    // Hash mật khẩu mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Cập nhật mật khẩu và xóa mã reset
    user.password = hashedPassword;
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({
      message: "Đổi mật khẩu thành công",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// reset password by old password
export const resetPasswordByOldPassword = asyncHandler(async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user._id;

    // Tìm người dùng và lấy trường password
    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    // Kiểm tra mật khẩu cũ
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Mật khẩu cũ không đúng" });
    }

    // Kiểm tra xem mật khẩu mới có trùng với mật khẩu cũ không
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        message: "Mật khẩu mới không được trùng với mật khẩu cũ",
      });
    }

    // Hash mật khẩu mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Cập nhật mật khẩu
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
      message: "Đổi mật khẩu thành công",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update profile
export const updateProfile = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id; // Giả sử middleware xác thực đã thêm req.user
    const { avatar, email, description, phone, dateOfBirth } = req.body;

    // Tìm người dùng
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    // Khởi tạo đối tượng cập nhật
    const updateFields = {};

    // Xử lý avatar
    if (avatar !== undefined) {
      if (typeof avatar !== "string") {
        return res.status(400).json({ message: "Avatar phải là chuỗi" });
      }
      updateFields.avatar = avatar;
    }

    // Xử lý email
    if (email !== undefined) {
      if (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ message: "Email không hợp lệ" });
      }
      if (email !== user.email) {
        const emailExists = await User.findOne({ email });
        if (emailExists) {
          return res.status(400).json({ message: "Email đã được sử dụng" });
        }
        // Lưu email tạm thời và tạo mã xác minh
        updateFields.tempEmail = email;
        updateFields.isVerified = false;
        updateFields.emailVerificationCode = crypto
          .randomBytes(4)
          .toString("hex");
        updateFields.emailVerificationExpires = Date.now() + 15 * 60 * 1000; // Hết hạn sau 15 phút
      }
    }

    // Xử lý description
    if (description !== undefined) {
      if (typeof description !== "string") {
        return res.status(400).json({ message: "Mô tả phải là chuỗi" });
      }
      updateFields.description = description;
    }

    // Xử lý phone
    if (phone !== undefined) {
      if (typeof phone !== "string" || !/^\d{10,11}$/.test(phone)) {
        return res.status(400).json({ message: "Số điện thoại không hợp lệ" });
      }
      if (phone !== user.phone) {
        const phoneExists = await User.findOne({ phone });
        if (phoneExists) {
          return res
            .status(400)
            .json({ message: "Số điện thoại đã được sử dụng" });
        }
        updateFields.phone = phone;
      }
    }

    // Xử lý dateOfBirth
    if (dateOfBirth !== undefined) {
      let parsedDateOfBirth;
      if (typeof dateOfBirth === "string") {
        if (moment(dateOfBirth, "DD-MM-YYYY", true).isValid()) {
          parsedDateOfBirth = moment(dateOfBirth, "DD-MM-YYYY").toDate();
        } else if (moment(dateOfBirth, "YYYY-MM-DD", true).isValid()) {
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
      if (isNaN(parsedDateOfBirth.getTime())) {
        return res.status(400).json({ message: "Ngày sinh không hợp lệ" });
      }
      updateFields.dateOfBirth = parsedDateOfBirth;
    }

    // Kiểm tra xem có trường nào được cập nhật không
    if (Object.keys(updateFields).length === 0) {
      return res
        .status(400)
        .json({ message: "Không có trường nào để cập nhật" });
    }

    // Nếu cập nhật email, gửi mã xác minh
    if (updateFields.tempEmail && updateFields.emailVerificationCode) {
      await sendProfileEmailVerificationCode(
        updateFields.tempEmail,
        updateFields.emailVerificationCode
      );
    }

    // Cập nhật người dùng
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({
      message: updateFields.tempEmail
        ? "Cập nhật hồ sơ thành công. Vui lòng kiểm tra email để xác minh mã."
        : "Cập nhật hồ sơ thành công",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// get user
export const getUser = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password -conversations")
      .populate("likedBlogs")
      .populate({
        path: "savedMedicalRecords",
        populate: {
          path: "createdBy",
          model: "User", // Đảm bảo bạn dùng đúng model name đã register
          select: "_id username email", // chỉ populate những field cần thiết
        },
      });
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// get liked blogs by id
export const getLikedBlogsById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).populate("likedBlogs");
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    if (!user.likedBlogs || user.likedBlogs.length === 0) {
      return res.status(200).json([]);
    }

    res.status(200).json(user.likedBlogs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// add liked blogs
export const addLikedBlog = asyncHandler(async (req, res) => {
  const { blogId } = req.body;
  const userId = req.user._id;

  try {
    // Tìm user và blog cùng lúc
    const [user, blog] = await Promise.all([
      User.findById(userId),
      Blog.findById(blogId),
    ]);

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }
    if (!blog) {
      return res.status(404).json({ message: "Không tìm thấy bài blog" });
    }

    // Kiểm tra xem user có phải là tác giả của blog không
    if (blog.author.equals(userId)) {
      return res
        .status(403)
        .json({ message: "Bạn không thể thích bài blog của chính mình" });
    }

    // Kiểm tra xem user đã thích blog chưa
    if (user.likedBlogs.includes(blogId)) {
      return res
        .status(400)
        .json({ message: "Bạn đã thích bài blog này rồi!" });
    }

    // Cập nhật cả User.likedBlogs và Blog.likedUsers
    user.likedBlogs.push(blogId);
    blog.likedUsers.push(userId);

    // Lưu cả hai
    await Promise.all([user.save(), blog.save()]);

    res.status(200).json({ message: "Thích bài blog thành công" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// unliked single blog
export const unlikedSingleBlog = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const blogId = req.params.blogId;

  if (!mongoose.isValidObjectId(blogId)) {
    return res.status(400).json({ message: "ID bài blog không hợp lệ" });
  }

  try {
    // Tìm user và blog
    const [user, blog] = await Promise.all([
      User.findById(userId),
      Blog.findById(blogId),
    ]);

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }
    if (!blog) {
      return res.status(404).json({ message: "Không tìm thấy bài blog" });
    }
    // Kiểm tra xem user có phải là tác giả của blog không
    if (blog.author.equals(userId)) {
      return res
        .status(404)
        .json({ message: "Bạn không thể thích bài blog của chính mình" });
    }
    // Kiểm tra xem blog có trong likedBlogs không
    if (!user.likedBlogs.includes(blogId)) {
      return res.status(404).json({ message: "Blog này chưa được thích" });
    }

    // Xóa blogId khỏi User.likedBlogs và userId khỏi Blog.likedUsers
    user.likedBlogs = user.likedBlogs.filter((id) => !id.equals(blogId));
    blog.likedUsers = blog.likedUsers.filter((id) => !id.equals(userId));

    // Lưu cả hai
    await Promise.all([user.save(), blog.save()]);

    res.status(200).json({ message: "Đã bỏ thích blog", blogId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
//unliked all blogs
export const unlikedAllBlogs = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const deletedCount = user.likedBlogs.length;
    if (deletedCount === 0) {
      return res.status(200).json({ message: "Không có blog nào để bỏ thích" });
    }

    // Lấy tất cả blog mà user đã thích
    const blogs = await Blog.find({ _id: { $in: user.likedBlogs } });

    // Xóa userId khỏi likedUsers của từng blog
    const blogUpdates = blogs.map((blog) =>
      Blog.findByIdAndUpdate(
        blog._id,
        { $pull: { likedUsers: userId } },
        { new: true }
      )
    );

    // Xóa tất cả likedBlogs của user
    user.likedBlogs = [];

    // Thực hiện tất cả cập nhật
    await Promise.all([...blogUpdates, user.save()]);

    res.status(200).json({
      message: `Đã bỏ thích ${deletedCount} bài blog`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export const getDoctors = async (req, res) => {
  try {
    const doctors = await User.find({ role: "doctor" }).select(
      "username email _id role avatar"
    );
    if (!doctors.length) {
      return res.status(404).json({ message: "No doctors found" });
    }
    res.status(200).json(doctors);
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res.status(500).json({ message: error.message });
  }
};
// Save a medical record
export const savedMedicalRecord = asyncHandler(async (req, res) => {
  const { medicalRecordId } = req.body;
  const userId = req.user._id;

  try {

    // Tìm user và medical record cùng lúc
    const [user, record] = await Promise.all([
      User.findById(userId),
      medicalRecord.findById(medicalRecordId),
    ]);

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }
    if (!record) {
      return res.status(404).json({ message: "Không tìm thấy hồ sơ y tế" });
    }

    // Kiểm tra xem user có phải là người tạo hồ sơ y tế không
    if (!record.createdBy.equals(userId)) {
      return res
        .status(403)
        .json({ message: "Chỉ người tạo hồ sơ y tế mới có quyền lưu" });
    }

    // Thêm medicalRecordId vào savedMedicalRecords của user
    user.savedMedicalRecords.push(medicalRecordId);

    // Lưu user
    await user.save();

    res.status(200).json({ message: "Lưu hồ sơ y tế thành công" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// get all saved medical record by id
export const getAllSavedMedicalRecordsById = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate(
      "savedMedicalRecords"
    );
    const count = user.savedMedicalRecords.length;
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }
     if (!user.savedMedicalRecords.length) {
      return res.status(404).json({ message: "Người dùng chưa có hồ sơ" });
    }
    return res.status(200).json({message:`Người dùng có ${count} hồ sơ y tế`,savedMedicalRecords:user.savedMedicalRecords});
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
})



// ADMIN ROUTE
// Get all users
export const getAllUsers = asyncHandler(async (req, res) => {
  try {
    // Thêm phân trang
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Lấy danh sách người dùng, loại bỏ trường nhạy cảm
    const users = await User.find()
      .select("-password")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate("likedBlogs savedMedicalRecords");

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
