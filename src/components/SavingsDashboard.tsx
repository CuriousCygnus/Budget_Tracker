import React, { useState, useEffect } from 'react';
import { Transaction } from '../types';
import { format, subMonths, startOfMonth } from 'date-fns';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Pie, Bar } from 'react-chartjs-2';
import { calculateSavingsProgress, calculateSavingsRate, formatCurrency } from '../utils/calculations';
import { TrendingUp, Target, PiggyBank, Percent } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface SavingsDashboardProps {
  transactions: Transaction[];
}

const SavingsDashboard: React.FC<SavingsDashboardProps> = ({ transactions }) => {
  const currentDate = new Date();
  
  // Calculate savings from transactions categorized as 'Savings' or investment-related subcategories
  const savingsTransactions = transactions.filter(t => {
    if (t.type !== 'expense') return false;
    
    // Check if it's in the Savings category
    if (t.category === 'Savings') return true;
    
    // Check if it's an investment-related transaction by subcategory
    const investmentKeywords = ['sip', 'mutual fund', 'mf', 'stock', 'stocks', 'equity', 'shares', 'fd', 'fixed deposit', 'rd', 'recurring deposit', 'aif', 'alternative investment'];
    const description = (t.description || '').toLowerCase();
    const subcategory = (t.subcategory || '').toLowerCase();
    
    return investmentKeywords.some(keyword => 
      description.includes(keyword) || subcategory.includes(keyword)
    );
  });
  
  // Calculate total income for savings rate calculation
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  // Monthly savings data for last 12 months
  const last12Months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return date;
  }).reverse();

  const monthlySavingsData = last12Months.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const monthlyTransactions = transactions.filter(t => 
      t.date >= monthStart && t.date < monthEnd
    );

    const monthlyIncome = monthlyTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlySavings = monthlyTransactions
      .filter(t => {
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
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;

    return {
      month: format(month, 'MMM yyyy'),
      shortMonth: format(month, 'MMM'),
      income: monthlyIncome,
      savings: monthlySavings,
      savingsRate
    };
  });

  // Calculate cumulative savings (YTD)
  const totalSavings = savingsTransactions.reduce((sum, t) => sum + t.amount, 0);
  
  // Calculate average monthly savings
  const monthsWithSavings = monthlySavingsData.filter(data => data.savings > 0);
  const averageMonthlySavings = monthsWithSavings.length > 0 
    ? monthsWithSavings.reduce((sum, data) => sum + data.savings, 0) / monthsWithSavings.length
    : 0;
  
  // Calculate overall savings rate
  const overallSavingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;
  
  // Calculate shortfall in savings (15% target)
  const savingsTarget = 0.15; // 15%
  const targetSavings = totalIncome * savingsTarget;
  const savingsShortfall = Math.max(0, targetSavings - totalSavings);

  // Cumulative savings line chart
  let cumulativeSavings = 0;
  const cumulativeSavingsData = {
    labels: monthlySavingsData.map(data => data.shortMonth),
    datasets: [{
      label: 'Cumulative Savings',
      data: monthlySavingsData.map(data => {
        cumulativeSavings += data.savings;
        return cumulativeSavings;
      }),
      borderColor: '#059669',
      backgroundColor: 'rgba(5, 150, 105, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
    }]
  };

  // Savings by subcategory (pie chart)
  const [savingsByCategory, setSavingsByCategory] = useState<{ [key: string]: number }>({});
  const [categorizingSavings, setCategorizingSavings] = useState(false);

  // Categorize savings using OpenAI
  useEffect(() => {
    if (savingsTransactions.length > 0) {
      categorizeSavingsWithAI();
    }
  }, [savingsTransactions]);

  const categorizeSavingsWithAI = async () => {
    setCategorizingSavings(true);
    
    try {
      // Check if Supabase configuration is available
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey || !supabaseUrl.startsWith('http')) {
        console.warn('Supabase configuration not available or invalid, using fallback categorization');
        useFallbackCategorization();
        return;
      }
      
      const apiUrl = `${supabaseUrl}/functions/v1/financial-analysis`;
      
      // Validate URL format before making request
      try {
        new URL(apiUrl);
      } catch (urlError) {
        console.error('Invalid Supabase URL format:', apiUrl);
        useFallbackCategorization();
        return;
      }
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactions: savingsTransactions.map(t => ({
            id: t.id,
            date: t.date.toISOString().split('T')[0],
            description: t.description || t.subcategory,
            amount: t.amount,
            type: t.type
          })),
          action: 'categorize-savings'
        })
      });

      if (!response.ok) {
        console.error(`Savings categorization failed: ${response.status}`);
        useFallbackCategorization();
        return;
      }

      const data = await response.json();
      const categorizedSavings = data.categorizedSavings || {};
      
      // Group by AI-determined categories
      const groupedSavings = savingsTransactions.reduce((acc, t, index) => {
        const aiCategory = categorizedSavings[index]?.category || t.subcategory;
        acc[aiCategory] = (acc[aiCategory] || 0) + t.amount;
        return acc;
      }, {} as { [key: string]: number });
      
      setSavingsByCategory(groupedSavings);
    } catch (error) {
      console.error('Error categorizing savings:', error);
      useFallbackCategorization();
    } finally {
      setCategorizingSavings(false);
    }
  };

  const useFallbackCategorization = () => {
    const fallbackSavings = savingsTransactions.reduce((acc, t) => {
      const description = (t.description || '').toLowerCase();
      const subcategory = (t.subcategory || '').toLowerCase();
      
      // Enhanced categorization based on keywords
      if (description.includes('sip') || description.includes('systematic') || subcategory.includes('sip')) {
        acc['SIP'] = (acc['SIP'] || 0) + t.amount;
      } else if (description.includes('mutual fund') || description.includes('mf ') || description.includes(' mf') || description.includes('mutual') || description.includes('fund') || subcategory.includes('mutual')) {
        acc['Mutual Fund'] = (acc['Mutual Fund'] || 0) + t.amount;
      } else if (description.includes('stock') || description.includes('equity') || description.includes('shares') || subcategory.includes('stock')) {
        acc['Stocks'] = (acc['Stocks'] || 0) + t.amount;
      } else if (description.includes('fd ') || description.includes(' fd') || description.includes('fixed deposit') || description.includes('fd') || description.includes('deposit') || subcategory.includes('fd')) {
        acc['Fixed Deposits'] = (acc['Fixed Deposits'] || 0) + t.amount;
      } else if (description.includes('rd ') || description.includes(' rd') || description.includes('recurring deposit') || description.includes('recurring') || subcategory.includes('rd')) {
        acc['Recurring Deposits'] = (acc['Recurring Deposits'] || 0) + t.amount;
      } else if (description.includes('aif') || description.includes('alternative investment') || subcategory.includes('aif')) {
        acc['AIF'] = (acc['AIF'] || 0) + t.amount;
      } else if (description.includes('investment') || description.includes('invest') || description.includes('saving') || description.includes('ppf') || description.includes('nsc') || description.includes('elss')) {
        acc['Investment Savings'] = (acc['Investment Savings'] || 0) + t.amount;
      } else {
        acc['Other Savings'] = (acc['Other Savings'] || 0) + t.amount;
      }
      return acc;
    }, {} as { [key: string]: number });
    
    setSavingsByCategory(fallbackSavings);
  };

  const savingsPieData = {
    labels: Object.keys(savingsByCategory),
    datasets: [{
      data: Object.values(savingsByCategory),
      backgroundColor: [
        '#059669', // SIP
        '#10B981', // Mutual Fund  
        '#34D399', // Stocks
        '#6EE7B7', // FD
        '#A7F3D0', // RD
        '#D1FAE5', // AIF
        '#86EFAC', // Others
      ],
      borderWidth: 2,
      borderColor: '#ffffff',
    }]
  };

  // Monthly savings rate bar chart
  const savingsRateData = {
    labels: monthlySavingsData.map(data => {
      const date = new Date(data.month);
      return format(date, "MMM''yy");
    }),
    datasets: [{
      label: 'Savings Rate (%)',
      data: monthlySavingsData.map(data => data.savingsRate),
      backgroundColor: 'rgba(5, 150, 105, 0.8)',
      borderColor: '#059669',
      borderWidth: 1,
      borderRadius: 4,
    }]
  };

  // Calculate current month metrics
  const currentMonthStart = startOfMonth(currentDate);
  const currentMonthEnd = new Date(currentMonthStart);
  currentMonthEnd.setMonth(currentMonthEnd.getMonth() + 1);

  const currentMonthTransactions = transactions.filter(t => 
    t.date >= currentMonthStart && t.date < currentMonthEnd
  );

  const currentMonthIncome = currentMonthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const currentMonthSavings = currentMonthTransactions
    .filter(t => {
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
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const currentMonthSavingsRate = currentMonthIncome > 0 ? (currentMonthSavings / currentMonthIncome) * 100 : 0;

  // Find the most recent month with data (current month or last month)
  const getMostRecentMonthData = () => {
    console.log('Current month data:', { currentMonthIncome, currentMonthSavings, currentMonthSavingsRate });
    console.log('Monthly savings data:', monthlySavingsData);
    
    // Check if current month has any income or savings data
    if (currentMonthIncome > 0 || currentMonthSavings > 0) {
      return {
        income: currentMonthIncome,
        savings: currentMonthSavings,
        savingsRate: currentMonthSavingsRate,
        monthName: format(currentDate, 'MMMM yyyy'),
        isCurrentMonth: true
      };
    }
    
    // If current month has no data, find the most recent month with data from monthlySavingsData
    // Create a copy and reverse to get most recent first
    const reversedMonthlyData = [...monthlySavingsData].reverse();
    console.log('Reversed monthly data:', reversedMonthlyData);
    
    const monthsWithData = reversedMonthlyData.filter(data => {
      const hasData = data.income > 0 || data.savings > 0;
      console.log(`Month ${data.month}: income=${data.income}, savings=${data.savings}, hasData=${hasData}`);
      return hasData;
    });
    
    console.log('Months with data:', monthsWithData);
    
    if (monthsWithData.length > 0) {
      const recentMonth = monthsWithData[0];
      console.log('Selected recent month:', recentMonth);
      return {
        income: recentMonth.income,
        savings: recentMonth.savings,
        savingsRate: recentMonth.savingsRate,
        monthName: recentMonth.month,
        isCurrentMonth: false
      };
    }
    
    console.log('No data found, using fallback');
    // Fallback if no data available
    return {
      income: 0,
      savings: 0,
      savingsRate: 0,
      monthName: format(currentDate, 'MMMM yyyy'),
      isCurrentMonth: true
    };
  };

  const currentMonthData = getMostRecentMonthData();

  // Calculate monthly savings target (15% of current month income)
  const monthlyTarget = currentMonthData.income * savingsTarget;
  const monthlyProgress = monthlyTarget > 0 ? (currentMonthData.savings / monthlyTarget) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Savings (YTD)</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalSavings)}
              </p>
            </div>
            <PiggyBank className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Monthly Savings</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(averageMonthlySavings)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Savings Rate</p>
              <p className="text-2xl font-bold text-purple-600">
                {overallSavingsRate.toFixed(1)}%
              </p>
              <p className="text-xs text-purple-500">
                Target: 15%
              </p>
            </div>
            <Percent className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className={`bg-white p-6 rounded-xl shadow-lg border-l-4 ${
          savingsShortfall > 0 ? 'border-red-500' : 'border-green-500'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Savings Shortfall</p>
              <p className={`text-2xl font-bold ${
                savingsShortfall > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {formatCurrency(savingsShortfall)}
              </p>
              <p className="text-xs text-gray-500">
                Target: {formatCurrency(targetSavings)}
              </p>
            </div>
            <Target className={`h-8 w-8 ${
              savingsShortfall > 0 ? 'text-red-500' : 'text-green-500'
            }`} />
          </div>
        </div>
      </div>

      {/* Savings Targets Progress */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Savings Goals Progress</h3>
        <div className="space-y-6">
          {/* Monthly Goal */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">Monthly Savings Goal (15%)</span>
              <span className="text-sm text-gray-800">
                Achievement: {overallSavingsRate.toFixed(1)}% / Target: 15%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-purple-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((overallSavingsRate / 15) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {((overallSavingsRate / 15) * 100).toFixed(1)}% of target achieved
            </p>
          </div>

          {/* Annual Performance */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">Annual Savings Performance</span>
              <span className="text-sm text-gray-800">
                {formatCurrency(totalSavings)} / {formatCurrency(targetSavings)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-green-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((totalSavings / targetSavings) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {((totalSavings / targetSavings) * 100).toFixed(1)}% of annual target achieved
            </p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cumulative Savings Line Chart */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Cumulative Savings Trend</h3>
          <div className="h-64">
            <Line 
              data={cumulativeSavingsData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  y: { 
                    beginAtZero: true,
                    ticks: {
                      callback: function(value) {
                        return formatCurrency(value as number);
                      }
                    }
                  },
                  x: {
                    ticks: {
                      maxRotation: 45,
                      minRotation: 45
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Savings by Type Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Savings by Type</h3>
            {categorizingSavings && (
              <div className="flex items-center space-x-2 text-purple-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                <span className="text-xs">AI Categorizing...</span>
              </div>
            )}
          </div>
          <div className="h-64">
            {Object.keys(savingsByCategory).length > 0 ? (
              <Pie 
                data={savingsPieData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'right' },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          return `${context.label}: ${formatCurrency(context.parsed)}`;
                        }
                      }
                    }
                  }
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                {categorizingSavings ? 'Categorizing savings...' : 'No savings data available'}
              </div>
            )}
          </div>
        </div>

        {/* Monthly Savings Rate */}
        <div className="bg-white p-6 rounded-xl shadow-lg lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Savings Rate</h3>
          <div className="h-64">
            {monthlySavingsData.length > 0 ? (
              <Bar 
                data={savingsRateData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                  },
                  scales: {
                    y: { 
                      beginAtZero: false,
                      min: Math.max(0, Math.min(...monthlySavingsData.map(d => d.savingsRate)) - 2),
                      max: Math.max(20, Math.max(...monthlySavingsData.map(d => d.savingsRate)) + 2),
                      ticks: {
                        callback: function(value) {
                          return Math.round(value as number) + '%';
                        },
                        stepSize: 1
                      }
                    },
                    x: {
                      ticks: {
                        callback: function(value, index) {
                          return monthlySavingsData[index]?.shortMonth || '';
                        }
                      }
                    }
                  }
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No monthly savings data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Savings Breakdown Table */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Savings Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Savings Type</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Amount</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(savingsByCategory).map(([type, amount]) => (
                <tr key={type} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-800">{type}</td>
                  <td className="py-3 px-4 text-right font-medium text-gray-800">
                    {formatCurrency(amount)}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-600">
                    {totalSavings > 0 ? ((amount / totalSavings) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              ))}
              {Object.keys(savingsByCategory).length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-gray-500">
                    No savings data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SavingsDashboard;