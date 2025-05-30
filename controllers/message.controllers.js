import Message from "../models/message.models.js";
import User from "../models/user.models.js";
import { Server } from "socket.io";

export const sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, content } = req.body;

    const message = new Message({
      sender: senderId,
      receiver: receiverId,
      content,
    });
    await message.save();

    // Add the message to both users' conversations
    await User.findByIdAndUpdate(senderId, {
      $push: { conversations: message._id },
    });
    await User.findByIdAndUpdate(receiverId, {
      $push: { conversations: message._id },
    });

    // Populate sender and receiver details
    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "username avatar")
      .populate("receiver", "username avatar");

    // Prepare message data
    const messageData = {
      _id: populatedMessage._id,
      sender: populatedMessage.sender,
      receiver: populatedMessage.receiver,
      content: populatedMessage.content,
      createdAt: populatedMessage.createdAt,
      updatedAt: populatedMessage.updatedAt,
    };

    // Emit to Socket.IO clients
    const io = req.app.get("io"); // Assuming io is attached to app in server.js
    io.to(receiverId).emit("receive-message", messageData);
    io.to(senderId).emit("receive-message", messageData);

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: "Error sending message", error });
  }
};

// Get messages between two users
export const getMessages = async (req, res) => {
  try {
    const { userId, otherUserId } = req.params;

    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId },
      ],
    })
      .populate("sender", "username avatar")
      .populate("receiver", "username avatar")
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: "Error fetching messages", error });
  }
};

// Mark messages as read
export const markMessagesAsRead = async (req, res) => {
  try {
    const { userId, otherUserId } = req.params;

    await Message.updateMany(
      { sender: otherUserId, receiver: userId, read: false },
      { $set: { read: true } }
    );

    res.status(200).json({ message: "Messages marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a message
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.body.userId;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Only allow the sender to delete the message
    if (message.sender.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Only sender can delete this message" });
    }

    await Message.findByIdAndDelete(messageId);

    // Remove the message from users' conversations
    await User.updateMany(
      { conversations: messageId },
      { $pull: { conversations: messageId } }
    );

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting message", error });
  }
};

// Edit a message
export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId, content } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Only allow the sender to edit the message
    if (message.sender.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Only sender can edit this message" });
    }

    message.content = content;
    message.updatedAt = new Date();
    await message.save();

    res.status(200).json(message);
  } catch (error) {
    res.status(500).json({ message: "Error editing message", error });
  }
};
