import React, { useState, useEffect } from 'react';
import { Transaction, Budget } from './types';
import { 
  loadTransactions, 
  saveTransaction, 
  updateTransaction, 
  deleteTransaction, 
  bulkInsertTransactions,
  loadBudgets, 
  saveBudgets 
} from './utils/supabaseStorage';
import { generateId } from './utils/calculations';
import { useAuth } from './hooks/useAuth';

import Navigation from './components/Navigation';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import AIInsights from './components/AIInsights';
import SavingsDashboard from './components/SavingsDashboard';
import AddTransaction from './components/AddTransaction';
import TransactionHistory from './components/TransactionHistory';
import BudgetSettings from './components/BudgetSettings';

function App() {
  const { user, loading: authLoading } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data when user is authenticated
  useEffect(() => {
    if (user) {
      loadData();
    } else {
      setTransactions([]);
      setBudgets([]);
      setLoading(false);
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [loadedTransactions, loadedBudgets] = await Promise.all([
        loadTransactions(),
        loadBudgets()
      ]);
      
      setTransactions(loadedTransactions);
      setBudgets(loadedBudgets);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async (transaction: Transaction) => {
    const { data, error } = await saveTransaction(transaction);
    if (error) {
      console.error('Error saving transaction:', error);
      alert('Failed to save transaction. Please try again.');
      return;
    }
    
    // Add the new transaction to local state
    const newTransaction = {
      ...transaction,
      id: data.id
    };
    setTransactions(prev => [newTransaction, ...prev]);
  };

  const handleBulkImport = async (importedTransactions: Transaction[]) => {
    const { data, error } = await bulkInsertTransactions(importedTransactions);
    if (error) {
      console.error('Error importing transactions:', error);
      alert('Failed to import transactions. Please try again.');
      return;
    }
    
    // Reload all transactions to get the latest data
    await loadData();
    
    // Auto-trigger AI insights after successful import
    setTimeout(() => {
      triggerAIInsights();
    }, 1000);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) {
      return;
    }
    
    const { error } = await deleteTransaction(id);
    if (error) {
      console.error('Error deleting transaction:', error);
      alert('Failed to delete transaction. Please try again.');
      return;
    }
    
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const handleEditTransaction = async (updatedTransaction: Transaction) => {
    const { data, error } = await updateTransaction(updatedTransaction);
    if (error) {
      console.error('Error updating transaction:', error);
      alert('Failed to update transaction. Please try again.');
      return;
    }
    
    setTransactions(prev => 
      prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t)
    );
  };

  const handleUpdateBudgets = async (newBudgets: Budget[]) => {
    const { error } = await saveBudgets(newBudgets);
    if (error) {
      console.error('Error saving budgets:', error);
      alert('Failed to save budgets. Please try again.');
      return;
    }
    
    setBudgets(newBudgets);
  };

  const handleLoadSampleData = async (sampleTransactions: Transaction[]) => {
    const { error } = await bulkInsertTransactions(sampleTransactions);
    if (error) {
      console.error('Error loading sample transactions:', error);
      alert('Failed to load sample transactions. Please try again.');
      return;
    }
    
    await loadData();
  };

  const handleLoadSampleBudgets = async (sampleBudgets: Budget[]) => {
    const { error } = await saveBudgets(sampleBudgets);
    if (error) {
      console.error('Error loading sample budgets:', error);
      alert('Failed to load sample budgets. Please try again.');
      return;
    }
    
    setBudgets(sampleBudgets);
    
    // Auto-trigger AI insights after loading sample data
    setTimeout(() => {
      triggerAIInsights();
    }, 1000);
  };

  const triggerAIInsights = async () => {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-analysis`;
      
      await fetch(apiUrl, {
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
    } catch (error) {
      console.error('Auto AI insights failed:', error);
    }
  };

  // Show loading spinner while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  // Show auth component if user is not logged in
  if (!user) {
    return <Auth />;
  }

  // Show loading spinner while loading data
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation activeView={activeView} onViewChange={setActiveView} user={user} />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }
  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard transactions={transactions} budgets={budgets} />;
      case 'ai-insights': // Keep the same ID for routing
        return <AIInsights transactions={transactions} />;
      case 'savings':
        return <SavingsDashboard transactions={transactions} />;
      case 'add-transaction':
        return (
          <AddTransaction 
            onAddTransaction={handleAddTransaction}
            onBulkImport={handleBulkImport}
            transactions={transactions}
            onLoadSampleData={handleLoadSampleData}
            onLoadSampleBudgets={handleLoadSampleBudgets}
          />
        );
      case 'history':
        return (
          <TransactionHistory 
            transactions={transactions}
            onDeleteTransaction={handleDeleteTransaction}
            onEditTransaction={handleEditTransaction}
            onBulkDelete={loadData}
          />
        );
      case 'budget-settings':
        return (
          <BudgetSettings 
            budgets={budgets}
            onUpdateBudgets={handleUpdateBudgets}
          />
        );
      default:
        return <Dashboard transactions={transactions} budgets={budgets} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation activeView={activeView} onViewChange={setActiveView} user={user} />
      <main className="pb-8">
        {renderView()}
      </main>
    </div>
  );
}

export default App;