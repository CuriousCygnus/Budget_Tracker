import React from 'react';
import { BarChart3, PiggyBank, Plus, Target, History, TrendingUp, LogOut, User, Brain } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface NavigationProps {
  activeView: string;
  onViewChange: (view: string) => void;
  user: SupabaseUser;
}

const Navigation: React.FC<NavigationProps> = ({ activeView, onViewChange, user }) => {
  const { signOut } = useAuth();
  
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'savings', label: 'Savings', icon: PiggyBank },
    { id: 'ai-insights', label: 'Expense', icon: Brain },
    { id: 'budget-settings', label: 'Recommended Credit Cards', icon: Target },
    { id: 'add-transaction', label: 'Add Transaction', icon: Plus },
    { id: 'history', label: 'History', icon: History },
  ];

  const handleSignOut = async () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      await signOut();
    }
  };

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <PiggyBank className="h-8 w-8 text-green-600" />

            <h1 className="text-xl font-bold text-gray-800">Spendly</h1>

          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex space-x-1">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onViewChange(id)}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                  activeView === id
                    ? 'bg-green-100 text-green-700 font-medium'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
            </div>
            
            <div className="flex items-center space-x-2 border-l pl-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-600" />
                <span className="text-sm text-gray-600 hidden sm:inline">
                  {user.email}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;