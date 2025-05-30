import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    channel: { type: String, required: true },
    receiver_email: { type: String, required: true },
    payment_type: { type: Number, required: true },
    transid: { type: String, required: true },
    client_transid: { type: String, required: true },
    product_group: { type: String, required: true },
    denomination: { type: Number, required: true },
    payment_channel: { type: String, required: true },
    result_url: { type: String, required: true },
    total_price: { type: Number, required: true },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);

export default Order;
