'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Loader2,
  Wallet,
  Home,
  Users,
  Zap,
  Wifi,
  Droplet
} from 'lucide-react';
import toast from 'react-hot-toast';

interface FixedCost {
  id: string;
  name: string;
  amount_cents: number;
  frequency: 'monthly' | 'yearly' | 'daily';
  is_active: boolean;
  notes: string | null;
}

const COMMON_COSTS = [
  { name: 'Rent (भाडा)', icon: Home, defaultAmount: 25000 },
  { name: 'Staff Salary (तलब)', icon: Users, defaultAmount: 15000 },
  { name: 'Electricity (बिजुली)', icon: Zap, defaultAmount: 3000 },
  { name: 'Internet', icon: Wifi, defaultAmount: 1500 },
  { name: 'Water (पानी)', icon: Droplet, defaultAmount: 500 },
];

export default function FixedCostsPage() {
  const supabase = createClient();
  
  const [costs, setCosts] = useState<FixedCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dailyShare, setDailyShare] = useState(0);
  
  // Form state
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<'monthly' | 'yearly' | 'daily'>('monthly');

  const formatPrice = (cents: number) => `Rs ${(cents / 100).toLocaleString('en-NP')}`;

  useEffect(() => {
    fetchCosts();
  }, []);

  async function fetchCosts() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('cafe_fixed_costs')
        .select('*')
        .eq('cafe_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setCosts(data || []);
      
      // Calculate daily share using actual days in month
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      const daily = (data || [])
        .filter(c => c.is_active)
        .reduce((sum, c) => {
          if (c.frequency === 'daily') return sum + c.amount_cents;
          if (c.frequency === 'monthly') return sum + Math.round(c.amount_cents / daysInMonth);
          if (c.frequency === 'yearly') return sum + Math.round(c.amount_cents / 365);
          return sum;
        }, 0);
      setDailyShare(daily);
    } catch (error) {
      console.error('Failed to fetch fixed costs:', error);
      toast.error('Failed to load fixed costs');
    } finally {
      setLoading(false);
    }
  }

  async function addCost() {
    if (!name.trim() || !amount) {
      toast.error('Please fill in name and amount');
      return;
    }

    const amountCents = Math.round(parseFloat(amount) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('cafe_fixed_costs')
        .insert({
          cafe_id: user.id,
          name: name.trim(),
          amount_cents: amountCents,
          frequency,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      setCosts(prev => [...prev, data]);
      
      // Reset form
      setName('');
      setAmount('');
      setFrequency('monthly');
      setIsAdding(false);
      
      // Recalculate daily share
      fetchCosts();
      
      toast.success('Fixed cost added');
    } catch (error) {
      console.error('Failed to add fixed cost:', error);
      toast.error('Failed to add fixed cost');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteCost(cost: FixedCost) {
    try {
      const { error } = await supabase
        .from('cafe_fixed_costs')
        .delete()
        .eq('id', cost.id);

      if (error) throw error;

      setCosts(prev => prev.filter(c => c.id !== cost.id));
      fetchCosts(); // Recalculate daily share
      
      toast.success('Fixed cost deleted');
    } catch (error) {
      console.error('Failed to delete fixed cost:', error);
      toast.error('Failed to delete fixed cost');
    }
  }

  async function toggleCost(cost: FixedCost) {
    try {
      const { error } = await supabase
        .from('cafe_fixed_costs')
        .update({ is_active: !cost.is_active })
        .eq('id', cost.id);

      if (error) throw error;

      setCosts(prev => prev.map(c => 
        c.id === cost.id ? { ...c, is_active: !c.is_active } : c
      ));
      fetchCosts(); // Recalculate daily share
      
      toast.success(cost.is_active ? 'Cost disabled' : 'Cost enabled');
    } catch (error) {
      console.error('Failed to toggle fixed cost:', error);
      toast.error('Failed to update fixed cost');
    }
  }

  function addQuickCost(common: typeof COMMON_COSTS[0]) {
    setName(common.name);
    setAmount(common.defaultAmount.toString());
    setFrequency('monthly');
    setIsAdding(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-stone-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/cafe/settings" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Fixed Costs</h1>
              <p className="text-sm text-gray-500">मासिक/वार्षिक खर्च सेटअप</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        {/* Daily Share Summary */}
        <div className="bg-stone-900 rounded-xl p-6 mb-4 shadow-lg text-white">
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="w-6 h-6" />
            <h2 className="text-lg font-medium">Daily Fixed Cost Share</h2>
          </div>
          <p className="text-3xl font-bold">{formatPrice(dailyShare)}</p>
          <p className="text-sm text-stone-300 mt-1">
            This amount is automatically deducted from your daily profit calculation
          </p>
        </div>

        {/* Quick Add Common Costs */}
        {costs.length === 0 && (
          <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">Quick Add Common Costs</h3>
            <div className="grid grid-cols-2 gap-2">
              {COMMON_COSTS.map(common => {
                const Icon = common.icon;
                return (
                  <button
                    key={common.name}
                    onClick={() => addQuickCost(common)}
                    className="flex items-center gap-2 p-3 border border-gray-200 rounded-xl hover:bg-stone-50 hover:border-stone-200 transition-colors text-left"
                  >
                    <Icon className="w-5 h-5 text-stone-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{common.name}</p>
                      <p className="text-xs text-gray-500">Rs {common.defaultAmount.toLocaleString()}/mo</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Add Cost Button */}
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl flex items-center justify-center gap-2 mb-4"
          >
            <Plus className="w-5 h-5" />
            Add Fixed Cost
          </button>
        )}

        {/* Add Cost Form */}
        {isAdding && (
          <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">New Fixed Cost</h2>
            
            {/* Name */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                placeholder="e.g., Rent, Staff Salary"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-stone-500"
              />
            </div>

            {/* Amount */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (Rs) *</label>
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-stone-500"
              />
            </div>

            {/* Frequency */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
              <div className="grid grid-cols-3 gap-2">
                {(['monthly', 'yearly', 'daily'] as const).map(freq => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => setFrequency(freq)}
                    className={`py-2 px-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                      frequency === freq
                        ? 'border-stone-500 bg-stone-50 text-stone-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {freq === 'monthly' ? 'Monthly' : freq === 'yearly' ? 'Yearly' : 'Daily'}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsAdding(false);
                  setName('');
                  setAmount('');
                }}
                className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={addCost}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-stone-900 hover:bg-stone-800 disabled:bg-gray-300 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
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

        {/* Fixed Costs List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Your Fixed Costs</h2>
          </div>
          
          {costs.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {costs.map(cost => (
                <div 
                  key={cost.id}
                  className={`p-4 flex items-center justify-between ${!cost.is_active ? 'opacity-50' : ''}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{cost.name}</span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                        {cost.frequency}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {cost.frequency === 'monthly' && `Daily: ${formatPrice(Math.round(cost.amount_cents / 30))}`}
                      {cost.frequency === 'yearly' && `Daily: ${formatPrice(Math.round(cost.amount_cents / 365))}`}
                      {cost.frequency === 'daily' && 'Per day'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">
                      {formatPrice(cost.amount_cents)}
                    </span>
                    <button
                      onClick={() => toggleCost(cost)}
                      className={`px-3 py-1 text-xs rounded-full ${
                        cost.is_active 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {cost.is_active ? 'Active' : 'Disabled'}
                    </button>
                    <button
                      onClick={() => deleteCost(cost)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No fixed costs yet</p>
              <p className="text-sm">Add rent, salary, and other monthly costs</p>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-4 p-4 bg-blue-50 rounded-xl">
          <h3 className="font-medium text-blue-900 mb-1">How it works</h3>
          <p className="text-sm text-blue-700">
            Fixed costs are divided into daily amounts and subtracted from your daily revenue 
            to calculate your true profit. For example, Rs 30,000 monthly rent = Rs 1,000/day.
          </p>
        </div>
      </main>
    </div>
  );
}
