import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./config/connectDB.js";
import userRouter from "./routes/user.routes.js";
import categoryRouter from "./routes/category.routes.js";
import blogRouter from "./routes/blog.routes.js";
import commentRouter from "./routes/comment.routes.js";
import transactionRouter from "./routes/transaction.routes.js";
import paymentRouter from "./routes/payment.routes.js";
import messageRouter from "./routes/message.routes.js ";
import {
  cleanupExpiredEmailVerifications,
  cleanupUnverifiedAccounts,
} from "./utils/cleanUpUnverifiedEmail.js";
import setupSocket from "./config/socketHandler.js";

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("io", io);
setupSocket(io);

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use("/api/users", userRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/blogs", blogRouter);
app.use("/api/comments", commentRouter);
app.use("/api/transactions", transactionRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/messages", messageRouter);

// Sample route
app.get("/", (req, res) => {
  res.json({ message: "Server is running!" });
});

// Start server after MongoDB connects
const PORT = process.env.PORT || 8000;

const startServer = async () => {
  try {
    await connectDB();
    await cleanupUnverifiedAccounts();
    await cleanupExpiredEmailVerifications();

    server.listen(PORT, () => {
      console.log(`🚀 Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Server failed to start:", error);
    process.exit(1);
  }
};

startServer();
