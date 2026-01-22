import express from "express";
import {
  createGoal,
  getGoals,
  updateGoalStatus,
} from "../controllers/goalController";
import { verifyToken } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/", verifyToken, createGoal);
router.get("/", verifyToken, getGoals);
router.patch("/:id/status", verifyToken, updateGoalStatus);

export default router;
