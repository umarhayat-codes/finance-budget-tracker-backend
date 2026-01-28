import express from "express";
import { createSaving, getSavings } from "../controllers/savingController";
import { verifyToken } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/", verifyToken, createSaving);
router.get("/", verifyToken, getSavings);

export default router;
