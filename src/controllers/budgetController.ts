import { Request, Response } from "express";
import prisma from "../prisma";
import { AuthController, CreateBudgetRequest } from "../types";

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
  req: AuthController,
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

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const result = await Promise.all(
      budgets.map(async (budget) => {
        const monthIndex = monthNames.indexOf(budget.month);
        const monthStr =
          monthIndex !== -1
            ? (monthIndex + 1).toString().padStart(2, "0")
            : budget.month.padStart(2, "0");
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

export const getBudgetAnalysis = async (
  req: AuthController,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const currentYear = new Date().getFullYear().toString();
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const shortMonthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    // Fetch all budgets for the current year
    const budgets = await prisma.budget.findMany({
      where: {
        userId,
        year: currentYear,
      },
    });

    // Fetch all expense transactions for the current year
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: "expense",
        date: {
          contains: currentYear,
        },
      },
    });

    const yearlyData = monthNames.map((fullMonth, index) => {
      const monthStr = (index + 1).toString().padStart(2, "0");
      const shortName = shortMonthNames[index];

      // Calculate total budget for this month
      const monthlyBudgets = budgets.filter((b) => b.month === fullMonth);
      const totalBudget = monthlyBudgets.reduce((sum, b) => sum + b.amount, 0);

      // Calculate total spent for this month
      // Transaction date is expected to contain "YYYY-MM"
      const monthlyTransactions = transactions.filter((t) =>
        t.date.includes(`${currentYear}-${monthStr}`),
      );
      const totalSpent = monthlyTransactions.reduce(
        (sum, t) => sum + t.amount,
        0,
      );

      // Calculate percentage
      let spentPercentage = 0;
      if (totalBudget > 0) {
        spentPercentage = (totalSpent / totalBudget) * 100;
      }
      // If no budget but there is spending, technically it's infinite,
      // but for the radar chart we might want to cap it or show it as 100+?
      // For now, let's keep it simple. If totalBudget is 0, percentage is 0
      // (or we could treat it as unbudgeted spending).

      return {
        month: shortName,
        fullMonth: fullMonth,
        year: parseInt(currentYear),
        spent: parseFloat(spentPercentage.toFixed(2)),
        totalBudget,
        totalSpent,
      };
    });

    res.status(200).json(yearlyData);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
