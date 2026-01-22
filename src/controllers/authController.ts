import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../prisma";
import { ChangePasswordBody } from "../routes/authRoute";

export const signup = async (req: Request, res: Response): Promise<any> => {
  try {
    const { fullName, email, password } = req.body;

    // Validate input
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
      },
    });

    // Return success response (excluding password)
    const { password: _, ...userWithoutPassword } = newUser;

    return res.status(201).json({
      message: "User created successfully",
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    console.log("Login attempt body:", req.body); // Debug log
    if (!email || !password) {
      res.status(400).json({ message: "All fields are required" });
      return;
    }
    console.log("password and email complete filled");
    const user = await prisma.user.findUnique({
      where: { email },
    });
    console.log("user found:");
    if (!user) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("password match:");
    if (!isMatch) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }
    console.log("password match");
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "10d" },
    );
    console.log("token generated");
    res.cookie("jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development", // Use secure cookies in production
      sameSite: "strict",
      maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days
    });
    console.log("cookie set");
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      message: "Login successful",
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    // req.user is populated by the verifyToken middleware
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // We can fetch fresh data from DB if needed, or return the token payload
    // For now, let's just return what we have or fetch slightly more if the token is minimal
    const fullUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { id: true, fullName: true, email: true }, // Select only safe fields
    });

    if (!fullUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({ user: fullUser });
  } catch (error) {
    console.error("GetMe error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const logout = (req: Request, res: Response): void => {
  try {
    res.cookie("jwt", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: "strict",
      expires: new Date(0), // Expire immediately
    });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const changePassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { email, newPassword, confirmPassword }: ChangePasswordBody =
      req.body;

    if (!email || !newPassword || !confirmPassword) {
      res.status(400).json({ message: "All fields are required" });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(400).json({ message: "no match" });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updatedUser = await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    if (!updatedUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("ChangePassword error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
