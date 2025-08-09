import React, { useState, useEffect } from 'react';
import { Transaction, Budget } from '../types';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { 
  calculateMonthlyTotals, 
  calculateCategoryTotals, 
  getBudgetVariance, 
  formatCurrency 
} from '../utils/calculations';
import { getCategoryColor, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../data/categories';
import { TrendingUp, TrendingDown, AlertCircle, Download, ChevronLeft, ChevronRight, Wallet, Brain, Loader } from 'lucide-react';
import { exportMonthlyReportToExcel } from '../utils/excelExport';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface DashboardProps {
  transactions: Transaction[];
  budgets: Budget[];
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, budgets }) => {
  // Set default to most recent month with data, or current month if no data
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (transactions.length === 0) return new Date();
    
    const monthsWithData = Array.from(new Set(
      transactions.map(t => format(t.date, 'yyyy-MM'))
    )).sort().reverse();
    
    return monthsWithData.length > 0 ? new Date(monthsWithData[0] + '-01') : new Date();
  });
  const [viewMode, setViewMode] = useState<'monthly' | 'cumulative'>('monthly');
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insights, setInsights] = useState<string[]>([]);
  
  // Generate array of months that have transaction data
  const generateMonthOptions = () => {
    const monthsWithData = Array.from(new Set(
      transactions.map(t => format(t.date, 'yyyy-MM'))
    )).sort().map(monthStr => new Date(monthStr + '-01'));
    
    return monthsWithData.length > 0 ? monthsWithData : [new Date()];
  };

  const monthOptions = generateMonthOptions();
  const selectedMonthIndex = monthOptions.findIndex(month => 
    month.getMonth() === selectedMonth.getMonth() && 
    month.getFullYear() === selectedMonth.getFullYear()
  );

  // Filter transactions based on view mode
  const getFilteredTransactions = () => {
    if (viewMode === 'cumulative') {
      return transactions;
    } else {
      const monthStart = startOfMonth(selectedMonth);
      const monthEnd = endOfMonth(selectedMonth);
      return transactions.filter(t => t.date >= monthStart && t.date <= monthEnd);
    }
  };

  const filteredTransactions = getFilteredTransactions();

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(event.target.value);
    setSelectedMonth(monthOptions[index]);
  };

  const currentMonth = selectedMonth;
  const monthlyData = calculateMonthlyTotals(filteredTransactions, budgets, currentMonth);
  const categoryTotals = calculateCategoryTotals(filteredTransactions, currentMonth);

  const handleExportExcel = () => {
    exportMonthlyReportToExcel(transactions, budgets, selectedMonth);
  };

  const handlePreviousMonth = () => {
    setSelectedMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => addMonths(prev, 1));
  };

  const handleCurrentMonth = () => {
    setSelectedMonth(new Date());
  };

  // Get months with actual transaction data for charts
  const getMonthsWithData = (monthCount: number = 6) => {
    const monthsWithData = Array.from(new Set(
      transactions.map(t => format(t.date, 'yyyy-MM'))
    )).sort().slice(-monthCount);
    
    return monthsWithData.map(month => {
      const monthDate = new Date(month + '-01');
      const monthlyData = calculateMonthlyTotals(transactions, budgets, monthDate);
      
      // Calculate expenses excluding savings
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthTransactions = transactions.filter(t => 
        t.date >= monthStart && t.date <= monthEnd && t.type === 'expense'
      );
      
      const expensesExcludingSavings = monthTransactions.filter(t => {
        if (t.category === 'Savings') return false;
        
        const investmentKeywords = ['sip', 'mutual fund', 'mf', 'stock', 'stocks', 'equity', 'shares', 'fd', 'fixed deposit', 'rd', 'recurring deposit', 'aif', 'alternative investment'];
        const description = (t.description || '').toLowerCase();
        const subcategory = (t.subcategory || '').toLowerCase();
        
        return !investmentKeywords.some(keyword => 
          description.includes(keyword) || subcategory.includes(keyword)
        );
      }).reduce((sum, t) => sum + t.amount, 0);
      
      return {
        month: format(monthDate, 'MMM yyyy'),
        shortMonth: format(monthDate, 'MMM'),
        ...monthlyData,
        expensesExcludingSavings
      };
    });
  };

  // Calculate KPIs
  const calculateKPIs = (transactionsToUse: Transaction[]) => {
    // Net worth (total savings accumulated over time)
    const allSavingsTransactions = transactionsToUse.filter(t => {
      if (t.type !== 'expense') return false;
      
      // For monthly view, only include transactions up to the selected month
      if (viewMode === 'monthly' && t.date > endOfMonth(selectedMonth)) return false;
      
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
    const netWorth = allSavingsTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Calculate monthly averages
    let monthCount = 1;
    if (viewMode === 'cumulative') {
      const monthsWithData = new Set(transactionsToUse.map(t => format(t.date, 'yyyy-MM')));
      monthCount = monthsWithData.size || 1;
    }

    const totalIncome = transactionsToUse.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactionsToUse.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const totalSavings = allSavingsTransactions.reduce((sum, t) => sum + t.amount, 0);

    const avgMonthlyIncome = viewMode === 'cumulative' ? totalIncome / monthCount : totalIncome;
    const avgMonthlyExpense = viewMode === 'cumulative' ? totalExpenses / monthCount : totalExpenses;
    const savingsRatio = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

    // Calculate debt to income ratio
    const debtTransactions = transactionsToUse.filter(t => t.type === 'expense' && t.category === 'Debt');
    const totalDebt = debtTransactions.reduce((sum, t) => sum + t.amount, 0);
    const debtToIncomeRatio = totalIncome > 0 ? (totalDebt / totalIncome) * 100 : 0;

    return {
      netWorth,
      avgMonthlyIncome,
      avgMonthlyExpense,
      savingsRatio,
      debtToIncomeRatio
    };
  };

  const kpis = calculateKPIs(filteredTransactions);

  // Auto-generate insights when transactions change
  useEffect(() => {
    if (transactions.length > 0 && !loadingInsights && insights.length === 0) {
      generateInsights();
    }
  }, [transactions, viewMode, selectedMonth]);

  // Summary cards calculations
  const incomeSurplus = monthlyData.income - monthlyData.expenses;
  const budgetVariance = monthlyData.budgetedExpenses - monthlyData.expenses;

  // Chart data preparations - only months with data
  const monthlyChartData = getMonthsWithData(6);

  // Combined income and expense line chart
  const incomeExpenseLineData = {
    labels: monthlyChartData.map(data => data.shortMonth),
    datasets: [
      {
        label: 'Income',
        data: monthlyChartData.map(data => data.income),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: false,
        tension: 0.1,
        pointRadius: 8,
        pointHoverRadius: 10,
        borderWidth: 5,
        pointBackgroundColor: '#10B981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 4,
      },
      {
        label: 'Expenses (Excluding Savings)', 
        data: monthlyChartData.map(data => data.expensesExcludingSavings),
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: false,
        tension: 0.1,
        pointRadius: 8,
        pointHoverRadius: 10,
        borderWidth: 5,
        pointBackgroundColor: '#EF4444',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 4,
      }
    ]
  };

  // Generate AI insights
  const generateInsights = async () => {
    setLoadingInsights(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-analysis`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactions: transactions.map(t => ({
            id: t.id,
            date: t.date.toISOString().split('T')[0],
            description: t.description || `${t.category} - ${t.subcategory}`,
            amount: t.amount,
            category: t.category,
            subcategory: t.subcategory,
            type: t.type
          })),
          action: 'analyze'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setInsights(data.metrics?.insights || []);
      } else {
        const fallbackInsights = [];
        
        if (kpis.debtToIncomeRatio > 36) {
          fallbackInsights.push(`Your debt-to-income ratio is ${kpis.debtToIncomeRatio.toFixed(1)}%, which is above the recommended 36%. Consider paying down high-interest debt first.`);
        } else {
          fallbackInsights.push(`Your debt-to-income ratio of ${kpis.debtToIncomeRatio.toFixed(1)}% is healthy and within recommended limits.`);
        }
        
        if (kpis.savingsRatio < 15) {
          fallbackInsights.push(`Your savings rate of ${kpis.savingsRatio.toFixed(1)}% is below the recommended 15%. Try to increase your savings by reducing discretionary spending.`);
        } else {
          fallbackInsights.push(`Excellent! Your savings rate of ${kpis.savingsRatio.toFixed(1)}% exceeds the recommended 15%.`);
        }
        
        setInsights(fallbackInsights);
      }
    } catch (error) {
      console.error('Error generating insights:', error);
      setInsights(['Unable to generate insights at this time. Please try again later.']);
    } finally {
      setLoadingInsights(false);
    }
  };

  // Calculate category breakdown for P&L table
  const calculateCategoryBreakdown = () => {
    const breakdown: { [key: string]: { category: string; type: 'income' | 'expense'; months: { [key: string]: number } } } = {};
    
    // Get all months with data
    const allMonths = Array.from(new Set(
      transactions.map(t => format(t.date, 'yyyy-MM'))
    )).sort().reverse();
    
    transactions.forEach(transaction => {
      const monthKey = format(transaction.date, 'yyyy-MM');
      const categoryKey = `${transaction.category}-${transaction.type}`;
      
      if (!breakdown[categoryKey]) {
        breakdown[categoryKey] = {
          category: transaction.category,
          type: transaction.type,
          months: {}
        };
      }
      
      if (!breakdown[categoryKey].months[monthKey]) {
        breakdown[categoryKey].months[monthKey] = 0;
      }
      
      breakdown[categoryKey].months[monthKey] += transaction.amount;
    });
    
    return breakdown;
  };

  const categoryBreakdown = calculateCategoryBreakdown();

  // Get months data for P&L table
  const monthsData = Array.from(new Set(
    transactions.map(t => format(t.date, 'yyyy-MM'))
  )).sort().reverse().slice(0, 6).map(month => {
    const monthDate = new Date(month + '-01');
    const monthlyData = calculateMonthlyTotals(transactions, budgets, monthDate);
    
    return {
      month,
      ...monthlyData
    };
  });

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header with Export Button */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Financial Dashboard</h2>
            <p className="text-gray-600 mt-1">
              {viewMode === 'cumulative' ? 'Cumulative Overview' : `${format(selectedMonth, 'MMMM yyyy')} Overview`}
              {viewMode === 'monthly' && ' - Select month below to analyze'}
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'monthly'
                    ? 'bg-white text-green-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setViewMode('cumulative')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'cumulative'
                    ? 'bg-white text-green-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Cumulative
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'monthly' && (
          <div className="mt-8 pb-12 flex justify-center">
          <div className="w-3/4 relative">
            <input
              type="range"
              min="0"
              max={monthOptions.length - 1}
              value={selectedMonthIndex >= 0 ? selectedMonthIndex : 0}
              onChange={handleSliderChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="absolute top-6 w-full">
              {monthOptions.map((month, index) => (
                <span 
                  key={index} 
                  className={`text-xs whitespace-nowrap ${
                    index === selectedMonthIndex ? 'text-green-600 font-medium' : 'text-gray-400'
                  }`}
                  style={{ 
                    left: `${(index / (monthOptions.length - 1)) * 100}%`,
                    transform: 'translateX(-50%)',
                    position: 'absolute'
                  }}
                >
                  {format(month, 'MMM yyyy')}
                </span>
              ))}
            </div>
          </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {viewMode === 'cumulative' ? 'Net Worth (Total)' : 'Net Worth (Month)'}
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(kpis.netWorth)}
              </p>
            </div>
            <Wallet className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {viewMode === 'cumulative' ? 'Avg Monthly Income' : 'Monthly Income'}
              </p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(kpis.avgMonthlyIncome)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {viewMode === 'cumulative' ? 'Avg Monthly Expense' : 'Monthly Expense'}
              </p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(kpis.avgMonthlyExpense)}
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Savings Ratio</p>
              <p className="text-2xl font-bold text-purple-600">
                {kpis.savingsRatio.toFixed(1)}%
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className={`bg-white p-6 rounded-xl shadow-lg border-l-4 ${
          kpis.debtToIncomeRatio > 36 ? 'border-red-500' : 'border-green-500'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Debt to Income Ratio</p>
              <p className={`text-2xl font-bold ${
                kpis.debtToIncomeRatio > 36 ? 'text-red-600' : 'text-green-600'
              }`}>
                {kpis.debtToIncomeRatio.toFixed(1)}%
              </p>
            </div>
            <AlertCircle className={`h-8 w-8 ${
              kpis.debtToIncomeRatio > 36 ? 'text-red-500' : 'text-green-500'
            }`} />
          </div>
        </div>
      </div>

      {/* Income vs Expense Trend and Personal Finance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Combined Income and Expense Trend */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Income vs Expense Trend</h3>
          <div className="h-64">
            <Line 
              data={incomeExpenseLineData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { 
                    position: 'top',
                    labels: {
                      usePointStyle: true,
                      pointStyle: 'line'
                    }
                  },
                },
                scales: {
                  y: {
                    beginAtZero: false,
                    min: 85000,
                    max: 135000,
                    grid: {
                      color: 'rgba(0, 0, 0, 0.1)',
                    },
                    ticks: {
                      stepSize: 10000,
                      callback: function(value) {
                        return formatCurrency(value as number);
                      }
                    }
                  },
                  x: {
                    grid: {
                      color: 'rgba(0, 0, 0, 0.1)',
                    },
                    ticks: {
                      maxRotation: 45,
                      minRotation: 0
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Personal Finance Insights */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Personal Finance Insights</h3>
            <button
              onClick={generateInsights}
              disabled={loadingInsights}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-3 py-1 rounded-lg text-sm transition-colors flex items-center space-x-2"
            >
              {loadingInsights ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <Brain className="h-4 w-4" />
              )}
              <span>{loadingInsights ? 'Analyzing...' : 'Generate'}</span>
            </button>
          </div>
          <div className="h-64">
            {loadingInsights ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : insights.length > 0 ? (
              <div className="space-y-3 overflow-y-auto h-full">
                {insights.map((insight, index) => (
                  <div key={index} className="bg-purple-50 p-3 rounded-lg border-l-4 border-purple-500">
                    <p className="text-sm text-gray-700">{insight}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Brain className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">Click "Generate" to get AI-powered insights</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Monthly P&L Summary */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Monthly P&L Summary</h3>
        {monthsData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50">Particulars</th>
                  {monthsData.slice(0, 6).map((monthData, index) => (
                    <th key={index} className="text-center py-3 px-3 font-semibold text-gray-700 bg-gray-50 min-w-[120px]">
                      {monthData.month}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Income Section */}
                <tr className="border-b border-gray-200 bg-green-50">
                  <td className="py-2 px-4 font-semibold text-green-800">INCOME</td>
                  {monthsData.slice(0, 6).map((_, index) => (
                    <td key={index} className="py-2 px-3"></td>
                  ))}
                </tr>
                
                {/* Income Categories */}
                {Object.values(categoryBreakdown)
                  .filter(item => item.type === 'income')
                  .sort((a, b) => {
                    const aTotal = Object.values(a.months).reduce((sum, val) => sum + val, 0);
                    const bTotal = Object.values(b.months).reduce((sum, val) => sum + val, 0);
                    return bTotal - aTotal;
                  })
                  .map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-4 pl-8 text-gray-700">{item.category}</td>
                      {monthsData.slice(0, 6).map((monthData, index) => (
                        <td key={index} className="py-2 px-3 text-center text-green-600 font-medium">
                          {item.months[monthData.month] ? formatCurrency(item.months[monthData.month]) : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                
                <tr className="border-b border-gray-200 bg-green-100">
                  <td className="py-2 px-4 pl-4 font-semibold text-green-800">Total Income</td>
                  {monthsData.slice(0, 6).map((monthData, index) => (
                    <td key={index} className="py-2 px-3 text-center text-green-600 font-medium">
                      {monthData.income > 0 ? formatCurrency(monthData.income) : '-'}
                    </td>
                  ))}
                </tr>
                
                {/* Expenses Section (Excluding Savings) */}
                <tr className="border-b border-gray-200 bg-red-50">
                  <td className="py-2 px-4 font-semibold text-red-800">EXPENSES</td>
                  {monthsData.slice(0, 6).map((_, index) => (
                    <td key={index} className="py-2 px-3"></td>
                  ))}
                </tr>
                
                {/* Expense Categories */}
                {Object.values(categoryBreakdown)
                  .filter(item => {
                    if (item.type !== 'expense') return false;
                    
                    // Check if it's a savings/investment category
                    if (item.category === 'Savings') return false;
                    
                    // Check if it's investment-related by examining transactions
                    const categoryTransactions = transactions.filter(t => t.category === item.category);
                    const isInvestmentCategory = categoryTransactions.some(t => {
                      const investmentKeywords = ['sip', 'mutual fund', 'mf', 'stock', 'stocks', 'equity', 'shares', 'fd', 'fixed deposit', 'rd', 'recurring deposit', 'aif', 'alternative investment'];
                      const description = (t.description || '').toLowerCase();
                      const subcategory = (t.subcategory || '').toLowerCase();
                      return investmentKeywords.some(keyword => 
                        description.includes(keyword) || subcategory.includes(keyword)
                      );
                    });
                    
                    return !isInvestmentCategory;
                  })
                  .sort((a, b) => {
                    const aTotal = Object.values(a.months).reduce((sum, val) => sum + val, 0);
                    const bTotal = Object.values(b.months).reduce((sum, val) => sum + val, 0);
                    return bTotal - aTotal;
                  })
                  .map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-4 pl-8 text-gray-700">{item.category}</td>
                      {monthsData.slice(0, 6).map((monthData, index) => (
                        <td key={index} className="py-2 px-3 text-center text-red-600 font-medium">
                          {item.months[monthData.month] ? formatCurrency(item.months[monthData.month]) : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                
                <tr className="border-b border-gray-200 bg-red-100">
                  <td className="py-2 px-4 pl-4 font-semibold text-red-800">Total Expenses</td>
                  {monthsData.slice(0, 6).map((monthData, index) => (
                    <td key={index} className="py-2 px-3 text-center text-red-600 font-medium">
                      {(() => {
                        // Parse month string properly
                        const [year, month] = monthData.month.split('-');
                        const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
                        const monthStart = startOfMonth(monthDate);
                        const monthEnd = endOfMonth(monthDate);
                        
                        const monthTransactions = transactions.filter(t => 
                          t.date >= monthStart && t.date <= monthEnd && t.type === 'expense'
                        );
                        
                        // Filter out savings/investment transactions
                        const nonSavingsExpenses = monthTransactions.filter(t => {
                          // Exclude Savings category
                          if (t.category === 'Savings') return false;
                          
                          // Exclude investment-related transactions
                          const investmentKeywords = ['sip', 'mutual fund', 'mf', 'stock', 'stocks', 'equity', 'shares', 'fd', 'fixed deposit', 'rd', 'recurring deposit', 'aif', 'alternative investment'];
                          const description = (t.description || '').toLowerCase();
                          const subcategory = (t.subcategory || '').toLowerCase();
                          
                          return !investmentKeywords.some(keyword => 
                            description.includes(keyword) || subcategory.includes(keyword)
                          );
                        });
                        
                        const totalNonSavingsExpenses = nonSavingsExpenses.reduce((sum, t) => sum + t.amount, 0);
                        return totalNonSavingsExpenses > 0 ? formatCurrency(totalNonSavingsExpenses) : '-';
                      })()}
                    </td>
                  ))}
                </tr>
                
                {/* Savings Breakdown */}
                <tr className="border-b border-gray-200 bg-purple-50">
                  <td className="py-2 px-4 font-semibold text-purple-800">SAVINGS BREAKDOWN</td>
                  {monthsData.slice(0, 6).map((_, index) => (
                    <td key={index} className="py-2 px-3"></td>
                  ))}
                </tr>
                
                {/* Savings Categories */}
                {Object.values(categoryBreakdown)
                  .filter(item => item.type === 'expense' && (
                    item.category === 'Savings' || 
                    (() => {
                      // Check if category has investment-related transactions
                      const categoryTransactions = transactions.filter(t => t.category === item.category);
                      return categoryTransactions.some(t => {
                        const investmentKeywords = ['sip', 'mutual fund', 'mf', 'stock', 'stocks', 'equity', 'shares', 'fd', 'fixed deposit', 'rd', 'recurring deposit', 'aif', 'alternative investment'];
                        const description = (t.description || '').toLowerCase();
                        const subcategory = (t.subcategory || '').toLowerCase();
                        return investmentKeywords.some(keyword => 
                          description.includes(keyword) || subcategory.includes(keyword)
                        );
                      });
                    })()
                  ))
                  .sort((a, b) => {
                    const aTotal = Object.values(a.months).reduce((sum, val) => sum + val, 0);
                    const bTotal = Object.values(b.months).reduce((sum, val) => sum + val, 0);
                    return bTotal - aTotal;
                  })
                  .map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-4 pl-8 text-gray-700">{item.category}</td>
                      {monthsData.slice(0, 6).map((monthData, index) => (
                        <td key={index} className="py-2 px-3 text-center text-purple-600 font-medium">
                          {item.months[monthData.month] ? formatCurrency(item.months[monthData.month]) : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                
                <tr className="border-b border-gray-200 bg-purple-100">
                  <td className="py-2 px-4 pl-4 font-semibold text-purple-800">Total Savings</td>
                  {monthsData.slice(0, 6).map((monthData, index) => {
                    // Calculate savings amount for this month
                    const [year, month] = monthData.month.split('-');
                    const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
                    const monthStart = startOfMonth(monthDate);
                    const monthEnd = endOfMonth(monthDate);
                    
                    const monthTransactions = transactions.filter(t => 
                      t.date >= monthStart && t.date <= monthEnd && t.type === 'expense'
                    );
                    
                    const savingsTransactions = monthTransactions.filter(t => {
                      // Include Savings category
                      if (t.category === 'Savings') return true;
                      
                      // Include investment-related transactions
                      const investmentKeywords = ['sip', 'mutual fund', 'mf', 'stock', 'stocks', 'equity', 'shares', 'fd', 'fixed deposit', 'rd', 'recurring deposit', 'aif', 'alternative investment'];
                      const description = (t.description || '').toLowerCase();
                      const subcategory = (t.subcategory || '').toLowerCase();
                      
                      return investmentKeywords.some(keyword => 
                        description.includes(keyword) || subcategory.includes(keyword)
                      );
                    });
                    
                    const savingsAmount = savingsTransactions.reduce((sum, t) => sum + t.amount, 0);
                    return (
                      <td key={index} className="py-2 px-3 text-center text-purple-600 font-medium">
                        {savingsAmount > 0 ? formatCurrency(savingsAmount) : '-'}
                      </td>
                    );
                  })}
                </tr>
                
                {/* Net Surplus/Deficit (Income - Expenses excluding Savings) */}
                <tr className="border-t-2 border-gray-300 bg-blue-50">
                  <td className="py-3 px-4 font-bold text-blue-800">NET SURPLUS / (DEFICIT)</td>
                  {monthsData.slice(0, 6).map((monthData, index) => {
                    // Parse month string properly
                    const [year, month] = monthData.month.split('-');
                    const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
                    const monthStart = startOfMonth(monthDate);
                    const monthEnd = endOfMonth(monthDate);
                    
                    const monthTransactions = transactions.filter(t => 
                      t.date >= monthStart && t.date <= monthEnd && t.type === 'expense'
                    );
                    
                    // Filter out savings/investment transactions
                    const nonSavingsExpenses = monthTransactions.filter(t => {
                      if (t.category === 'Savings') return false;
                      
                      const investmentKeywords = ['sip', 'mutual fund', 'mf', 'stock', 'stocks', 'equity', 'shares', 'fd', 'fixed deposit', 'rd', 'recurring deposit', 'aif', 'alternative investment'];
                      const description = (t.description || '').toLowerCase();
                      const subcategory = (t.subcategory || '').toLowerCase();
                      
                      return !investmentKeywords.some(keyword => 
                        description.includes(keyword) || subcategory.includes(keyword)
                      );
                    });
                    
                    const totalNonSavingsExpenses = nonSavingsExpenses.reduce((sum, t) => sum + t.amount, 0);
                    const netAmount = monthData.income - totalNonSavingsExpenses;
                    
                    return (
                      <td key={index} className={`py-3 px-3 text-center font-bold ${
                        netAmount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {netAmount !== 0 ? formatCurrency(netAmount) : '-'}
                      </td>
                    );
                  })}
                </tr>
                
                {/* Savings Rate */}
                <tr className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-2 px-4 pl-8 text-gray-700 font-medium">Savings Rate</td>
                  {monthsData.slice(0, 6).map((monthData, index) => {
                    // Calculate savings amount for this month
                    const [year, month] = monthData.month.split('-');
                    const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
                    const monthStart = startOfMonth(monthDate);
                    const monthEnd = endOfMonth(monthDate);
                    
                    const monthTransactions = transactions.filter(t => 
                      t.date >= monthStart && t.date <= monthEnd && t.type === 'expense'
                    );
                    
                    const savingsTransactions = monthTransactions.filter(t => {
                      // Include Savings category
                      if (t.category === 'Savings') return true;
                      
                      // Include investment-related transactions
                      const investmentKeywords = ['sip', 'mutual fund', 'mf', 'stock', 'stocks', 'equity', 'shares', 'fd', 'fixed deposit', 'rd', 'recurring deposit', 'aif', 'alternative investment'];
                      const description = (t.description || '').toLowerCase();
                      const subcategory = (t.subcategory || '').toLowerCase();
                      
                      return investmentKeywords.some(keyword => 
                        description.includes(keyword) || subcategory.includes(keyword)
                      );
                    });
                    
                    const savingsAmount = savingsTransactions.reduce((sum, t) => sum + t.amount, 0);
                    const savingsRate = monthData.income > 0 ? (savingsAmount / monthData.income) * 100 : 0;
                    return (
                      <td key={index} className={`py-2 px-3 text-center font-medium ${
                        savingsRate >= 15 ? 'text-green-600' : savingsRate >= 10 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {monthData.income > 0 ? `${savingsRate.toFixed(1)}%` : '-'}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No transaction data available
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;