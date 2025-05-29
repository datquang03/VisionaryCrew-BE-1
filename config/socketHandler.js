import User from "../models/user.models.js";
import Message from "../models/message.models.js";
const setupSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Tham gia room (nếu cần gọi theo room)
    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      socket.to(roomId).emit("user-connected", socket.id);
    });

    // Nhận và chuyển tiếp SDP offer
    socket.on("offer", (data) => {
      socket
        .to(data.target)
        .emit("offer", { sdp: data.sdp, sender: socket.id });
    });

    // Nhận và chuyển tiếp SDP answer
    socket.on("answer", (data) => {
      socket
        .to(data.target)
        .emit("answer", { sdp: data.sdp, sender: socket.id });
    });

    // Chuyển tiếp ICE candidate
    socket.on("ice-candidate", (data) => {
      socket.to(data.target).emit("ice-candidate", {
        candidate: data.candidate,
        sender: socket.id,
      });
    });

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

        // Emit the message to the receiver and sender
        const messageData = {
          senderId,
          receiverId,
          content,
          timestamp: message.createdAt,
          _id: message._id,
        };
        socket.to(receiverId).emit("receive-message", messageData);
        socket.emit("receive-message", messageData);
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
        socket.to(receiverId).emit("message-deleted", { messageId });
        socket.emit("message-deleted", { messageId });
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
        socket.to(receiverId).emit("message-edited", {
          messageId,
          content,
          updatedAt: message.updatedAt,
        });
        socket.emit("message-edited", {
          messageId,
          content,
          updatedAt: message.updatedAt,
        });
      } catch (error) {
        console.error("Error editing message:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      socket.broadcast.emit("user-disconnected", socket.id);
    });
  });
};

export default setupSocket;
