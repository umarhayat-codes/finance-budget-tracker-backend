import express from "express";

export interface ChangePasswordBody {
  email: string;
  newPassword: string;
  confirmPassword: string;
}
import {
  signup,
  login,
  getMe,
  logout,
  changePassword,
} from "../controllers/authController";
import { verifyToken } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", verifyToken, getMe);
router.post("/logout", logout);
router.post("/change-password", changePassword);

export default router;
