import qs from "qs";
import crypto from "crypto";
import moment from "moment";
import dotenv from "dotenv";
import QRCode from "qrcode";

dotenv.config();

export const createVnpayPaymentQR = async (req, res) => {
  try {
    const { amount, orderId, orderInfo } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: "Số tiền không hợp lệ" });
    }
    if (!orderId || !/^[a-zA-Z0-9]+$/.test(orderId)) {
      return res.status(400).json({ message: "Mã đơn hàng không hợp lệ" });
    }

    const vnp_TmnCode = process.env.VNPAY_TMN_CODE;
    const vnp_HashSecret = process.env.VNPAY_HASH_SECRET;
    const vnp_Url = process.env.VNPAY_URL;
    const vnp_ReturnUrl = process.env.VNPAY_RETURN_URL;

    if (!vnp_TmnCode || !vnp_HashSecret || !vnp_Url || !vnp_ReturnUrl) {
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

    const vnp_Params = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode,
      vnp_Locale: "vn",
      vnp_CurrCode: "VND",
      vnp_TxnRef: orderId,
      vnp_OrderInfo: sanitizedOrderInfo,
      vnp_OrderType: "other",
      vnp_Amount: Math.round(amount * 100).toString(), // Chuyển thành chuỗi
      vnp_ReturnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
      vnp_BankCode: "VNPAYQR",
    };

    // B1: Sort keys alphabetically
    const sortedParams = {};
    Object.keys(vnp_Params)
      .sort()
      .forEach((key) => {
        if (vnp_Params[key] !== undefined && vnp_Params[key] !== null) {
          sortedParams[key] = String(vnp_Params[key]).trim(); // Loại bỏ khoảng trắng
        }
      });

    // B2: Build sign data (without encoding)
    const signData = qs.stringify(sortedParams, { encode: false });
    console.log("signData:", signData); // Debug chuỗi signData

    // B3: Generate hash
    const hmac = crypto.createHmac("sha512", vnp_HashSecret.trim()); // Loại bỏ khoảng trắng trong HashSecret
    const vnp_SecureHash = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");
    console.log("vnp_SecureHash:", vnp_SecureHash); // Debug chữ ký

    // B4: Add hash to final params
    sortedParams.vnp_SecureHash = vnp_SecureHash;

    // B5: Final payment URL
    const paymentUrl = `${vnp_Url}?${qs.stringify(sortedParams, { encode: true })}`;
    console.log("paymentUrl:", paymentUrl); // Debug URL

    // B6: Generate QR code
    const qrImage = await QRCode.toDataURL(paymentUrl);

    res.json({ paymentUrl, qrImage });
  } catch (error) {
    console.error("Lỗi tạo thanh toán VNPAY:", error);
    res.status(500).json({ message: "Không tạo được thanh toán VNPAY", error: error.message });
  }
};