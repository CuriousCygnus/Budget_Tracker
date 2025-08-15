import * as XLSX from 'xlsx';
import { Transaction, Budget } from '../types';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { calculateMonthlyTotals, calculateCategoryTotals, getBudgetVariance, formatCurrency } from './calculations';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../data/categories';

export const exportMonthlyReportToExcel = (
  transactions: Transaction[],
  budgets: Budget[],
  selectedMonth: Date
): void => {
  const monthStr = format(selectedMonth, 'yyyy-MM');
  const monthName = format(selectedMonth, 'MMMM yyyy');
  
  // Calculate monthly data
  const monthlyData = calculateMonthlyTotals(transactions, budgets, selectedMonth);
  const categoryTotals = calculateCategoryTotals(transactions, selectedMonth);
  const monthlyBudgets = budgets.filter(b => b.month === monthStr);
  
  // Filter transactions for the month
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const monthlyTransactions = transactions.filter(t => 
    t.date >= monthStart && t.date <= monthEnd
  );

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // 1. Summary Sheet
  const summaryData = [
    ['Monthly Financial Report', '', '', ''],
    ['Month:', monthName, '', ''],
    ['Generated:', format(new Date(), 'MMM dd, yyyy HH:mm'), '', ''],
    ['', '', '', ''],
    ['SUMMARY', '', '', ''],
    ['Total Income', formatCurrency(monthlyData.income), 'Budgeted Income', formatCurrency(monthlyData.budgetedIncome)],
    ['Total Expenses', formatCurrency(monthlyData.expenses), 'Budgeted Expenses', formatCurrency(monthlyData.budgetedExpenses)],
    ['Net Surplus/Deficit', formatCurrency(monthlyData.income - monthlyData.expenses), 'Budget Variance', formatCurrency(monthlyData.budgetedExpenses - monthlyData.expenses)],
    ['', '', '', ''],
    ['INCOME BREAKDOWN', '', '', ''],
    ['Category', 'Actual', 'Budget', 'Variance'],
  ];

  // Add income categories
  Object.keys(INCOME_CATEGORIES).forEach(category => {
    const actual = categoryTotals[category] || 0;
    const budget = monthlyBudgets.find(b => b.category === category)?.amount || 0;
    const variance = getBudgetVariance(actual, budget);
    
    summaryData.push([
      category,
      formatCurrency(actual),
      formatCurrency(budget),
      formatCurrency(variance.amount)
    ]);
  });

  summaryData.push(['', '', '', '']);
  summaryData.push(['EXPENSE BREAKDOWN', '', '', '']);
  summaryData.push(['Category', 'Actual', 'Budget', 'Variance']);

  // Add expense categories
  Object.keys(EXPENSE_CATEGORIES).forEach(category => {
    const actual = categoryTotals[category] || 0;
    const budget = monthlyBudgets.find(b => b.category === category)?.amount || 0;
    const variance = getBudgetVariance(actual, budget);
    
    summaryData.push([
      category,
      formatCurrency(actual),
      formatCurrency(budget),
      formatCurrency(variance.amount)
    ]);
  });

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  
  // Set column widths
  summarySheet['!cols'] = [
    { width: 25 },
    { width: 15 },
    { width: 18 },
    { width: 15 }
  ];

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // 2. Transactions Sheet
  const transactionHeaders = ['Date', 'Type', 'Category', 'Subcategory', 'Amount', 'Description'];
  const transactionData = [transactionHeaders];
  
  monthlyTransactions
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .forEach(transaction => {
      transactionData.push([
        format(transaction.date, 'MMM dd, yyyy'),
        transaction.type,
        transaction.category,
        transaction.subcategory,
        transaction.amount,
        transaction.description || ''
      ]);
    });

  const transactionSheet = XLSX.utils.aoa_to_sheet(transactionData);
  
  // Set column widths for transactions
  transactionSheet['!cols'] = [
    { width: 12 },
    { width: 10 },
    { width: 20 },
    { width: 20 },
    { width: 12 },
    { width: 30 }
  ];

  XLSX.utils.book_append_sheet(workbook, transactionSheet, 'Transactions');

  // 3. Income Details Sheet
  const incomeTransactions = monthlyTransactions.filter(t => t.type === 'income');
  const incomeHeaders = ['Date', 'Category', 'Subcategory', 'Amount', 'Description'];
  const incomeData = [incomeHeaders];
  
  incomeTransactions
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .forEach(transaction => {
      incomeData.push([
        format(transaction.date, 'MMM dd, yyyy'),
        transaction.category,
        transaction.subcategory,
        transaction.amount,
        transaction.description || ''
      ]);
    });

  // Add income totals by subcategory
  incomeData.push(['', '', '', '', '']);
  incomeData.push(['INCOME TOTALS BY SOURCE', '', '', '', '']);
  incomeData.push(['Source', '', '', 'Total', '']);
  
  const incomeBySubcategory = incomeTransactions.reduce((acc, t) => {
    acc[t.subcategory] = (acc[t.subcategory] || 0) + t.amount;
    return acc;
  }, {} as { [key: string]: number });

  Object.entries(incomeBySubcategory).forEach(([subcategory, total]) => {
    incomeData.push([subcategory, '', '', total, '']);
  });

  const incomeSheet = XLSX.utils.aoa_to_sheet(incomeData);
  incomeSheet['!cols'] = [
    { width: 12 },
    { width: 20 },
    { width: 20 },
    { width: 12 },
    { width: 30 }
  ];

  XLSX.utils.book_append_sheet(workbook, incomeSheet, 'Income Details');

  // 4. Expense Details Sheet
  const expenseTransactions = monthlyTransactions.filter(t => t.type === 'expense');
  const expenseHeaders = ['Date', 'Category', 'Subcategory', 'Amount', 'Description'];
  const expenseData = [expenseHeaders];
  
  expenseTransactions
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .forEach(transaction => {
      expenseData.push([
        format(transaction.date, 'MMM dd, yyyy'),
        transaction.category,
        transaction.subcategory,
        transaction.amount,
        transaction.description || ''
      ]);
    });

  // Add expense totals by category
  expenseData.push(['', '', '', '', '']);
  expenseData.push(['EXPENSE TOTALS BY CATEGORY', '', '', '', '']);
  expenseData.push(['Category', '', '', 'Total', '']);
  
  const expenseByCategory = expenseTransactions.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {} as { [key: string]: number });

  Object.entries(expenseByCategory)
    .sort(([,a], [,b]) => b - a)
    .forEach(([category, total]) => {
      expenseData.push([category, '', '', total, '']);
    });

  const expenseSheet = XLSX.utils.aoa_to_sheet(expenseData);
  expenseSheet['!cols'] = [
    { width: 12 },
    { width: 20 },
    { width: 20 },
    { width: 12 },
    { width: 30 }
  ];

  XLSX.utils.book_append_sheet(workbook, expenseSheet, 'Expense Details');

  // 5. Budget Analysis Sheet
  const budgetAnalysisData = [
    ['Budget vs Actual Analysis', '', '', '', ''],
    ['Month:', monthName, '', '', ''],
    ['', '', '', '', ''],
    ['Category', 'Budget', 'Actual', 'Variance', 'Variance %'],
  ];

  // Add all categories with budgets
  const allCategories = [...Object.keys(INCOME_CATEGORIES), ...Object.keys(EXPENSE_CATEGORIES)];
  
  allCategories.forEach(category => {
    const actual = categoryTotals[category] || 0;
    const budget = monthlyBudgets.find(b => b.category === category)?.amount || 0;
    const variance = getBudgetVariance(actual, budget);
    
    if (budget > 0 || actual > 0) {
      budgetAnalysisData.push([
        category,
        budget,
        actual,
        variance.amount,
        budget > 0 ? `${variance.percentage.toFixed(1)}%` : 'N/A'
      ]);
    }
  });

  const budgetSheet = XLSX.utils.aoa_to_sheet(budgetAnalysisData);
  budgetSheet['!cols'] = [
    { width: 25 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 }
  ];

  XLSX.utils.book_append_sheet(workbook, budgetSheet, 'Budget Analysis');

  // Generate filename and download
  const filename = `Spendly_Report_${format(selectedMonth, 'yyyy_MM')}.xlsx`;
  XLSX.writeFile(workbook, filename);
};