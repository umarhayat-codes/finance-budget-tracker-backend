import { Request, Response } from "express";
import prisma from "../prisma";

interface CreateBudgetRequest extends Request {
  body: {
    userId: string;
    category: string;
    amount: string | number;
    year: string;
    month: string;
    // budget?: string; // Optional field if user provides a description/title
  };
}

interface GetBudgetRequest extends Request {
  params: {
    userId: string;
  };
}

export const createBudget = async (
  req: CreateBudgetRequest,
  res: Response
): Promise<void> => {
  try {
    const { userId, category, amount, year, month } = req.body;

    if (!userId || !category || !amount || !year || !month) {
      res.status(400).json({ message: "All fields are required" });
      return;
    }

    const newBudget = await prisma.budget.create({
      data: {
        userId,
        category,
        amount: Number(amount),
        year,
        month,
        // budget: budget || "", // Store budget name/description if provided
      },
    });

    res.status(201).json({
      message: "Budget created successfully",
      budget: newBudget,
    });
  } catch (error) {
    console.error("Error creating budget:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getBudget = async (
  req: GetBudgetRequest,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({ message: "User ID is required" });
      return;
    }

    const budgets = await prisma.budget.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(budgets);
  } catch (error) {
    console.error("Error fetching budgets:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
