import nodemailer from "nodemailer";

export const sendVerificationEmail = async (email, token) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const encodedEmail = encodeURIComponent(email);
    const verifyLink = `${process.env.FRONTEND_URL}/verify-email/${token}?email=${encodedEmail}`;
    await transporter.sendMail({
      from: '"Xác thực" <no-reply@example.com>',
      to: email,
      subject: "Xác minh email của bạn",
      html: `
        <p>Nhấn vào liên kết bên dưới để xác minh tài khoản của bạn:</p>
        <a href="${verifyLink}">${verifyLink}</a>
      `,
    });
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new Error("Failed to send verification email");
  }
};
