import React, { useState, useEffect } from 'react';
import { Transaction } from '../types';
import { Brain, TrendingUp, AlertCircle, Loader, Sparkles, ChevronDown } from 'lucide-react';
import { formatCurrency } from '../utils/calculations';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { EXPENSE_CATEGORIES } from '../data/categories';

interface AIInsightsProps {
  transactions: Transaction[];
}

interface FinancialMetrics {
  netWorth: number;
  totalIncome: number;
  totalExpenses: number;
  incomeSurplus: number;
  savingsRate: number;
  topExpenseCategories: Array<{ category: string; amount: number; percentage: number }>;
  monthlyTrends: Array<{ month: string; income: number; expenses: number; surplus: number }>;
  insights: string[];
}

const AIInsights: React.FC<AIInsightsProps> = ({ transactions }) => {
  const [viewType, setViewType] = useState<'monthly' | 'cumulative'>('cumulative');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return format(now, 'yyyy-MM');
  });
  const [breakdownViewType, setBreakdownViewType] = useState<'monthly' | 'cumulative'>('cumulative');
  const [breakdownSelectedMonth, setBreakdownSelectedMonth] = useState(() => {
    const now = new Date();
    return format(now, 'yyyy-MM');
  });

  // Calculate metrics
  const calculateMetrics = () => {
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const savingsTransactions = transactions.filter(t => {
      if (t.type !== 'expense') return false;
      if (t.category === 'Savings') return true;
      const investmentKeywords = ['sip', 'mutual fund', 'mf', 'stock', 'stocks', 'equity', 'shares', 'fd', 'fixed deposit', 'rd', 'recurring deposit', 'aif', 'alternative investment'];
      const description = (t.description || '').toLowerCase();
      const subcategory = (t.subcategory || '').toLowerCase();
      return investmentKeywords.some(keyword => 
        description.includes(keyword) || subcategory.includes(keyword)
      );
    });

    const totalSavings = savingsTransactions.reduce((sum, t) => sum + t.amount, 0);
    const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

    // Calculate monthly averages
    const monthsWithData = new Set(transactions.map(t => format(t.date, 'yyyy-MM')));
    const monthCount = monthsWithData.size || 1;
    const averageMonthlyExpenses = totalExpenses / monthCount;

    return {
      totalExpenses,
      averageMonthlyExpenses,
      savingsRate
    };
  };

  // Get top expense categories
  const getTopExpenseCategories = () => {
    let filteredTransactions = transactions.filter(t => t.type === 'expense');

    if (viewType === 'monthly') {
      const monthStart = startOfMonth(new Date(selectedMonth + '-01'));
      const monthEnd = endOfMonth(new Date(selectedMonth + '-01'));
      filteredTransactions = filteredTransactions.filter(t => 
        t.date >= monthStart && t.date <= monthEnd
      );
    }

    const categoryTotals = filteredTransactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as { [key: string]: number });

    const totalCategoryExpenses = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);

    return Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalCategoryExpenses > 0 ? (amount / totalCategoryExpenses) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  };

  // Get expense breakdown by subcategory
  const getExpenseBreakdown = () => {
    let filteredTransactions = transactions.filter(t => t.type === 'expense');

    if (breakdownViewType === 'monthly') {
      const monthStart = startOfMonth(new Date(breakdownSelectedMonth + '-01'));
      const monthEnd = endOfMonth(new Date(breakdownSelectedMonth + '-01'));
      filteredTransactions = filteredTransactions.filter(t => 
        t.date >= monthStart && t.date <= monthEnd
      );
    }

    const categoryBreakdown = {} as { [category: string]: { [subcategory: string]: number } };

    filteredTransactions.forEach(t => {
      if (!categoryBreakdown[t.category]) {
        categoryBreakdown[t.category] = {};
      }
      categoryBreakdown[t.category][t.subcategory] = 
        (categoryBreakdown[t.category][t.subcategory] || 0) + t.amount;
    });

    return categoryBreakdown;
  };

  const metrics = calculateMetrics();
  const topExpenseCategories = getTopExpenseCategories();
  const expenseBreakdown = getExpenseBreakdown();

  // Generate available months
  const availableMonths = Array.from(new Set(
    transactions.map(t => format(t.date, 'yyyy-MM'))
  )).sort().reverse();

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-red-500">
          <h3 className="text-sm font-medium text-gray-600">Total Expenses (YTD)</h3>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(metrics.totalExpenses)}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-orange-500">
          <h3 className="text-sm font-medium text-gray-600">Average Monthly Expenses</h3>
          <p className="text-2xl font-bold text-orange-600">
            {formatCurrency(metrics.averageMonthlyExpenses)}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-purple-500">
          <h3 className="text-sm font-medium text-gray-600">Savings Rate</h3>
          <p className="text-2xl font-bold text-purple-600">
            {metrics.savingsRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Top Expense Categories */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Top Expense Categories</h3>
          <div className="flex items-center space-x-4">
            <select
              value={viewType}
              onChange={(e) => setViewType(e.target.value as 'monthly' | 'cumulative')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="cumulative">Cumulative</option>
              <option value="monthly">Monthly</option>
            </select>
            {viewType === 'monthly' && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {availableMonths.map(month => (
                  <option key={month} value={month}>
                    {format(new Date(month + '-01'), 'MMMM yyyy')}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="space-y-3">
          {topExpenseCategories.map((category, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{category.category}</span>
                  <span className="text-sm text-gray-600">{formatCurrency(category.amount)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${category.percentage}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500">{category.percentage.toFixed(1)}% of expenses</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Expense Category Breakdown */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Expense Category Breakdown</h3>
          <div className="flex items-center space-x-4">
            <select
              value={breakdownViewType}
              onChange={(e) => setBreakdownViewType(e.target.value as 'monthly' | 'cumulative')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="cumulative">Cumulative</option>
              <option value="monthly">Monthly</option>
            </select>
            {breakdownViewType === 'monthly' && (
              <select
                value={breakdownSelectedMonth}
                onChange={(e) => setBreakdownSelectedMonth(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {availableMonths.map(month => (
                  <option key={month} value={month}>
                    {format(new Date(month + '-01'), 'MMMM yyyy')}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(expenseBreakdown).map(([category, subcategories]) => {
            const categoryTotal = Object.values(subcategories).reduce((sum, amount) => sum + amount, 0);
            if (categoryTotal === 0) return null;
            
            return (
              <div key={category} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-800">{category}</h4>
                  <span className="text-sm font-bold text-gray-900">
                    {formatCurrency(categoryTotal)}
                  </span>
                </div>
                <div className="space-y-2">
                  {Object.entries(subcategories)
                    .sort(([,a], [,b]) => b - a)
                    .map(([subcategory, amount]) => (
                      <div key={subcategory} className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">{subcategory}</span>
                        <span className="text-xs font-medium text-gray-800">
                          {formatCurrency(amount)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
        {Object.keys(expenseBreakdown).length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No expense data available for the selected period
          </div>
        )}
      </div>

      {transactions.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No Transaction Data</h3>
          <p className="text-gray-500">
            Upload your expense data to see detailed analysis and breakdowns.
          </p>
        </div>
      )}
    </div>
  );
};

export default AIInsights;