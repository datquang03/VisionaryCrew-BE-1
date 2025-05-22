import express from "express";

import { protectRouter } from "../middlewares/auth.js";
import { createVnpayPaymentQR } from "../controllers/transaction.controllers.js";

const router = express.Router();

// USER ROUTER
router.post("/vnpay/create", protectRouter, createVnpayPaymentQR);

// PUBLIC ROUTER

export default router;
