// routes/chatRoutes.js
import express from "express";
import { askChatGPT } from "../controllers/chatAI.controllers.js";


const router = express.Router();

router.post("/ask", askChatGPT);

export default router;
