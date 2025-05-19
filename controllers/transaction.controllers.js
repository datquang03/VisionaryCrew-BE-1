import asyncHandler from "express-async-handler";
import { VNPay, ProductCode, ignoreLogger, dateFormat } from "vnpay";
export const createPayment = asyncHandler(async (req, res) => {
  try {
    const { amount } = req.body;
    const vnp_Amount = amount * 100;

    const vnpay = new VNPay({
      tmnCode: "QYQJK3RR",
      secureSecret: "2LSKLRS9I8H66XW43E9W2P0FNHX46NUU",
      vnpayHost: "https://sandbox.vnpayment.vn",
      testMode: true,
      hashAlgorithm: "SHA512",
      loggerFn: ignoreLogger
    });

    const vnpayResponse = await vnpay.buildPaymentUrl({
      vnp_Amount,
      vnp_IpAddr: "127.0.0.1",
      vnp_TxnRef: Date.now().toString(), // Mỗi giao dịch nên unique
      vnp_OrderInfo: "Thanh toan don hang " + Date.now(),
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: "http://localhost:8000/api/transactions/vnpay_return",
      vnp_Locale: "vn",
      vnp_CreateDate: dateFormat(new Date()),
      vnp_ExpireDate: dateFormat(new Date(Date.now() + 15 * 60 * 1000)),
    });

    res.status(200).json(vnpayResponse);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});
