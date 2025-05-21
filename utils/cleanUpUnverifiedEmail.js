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
// Cleanup expired email verification codes and related fields
export const cleanupExpiredEmailVerifications = async () => {
  try {
    const result = await User.updateMany(
      {
        isVerified: false,
        emailVerificationExpires: { $lt: Date.now() },
        emailVerificationCode: { $exists: true },
      },
      {
        $unset: {
          tempEmail: "",
          emailVerificationCode: "",
          emailVerificationExpires: "",
        },
      }
    );
    console.log(`Đã xóa ${result.modifiedCount} bộ mã xác minh email hết hạn.`);
    return result;
  } catch (error) {
    console.error("Lỗi khi dọn dẹp mã xác minh email:", error);
    throw error;
  }
};
