// filepath: f:\hukoFpt\VisionaryCrew-BE-1\routes\transaction.routes.js
import express from "express";
import { protectRouter } from "../middlewares/auth.js";
import {
  createVnpayPaymentQR,
  handleVnpayReturn,
  handleVnpayIpn,
} from "../controllers/transaction.controllers.js";

const router = express.Router();

// USER ROUTER
router.post("/vnpay/create", protectRouter, createVnpayPaymentQR);

// PUBLIC ROUTER
router.get("/vnpay_return", handleVnpayReturn);
router.get("/vnpay_ipn", handleVnpayIpn);

export default router;
