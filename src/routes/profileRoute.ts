import express from "express";
import { saveProfile, getProfile } from "../controllers/profileController";

const router = express.Router();

router.post("/save", saveProfile);
router.get("/get/:userId", getProfile);

export default router;
