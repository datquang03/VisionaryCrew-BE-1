import express from "express";
import { admin, protectRouter } from "../middlewares/auth.js";
import {
  createMedicine,
  deleteMedicine,
  getAllMedicines,
  getMedicineById,
  updateMedicine,
} from "../controllers/medicine.controllers.js";

const router = express.Router();

router.post("/", protectRouter, admin, createMedicine);
router.get("/", getAllMedicines);
router.get("/:id", getMedicineById);
router.put("/:id", protectRouter, admin, updateMedicine);
router.delete("/:id", protectRouter, admin, deleteMedicine);

export default router;
