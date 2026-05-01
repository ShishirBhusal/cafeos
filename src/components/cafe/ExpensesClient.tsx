'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Plus, 
  Trash2, 
  Receipt,
  Loader2,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Expense {
  id: string;
  category: string;
  notes: string | null;
  amount_cents: number;
  supplier_name: string | null;
  expense_date: string;
  created_at: string;
}

interface DailyProfitData {
  revenue_cents: number;
  expense_cents: number;
  fixed_cost_share_cents: number;
  profit_cents: number;
  order_count: number;
}

interface ExpensesClientProps {
  cafeId: string;
  initialExpenses: Expense[];
  totalExpensesCents: number;
  profitData?: DailyProfitData;
  initialDate?: string;
}

// Nepal-specific expense categories matching database constraint
// DB constraint: ingredients, dairy, vegetables, groceries, utilities, rent, salary, fuel, other
const EXPENSE_CATEGORIES = [
  { id: 'dairy', label: 'दूध (Milk/Dairy)', icon: '🥛' },
  { id: 'vegetables', label: 'सब्जी (Vegetables)', icon: '🥬' },
  { id: 'groceries', label: 'किराना (Grocery)', icon: '🛒' },
  { id: 'ingredients', label: 'मासु/सामग्री (Ingredients)', icon: '🍖' },
  { id: 'fuel', label: 'ग्यास (Gas/Fuel)', icon: '⛽' },
  { id: 'utilities', label: 'बिजुली/पानी (Utilities)', icon: '💡' },
  { id: 'rent', label: 'भाडा (Rent)', icon: '🏠' },
  { id: 'salary', label: 'तलब (Salary)', icon: '💰' },
  { id: 'other', label: 'अन्य (Other)', icon: '📝' },
];

export default function ExpensesClient({
  cafeId,
  initialExpenses,
  totalExpensesCents: initialTotal,
  profitData,
  initialDate,
}: ExpensesClientProps) {
  const supabase = createClient();
  
  const [expenses, setExpenses] = useState(initialExpenses);
  const [totalCents, setTotalCents] = useState(initialTotal);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'expenses' | 'summary'>('expenses');
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [isLoadingDate, setIsLoadingDate] = useState(false);
  
  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  
  const loadExpensesForDate = async (date: string) => {
    setIsLoadingDate(true);
    try {
      const { data } = await supabase
        .from('daily_expenses')
        .select('*')
        .eq('cafe_id', cafeId)
        .eq('expense_date', date)
        .order('created_at', { ascending: false });
      
      setExpenses(data || []);
      setTotalCents((data || []).reduce((sum, exp) => sum + (exp.amount_cents || 0), 0));
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setIsLoadingDate(false);
    }
  };
  
  const goToDate = (direction: 'prev' | 'next') => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + (direction === 'next' ? 1 : -1));
    const newDate = current.toISOString().split('T')[0];
    
    // Don't go beyond today
    if (newDate > new Date().toISOString().split('T')[0]) return;
    
    setSelectedDate(newDate);
    loadExpensesForDate(newDate);
  };
  
  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (dateStr === today.toISOString().split('T')[0]) return 'Today';
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };
  
  // Form state
  const [category, setCategory] = useState('dairy');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [supplier, setSupplier] = useState('');
  
  // Calculate updated profit based on current expenses
  const currentProfit = profitData ? {
    ...profitData,
    expense_cents: totalCents,
    profit_cents: profitData.revenue_cents - totalCents - profitData.fixed_cost_share_cents
  } : null;

  const formatPrice = (cents: number) => `Rs ${(cents / 100).toLocaleString('en-NP')}`;

  const addExpense = async () => {
    if (!description.trim() || !amount) {
      toast.error('Please fill in description and amount');
      return;
    }

    const amountCents = Math.round(parseFloat(amount) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase
        .from('daily_expenses')
        .insert({
          cafe_id: cafeId,
          category,
          notes: description.trim(),
          amount_cents: amountCents,
          supplier_name: supplier.trim() || null,
          expense_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (error) throw error;

      setExpenses(prev => [data, ...prev]);
      setTotalCents(prev => prev + amountCents);
      
      // Reset form
      setDescription('');
      setAmount('');
      setSupplier('');
      setIsAdding(false);
      
      toast.success('Expense added');
    } catch (error) {
      console.error('Failed to add expense:', error);
      toast.error('Failed to add expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteExpense = async (expense: Expense) => {
    try {
      const { error } = await supabase
        .from('daily_expenses')
        .delete()
        .eq('id', expense.id);

      if (error) throw error;

      setExpenses(prev => prev.filter(e => e.id !== expense.id));
      setTotalCents(prev => prev - expense.amount_cents);
      
      toast.success('Expense deleted');
    } catch (error) {
      console.error('Failed to delete expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  return (
    <main className="max-w-2xl mx-auto p-4">
      {/* Date Navigation */}
      <div className="bg-white rounded-xl p-3 mb-4 shadow-sm border border-stone-200 flex items-center justify-between">
        <button
          onClick={() => goToDate('prev')}
          className="p-2 hover:bg-stone-100 rounded-xl transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-stone-600" />
        </button>
        
        <div className="text-center">
          <div className="flex items-center gap-2 justify-center">
            <Calendar className="w-4 h-4 text-stone-400" />
            <span className="font-semibold text-stone-900">
              {isLoadingDate ? 'Loading...' : formatDateDisplay(selectedDate)}
            </span>
          </div>
          {!isToday && (
            <button
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                setSelectedDate(today);
                loadExpensesForDate(today);
              }}
              className="text-xs text-stone-500 hover:underline mt-1"
            >
              Go to Today
            </button>
          )}
        </div>
        
        <button
          onClick={() => goToDate('next')}
          disabled={isToday}
          className="p-2 hover:bg-stone-100 rounded-xl transition-colors disabled:opacity-30"
        >
          <ChevronRight className="w-5 h-5 text-stone-600" />
        </button>
      </div>

      {/* Daily Profit Summary - The Hisab Kitab */}
      {currentProfit && (
        <div className="bg-stone-900 rounded-xl p-6 mb-4 shadow-lg text-white">
          <h2 className="text-lg font-medium opacity-90 mb-4">आजको हिसाब किताब</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm opacity-80">आम्दानी (Revenue)</p>
              <p className="text-2xl font-bold">{formatPrice(currentProfit.revenue_cents)}</p>
              <p className="text-xs opacity-70">{currentProfit.order_count} orders</p>
            </div>
            <div>
              <p className="text-sm opacity-80">खर्च (Expenses)</p>
              <p className="text-2xl font-bold">{formatPrice(totalCents)}</p>
            </div>
          </div>
          {currentProfit.fixed_cost_share_cents > 0 && (
            <div className="mt-3 pt-3 border-t border-white/20">
              <div className="flex justify-between text-sm">
                <span className="opacity-80">Fixed Costs (Daily)</span>
                <span>{formatPrice(currentProfit.fixed_cost_share_cents)}</span>
              </div>
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-white/30">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium">नाफा (Profit)</span>
              <span className={`text-3xl font-bold ${currentProfit.profit_cents >= 0 ? 'text-white' : 'text-red-200'}`}>
                {currentProfit.profit_cents >= 0 ? '' : '-'}{formatPrice(Math.abs(currentProfit.profit_cents))}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Today's Expenses Total */}
      <div className="bg-white rounded-xl p-6 mb-4 shadow-sm text-center border border-stone-200">
        <p className="text-sm text-stone-500 mb-1">Today's Expenses</p>
        <p className="text-3xl font-bold text-rose-600 tabular-nums">{formatPrice(totalCents)}</p>
      </div>

      {/* Add Expense Button - Only show for today */}
      {!isAdding && isToday && (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl flex items-center justify-center gap-2 mb-4"
        >
          <Plus className="w-5 h-5" />
          Add Expense
        </button>
      )}
      
      {!isToday && (
        <div className="bg-stone-100 rounded-xl p-3 mb-4 text-center text-sm text-stone-600">
          Viewing historical data. Switch to Today to add new expenses.
        </div>
      )}

      {/* Add Expense Form */}
      {isAdding && (
        <div className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-stone-200">
          <h2 className="font-bold text-stone-900 mb-4">New Expense</h2>
          
          {/* Category */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-stone-700 mb-1">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {EXPENSE_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`p-3 rounded-xl border-2 text-center transition-colors ${
                    category === cat.id 
                      ? 'border-stone-500 bg-stone-50' 
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <span className="text-2xl block mb-1">{cat.icon}</span>
                  <span className="text-xs text-stone-600 truncate block">
                    {cat.label.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-stone-700 mb-1">Description *</label>
            <input
              type="text"
              placeholder="e.g., Milk 10L"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-stone-500"
            />
          </div>

          {/* Amount */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-stone-700 mb-1">Amount (Rs) *</label>
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-stone-500"
            />
          </div>

          {/* Supplier */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-stone-700 mb-1">Supplier (optional)</label>
            <input
              type="text"
              placeholder="e.g., DDC Dairy"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-stone-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setIsAdding(false)}
              className="flex-1 py-3 border border-stone-300 text-stone-700 font-medium rounded-xl hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={addExpense}
              disabled={isSubmitting}
              className="flex-1 py-3 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Add
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Expenses List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-stone-200">
        <div className="p-4 border-b border-stone-100">
          <h2 className="font-bold text-stone-900">
            {isToday ? "Today's" : formatDateDisplay(selectedDate)} Expenses
          </h2>
        </div>
        
        {expenses.length > 0 ? (
          <div className="divide-y divide-stone-100">
            {expenses.map(expense => (
              <div 
                key={expense.id}
                className="p-4 flex items-center justify-between hover:bg-stone-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-stone-900">{expense.notes || expense.category}</span>
                    <span className="text-xs px-2 py-0.5 bg-stone-100 text-stone-600 rounded-full">
                      {expense.category}
                    </span>
                  </div>
                  {expense.supplier_name && (
                    <p className="text-sm text-stone-500">{expense.supplier_name}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-rose-600 tabular-nums">
                    -{formatPrice(expense.amount_cents)}
                  </span>
                  <button
                    onClick={() => deleteExpense(expense)}
                    className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center">
            <Receipt className="w-12 h-12 mx-auto mb-3 text-stone-300" />
            <p className="font-medium text-stone-600">No expenses today</p>
            <p className="text-sm text-stone-400 mt-1">Kharcha add garnus to track costs</p>
          </div>
        )}
      </div>
    </main>
  );
}
