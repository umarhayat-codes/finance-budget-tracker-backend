import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoute";
import transactionRoutes from "./routes/transactionRoute";
import categoryRoutes from "./routes/categoryRoute";
import budgetRoutes from "./routes/budgetRoute";
import goalRoutes from "./routes/goalRoute";
import reminderRoutes from "./routes/reminderRoute";
import savingRoutes from "./routes/savingRoute";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(
  process.env.NODE_ENV === "development" ? morgan("dev") : morgan("combined"),
);
app.use(
  cors({
    credentials: true,
    origin: ["http://localhost:3000", "http://localhost:3001"], // Allow both common frontend ports
  }),
);
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/reminder", reminderRoutes);
app.use("/api/savings", savingRoutes);
// app.get("/", (req, res) => {
//   res.send("API is running...");
// });

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
