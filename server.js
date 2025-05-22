// server.js

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/connectDB.js";
import userRouter from "./routes/user.routes.js";
import categoryRouter from "./routes/category.routes.js";
import blogRouter from "./routes/blog.routes.js";
import commentRouter from "./routes/comment.routes.js";
import transactionRouter from "./routes/transaction.routes.js";
import paymentRouter from "./routes/payment.routes.js";
import {
  cleanupExpiredEmailVerifications,
  cleanupUnverifiedAccounts,
} from "./utils/cleanUpUnverifiedEmail.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api/users", userRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/blogs", blogRouter);
app.use("/api/comments", commentRouter);
app.use("/api/transactions", transactionRouter);
app.use("/api/payments", paymentRouter);

// Sample route
app.get("/", (req, res) => {
  res.json({ message: "Server is running!" });
});

// Start server after MongoDB connects
const PORT = process.env.PORT || 8000;

const startServer = async () => {
  try {
    await connectDB(); // Đợi kết nối thành công

    // Sau khi kết nối thành công, mới cleanup
    await cleanupUnverifiedAccounts();
    await cleanupExpiredEmailVerifications();

    app.listen(PORT, () => {
      console.log(`🚀 Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Server failed to start:", error);
    process.exit(1);
  }
};

startServer();
