import express from "express";
import { createOrderController } from "../controllers/order.controller.js";

const router = express.Router();

router.post("/", createOrderController);

export default router;
