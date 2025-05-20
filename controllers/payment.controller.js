import mongoose from "mongoose";
import User from "../models/user.models.js"; // Adjust the path to your User model
import Payment from "../models/payment.models.js"; // Adjust the path to your Payment model

// Process a payment for a service
export const processPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, doctorId, amount, serviceType } = req.body;

    // Validate input
    if (!userId || !doctorId || !amount || amount <= 0 || !serviceType) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Invalid input data" });
    }

    // Validate serviceType
    const validServiceTypes = [
      "consultation",
      "appointment",
      "video",
      "message",
      "other",
    ];
    if (!validServiceTypes.includes(serviceType)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Invalid service type" });
    }

    // Find user, doctor, and admin
    const user = await User.findById(userId).session(session);
    const doctor = await User.findById(doctorId).session(session);
    const admin = await User.findOne({ role: "admin" }).session(session);

    if (!user || !doctor || !admin) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ message: "User, doctor, or admin not found" });
    }

    if (
      user.role !== "user" ||
      doctor.role !== "doctor" ||
      admin.role !== "admin"
    ) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ message: "Invalid user roles" });
    }

    // Check if user has sufficient balance
    if (user.balance < amount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // Calculate distribution
    const doctorShare = amount * 0.3; // 30% to doctor
    const adminShare = amount * 0.7; // 70% to admin

    // Create payment record
    const payment = new Payment({
      user: userId,
      doctor: doctorId,
      amount,
      doctorShare,
      adminShare,
      serviceType,
    });

    // Update balances
    user.balance -= amount;
    doctor.balance += doctorShare;
    admin.balance += adminShare;

    // Save changes
    await user.save({ session });
    await doctor.save({ session });
    await admin.save({ session });
    await payment.save({ session });

    await session.commitTransaction();
    res.status(200).json({
      message: "Thanh toán thành công",
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// Add funds to user balance
export const addFunds = async (req, res) => {
  try {
    const { userId, amount } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ message: "input không hợp lệ" });
    }

    const user = await User.findById(userId);
    if (!user || user.role !== "user") {
      return res.status(404).json({ message: "Valid user not found" });
    }

    user.balance += amount;
    await user.save();

    res.status(200).json({
      message: "Đã thêm tiền thành công",
      newBalance: user.balance,
    });
  } catch (error) {
    res.status(500).json({ message: error.message});
  }
};

// Get user balance
export const getBalance = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      userId: user._id,
      balance: user.balance,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error retrieving balance" });
  }
};

// Get payment history for a user
export const getPaymentHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const payments = await Payment.find({
      $or: [{ user: userId }, { doctor: userId }],
    })
      .populate("user", "username")
      .populate("doctor", "username")
      .select("-adminShare -doctorShare")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Lấy danh sách thanh toán thành công",
      payments,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Server error retrieving payment history" });
  }
};

// Get payment history for a doctor
export const getDoctorPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({})
      .populate("user", "username")
      .populate("doctor", "username")
      .select("-adminShare")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Doctor payment history retrieved successfully",
      payments,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all payments for admin
export const getAllPayments = async (req, res) => {
  try {
    // Fetch all payments
    const payments = await Payment.find({})
      .populate("user", "username")
      .populate("doctor", "username")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Lấy toàn bộ danh sách thanh toán thành công",
      payments,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
