import { Transaction, Budget } from '../types';


const TRANSACTIONS_KEY = 'spendly_transactions';
const BUDGETS_KEY = 'spendly_budgets';


export const saveTransactions = (transactions: Transaction[]): void => {
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
};

export const loadTransactions = (): Transaction[] => {
  const stored = localStorage.getItem(TRANSACTIONS_KEY);
  if (!stored) return [];
  
  try {
    const parsed = JSON.parse(stored);
    return parsed.map((t: any) => ({
      ...t,
      date: new Date(t.date)
    }));
  } catch {
    return [];
  }
};

export const saveBudgets = (budgets: Budget[]): void => {
  localStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
};

export const loadBudgets = (): Budget[] => {
  const stored = localStorage.getItem(BUDGETS_KEY);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

export const exportToCsv = (transactions: Transaction[]): string => {
  const headers = ['Date', 'Type', 'Category', 'Subcategory', 'Amount', 'Description'];
  const rows = transactions.map(t => [
    t.date.toISOString().split('T')[0],
    t.type,
    t.category,
    t.subcategory,
    t.amount.toString(),
    t.description || ''
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
};

export const downloadCsv = (csvContent: string, filename: string = 'transactions.csv'): void => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};