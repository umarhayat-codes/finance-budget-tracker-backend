import express from "express";
import { createBudget, getBudget } from "../controllers/budgetController";

const router = express.Router();

router.post("/", createBudget);
router.get("/:userId", getBudget);

export default router;
