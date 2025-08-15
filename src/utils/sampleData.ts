import { Transaction } from '../types';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../data/categories';
import { generateId } from './calculations';

// Sample descriptions for different expense categories
const SAMPLE_DESCRIPTIONS = {
  'Living Expenses': {
    'Grocery': ['Weekly groceries', 'Supermarket shopping', 'Fresh produce', 'Organic food shopping'],
    'Maids': ['House cleaning service', 'Maid salary', 'Domestic help payment'],
    'Fruits & Vegetables': ['Fresh fruits', 'Vegetable market', 'Organic vegetables', 'Fruit vendor'],
    'Utilities': ['Electricity bill', 'Water bill', 'Gas bill', 'Internet bill'],
    'Personal Care': ['Shampoo and soap', 'Toothpaste', 'Skincare products', 'Haircut']
  },
  'Rental': {
    'House Rent': ['Monthly house rent', 'Apartment rent', 'Home rental payment'],
    'Office Rent': ['Office space rent', 'Co-working space', 'Business premises rent']
  },
  'Debt': {
    'Car Loan': ['Car loan EMI', 'Vehicle financing payment'],
    'Home Loan': ['Home loan EMI', 'Mortgage payment', 'Housing loan installment'],
    'Personal Loan': ['Personal loan EMI', 'Credit card payment']
  },
  'Education': {
    'School Fees': ['School tuition fees', 'Admission fees', 'School supplies'],
    'Tuition': ['Private tuition', 'Coaching classes', 'Online courses'],
    'Books': ['Educational books', 'Study materials', 'Reference books']
  },
  'Healthcare': {
    'Medical Bills': ['Doctor consultation', 'Hospital bills', 'Medical tests'],
    'Medicine': ['Prescription medicines', 'Health supplements', 'First aid supplies']
  },
  'Transportation': {
    'Fuel': ['Petrol', 'Diesel', 'Gas station'],
    'Taxi': ['Uber to airport', 'Late night taxi', 'Taxi to meeting', 'Weekend taxi ride'],
    'Public Transport': ['Bus ticket', 'Metro card', 'Train ticket']
  },
  'Entertainment': {
    'Movies': ['Movie tickets', 'Cinema hall', 'Netflix subscription'],
    'Dining Out': ['Restaurant dinner', 'Lunch with friends', 'Coffee shop'],
    'Vacation': ['Holiday trip', 'Weekend getaway', 'Travel expenses']
  },
  'Shopping': {
    'Clothes': ['New shirt', 'Winter jacket', 'Running shoes', 'Jeans'],
    'Electronics': ['Mobile phone', 'Laptop', 'Headphones', 'Charger']
  },
  'Charity': {
    'Donations': ['Charity donation', 'Religious contribution', 'NGO support']
  },
  'Savings': {
    'SIPs': ['Mutual fund SIP', 'Systematic investment plan', 'Monthly SIP'],
    'Fixed Deposits': ['Bank FD', 'Term deposit', 'Savings deposit']
  },
  'Insurance': {
    'Life Insurance': ['Life insurance premium', 'Term insurance'],
    'Health Insurance': ['Medical insurance premium', 'Family health cover']
  },
  'Taxes': {
    'Income Tax': ['Annual income tax', 'Tax payment', 'TDS'],
    'Property Tax': ['House tax', 'Municipal tax']
  },
  'Other': {
    'Miscellaneous': ['Bank charges', 'ATM fees', 'Service charges'],
    'Professional Services': ['Legal fees', 'Consultant fees', 'Professional advice']
  }
};

const INCOME_DESCRIPTIONS = {
  'Employment Income': {
    'Salary': ['Monthly salary', 'Bi-weekly paycheck', 'Bonus payment', 'Overtime pay']
  },
  'Investment Income': {
    'Dividends': ['Stock dividends', 'Mutual fund dividends', 'Investment returns'],
    'Interest': ['Bank interest', 'FD interest', 'Savings interest']
  },
  'Rental Income': {
    'Property Rent': ['House rent received', 'Commercial rent', 'Property rental income']
  },
  'Business Income': {
    'Business Profits': ['Business income', 'Freelance payment', 'Consulting income']
  },
  'Other Income': {
    'Gifts': ['Birthday gift', 'Festival gift', 'Wedding gift received'],
    'Refunds': ['Tax refund', 'Purchase refund', 'Insurance claim']
  }
};

// Generate random amount within a range
const getRandomAmount = (min: number, max: number): number => {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
};

// Get random item from array
const getRandomItem = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

// Generate random date within the last 6 months
const getRandomDate = (): Date => {
  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 6);
  
  const randomTime = sixMonthsAgo.getTime() + Math.random() * (now.getTime() - sixMonthsAgo.getTime());
  return new Date(randomTime);
};

// Generate random date for a specific month
const getRandomDateInMonth = (monthOffset: number): Date => {
  const now = new Date();
  const targetMonth = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() - monthOffset + 1, 0);
  
  const randomTime = targetMonth.getTime() + Math.random() * (nextMonth.getTime() - targetMonth.getTime());
  return new Date(randomTime);
};

// Get weighted random category (some categories should appear more frequently)
const getWeightedRandomCategory = (categories: string[]): string => {
  const weights: { [key: string]: number } = {
    'Living Expenses': 3, // Most frequent
    'Rental': 2.5,
    'Transportation': 2,
    'Entertainment': 2,
    'Healthcare': 1.5,
    'Education': 1,
    'Debt': 1.2,
    'Charity': 0.5,
    'Savings': 1.5,
    'Shopping': 1.8,
    'Insurance': 0.8,
    'Taxes': 0.6
  };
  
  const weightedCategories: string[] = [];
  categories.forEach(category => {
    const weight = weights[category] || 1;
    for (let i = 0; i < weight * 10; i++) {
      weightedCategories.push(category);
    }
  });
  
  return getRandomItem(weightedCategories);
};

// Generate sample expense transactions
const generateExpenseTransactions = (count: number, distributeAcrossMonths: boolean = true): Transaction[] => {
  const transactions: Transaction[] = [];
  const monthsToGenerate = distributeAcrossMonths ? 6 : 1;
  const transactionsPerMonth = Math.floor(count / monthsToGenerate);
  const remainder = count % monthsToGenerate;
  
  for (let month = 0; month < monthsToGenerate; month++) {
    const monthTransactionCount = transactionsPerMonth + (month < remainder ? 1 : 0);
    
    for (let i = 0; i < monthTransactionCount; i++) {
      const category = distributeAcrossMonths ? 
        getWeightedRandomCategory(Object.keys(EXPENSE_CATEGORIES)) : 
        getRandomItem(Object.keys(EXPENSE_CATEGORIES));
      
      const subcategory = getRandomItem(EXPENSE_CATEGORIES[category]);
      const descriptions = SAMPLE_DESCRIPTIONS[category as keyof typeof SAMPLE_DESCRIPTIONS]?.[subcategory] || ['Sample expense'];
      const description = getRandomItem(descriptions);
      
      // Set realistic amount ranges based on category and add some monthly variation
      let minAmount = 10;
      let maxAmount = 100;
      const monthlyVariation = 0.8 + (Math.random() * 0.4); // 80% to 120% variation
      
      switch (category) {
        case 'Living Expenses':
          if (subcategory === 'Grocery') {
            minAmount = 50;
            maxAmount = 200;
          } else if (subcategory === 'Maids') {
            minAmount = 100;
            maxAmount = 300;
          } else {
            minAmount = 20;
            maxAmount = 100;
          }
          break;
        case 'Rental':
          minAmount = 5000;
          maxAmount = 25000;
          break;
        case 'Debt':
          if (subcategory === 'Home Loan') {
            minAmount = 15000;
            maxAmount = 50000;
          } else if (subcategory === 'Car Loan') {
            minAmount = 8000;
            maxAmount = 25000;
          } else {
            minAmount = 2000;
            maxAmount = 10000;
          }
          break;
        case 'Education':
          if (subcategory === 'School Fees') {
            minAmount = 2000;
            maxAmount = 15000;
          } else {
            minAmount = 500;
            maxAmount = 5000;
          }
          break;
        case 'Entertainment':
          if (subcategory === 'Vacation') {
            minAmount = 200;
            maxAmount = 2000;
          } else {
            minAmount = 10;
            maxAmount = 150;
          }
          break;
        case 'Healthcare':
          if (subcategory === 'Medical Bills') {
            minAmount = 200;
            maxAmount = 500;
          } else {
            minAmount = 30;
            maxAmount = 300;
          }
          break;
        case 'Transportation':
          if (subcategory === 'Fuel') {
            minAmount = 100;
            maxAmount = 500;
          } else {
            minAmount = 20;
            maxAmount = 200;
          }
          break;
        case 'Savings':
          if (subcategory === 'SIPs') {
            minAmount = 1000;
            maxAmount = 10000;
          } else if (subcategory === 'Mutual Fund') {
            minAmount = 5000;
            maxAmount = 50000;
          } else if (subcategory === 'Stocks') {
            minAmount = 2000;
            maxAmount = 25000;
          } else if (subcategory === 'FD') {
            minAmount = 10000;
            maxAmount = 100000;
          } else if (subcategory === 'RD') {
            minAmount = 1000;
            maxAmount = 5000;
          } else if (subcategory === 'AIF') {
            minAmount = 25000;
            maxAmount = 200000;
          } else {
            minAmount = 500;
            maxAmount = 5000;
          }
          break;
        case 'Shopping':
          if (subcategory === 'Electronics') {
            minAmount = 500;
            maxAmount = 5000;
          } else {
            minAmount = 200;
            maxAmount = 2000;
          }
          break;
        case 'Insurance':
          minAmount = 500;
          maxAmount = 3000;
          break;
        case 'Taxes':
          minAmount = 1000;
          maxAmount = 20000;
          break;
        default:
          minAmount = 20;
          maxAmount = 150;
      }
      
      // Apply monthly variation
      minAmount *= monthlyVariation;
      maxAmount *= monthlyVariation;
      
      transactions.push({
        id: generateId(),
        date: distributeAcrossMonths ? getRandomDateInMonth(month) : getRandomDate(),
        category,
        subcategory,
        amount: getRandomAmount(minAmount, maxAmount),
        description,
        type: 'expense'
      });
    }
  }
  
  return transactions;
};

// Generate sample income transactions
const generateIncomeTransactions = (count: number, distributeAcrossMonths: boolean = true): Transaction[] => {
  const transactions: Transaction[] = [];
  const monthsToGenerate = distributeAcrossMonths ? 6 : 1;
  const transactionsPerMonth = Math.floor(count / monthsToGenerate);
  const remainder = count % monthsToGenerate;
  
  for (let month = 0; month < monthsToGenerate; month++) {
    const monthTransactionCount = transactionsPerMonth + (month < remainder ? 1 : 0);
    
    for (let i = 0; i < monthTransactionCount; i++) {
      const category = getRandomItem(Object.keys(INCOME_CATEGORIES));
      const subcategory = getRandomItem(INCOME_CATEGORIES[category]);
      const descriptions = INCOME_DESCRIPTIONS[category as keyof typeof INCOME_DESCRIPTIONS]?.[subcategory] || ['Sample income'];
      const description = getRandomItem(descriptions);
      
      // Set realistic amount ranges based on subcategory with monthly variation
      let minAmount = 100;
      let maxAmount = 1000;
      const monthlyVariation = 0.9 + (Math.random() * 0.2); // 90% to 110% variation for income
      
      switch (subcategory) {
        case 'Salary':
          minAmount = 3000;
          maxAmount = 8000;
          break;
        case 'Dividends':
          minAmount = 50;
          maxAmount = 500;
          break;
        case 'Property Rent':
          minAmount = 2000;
          maxAmount = 8000;
          break;
        case 'Business Profits':
          minAmount = 1000;
          maxAmount = 5000;
          break;
        default:
          minAmount = 100;
          maxAmount = 1000;
      }
      
      // Apply monthly variation
      minAmount *= monthlyVariation;
      maxAmount *= monthlyVariation;
      
      transactions.push({
        id: generateId(),
        date: distributeAcrossMonths ? getRandomDateInMonth(month) : getRandomDate(),
        category,
        subcategory,
        amount: getRandomAmount(minAmount, maxAmount),
        description,
        type: 'income'
      });
    }
  }
  
  return transactions;
};

// Generate complete sample dataset
export const generateSampleData = (expenseCount: number = 100, incomeCount: number = 50): Transaction[] => {
  const expenses = generateExpenseTransactions(expenseCount, true);
  const income = generateIncomeTransactions(incomeCount, true);
  
  // Combine and sort by date (newest first)
  return [...expenses, ...income].sort((a, b) => b.date.getTime() - a.date.getTime());
};

// Generate sample budgets for the current and previous months
export const generateSampleBudgets = () => {
  const budgets = [];
  const currentDate = new Date();
  
  // Generate budgets for current month and previous 5 months
  for (let monthOffset = 0; monthOffset <= 5; monthOffset++) {
    const budgetDate = new Date(currentDate);
    budgetDate.setMonth(budgetDate.getMonth() - monthOffset);
    const monthStr = budgetDate.toISOString().slice(0, 7); // YYYY-MM format
    
    // Add some variation to budgets across months
    const budgetVariation = 0.85 + (Math.random() * 0.3); // 85% to 115% variation
    
    // Income budgets
    budgets.push(
      { category: 'Salary', amount: Math.round(50000 * budgetVariation), month: monthStr },
      { category: 'Dividend', amount: Math.round(3000 * budgetVariation), month: monthStr },
      { category: 'Rental Income', amount: Math.round(8000 * budgetVariation), month: monthStr }
    );
    
    // Expense budgets
    budgets.push(
      { category: 'Living Expenses', amount: Math.round(8000 * budgetVariation), month: monthStr },
      { category: 'Rental', amount: Math.round(15000 * budgetVariation), month: monthStr },
      { category: 'Debt', amount: Math.round(12000 * budgetVariation), month: monthStr },
      { category: 'Education', amount: Math.round(5000 * budgetVariation), month: monthStr },
      { category: 'Healthcare', amount: Math.round(2000 * budgetVariation), month: monthStr },
      { category: 'Transportation', amount: Math.round(3000 * budgetVariation), month: monthStr },
      { category: 'Entertainment', amount: Math.round(2000 * budgetVariation), month: monthStr },
      { category: 'Shopping', amount: Math.round(3000 * budgetVariation), month: monthStr },
      { category: 'Insurance', amount: Math.round(2000 * budgetVariation), month: monthStr },
      { category: 'Taxes', amount: Math.round(5000 * budgetVariation), month: monthStr },
      { category: 'Charity', amount: Math.round(100 * budgetVariation), month: monthStr },
      { category: 'Savings', amount: Math.round(8000 * budgetVariation), month: monthStr }
    );
  }
  
  return budgets;
};