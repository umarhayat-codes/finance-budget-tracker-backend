import express from "express";
import {
  getExpenseDistribution,
  getTransactionSummary,
} from "../controllers/financeController";
import { verifyToken } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/distribution", verifyToken, getExpenseDistribution);
router.get("/summary", verifyToken, getTransactionSummary);

export default router;
