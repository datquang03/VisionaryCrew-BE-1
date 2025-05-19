import express from "express";

import { protectRouter } from "../middlewares/auth.js";
import {
  createPayment,
  
} from "../controllers/transaction.controllers.js";

const router = express.Router();

// USER ROUTER
router.post("/create_payment_url", protectRouter, createPayment);

// PUBLIC ROUTER

export default router;
