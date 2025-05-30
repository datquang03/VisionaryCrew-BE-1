import Order from "../models/order.model.js";
import { createVnpayPaymentQR } from "./transaction.controllers.js";

export const createOrderController = async (req, res) => {
  try {
    const order = await Order.create(req.body);

    req.body.amount = order.total_price;
    req.body.orderId = order._id.toString();
    req.body.orderInfo = `Thanh toan don hang ${order._id}`;
    req.body.language = "vn";
    req.body.bankCode = order.payment_channel || "VNBANK";

    return createVnpayPaymentQR(req, res);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to create order", error: error.message });
  }
};
