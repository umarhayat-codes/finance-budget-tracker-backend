import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ExpenseDistributionItem {
  id: string;
  category: string;
  percentage: number;
  amount: string;
  color: string;
  textColor: string;
}

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

interface AuthRequest extends Request {
  user?: TokenPayload;
}

export const getExpenseDistribution = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Fetch all savings for the user
    const savings = await prisma.saving.findMany({
      where: { userId: userId },
    });

    // Fetch all expenses for the user
    const expenses = await prisma.transaction.findMany({
      where: {
        userId: userId,
        type: "expense",
      },
    });

    let totalSavings = 0;
    savings.forEach((s) => (totalSavings += s.amount));

    let groceriesTotal = 0;
    let transportTotal = 0;
    let othersTotal = 0;
    let grandTotal = totalSavings;

    // Detailed breakdown for "Other" categories
    const otherCategoriesMap: Record<string, number> = {};

    expenses.forEach((expense) => {
      const amount = expense.amount;
      const category = expense.category.toLowerCase();

      grandTotal += amount;

      if (
        category.includes("groceries") ||
        category.includes("shopping") ||
        category.includes("mart") ||
        category.includes("market")
      ) {
        groceriesTotal += amount;
      } else if (
        category.includes("transport") ||
        category.includes("fuel") ||
        category.includes("uber") ||
        category.includes("taxi") ||
        category.includes("bus") ||
        category.includes("train")
      ) {
        transportTotal += amount;
      } else {
        othersTotal += amount;
        // Group other categories for detailed list
        const catName =
          expense.category.charAt(0).toUpperCase() +
          expense.category.slice(1).toLowerCase();
        otherCategoriesMap[catName] =
          (otherCategoriesMap[catName] || 0) + amount;
      }
    });

    const formatAmount = (amount: number): string => {
      // Format: IDR 1.500.000 or similar
      return "IDR " + amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    const calculatePercentage = (part: number, total: number): number => {
      if (total === 0) return 0;
      // Fixed to 1 decimal place to avoid long floats, but requirement says "percentage value"
      // The design usually expects number. Let's return number but precise enough.
      return Number(((part / total) * 100).toFixed(1));
    };

    const mainCategories: ExpenseDistributionItem[] = [
      {
        id: "1",
        category: "Savings",
        percentage: calculatePercentage(totalSavings, grandTotal),
        amount: formatAmount(totalSavings),
        color: "#000000",
        textColor: "#FFFFFF",
      },
      {
        id: "2",
        category: "Groceries",
        percentage: calculatePercentage(groceriesTotal, grandTotal),
        amount: formatAmount(groceriesTotal),
        color: "#1A2E05",
        textColor: "#FFFFFF",
      },
      {
        id: "3",
        category: "Transport",
        percentage: calculatePercentage(transportTotal, grandTotal),
        amount: formatAmount(transportTotal),
        color: "#44920E",
        textColor: "#FFFFFF",
      },
      {
        id: "4",
        category: "Others",
        percentage: calculatePercentage(othersTotal, grandTotal),
        amount: formatAmount(othersTotal),
        color: "#99FF33", // Bright green from design
        textColor: "#000000",
      },
    ];

    // Process other categories for the list below graph
    const otherCategoriesList: ExpenseDistributionItem[] = Object.keys(
      otherCategoriesMap,
    ).map((cat, index) => ({
      id: `other-${index}`,
      category: cat,
      percentage: calculatePercentage(otherCategoriesMap[cat], grandTotal),
      amount: formatAmount(otherCategoriesMap[cat]),
      color: "#F0F0F0", // Default gray for list items
      textColor: "#000000",
    }));

    // Sort other categories by percentage descending
    otherCategoriesList.sort((a, b) => b.percentage - a.percentage);

    res.status(200).json({
      mainCategories,
      otherCategories: otherCategoriesList,
    });
  } catch (error) {
    console.error("Error fetching expense distribution:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
