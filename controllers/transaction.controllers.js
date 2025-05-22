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

    const tmnCode = process.env.VNPAY_TMN_CODE;
    const secretKey = process.env.VNPAY_HASH_SECRET;
    const vnpUrl = process.env.VNPAY_URL;
    const returnUrl = process.env.VNPAY_RETURN_URL;

    let bankCode = req.body.bankCode;

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
    vnp_Params["vnp_Locale"] = locale;
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
