import express from "express";
import {
  createReminder,
  getReminders,
} from "../controllers/reminderController";

const router = express.Router();

router.post("/create", createReminder);
router.get("/get/:userId", getReminders);

export default router;
