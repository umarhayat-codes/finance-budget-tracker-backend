import { Response } from "express";
import prisma from "../prisma";
import { AuthRequest, Transaction, Saving, Budget, Category } from "../types";

export const createTransaction = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { category, date, time, amount, method, type } = req.body;
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const parsedAmount = parseFloat(amount);

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        category,
        date,
        time,
        amount: parsedAmount,
        method,
        type,
      },
    });

    const existingCategory = (await prisma.category.findFirst({
      where: { userId, name: category },
    })) as Category | null;

    if (existingCategory) {
      await prisma.category.update({
        where: { id: existingCategory.id },
        data: {
          amount:
            type === "income"
              ? existingCategory.amount + parsedAmount
              : existingCategory.amount - parsedAmount,
        },
      });
    } else if (type === "income") {
      await prisma.category.create({
        data: {
          userId,
          name: category,
          amount: parsedAmount,
        },
      });
    }

    if (type === "expense") {
      const incomeCategories = await prisma.transaction.findMany({
        where: { userId, type: "income" },
        select: { category: true },
        distinct: ["category"],
      });

      const incomeCategoryNames = incomeCategories.map((ic) => ic.category);

      if (incomeCategoryNames.length === 0) {
        incomeCategoryNames.push("Salary", "Freelancing");
      }

      const targetIncomeCategory = await prisma.category.findFirst({
        where: {
          userId,
          name: { in: incomeCategoryNames },
        },
      });

      if (targetIncomeCategory) {
        await prisma.category.update({
          where: { id: targetIncomeCategory.id },
          data: {
            amount: targetIncomeCategory.amount - parsedAmount,
          },
        });
      }
    }

    res.status(201).json({
      message: "Transaction created successfully",
      transaction,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getTransactions = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ transactions });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getFinancialSummary = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const [transactions, savings, budgets] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId },
      }),
      prisma.saving.findMany({
        where: { userId },
      }),
      prisma.budget.findMany({
        where: { userId },
      }),
    ]);

    let totalIncome = 0;
    let totalExpense = 0;
    (transactions as unknown as Transaction[]).forEach((t) => {
      const amount = Number(t.amount);
      if (t.type === "income") {
        totalIncome += amount;
      } else if (t.type === "expense") {
        totalExpense += amount;
        totalIncome -= amount;
      }
    });

    const totalSaving = (savings as unknown as Saving[]).reduce(
      (acc: number, curr: Saving) => acc + Number(curr.amount),
      0,
    );
    const totalBudget = (budgets as unknown as Budget[]).reduce(
      (acc: number, curr: Budget) => acc + Number(curr.amount),
      0,
    );

    res.status(200).json({
      totalIncome,
      totalExpense,
      totalSaving,
      totalBudget,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const mapCategoryToIcon = (category: string): string => {
  const categoryLower = category.toLowerCase();

  if (
    categoryLower.includes("food") ||
    categoryLower.includes("grocery") ||
    categoryLower.includes("restaurant") ||
    categoryLower.includes("dinner") ||
    categoryLower.includes("lunch")
  ) {
    return "food";
  } else if (
    categoryLower.includes("salary") ||
    categoryLower.includes("income") ||
    categoryLower.includes("wallet") ||
    categoryLower.includes("payment")
  ) {
    return "wallet";
  } else if (
    categoryLower.includes("internet") ||
    categoryLower.includes("subscription") ||
    categoryLower.includes("online") ||
    categoryLower.includes("web")
  ) {
    return "globe";
  } else if (
    categoryLower.includes("electric") ||
    categoryLower.includes("power") ||
    categoryLower.includes("utilities")
  ) {
    return "power";
  } else if (
    categoryLower.includes("rent") ||
    categoryLower.includes("home") ||
    categoryLower.includes("house") ||
    categoryLower.includes("project")
  ) {
    return "home";
  }

  return "wallet";
};

const formatTransactionDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    const month = date.toLocaleString("en-US", { month: "short" });
    const day = date.getDate();

    let suffix = "th";
    if (day === 1 || day === 21 || day === 31) suffix = "st";
    else if (day === 2 || day === 22) suffix = "nd";
    else if (day === 3 || day === 23) suffix = "rd";

    return `${month} ${day}${suffix}`;
  } catch (error) {
    return dateStr;
  }
};

const formatAmount = (amount: number, type: string): string => {
  const amountK =
    amount >= 1000000
      ? `${(amount / 1000000).toFixed(1)}M`
      : `${(amount / 1000).toFixed(0)}K`;

  return type === "income" ? `+IDR ${amountK}` : `-IDR ${amountK}`;
};

export const getRecentTransactions = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    interface Transaction {
      id: string;
      userId: string;
      category: string;
      date: string;
      time: string;
      amount: number;
      method: string;
      type: string;
      createdAt: Date;
      updatedAt: Date;
    }

    const month = req.query.month as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 5;
    const skip = (page - 1) * limit;

    const whereClause: {
      userId: string;
      date?: { contains: string };
    } = { userId };

    if (month && month !== "all") {
      whereClause.date = { contains: `-${month}-` };
    }

    const [transactions, totalCount] = await Promise.all([
      prisma.transaction.findMany({
        where: whereClause,
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      prisma.transaction.count({
        where: whereClause,
      }),
    ]);

    const formattedTransactions = (transactions as Transaction[]).map((t) => ({
      id: t.id,
      category: t.category,
      subCategory: t.category,
      amount: formatAmount(t.amount, t.type),
      date: formatTransactionDate(t.date),
      paymentMethod: t.method,
      status: t.type === "income" ? "Received" : "Success",
      type: t.type,
      iconType: mapCategoryToIcon(t.category),
    }));

    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      transactions: formattedTransactions,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
