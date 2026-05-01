'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
  Gift, 
  Star, 
  Check, 
  X, 
  Loader2,
  Sparkles,
  Trophy,
  Coffee
} from 'lucide-react';

interface EligibleCustomer {
  customer_id: string;
  customer_name: string | null;
  phone: string;
  total_visits: number;
  total_spent_cents: number;
  eligible_milestone: number;
  last_visit_at: string;
}

interface ActiveReward {
  id: string;
  reward_type: string;
  reward_description: string;
  reward_value_cents: number;
  issued_at: string;
  expires_at: string;
}

interface CustomerRewardsClientProps {
  cafeId: string;
  userId: string;
}

export default function CustomerRewardsClient({ cafeId, userId }: CustomerRewardsClientProps) {
  const [eligibleCustomers, setEligibleCustomers] = useState<EligibleCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState<string | null>(null);
  const [justIssued, setJustIssued] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<EligibleCustomer | null>(null);
  const [customReward, setCustomReward] = useState({
    type: 'free_item',
    description: 'Free Masala Tea',
    value: 50
  });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchEligibleCustomers();
  }, [cafeId]);

  const fetchEligibleCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_reward_eligible_customers', {
        p_cafe_id: cafeId
      });
      if (error) throw error;
      setEligibleCustomers(data || []);
    } catch (err) {
      console.error('Failed to fetch eligible customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const issueReward = async (customer: EligibleCustomer, rewardType: string, description: string, valueCents: number) => {
    setIssuing(customer.customer_id);
    try {
      const { data, error } = await supabase.rpc('issue_customer_reward', {
        p_cafe_id: cafeId,
        p_customer_id: customer.customer_id,
        p_reward_type: rewardType,
        p_reward_description: description,
        p_reward_value_cents: valueCents,
        p_milestone_visits: customer.eligible_milestone,
        p_issued_by: userId,
        p_expires_in_days: 90
      });

      if (error) throw error;

      // Mark as just issued for animation
      setJustIssued(prev => [...prev, customer.customer_id]);
      
      // Remove from eligible list after animation
      setTimeout(() => {
        setEligibleCustomers(prev => prev.filter(c => c.customer_id !== customer.customer_id));
      }, 1500);

    } catch (err) {
      console.error('Failed to issue reward:', err);
      alert('Failed to issue reward. Please try again.');
    } finally {
      setIssuing(null);
      setShowModal(false);
    }
  };

  const quickIssue = async (customer: EligibleCustomer) => {
    // Default reward: Free tea/coffee for milestone
    const description = `Free drink for ${customer.eligible_milestone} visits! 🎉`;
    await issueReward(customer, 'milestone_reward', description, 5000); // Rs 50
  };

  const openCustomRewardModal = (customer: EligibleCustomer) => {
    setSelectedCustomer(customer);
    setShowModal(true);
  };

  const formatPrice = (cents: number) => `Rs ${Math.round(cents / 100)}`;

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <div className="flex items-center gap-3 animate-pulse">
          <div className="w-10 h-10 bg-stone-100 rounded-xl" />
          <div className="flex-1">
            <div className="h-4 bg-stone-100 rounded w-40" />
            <div className="h-3 bg-stone-100 rounded w-24 mt-2" />
          </div>
        </div>
      </div>
    );
  }

  if (eligibleCustomers.length === 0) {
    return (
      <div className="bg-stone-50 rounded-xl border border-stone-200 p-6 text-center">
        <Trophy className="w-10 h-10 text-stone-300 mx-auto mb-2" />
        <p className="font-medium text-stone-600">No reward-eligible customers right now</p>
        <p className="text-sm text-stone-400 mt-1">Customers become eligible at every 10 visits</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gradient-to-r from-stone-800 to-stone-600 rounded-xl p-5 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-white/20 rounded-xl">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Reward Time! 🎉</h3>
            <p className="text-white/80 text-sm">
              {eligibleCustomers.length} customer{eligibleCustomers.length > 1 ? 's' : ''} earned a reward
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {eligibleCustomers.slice(0, 5).map((customer) => {
            const isIssuing = issuing === customer.customer_id;
            const wasJustIssued = justIssued.includes(customer.customer_id);

            return (
              <div
                key={customer.customer_id}
                className={`bg-white/10 backdrop-blur rounded-xl p-4 transition-all ${
                  wasJustIssued ? 'scale-95 opacity-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <Star className="w-5 h-5 text-stone-300" />
                    </div>
                    <div>
                      <p className="font-semibold">{customer.customer_name || 'Customer'}</p>
                      <p className="text-white/70 text-sm">{customer.phone}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="text-right mr-2">
                      <p className="font-bold text-lg">{customer.eligible_milestone}</p>
                      <p className="text-white/70 text-xs">visits</p>
                    </div>
                    
                    {wasJustIssued ? (
                      <div className="px-4 py-2 bg-emerald-500 rounded-xl flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        <span className="text-sm font-medium">Issued!</span>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => quickIssue(customer)}
                          disabled={isIssuing}
                          className="px-4 py-2 bg-white text-stone-700 rounded-xl font-medium hover:bg-stone-50 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {isIssuing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Coffee className="w-4 h-4" />
                          )}
                          <span className="hidden sm:inline">Free Drink</span>
                        </button>
                        <button
                          onClick={() => openCustomRewardModal(customer)}
                          disabled={isIssuing}
                          className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors"
                          title="Custom Reward"
                        >
                          <Sparkles className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {eligibleCustomers.length > 5 && (
          <p className="text-white/70 text-sm text-center mt-3">
            + {eligibleCustomers.length - 5} more eligible customers
          </p>
        )}
      </div>

      {/* Custom Reward Modal */}
      {showModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-stone-900">Custom Reward</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-stone-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-stone-600 mb-4">
              Rewarding <strong>{selectedCustomer.customer_name || selectedCustomer.phone}</strong> for {selectedCustomer.eligible_milestone} visits
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Reward Type</label>
                <select
                  value={customReward.type}
                  onChange={(e) => setCustomReward(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-stone-500 focus:border-stone-500"
                >
                  <option value="free_item">Free Item</option>
                  <option value="discount">Discount</option>
                  <option value="percentage_off">Percentage Off</option>
                  <option value="special">Special Reward</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
                <input
                  type="text"
                  value={customReward.description}
                  onChange={(e) => setCustomReward(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g., Free Masala Tea"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-stone-500 focus:border-stone-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Value (Rs)</label>
                <input
                  type="number"
                  value={customReward.value}
                  onChange={(e) => setCustomReward(prev => ({ ...prev, value: parseInt(e.target.value) || 0 }))}
                  placeholder="50"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-stone-500 focus:border-stone-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-stone-300 rounded-xl font-medium text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={() => issueReward(
                  selectedCustomer,
                  customReward.type,
                  customReward.description,
                  customReward.value * 100
                )}
                disabled={issuing !== null}
                className="flex-1 px-4 py-2 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {issuing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                Issue Reward
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
