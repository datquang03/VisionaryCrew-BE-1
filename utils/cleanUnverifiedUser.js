import mongoose from "mongoose";
import User from "../models/user.models.js";
import cron from "node-cron";

async function cleanupUnverifiedUsers() {
  try {
    // Kết nối MongoDB nếu chưa kết nối
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // Xóa các user chưa xác minh và có verifyTokenExpires đã hết hạn
    const result = await User.deleteMany({
      isVerified: false,
      verifyTokenExpires: { $lt: Date.now() },
    });

    console.log(
      `Đã xóa ${result.deletedCount} tài khoản chưa xác minh đã hết hạn.`
    );
  } catch (error) {
    console.error("Lỗi khi xóa tài khoản chưa xác minh:", error);
  }
}

// Lên lịch chạy mỗi 5 phút
cron.schedule("*/5 * * * *", cleanupUnverifiedUsers);

// Hàm để chạy ngay lập tức khi server khởi động (tùy chọn)
cleanupUnverifiedUsers();

export default cleanupUnverifiedUsers;
