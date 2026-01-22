import { Request, Response } from "express";
import prisma from "../prisma";

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

interface AuthRequest extends Request {
  user?: TokenPayload;
}

export const createGoal = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { goalName, targetAmount, targetDate, goalType, fundingSource } =
      req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    if (
      !goalName ||
      !targetAmount ||
      !targetDate ||
      !goalType ||
      !fundingSource
    ) {
      res.status(400).json({ message: "All fields are required" });
      return;
    }

    const newGoal = await prisma.goal.create({
      data: {
        userId,
        goalName,
        targetAmount: Number(targetAmount),
        targetDate,
        goalType,
        fundingSource,
        goalStatus: "On Track", // Default status
      },
    });

    res.status(201).json({
      message: "Goal created successfully",
      goal: newGoal,
    });
  } catch (error) {
    console.error("Error creating goal:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getGoals = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const goals = await prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(goals);
  } catch (error) {
    console.error("Error fetching goals:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateGoalStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { goalStatus } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    if (!goalStatus) {
      res.status(400).json({ message: "Goal status is required" });
      return;
    }

    const goal = await prisma.goal.findUnique({
      where: { id },
    });

    if (!goal || goal.userId !== userId) {
      // Check if it exists or if the user is authorized to update it
      res.status(404).json({ message: "Goal not found" });
      return;
    }

    const updatedGoal = await prisma.goal.update({
      where: { id },
      data: { goalStatus },
    });

    res.status(200).json({
      message: "Goal status updated successfully",
      goal: updatedGoal,
    });
  } catch (error) {
    console.error("Error updating goal status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
