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

interface Saving {
  id: string;
  userId: string;
  title: string;
  amount: number;
  date: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Budget {
  id: string;
  userId: string;
  category: string;
  amount: number;
  month: string;
  year: string;
  createdAt: Date;
  updatedAt: Date;
}

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

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        category,
        date,
        time,
        amount: parseFloat(amount),
        method,
        type,
      },
    });

    res.status(201).json({
      message: "Transaction created successfully",
      transaction,
    });
  } catch (error) {
    console.error("CreateTransaction error:", error);
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
    console.error("GetTransactions error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getTransactionSummary = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    interface ParsedTransaction extends Transaction {
      parsedDate: Date;
    }

    interface ParsedSaving extends Saving {
      parsedDate: Date;
    }

    const [transactionsRaw, savingsRaw] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId },
      }),
      prisma.saving.findMany({
        where: { userId },
      }),
    ]);

    // Parse dates and filter invalid ones
    const transactions: ParsedTransaction[] = (transactionsRaw as Transaction[])
      .map((t: Transaction) => ({
        ...t,
        parsedDate: new Date(t.date),
      }))
      .filter((t) => !isNaN(t.parsedDate.getTime()));

    const savings: ParsedSaving[] = (savingsRaw as unknown as Saving[])
      .map((s: Saving) => ({
        ...s,
        parsedDate: new Date(s.date),
      }))
      .filter((s) => !isNaN(s.parsedDate.getTime()));

    // If no data at all
    if (transactions.length === 0 && savings.length === 0) {
      const now = new Date();
      const currentMonthLabel = now.toLocaleString("en-US", {
        month: "short",
        year: "numeric",
      });
      res.status(200).json({
        totalIncome: 0,
        totalExpense: 0,
        startDate: currentMonthLabel,
        endDate: currentMonthLabel,
        categoryBreakdown: [],
        trend: {
          labels: [currentMonthLabel],
          incomeData: [0],
          expenseData: [0],
          savingsData: [0],
        },
      });
      return;
    }

    // Sort to find true range
    const allRecords = [
      ...transactions.map((t: ParsedTransaction) => ({ date: t.parsedDate })),
      ...savings.map((s: ParsedSaving) => ({ date: s.parsedDate })),
    ];
    allRecords.sort((a, b) => a.date.getTime() - b.date.getTime());

    const firstDate = allRecords[0].date;
    const lastDate = allRecords[allRecords.length - 1].date;

    const startDate = new Date(
      firstDate.getFullYear(),
      firstDate.getMonth(),
      1,
    );
    const endDate = new Date(lastDate.getFullYear(), lastDate.getMonth(), 1);

    // Generate Month Labels
    const allMonths: string[] = [];
    const dateCursor = new Date(startDate);
    while (dateCursor <= endDate) {
      const monthLabel = dateCursor.toLocaleString("en-US", {
        month: "short",
        year: "numeric",
      });
      if (allMonths[allMonths.length - 1] !== monthLabel) {
        allMonths.push(monthLabel);
      }
      dateCursor.setMonth(dateCursor.getMonth() + 1);
    }

    // 3. Aggregate Data by Month
    const monthlyAgg: Record<
      string,
      { income: number; expense: number; saving: number }
    > = {};
    allMonths.forEach((m) => {
      monthlyAgg[m] = { income: 0, expense: 0, saving: 0 };
    });

    const getMonthKey = (date: Date) => {
      return date.toLocaleString("en-US", {
        month: "short",
        year: "numeric",
      });
    };

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryMap: Record<string, number> = {};

    transactions.forEach((t: ParsedTransaction) => {
      const key = getMonthKey(t.parsedDate);
      if (monthlyAgg[key]) {
        if (t.type === "income") {
          monthlyAgg[key].income += t.amount;
          totalIncome += t.amount;
        } else if (t.type === "expense") {
          monthlyAgg[key].expense += t.amount;
          totalExpense += t.amount;
          categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
        }
      }
    });

    savings.forEach((s: ParsedSaving) => {
      const key = getMonthKey(s.parsedDate);
      if (monthlyAgg[key]) {
        const amount = parseFloat(s.amount.toString());
        monthlyAgg[key].saving += isNaN(amount) ? 0 : amount;
      }
    });

    const categoryBreakdown = Object.entries(categoryMap).map(
      ([category, value]) => ({
        category,
        value: totalExpense > 0 ? (value / totalExpense) * 100 : 0,
        amount: value,
      }),
    );

    const colors = [
      "#8CFF2E",
      "#565555",
      "#FF8042",
      "#0088FE",
      "#00C49F",
      "#FFBB28",
    ];
    const breakdownWithColors = categoryBreakdown.map((item, index) => ({
      ...item,
      color: colors[index % colors.length],
    }));

    const trendIncomeData = allMonths.map((m) => monthlyAgg[m].income);
    const trendExpenseData = allMonths.map((m) => monthlyAgg[m].expense);
    const trendSavingsData = allMonths.map((m) => monthlyAgg[m].saving);

    res.status(200).json({
      totalIncome,
      totalExpense,
      startDate: allMonths[0],
      endDate: allMonths[allMonths.length - 1],
      categoryBreakdown: breakdownWithColors,
      trend: {
        labels: allMonths,
        incomeData: trendIncomeData,
        expenseData: trendExpenseData,
        savingsData: trendSavingsData,
      },
    });
  } catch (error) {
    console.error("GetTransactionSummary error:", error);
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
    (transactions as Transaction[]).forEach((t) => {
      const amount = Number(t.amount);
      if (t.type === "income") {
        totalIncome += amount;
      } else if (t.type === "expense") {
        totalExpense += amount;
      }
    });

    const totalSaving = (savings as unknown as Saving[]).reduce(
      (acc, curr) => acc + Number(curr.amount),
      0,
    );
    const totalBudget = (budgets as Budget[]).reduce(
      (acc, curr) => acc + Number(curr.amount),
      0,
    );

    res.status(200).json({
      totalIncome,
      totalExpense,
      totalSaving,
      totalBudget,
    });
  } catch (error) {
    console.error("GetFinancialSummary error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Helper function to map category to icon type
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

  return "wallet"; // default icon
};

// Helper function to format date
const formatTransactionDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    const month = date.toLocaleString("en-US", { month: "short" });
    const day = date.getDate();

    // Add ordinal suffix
    let suffix = "th";
    if (day === 1 || day === 21 || day === 31) suffix = "st";
    else if (day === 2 || day === 22) suffix = "nd";
    else if (day === 3 || day === 23) suffix = "rd";

    return `${month} ${day}${suffix}`;
  } catch (error) {
    return dateStr;
  }
};

// Helper function to format amount
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

    // Get query parameters
    const month = req.query.month as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 5;
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: {
      userId: string;
      date?: { contains: string };
    } = { userId };

    // If month is provided and not "all", filter by month number (e.g., "01" for January)
    // This will match all years for that month
    if (month && month !== "all") {
      // Month format is "01", "02", etc.
      // We want to match dates like "2026-01-15", "2025-01-20", etc.
      // Using contains with "-01-" will match January in any year
      whereClause.date = { contains: `-${month}-` };
    }

    // Fetch transactions with pagination
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

    // Map transactions to frontend format
    const formattedTransactions = (transactions as Transaction[]).map((t) => ({
      id: t.id,
      category: t.category,
      subCategory: t.category, // Using category as subcategory for now
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
    console.error("GetRecentTransactions error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
