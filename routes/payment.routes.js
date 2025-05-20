import express from "express";
import { admin, doctor, protectRouter } from "../middlewares/auth.js";
import { addFunds, getAllPayments, getDoctorPaymentHistory, getPaymentHistory, processPayment } from "../controllers/payment.controller.js";

const router = express.Router();

router.post("/create", protectRouter, processPayment);
router.post("/add", protectRouter, addFunds);
router.get("/:userId", protectRouter, getPaymentHistory);
router.get("/doctor/:userId",protectRouter, doctor, getDoctorPaymentHistory)
router.get("/", protectRouter,admin, getAllPayments)

export default router;