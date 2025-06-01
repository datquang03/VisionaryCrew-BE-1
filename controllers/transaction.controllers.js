import qs from "qs";
import crypto from "crypto";
import moment from "moment";
import dotenv from "dotenv";
import QRCode from "qrcode";
import User from "../models/user.models.js";
import Order from "../models/order.model.js";

dotenv.config();

export const createVnpayPaymentQR = async (req, res) => {
  try {
    const { amount, orderId, orderInfo, bankCode } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: "Số tiền không hợp lệ" });
    }

    const tmnCode = process.env.VNPAY_TMN_CODE;
    const secretKey = process.env.VNPAY_HASH_SECRET;
    const vnpUrl = process.env.VNPAY_URL;
    const returnUrl = process.env.VNPAY_RETURN_URL;

    if (!tmnCode || !secretKey || !vnpUrl || !returnUrl) {
      return res.status(500).json({ message: "Cấu hình VNPAY không đầy đủ" });
    }

    const createDate = moment().format("YYYYMMDDHHmmss");
    const ipAddr =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      "127.0.0.1"; // Sử dụng IPv4 thay vì ::1 để đảm bảo tương thích

    // Chuẩn hóa orderInfo để loại bỏ ký tự đặc biệt
    const sanitizedOrderInfo = (orderInfo || `Thanh toan don hang ${orderId}`)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 ]/g, "");

    let locale = req.body.language;
    if (locale === null || locale === "") {
      locale = "vn";
    }

    const currCode = "VND";

    let vnp_Params = {};

    vnp_Params["vnp_Version"] = "2.1.0";
    vnp_Params["vnp_Command"] = "pay";
    vnp_Params["vnp_TmnCode"] = tmnCode;
    vnp_Params["vnp_Locale"] = "vn";
    vnp_Params["vnp_CurrCode"] = currCode;
    vnp_Params["vnp_TxnRef"] = orderId;
    vnp_Params["vnp_OrderInfo"] = "Thanh toan cho ma GD:" + orderId;
    vnp_Params["vnp_OrderType"] = "other";
    vnp_Params["vnp_Amount"] = amount * 100;
    vnp_Params["vnp_ReturnUrl"] = returnUrl;
    vnp_Params["vnp_IpAddr"] = ipAddr;
    vnp_Params["vnp_CreateDate"] = createDate;
    if (bankCode !== null && bankCode !== "") {
      vnp_Params["vnp_BankCode"] = bankCode;
    }

    vnp_Params = sortObject(vnp_Params);

    const signData = qs.stringify(vnp_Params, { encode: false });

    // Generate the secure hash
    const hmac = crypto.createHmac("sha512", secretKey.trim());
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");
    vnp_Params["vnp_SecureHash"] = signed;

    // Generate the payment URL
    const paymentUrl = `${vnpUrl}?${qs.stringify(vnp_Params, {
      encode: false,
    })}`;

    const qrImage = await QRCode.toDataURL(paymentUrl);

    res.json({ paymentUrl, qrImage });
  } catch (error) {
    console.error("Lỗi tạo thanh toán VNPAY:", error);
    res.status(500).json({
      message: "Không tạo được thanh toán VNPAY",
      error: error.message,
    });
  }
};

export const handleVnpayReturn = async (req, res) => {
  let verify;
  try {
    // Use try-catch to catch errors if the query is invalid or lacks data
    verify = verifyReturnUrl(req.query);
    if (!verify.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Data integrity verification failed",
      });
    }
    if (!verify.isSuccess) {
      return res.status(400).json({
        success: false,
        message: "Payment order failed",
      });
    }
    const orderId = req.query.vnp_TxnRef;
    if (verify.isSuccess && orderId) {
      await updateUserBalance(orderId);
    }
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Invalid data",
    });
  }

  // Check order information and handle accordingly
  // Only handle UI-related here, do not handle business logic
  // Important business logic must be handled on the server side via IPN

  return res.status(200).json({
    success: true,
    message: "Return URL verification successful",
  });
};

const verifyReturnUrl = (query) => {
  const vnp_Params = { ...query };
  const secureHash = vnp_Params["vnp_SecureHash"];
  const responseCode = vnp_Params["vnp_ResponseCode"];

  delete vnp_Params["vnp_SecureHash"];
  delete vnp_Params["vnp_SecureHashType"];

  // Sort parameters
  const sortedParams = sortObject(vnp_Params);

  const secretKey = process.env.VNPAY_HASH_SECRET;
  const signData = qs.stringify(sortedParams, { encode: false });
  const hmac = crypto.createHmac("sha512", secretKey.trim());
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  return {
    isVerified: secureHash === signed,
    isSuccess: responseCode === "00",
  };
};

export const handleVnpayIpn = async (req, res) => {
  try {
    let vnp_Params = req.query;
    const secureHash = vnp_Params["vnp_SecureHash"];
    const orderId = vnp_Params["vnp_TxnRef"];
    const responseCode = vnp_Params["vnp_ResponseCode"];

    delete vnp_Params["vnp_SecureHash"];
    delete vnp_Params["vnp_SecureHashType"];

    // Sort parameters
    vnp_Params = sortObject(vnp_Params);

    const secretKey = process.env.VNPAY_HASH_SECRET;
    const signData = qs.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac("sha512", secretKey.trim());
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    if (secureHash === signed) {
      if (responseCode === "00") {
        // Payment successful - update user balance
        await updateUserBalance(orderId);
        res.status(200).json({ RspCode: "00", Message: "Success" });
      } else {
        res
          .status(200)
          .json({ RspCode: "00", Message: "Payment failed but confirmed" });
      }
    } else {
      res.status(200).json({ RspCode: "97", Message: "Checksum failed" });
    }
  } catch (error) {
    console.error("Error handling VNPAY IPN:", error);
    res.status(200).json({ RspCode: "99", Message: "Unknown error" });
  }
};

const updateUserBalance = async (orderId) => {
  try {
    // Find the order by ID
    const order = await Order.findById(orderId);
    if (!order) {
      console.error("Order not found:", orderId);
      return;
    }
    const balanceToAdd = order.denomination / 10000;

    const user = await User.findOneAndUpdate(
      { email: order.receiver_email },
      { $inc: { balance: balanceToAdd } },
      { new: true }
    );

    if (user) {
      console.log(
        `Updated balance for user ${user.email}: +${balanceToAdd} (New balance: ${user.balance})`
      );
    } else {
      console.error("User not found with email:", order.receiver_email);
    }
  } catch (error) {
    console.error("Error updating user balance:", error);
  }
};

function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
  }
  return sorted;
}
