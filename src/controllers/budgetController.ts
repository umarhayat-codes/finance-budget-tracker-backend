import { Request, Response } from "express";
import prisma from "../prisma";

interface CreateBudgetRequest extends Request {
  body: {
    userId: string;
    category: string;
    amount: string | number;
    year: string;
    month: string;
  };
}

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

interface GetBudgetRequest extends Request {
  params: {
    userId: string;
  };
}

export const createBudget = async (
  req: CreateBudgetRequest,
  res: Response,
): Promise<void> => {
  try {
    const { userId, category, amount, year, month } = req.body;

    if (!userId || !category || !amount || !year || !month) {
      res.status(400).json({ message: "All fields are required" });
      return;
    }

    const existingBudget = await prisma.budget.findFirst({
      where: {
        userId,
        category,
        month,
        year,
      },
    });

    if (existingBudget) {
      const updatedBudget = await prisma.budget.update({
        where: { id: existingBudget.id },
        data: {
          amount: existingBudget.amount + Number(amount),
        },
      });

      res.status(200).json({
        message: "Budget updated successfully",
        budget: updatedBudget,
      });
      return;
    }

    const newBudget = await prisma.budget.create({
      data: {
        userId,
        category,
        amount: Number(amount),
        year,
        month,
      },
    });

    res.status(201).json({
      message: "Budget created successfully",
      budget: newBudget,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getBudget = async (
  req: GetBudgetRequest,
  res: Response,
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
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getLatestBudgets = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const budgets = await prisma.budget.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 2,
    });

    const result = await Promise.all(
      budgets.map(async (budget) => {
        const monthStr = budget.month.padStart(2, "0");
        const yearStr = budget.year;

        const transactions = await prisma.transaction.findMany({
          where: {
            userId,
            category: budget.category,
            type: "expense",
            date: {
              contains: `${yearStr}-${monthStr}`,
            },
          },
        });

        const spent = transactions.reduce((acc, t) => acc + t.amount, 0);

        return {
          ...budget,
          spent,
        };
      }),
    );

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
