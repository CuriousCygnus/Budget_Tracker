import { supabase } from '../lib/supabase';
import { Transaction, Budget } from '../types';

// Utility functions for date handling in Asia/Kolkata timezone
const formatDateForDB = (date: Date): string => {
  // Create a new date in Asia/Kolkata timezone
  const istDate = new Date(date.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
  const year = istDate.getFullYear();
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const day = String(istDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateFromDB = (dateString: string): Date => {
  // Parse the date string and create a date object in Asia/Kolkata timezone
  const [year, month, day] = dateString.split('-').map(Number);
  // Create date at midnight in Asia/Kolkata timezone
  const date = new Date();
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getCurrentDateIST = (): string => {
  const now = new Date();
  return formatDateForDB(now);
};

// Transaction operations
export const saveTransaction = async (transaction: Transaction): Promise<{ data: any; error: any }> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { data: null, error: { message: 'User not authenticated' } };
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      date: formatDateForDB(transaction.date),
      category: transaction.category,
      subcategory: transaction.subcategory,
      amount: transaction.amount,
      description: transaction.description || '',
      type: transaction.type,
    })
    .select()
    .single();

  return { data, error };
};

export const loadTransactions = async (): Promise<Transaction[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error loading transactions:', error);
    return [];
  }

  return data.map(t => ({
    id: t.id,
    date: parseDateFromDB(t.date),
    category: t.category,
    subcategory: t.subcategory,
    amount: t.amount,
    description: t.description || '',
    type: t.type as 'income' | 'expense',
  }));
};

export const updateTransaction = async (transaction: Transaction): Promise<{ data: any; error: any }> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { data: null, error: { message: 'User not authenticated' } };
  }

  const { data, error } = await supabase
    .from('transactions')
    .update({
      date: formatDateForDB(transaction.date),
      category: transaction.category,
      subcategory: transaction.subcategory,
      amount: transaction.amount,
      description: transaction.description || '',
      type: transaction.type,
    })
    .eq('id', transaction.id)
    .eq('user_id', user.id)
    .select()
    .single();

  return { data, error };
};

export const deleteTransaction = async (id: string): Promise<{ error: any }> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: { message: 'User not authenticated' } };
  }

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  return { error };
};

export const bulkInsertTransactions = async (transactions: Transaction[]): Promise<{ data: any; error: any }> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { data: null, error: { message: 'User not authenticated' } };
  }

  const transactionsToInsert = transactions.map(t => ({
    user_id: user.id,
    date: formatDateForDB(t.date),
    category: t.category,
    subcategory: t.subcategory,
    amount: t.amount,
    description: t.description || '',
    type: t.type,
  }));

  const { data, error } = await supabase
    .from('transactions')
    .insert(transactionsToInsert)
    .select();

  return { data, error };
};

export const deleteTransactionsByMonth = async (month: string): Promise<{ error: any }> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: { message: 'User not authenticated' } };
  }

  // Delete transactions for the specific month (YYYY-MM format)
  const startDate = `${month}-01`;
  const endDate = `${month}-31`; // This will work for all months

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate);

  return { error };
};

export const deleteAllTransactions = async (): Promise<{ error: any }> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: { message: 'User not authenticated' } };
  }

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('user_id', user.id);

  return { error };
};

// Budget operations
export const saveBudgets = async (budgets: Budget[]): Promise<{ data: any; error: any }> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { data: null, error: { message: 'User not authenticated' } };
  }

  // First, delete existing budgets for the months we're updating
  const months = [...new Set(budgets.map(b => b.month))];
  
  for (const month of months) {
    await supabase
      .from('budgets')
      .delete()
      .eq('user_id', user.id)
      .eq('month', month);
  }

  // Then insert the new budgets
  const budgetsToInsert = budgets.map(b => ({
    user_id: user.id,
    category: b.category,
    amount: b.amount,
    month: b.month,
  }));

  const { data, error } = await supabase
    .from('budgets')
    .insert(budgetsToInsert)
    .select();

  return { data, error };
};

export const loadBudgets = async (): Promise<Budget[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', user.id)
    .order('month', { ascending: false });

  if (error) {
    console.error('Error loading budgets:', error);
    return [];
  }

  return data.map(b => ({
    category: b.category,
    amount: b.amount,
    month: b.month,
  }));
};

export const updateBudget = async (budget: Budget): Promise<{ data: any; error: any }> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { data: null, error: { message: 'User not authenticated' } };
  }

  const { data, error } = await supabase
    .from('budgets')
    .upsert({
      user_id: user.id,
      category: budget.category,
      amount: budget.amount,
      month: budget.month,
    })
    .select()
    .single();

  return { data, error };
};