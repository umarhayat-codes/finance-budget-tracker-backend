import { Request } from "express";

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: TokenPayload;
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
