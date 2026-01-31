import { Request } from "express";

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export interface AuthController extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export interface Transaction {
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

export interface Saving {
  id: string;
  userId: string;
  title: string;
  amount: number;
  date: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Budget {
  id: string;
  userId: string;
  category: string;
  amount: number;
  month: string;
  year: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type GoalStatus = "On Track" | "Pending" | "Delayed" | "Completed";

export interface Goal {
  id: string;
  userId: string;
  goalName: string;
  targetAmount: number;
  targetDate: string;
  goalType: string;
  fundingSource: string;
  goalStatus: GoalStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryRequestBody {
  name: string;
  amount: number;
}

export interface CategoryResponse {
  id: string;
  name: string;
  amount: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  totalSaving: number;
  totalBudget: number;
}

export interface CreateBudgetRequest extends Request {
  body: {
    userId: string;
    category: string;
    amount: string | number;
    year: string;
    month: string;
  };
}

// new
export interface CategoryInput {
  name: string;
  amount?: number;
  type?: string;
}

export interface Category {
  id: string;
  name: string;
  amount: number;
  type: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryModel {
  create: (args: {
    data: { name: string; amount: number; type?: string; userId: string };
  }) => Promise<Category>;
  findMany: (args: {
    where: { userId: string };
    orderBy?: { createdAt: "asc" | "desc" };
  }) => Promise<Category[]>;
}

export interface ExtendedPrisma {
  category: CategoryModel;
  saving: SavingModel;
}

// sdfds

export interface ExpenseDistributionItem {
  id: string;
  category: string;
  percentage: number;
  amount: string;
  color: string;
  textColor: string;
}

export interface CreateReminderBody {
  userId: string;
  title: string;
  amount: string;
  dateStr: string;
  type: string;
}

export interface SavingInput {
  title: string;
  amount: number;
  date: string;
}

export interface SavingModel {
  create: (args: {
    data: { title: string; amount: number; date: string; userId: string };
  }) => Promise<Saving>;
  findMany: (args: {
    where: { userId: string };
    orderBy?: { createdAt: "asc" | "desc" };
  }) => Promise<Saving[]>;
}

export interface MonthlyBudgetSpending {
  month: string;
  fullMonth: string;
  year: number;
  spent: number; // percentage
  totalBudget: number;
  totalSpent: number;
}
