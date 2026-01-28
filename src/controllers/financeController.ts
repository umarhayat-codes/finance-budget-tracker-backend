import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import {
  AuthRequest,
  ExpenseDistributionItem,
  Saving,
  Transaction,
} from "../types";

const prisma = new PrismaClient();

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

    const transactions: ParsedTransaction[] = (
      transactionsRaw as unknown as Transaction[]
    )
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
          totalIncome -= t.amount;
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
    res.status(500).json({ message: "Internal server error" });
  }
};

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

    const savings = await prisma.saving.findMany({
      where: { userId: userId },
    });
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
        const catName =
          expense.category.charAt(0).toUpperCase() +
          expense.category.slice(1).toLowerCase();
        otherCategoriesMap[catName] =
          (otherCategoriesMap[catName] || 0) + amount;
      }
    });

    const formatAmount = (amount: number): string => {
      return "IDR " + amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    const calculatePercentage = (part: number, total: number): number => {
      if (total === 0) return 0;
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
        color: "#99FF33",
        textColor: "#000000",
      },
    ];

    const otherCategoriesList: ExpenseDistributionItem[] = Object.keys(
      otherCategoriesMap,
    ).map((cat, index) => ({
      id: `other-${index}`,
      category: cat,
      percentage: calculatePercentage(otherCategoriesMap[cat], grandTotal),
      amount: formatAmount(otherCategoriesMap[cat]),
      color: "#F0F0F0",
      textColor: "#000000",
    }));

    otherCategoriesList.sort((a, b) => b.percentage - a.percentage);

    res.status(200).json({
      mainCategories,
      otherCategories: otherCategoriesList,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
