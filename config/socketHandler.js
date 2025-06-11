import User from "../models/user.models.js";
import Message from "../models/message.models.js";
import jwt from "jsonwebtoken";

const setupSocket = (io) => {
  io.on("connection", async (socket) => {

    // Authenticate user using token
    const token = socket.handshake.auth.token;
    console.log(token)
    if (!token) {
      console.log("No token provided, disconnecting:", socket.id);
      socket.disconnect();
      return;
    }

    try {
      // Verify token and get userId
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id; // Assuming token contains user ID in 'id' field

      // Join user to their own userId room
      socket.join(userId);
      // Handle chat message
      socket.on("send-message", async (data) => {
        const { senderId, receiverId, content } = data;

        try {
          // Save the message to the database
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

          // Emit to receiver and sender
          io.to(receiverId).emit("receive-message", messageData);
          io.to(senderId).emit("receive-message", messageData);
        } catch (error) {
          console.error("Error saving message:", error);
        }
      });

      // Handle delete message
      socket.on("delete-message", async (data) => {
        const { messageId, userId, receiverId } = data;

        try {
          const message = await Message.findById(messageId);
          if (!message || message.sender.toString() !== userId) {
            return;
          }

          await Message.findByIdAndDelete(messageId);
          await User.updateMany(
            { conversations: messageId },
            { $pull: { conversations: messageId } }
          );

          // Notify both users
          io.to(receiverId).emit("message-deleted", { messageId });
          io.to(userId).emit("message-deleted", { messageId });
        } catch (error) {
          console.error("Error deleting message:", error);
        }
      });

      // Handle edit message
      socket.on("edit-message", async (data) => {
        const { messageId, userId, content, receiverId } = data;

        try {
          const message = await Message.findById(messageId);
          if (!message || message.sender.toString() !== userId) {
            return;
          }

          message.content = content;
          message.updatedAt = new Date();
          await message.save();

          // Notify both users
          io.to(receiverId).emit("message-edited", {
            messageId,
            content,
            updatedAt: message.updatedAt,
          });
          io.to(userId).emit("message-edited", {
            messageId,
            content,
            updatedAt: message.updatedAt,
          });
        } catch (error) {
          console.error("Error editing message:", error);
        }
      });

      socket.on("disconnect", () => {
        socket.broadcast.emit("user-disconnected", socket.id);
      });
    } catch (error) {
      console.error("Token verification failed:", error);
      socket.disconnect();
    }
  });
};

export default setupSocket;