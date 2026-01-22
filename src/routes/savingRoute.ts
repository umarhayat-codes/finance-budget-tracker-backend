import express from "express";
import { createSaving, getSavings } from "../controllers/savingController";
import { verifyToken } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/", verifyToken, createSaving as any);
router.get("/", verifyToken, getSavings as any);

export default router;
