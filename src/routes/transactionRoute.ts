import express from "express";
import {
  createTransaction,
  getTransactions,
  getFinancialSummary,
  getRecentTransactions,
} from "../controllers/transactionController";
import { verifyToken } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/", verifyToken, createTransaction);
router.get("/", verifyToken, getTransactions);
router.get("/financial-summary", verifyToken, getFinancialSummary);
router.get("/recent", verifyToken, getRecentTransactions);

export default router;
