import { Transaction, Budget, MonthlyData } from '../types';
import { format, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';

export const calculateMonthlyTotals = (
  transactions: Transaction[],
  budgets: Budget[],
  month: Date
): MonthlyData => {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const monthStr = format(month, 'yyyy-MM');

  const monthlyTransactions = transactions.filter(t => 
    t.date >= monthStart && t.date <= monthEnd
  );

  const income = monthlyTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = monthlyTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyBudgets = budgets.filter(b => b.month === monthStr);
  
  const budgetedIncome = monthlyBudgets
    .filter(b => ['Salary', 'Dividend', 'Rental Income', 'Business', 'Other'].includes(b.category))
    .reduce((sum, b) => sum + b.amount, 0);

  const budgetedExpenses = monthlyBudgets
    .filter(b => !['Salary', 'Dividend', 'Rental Income', 'Business', 'Other'].includes(b.category))
    .reduce((sum, b) => sum + b.amount, 0);

  return {
    month: monthStr,
    income,
    expenses,
    budgetedIncome,
    budgetedExpenses
  };
};

export const calculateCategoryTotals = (
  transactions: Transaction[],
  month: Date
): { [category: string]: number } => {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);

  return transactions
    .filter(t => t.date >= monthStart && t.date <= monthEnd)
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as { [category: string]: number });
};

export const calculateSavingsProgress = (transactions: Transaction[]): number => {
  const savingsTransactions = transactions.filter(t => {
    if (t.type !== 'expense') return false;
    
    // Check if it's in the Savings category
    if (t.category === 'Savings') return true;
    
    // Check if it's an investment-related transaction
    const investmentKeywords = ['sip', 'mutual fund', 'mf', 'stock', 'stocks', 'equity', 'shares', 'fd', 'fixed deposit', 'rd', 'recurring deposit', 'aif', 'alternative investment'];
    const description = (t.description || '').toLowerCase();
    const subcategory = (t.subcategory || '').toLowerCase();
    
    return investmentKeywords.some(keyword => 
      description.includes(keyword) || subcategory.includes(keyword)
    );
  });
  
  return savingsTransactions
    .reduce((sum, t) => sum + t.amount, 0);
};

export const calculateSavingsRate = (
  income: number,
  expenses: number,
  savings: number
): number => {
  if (income === 0) return 0;
  return (savings / income) * 100;
};

export const getBudgetVariance = (actual: number, budget: number): {
  amount: number;
  percentage: number;
  isOver: boolean;
} => {
  const amount = actual - budget;
  const percentage = budget > 0 ? (amount / budget) * 100 : 0;
  const isOver = amount > 0;

  return { amount, percentage, isOver };
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};