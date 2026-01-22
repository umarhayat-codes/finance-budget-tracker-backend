import express from "express";
import {
  createCategory,
  getCategories,
} from "../controllers/categoryController";
import { verifyToken } from "../middleware/authMiddleware";

const router = express.Router();

// All category routes are protected
router.post("/", verifyToken, createCategory as any);
router.get("/", verifyToken, getCategories as any);

export default router;
