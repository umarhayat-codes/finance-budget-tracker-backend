import express from "express";
import {
  createBudget,
  getBudget,
  getLatestBudgets,
} from "../controllers/budgetController";
import { verifyToken } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/", createBudget);
router.get("/latest", verifyToken, getLatestBudgets);
router.get("/:userId", getBudget);

export default router;
