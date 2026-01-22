import express from "express";
import {
  createTransaction,
  getTransactions,
  getTransactionSummary,
} from "../controllers/transactionController";
import { verifyToken } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/", verifyToken, createTransaction);
router.get("/", verifyToken, getTransactions);
router.get("/summary", verifyToken, getTransactionSummary);

export default router;
