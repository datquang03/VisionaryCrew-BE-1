import nodemailer from "nodemailer";

const createTransporter = () => {
  return nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Hàm gửi email xác minh cho đăng ký
export const sendVerificationEmail = async (email, token) => {
  try {
    const transporter = createTransporter();
    const verifyLink = `${process.env.FRONTEND_URL}/verify-email/${token}`;
    await transporter.sendMail({
      from: '"Xác thực" <no-reply@example.com>',
      to: email,
      subject: "Xác minh email của bạn",
      html: `
        <p>Nhấn vào liên kết bên dưới để xác minh tài khoản của bạn:</p>
        <a href="${verifyLink}">${verifyLink}</a>
        <p>Liên kết này sẽ hết hạn sau 15 phút. Nếu không xác minh, tài khoản của bạn sẽ bị xóa.</p>
      `,
    });
  } catch (error) {
    throw new Error("Không tìm thấy email của người dùng");
  }
};

// Hàm gửi email khôi phục mật khẩu
export const sendResetPasswordEmail = async (email, resetCode) => {
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: '"Khôi phục mật khẩu" <no-reply@example.com>',
      to: email,
      subject: "Mã khôi phục mật khẩu",
      html: `
        <p>Mã khôi phục mật khẩu của bạn là: <strong>${resetCode}</strong></p>
        <p>Mã này sẽ hết hạn sau 15 phút.</p>
        <p>Nếu bạn không yêu cầu khôi phục mật khẩu, vui lòng bỏ qua email này.</p>
      `,
    });
  } catch (error) {
    throw new Error("Không tìm thấy email của người dùng");
  }
};

// Hàm gửi mã xác minh email khi cập nhật profile
export const sendProfileEmailVerificationCode = async (email, code) => {
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: '"Xác thực hồ sơ" <no-reply@example.com>',
      to: email,
      subject: "Mã xác minh email mới cho hồ sơ của bạn",
      html: `
        <p>Mã xác minh email mới của bạn là: <strong>${code}</strong></p>
        <p>Mã này sẽ hết hạn sau 15 phút.</p>
        <p>Nếu bạn không thực hiện thay đổi này, vui lòng bỏ qua email này.</p>
      `,
    });
  } catch (error) {
    throw new Error("Không tìm thấy email của người dùng");
  }
};
