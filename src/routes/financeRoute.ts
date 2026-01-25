import express from "express";
import { getExpenseDistribution } from "../controllers/financeController";
import { verifyToken } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/distribution", verifyToken, getExpenseDistribution);

export default router;
