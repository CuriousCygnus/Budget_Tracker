import React, { useState, useEffect } from 'react';
import { Budget } from '../types';
import { getAllCategories, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../data/categories';
import { formatCurrency } from '../utils/calculations';
import { format } from 'date-fns';
import { Settings, Plus, Trash2, Save } from 'lucide-react';

interface BudgetSettingsProps {
  budgets: Budget[];
  onUpdateBudgets: (budgets: Budget[]) => void;
}

const BudgetSettings: React.FC<BudgetSettingsProps> = ({ budgets, onUpdateBudgets }) => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return format(now, 'yyyy-MM');
  });
  
  const [monthlyBudgets, setMonthlyBudgets] = useState<{ [category: string]: number }>({});
  const [newCategory, setNewCategory] = useState('');
  const [newAmount, setNewAmount] = useState('');

  // Load budgets for selected month
  useEffect(() => {
    const currentMonthBudgets = budgets.filter(b => b.month === selectedMonth);
    const budgetMap = currentMonthBudgets.reduce((acc, budget) => {
      acc[budget.category] = budget.amount;
      return acc;
    }, {} as { [category: string]: number });
    
    setMonthlyBudgets(budgetMap);
  }, [budgets, selectedMonth]);

  const allCategories = getAllCategories();
  const availableCategories = Object.keys(allCategories).filter(
    cat => !monthlyBudgets.hasOwnProperty(cat)
  );

  const handleBudgetChange = (category: string, amount: string) => {
    const numAmount = parseFloat(amount) || 0;
    setMonthlyBudgets(prev => ({
      ...prev,
      [category]: numAmount
    }));
  };

  const handleAddCategory = () => {
    if (newCategory && newAmount) {
      const amount = parseFloat(newAmount);
      if (amount > 0) {
        setMonthlyBudgets(prev => ({
          ...prev,
          [newCategory]: amount
        }));
        setNewCategory('');
        setNewAmount('');
      }
    }
  };

  const handleRemoveCategory = (category: string) => {
    setMonthlyBudgets(prev => {
      const updated = { ...prev };
      delete updated[category];
      return updated;
    });
  };

  const handleSave = () => {
    // Remove existing budgets for this month
    const otherMonthBudgets = budgets.filter(b => b.month !== selectedMonth);
    
    // Create new budget entries
    const newBudgets = Object.entries(monthlyBudgets)
      .filter(([_, amount]) => amount > 0)
      .map(([category, amount]) => ({
        category,
        amount,
        month: selectedMonth
      }));

    const allBudgets = [...otherMonthBudgets, ...newBudgets];
    onUpdateBudgets(allBudgets);
    
    alert('Budget saved successfully!');
  };

  const totalBudget = Object.values(monthlyBudgets).reduce((sum, amount) => sum + amount, 0);
  const incomeBudget = Object.entries(monthlyBudgets)
    .filter(([category]) => Object.keys(INCOME_CATEGORIES).includes(category))
    .reduce((sum, [_, amount]) => sum + amount, 0);
  const expenseBudget = Object.entries(monthlyBudgets)
    .filter(([category]) => Object.keys(EXPENSE_CATEGORIES).includes(category))
    .reduce((sum, [_, amount]) => sum + amount, 0);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center space-x-2 mb-4">
          <Settings className="h-6 w-6 text-green-600" />
          <h2 className="text-2xl font-semibold text-gray-800">Recommended Credit Cards</h2>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-800">
            Based on your spending patterns, here are personalized credit card recommendations to maximize your rewards and benefits.
          </p>
        </div>
      </div>

      {/* Top Credit Card Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-blue-500">
          <h3 className="text-lg font-medium text-gray-800 mb-3">Living Expenses & Grocery</h3>
          <p className="text-sm text-gray-600 mb-4">Best for high grocery/daily expenses</p>
          <div className="space-y-2">
            <div className="bg-blue-50 p-3 rounded">
              <h4 className="font-medium text-blue-800">HDFC Millennia</h4>
              <p className="text-xs text-blue-600">2.5% cashback on groceries, 1% on all purchases</p>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <h4 className="font-medium text-blue-800">ICICI Amazon Pay</h4>
              <p className="text-xs text-blue-600">2% on Amazon, 1% on others, no annual fee</p>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <h4 className="font-medium text-blue-800">SBI Simply Save</h4>
              <p className="text-xs text-blue-600">5% on groceries up to ₹2000/month</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500">
          <h3 className="text-lg font-medium text-gray-800 mb-3">Transportation & Fuel</h3>
          <p className="text-sm text-gray-600 mb-4">Best for high fuel/travel expenses</p>
          <div className="space-y-2">
            <div className="bg-green-50 p-3 rounded">
              <h4 className="font-medium text-green-800">HDFC Regalia</h4>
              <p className="text-xs text-green-600">4 reward points per ₹150 on fuel</p>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <h4 className="font-medium text-green-800">ICICI HPCL Super Saver</h4>
              <p className="text-xs text-green-600">Fuel surcharge waiver + rewards</p>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <h4 className="font-medium text-green-800">IndianOil Citibank</h4>
              <p className="text-xs text-green-600">4% fuel savings, 1% on others</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-purple-500">
          <h3 className="text-lg font-medium text-gray-800 mb-3">Entertainment & Dining</h3>
          <p className="text-sm text-gray-600 mb-4">Best for dining and entertainment</p>
          <div className="space-y-2">
            <div className="bg-purple-50 p-3 rounded">
              <h4 className="font-medium text-purple-800">HDFC Swiggy Card</h4>
              <p className="text-xs text-purple-600">10% on Swiggy, 5% on dining</p>
            </div>
            <div className="bg-purple-50 p-3 rounded">
              <h4 className="font-medium text-purple-800">Zomato RBL Card</h4>
              <p className="text-xs text-purple-600">10% on Zomato, dining rewards</p>
            </div>
            <div className="bg-purple-50 p-3 rounded">
              <h4 className="font-medium text-purple-800">ICICI Sapphiro</h4>
              <p className="text-xs text-purple-600">2 points per ₹100 on dining & movies</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Card Analysis */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Detailed Card Analysis</h3>
        
        <div className="space-y-6">
          {/* HDFC Cards */}
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-lg">
            <h4 className="font-semibold text-orange-800 mb-3">HDFC Bank Cards</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-medium text-orange-700 mb-2">HDFC Millennia:</h5>
                <ul className="text-sm text-orange-600 space-y-1">
                  <li>• 2.5% cashback on groceries & online shopping</li>
                  <li>• 1% cashback on all other purchases</li>
                  <li>• Annual fee: ₹1,000 (waived on ₹1L spend)</li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium text-orange-700 mb-2">HDFC Regalia:</h5>
                <ul className="text-sm text-orange-600 space-y-1">
                  <li>• 4 reward points per ₹150 on fuel</li>
                  <li>• 2 points per ₹150 on dining & shopping</li>
                  <li>• Annual fee: ₹2,500 (waived on ₹3L spend)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* ICICI Cards */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-3">ICICI Bank Cards</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-medium text-blue-700 mb-2">ICICI Amazon Pay:</h5>
                <ul className="text-sm text-blue-600 space-y-1">
                  <li>• 2% cashback on Amazon purchases</li>
                  <li>• 1% cashback on all other purchases</li>
                  <li>• No annual fee, instant approval</li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium text-blue-700 mb-2">ICICI Sapphiro:</h5>
                <ul className="text-sm text-blue-600 space-y-1">
                  <li>• 2 reward points per ₹100 on dining & movies</li>
                  <li>• 1 point per ₹100 on all other purchases</li>
                  <li>• Annual fee: ₹3,500 (waived on ₹4L spend)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* SBI Cards */}
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-3">SBI Cards</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-medium text-green-700 mb-2">SBI Simply Save:</h5>
                <ul className="text-sm text-green-600 space-y-1">
                  <li>• 5% cashback on groceries (up to ₹2000/month)</li>
                  <li>• 1% cashback on all other purchases</li>
                  <li>• Annual fee: ₹499 (waived on ₹1L spend)</li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium text-green-700 mb-2">SBI Prime:</h5>
                <ul className="text-sm text-green-600 space-y-1">
                  <li>• 5X reward points on dining & movies</li>
                  <li>• 1X points on all other categories</li>
                  <li>• Annual fee: ₹2,999 (waived on ₹3L spend)</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-6 rounded-lg">
            <h4 className="font-semibold text-yellow-800 mb-3">Selection Tips & Important Notes</h4>
            <div className="space-y-2">
              <p className="text-sm text-yellow-700">
                • <strong>Choose based on your top spending categories:</strong> Grocery → HDFC Millennia, Fuel → HDFC Regalia, Online → ICICI Amazon Pay
              </p>
              <p className="text-sm text-yellow-700">
                • <strong>Annual fee vs benefits:</strong> Calculate if rewards earned exceed annual fees
              </p>
              <p className="text-sm text-yellow-700">
                • <strong>Always pay full balance on time</strong> to avoid interest charges that negate rewards
              </p>
              <p className="text-sm text-yellow-700">
                • <strong>Credit score requirement:</strong> Most premium cards need 750+ CIBIL score
              </p>
              <p className="text-sm text-yellow-700">
                • <strong>Don't overspend for rewards</strong> - rewards should be a bonus, not a reason to spend more
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetSettings;