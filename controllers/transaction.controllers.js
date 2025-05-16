import asyncHandler from "express-async-handler";
import crypto from "crypto";
import moment from "moment";
import Transaction from "../models/transaction.models.js";

// VNPay configuration
const vnpConfig = {
  vnp_TmnCode: "QYQJK3RR",
  vnp_HashSecret: "2LSKLRS9I8H66XW43E9W2P0FNHX46NUU",
  vnp_Url: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
  vnp_Api: "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction",
  vnp_ReturnUrl: "http://localhost:8000/vnpay_return",
};

// Create VNPay payment URL
export const createPayment = asyncHandler(async (req, res) => {
  try {
    const { amount, orderInfo, orderId, bankCode } = req.body;
    const userId = req.user?._id; // Giả định middleware protectRouter thêm user vào req

    // Validate input
    if (!amount || !orderInfo || !orderId) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
    }
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: "Số tiền không hợp lệ" });
    }

    // Generate transaction reference
    const vnp_TxnRef = orderId + "_" + moment().format("YYYYMMDDHHmmss");
    const vnp_IpAddr =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const vnp_CreateDate = moment().format("YYYYMMDDHHmmss");
    const vnp_Amount = amount * 100; // VNPay yêu cầu nhân 100

    // Create transaction in database
    const transaction = await Transaction.create({
      userId,
      orderId,
      amount,
      transactionId: vnp_TxnRef,
      status: "pending",
      createdAt: moment().toDate(),
    });

    // Prepare VNPay parameters
    const vnp_Params = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: vnpConfig.vnp_TmnCode,
      vnp_Amount: vnp_Amount,
      vnp_CurrCode: "VND",
      vnp_TxnRef: vnp_TxnRef,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: "billpayment",
      vnp_Locale: "vn",
      vnp_ReturnUrl: vnpConfig.vnp_ReturnUrl,
      vnp_IpAddr: vnp_IpAddr,
      vnp_CreateDate: vnp_CreateDate,
    };

    if (bankCode) {
      vnp_Params.vnp_BankCode = bankCode;
    }

    // Sort parameters and create secure hash
    const sortedParams = Object.keys(vnp_Params)
      .sort()
      .reduce((result, key) => {
        result[key] = vnp_Params[key];
        return result;
      }, {});

    const signData = Object.keys(sortedParams)
      .map(
        (key) =>
          `${key}=${encodeURIComponent(sortedParams[key]).replace(/%20/g, "+")}`
      )
      .join("&");

    const hmac = crypto.createHmac("sha512", vnpConfig.vnp_HashSecret);
    const vnp_SecureHash = hmac.update(signData).digest("hex");

    // Create payment URL
    const vnpUrl = new URL(vnpConfig.vnp_Url);
    Object.keys(sortedParams).forEach((key) => {
      vnpUrl.searchParams.append(key, sortedParams[key]);
    });
    vnpUrl.searchParams.append("vnp_SecureHash", vnp_SecureHash);

    res.status(200).json({
      paymentUrl: vnpUrl.toString(),
      transactionId: vnp_TxnRef,
      message: "Tạo URL thanh toán thành công",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Handle VNPay return callback
export const vnpayReturn = asyncHandler(async (req, res) => {
  try {
    let vnp_Params = req.query;

    // Remove secure hash for verification
    const secureHash = vnp_Params["vnp_SecureHash"];
    delete vnp_Params["vnp_SecureHash"];
    delete vnp_Params["vnp_SecureHashType"];

    // Sort parameters
    const sortedParams = Object.keys(vnp_Params)
      .sort()
      .reduce((result, key) => {
        result[key] = vnp_Params[key];
        return result;
      }, {});

    const signData = Object.keys(sortedParams)
      .map(
        (key) =>
          `${key}=${encodeURIComponent(sortedParams[key]).replace(/%20/g, "+")}`
      )
      .join("&");

    const hmac = crypto.createHmac("sha512", vnpConfig.vnp_HashSecret);
    const calculatedHash = hmac.update(signData).digest("hex");

    const transaction = await Transaction.findOne({
      transactionId: vnp_Params["vnp_TxnRef"],
    });

    if (!transaction) {
      return res.status(400).json({ message: "Không tìm thấy giao dịch" });
    }

    if (secureHash === calculatedHash) {
      // Verify checksum success
      const vnp_ResponseCode = vnp_Params["vnp_ResponseCode"];
      const status = vnp_ResponseCode === "00" ? "success" : "failed";
      const updateData = {
        status,
        responseCode: vnp_ResponseCode,
        transactionDate: moment(
          vnp_Params["vnp_PayDate"],
          "YYYYMMDDHHmmss"
        ).toDate(),
        updatedAt: moment().toDate(),
      };

      // Update transaction
      await Transaction.findOneAndUpdate(
        { transactionId: vnp_Params["vnp_TxnRef"] },
        { $set: updateData },
        { new: true }
      );

      // Format transaction date for response
      const formattedTransactionDate = moment(
        updateData.transactionDate
      ).format("DD-MM-YYYY HH:mm:ss");

      if (vnp_ResponseCode === "00") {
        res.status(200).json({
          message: "Thanh toán thành công",
          transactionId: vnp_Params["vnp_TxnRef"],
          amount: vnp_Params["vnp_Amount"] / 100,
          transactionDate: formattedTransactionDate,
        });
      } else {
        res.status(400).json({
          message: "Thanh toán thất bại",
          responseCode: vnp_ResponseCode,
          transactionId: vnp_Params["vnp_TxnRef"],
        });
      }
    } else {
      // Invalid checksum
      await Transaction.findOneAndUpdate(
        { transactionId: vnp_Params["vnp_TxnRef"] },
        { $set: { status: "failed", updatedAt: moment().toDate() } },
        { new: true }
      );
      res.status(400).json({ message: "Xác thực chữ ký không hợp lệ" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
