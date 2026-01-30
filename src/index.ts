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
import profileRoutes from "./routes/profileRoute";
import financeRoutes from "./routes/financeRoute";
dotenv.config();

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 5000;

// CORS configuration
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://finance-budget-tracker-frontend-okg.vercel.app",
  process.env.FRONTEND_URL,
].filter((origin): origin is string => Boolean(origin));

console.log("Allowed CORS origins:", allowedOrigins);

app.use(
  process.env.NODE_ENV === "development" ? morgan("dev") : morgan("combined"),
);
app.use(
  cors({
    credentials: true,
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  }),
);
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/reminder", reminderRoutes);
app.use("/api/savings", savingRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/finance", financeRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
