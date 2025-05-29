// routes/message.routes.js
import express from "express";
import {
  getMessages,
  markMessagesAsRead,
  sendMessage,
  deleteMessage,
  editMessage,
} from "../controllers/message.controllers.js";
import { protectRouter } from "../middlewares/auth.js";

const router = express.Router();

// Send a new message
router.post("/send", protectRouter, sendMessage);

// Get messages between two users
router.get("/:userId/:otherUserId", protectRouter, getMessages);

// Mark messages as read
router.put("/read/:userId/:otherUserId", protectRouter, markMessagesAsRead);

// Delete a message
router.delete("/:messageId", protectRouter, deleteMessage);

// Edit a message
router.put("/:messageId", protectRouter, editMessage);

export default router;
