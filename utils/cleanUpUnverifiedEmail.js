import User from "../models/user.models.js";
export const cleanupUnverifiedAccounts = async () => {
  try {
    const result = await User.deleteMany({
      isVerified: false,
      verifyTokenExpires: { $lt: Date.now() },
    });
    console.log(`Đã xóa ${result.deletedCount} tài khoản không xác minh.`);
  } catch (error) {
    console.error("Lỗi khi dọn dẹp tài khoản:", error);
  }
};
