import express from "express";
import {
  createCategory,
  getCategories,
} from "../controllers/categoryController";
import { verifyToken } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/", verifyToken, createCategory);
router.get("/", verifyToken, getCategories);

export default router;
