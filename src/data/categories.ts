import { CategoryStructure } from '../types';

export const EXPENSE_CATEGORIES: CategoryStructure = {
  'Living Expenses': [
    'Grocery', 'Maids', 'Fruits & Vegetables', 'Food', 'Household Items',
    'Utilities', 'Electricity', 'Gas', 'Water', 'Internet', 'Phone',
    'Personal Care', 'Toiletries', 'Laundry', 'Kitchen Supplies'
  ],
  'Rental': [
    'House Rent', 'Apartment Rent', 'Office Rent', 'Parking Rent',
    'Storage Rent', 'Equipment Rent'
  ],
  'Debt': [
    'Car Loan', 'Home Loan', 'Personal Loan', 'Credit Card Payment',
    'Student Loan', 'Business Loan', 'EMI', 'Interest Payment'
  ],
  'Education': [
    'School Fees', 'Tuition', 'College Fees', 'Training', 'Courses',
    'Books', 'Educational Materials', 'Exam Fees', 'Coaching'
  ],
  'Healthcare': [
    'Medical Bills', 'Doctor Consultation', 'Medicine', 'Hospital',
    'Dental', 'Health Insurance', 'Lab Tests', 'Surgery', 'Therapy'
  ],
  'Transportation': [
    'Fuel', 'Car Maintenance', 'Public Transport', 'Taxi', 'Uber',
    'Bus', 'Train', 'Flight', 'Car Insurance', 'Vehicle Registration'
  ],
  'Entertainment': [
    'Movies', 'Dining Out', 'Vacation', 'Sports', 'Hobbies',
    'Subscriptions', 'Netflix', 'Spotify', 'Gaming', 'Books'
  ],
  'Shopping': [
    'Clothes', 'Electronics', 'Gifts', 'Jewelry', 'Furniture',
    'Home Decor', 'Appliances', 'Personal Items'
  ],
  'Insurance': [
    'Life Insurance', 'Health Insurance', 'Car Insurance', 'Home Insurance',
    'Travel Insurance', 'Professional Insurance'
  ],
  'Taxes': [
    'Income Tax', 'Property Tax', 'GST', 'Professional Tax',
    'Vehicle Tax', 'Other Taxes'
  ],
  'Charity': [
    'Donations', 'Religious Contributions', 'NGO Support', 'Community Support'
  ],
  'Savings': [
    'SIPs', 'Mutual Fund', 'Stocks', 'FD', 'RD', 'AIF', 'Emergency Fund',
    'Investment Savings', 'Retirement Savings'
  ],
  'Other': [
    'Miscellaneous', 'Bank Charges', 'Legal Fees', 'Professional Services',
    'Repairs', 'Maintenance'
  ]
};

export const INCOME_CATEGORIES: CategoryStructure = {
  'Salary': [
    'Salary', 'Wages', 'Bonus', 'Overtime', 'Commission', 'Tips',
    'Freelance Income', 'Consulting Income'
  ],
  'Dividend': [
    'Dividends', 'Interest', 'Capital Gains', 'Mutual Fund Returns',
    'Stock Profits', 'Bond Interest', 'Crypto Gains'
  ],
  'Rental Income': [
    'Property Rent', 'Room Rent', 'Commercial Rent', 'Parking Rent',
    'Equipment Rental', 'Airbnb Income'
  ],
  'Business': [
    'Business Profits', 'Partnership Income', 'Royalties', 'Licensing',
    'Product Sales', 'Service Income'
  ],
  'Other': [
    'Gifts', 'Inheritance', 'Insurance Claims', 'Refunds', 'Cashback',
    'Prize Money', 'Government Benefits', 'Pension'
  ]
};

export const getAllCategories = () => ({
  ...EXPENSE_CATEGORIES,
  ...INCOME_CATEGORIES
});

export const getCategoryColor = (category: string): string => {
  const colors: { [key: string]: string } = {
    'Living Expenses': '#F59E0B',
    'Rental': '#DC2626',
    'Debt': '#EF4444',
    'Education': '#3B82F6',
    'Healthcare': '#EF4444',
    'Transportation': '#8B5CF6',
    'Entertainment': '#EC4899',
    'Shopping': '#3B82F6',
    'Insurance': '#6B7280',
    'Taxes': '#374151',
    'Charity': '#A855F7',
    'Savings': '#059669',
    'Other': '#6B7280',
    'Salary': '#22C55E',
    'Dividend': '#16A34A',
    'Rental Income': '#059669',
    'Business': '#10B981',
    'Other': '#34D399'
  };
  return colors[category] || '#6B7280';
};