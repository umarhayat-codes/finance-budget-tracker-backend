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

    // Define interfaces locally to avoid import issues
    interface Saving {
      id: string;
      title: string;
      amount: string;
      date: string;
      userId: string;
      createdAt: Date;
      updatedAt: Date;
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

    interface ParsedTransaction extends Transaction {
      parsedDate: Date;
    }

    interface ParsedSaving extends Saving {
      parsedDate: Date;
    }

    const [transactionsRaw, savingsRaw] = await Promise.all([
      (prisma as any).transaction.findMany({
        where: { userId },
      }),
      (prisma as any).saving.findMany({
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
