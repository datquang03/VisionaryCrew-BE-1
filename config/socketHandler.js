// socketHandler.js
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
      socket
        .to(data.target)
        .emit("ice-candidate", {
          candidate: data.candidate,
          sender: socket.id,
        });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      socket.broadcast.emit("user-disconnected", socket.id);
    });
  });
};

export default setupSocket;
