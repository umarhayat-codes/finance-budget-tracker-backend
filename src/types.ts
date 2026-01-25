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
