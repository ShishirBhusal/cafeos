'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Plus,
  Clock,
  Percent,
  Gift,
  Tag,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
  Zap,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import CafePageLayout from '@/components/cafe/CafePageLayout';

interface Promotion {
  id: string;
  cafe_id: string;
  name: string;
  type: 'happy_hour' | 'combo' | 'discount' | 'buy_x_get_y';
  is_active: boolean;
  start_time?: string;
  end_time?: string;
  days_of_week?: number[];
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number;
  combo_items?: { menu_item_id: string; quantity: number }[];
  combo_price_cents?: number;
  buy_quantity?: number;
  get_quantity?: number;
  applies_to?: string[];
  valid_from?: string;
  valid_until?: string;
  created_at: string;
}

interface MenuItem {
  id: string;
  name: string;
  price_cents: number;
  category_id: string | null;
  category_name: string;
}

interface Category {
  id: string;
  name: string;
}

interface PromotionsClientProps {
  cafeId: string;
  cafeName: string;
  initialPromotions: Promotion[];
  menuItems: MenuItem[];
  categories: Category[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PROMO_TYPES = [
  { value: 'happy_hour', label: 'Happy Hour', icon: Clock, description: 'Time-based discounts' },
  { value: 'combo', label: 'Combo Deal', icon: Gift, description: 'Bundle items at special price' },
  { value: 'discount', label: 'Flat Discount', icon: Percent, description: 'Percentage or fixed off' },
  { value: 'buy_x_get_y', label: 'Buy X Get Y', icon: Tag, description: 'Buy 2 get 1 free, etc.' },
];

export default function PromotionsClient({
  cafeId,
  cafeName,
  initialPromotions,
  menuItems,
  categories,
}: PromotionsClientProps) {
  const supabase = createClient();
  
  const [promotions, setPromotions] = useState<Promotion[]>(initialPromotions);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('happy_hour');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'happy_hour',
    start_time: '14:00',
    end_time: '18:00',
    days_of_week: [1, 2, 3, 4, 5], // Mon-Fri
    discount_type: 'percentage',
    discount_value: 20,
    combo_items: [] as { menu_item_id: string; quantity: number }[],
    combo_price_cents: 0,
    buy_quantity: 2,
    get_quantity: 1,
    applies_to: [] as string[],
    valid_from: '',
    valid_until: '',
  });

  const formatPrice = (cents: number) => `Rs ${(cents / 100).toLocaleString('en-NP')}`;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'happy_hour': return <Clock className="w-5 h-5 text-stone-500" />;
      case 'combo': return <Gift className="w-5 h-5 text-purple-500" />;
      case 'discount': return <Percent className="w-5 h-5 text-green-500" />;
      case 'buy_x_get_y': return <Tag className="w-5 h-5 text-blue-500" />;
      default: return <Zap className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'happy_hour': return 'bg-stone-100 border-stone-200';
      case 'combo': return 'bg-purple-100 border-purple-200';
      case 'discount': return 'bg-green-100 border-green-200';
      case 'buy_x_get_y': return 'bg-blue-100 border-blue-200';
      default: return 'bg-gray-100 border-gray-200';
    }
  };

  const formatPromoDetails = (promo: Promotion) => {
    switch (promo.type) {
      case 'happy_hour':
        const days = promo.days_of_week?.map(d => DAYS[d]).join(', ') || 'All days';
        return `${promo.start_time} - ${promo.end_time} • ${days} • ${promo.discount_value}% off`;
      case 'combo':
        return `Special combo at ${formatPrice(promo.combo_price_cents || 0)}`;
      case 'discount':
        return promo.discount_type === 'percentage' 
          ? `${promo.discount_value}% off`
          : `${formatPrice((promo.discount_value || 0) * 100)} off`;
      case 'buy_x_get_y':
        return `Buy ${promo.buy_quantity} get ${promo.get_quantity} free`;
      default:
        return '';
    }
  };

  // Toggle promotion active status
  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('promotions')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      setPromotions(promotions.map(p => 
        p.id === id ? { ...p, is_active: !currentStatus } : p
      ));
      
      toast.success(!currentStatus ? 'Promotion activated!' : 'Promotion paused');
    } catch (error) {
      console.error('Error toggling promotion:', error);
      toast.error('Failed to update promotion');
    }
  };

  // Delete promotion
  const deletePromotion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promotion?')) return;

    try {
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPromotions(promotions.filter(p => p.id !== id));
      toast.success('Promotion deleted');
    } catch (error) {
      console.error('Error deleting promotion:', error);
      toast.error('Failed to delete promotion');
    }
  };

  // Create new promotion
  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a promotion name');
      return;
    }

    setIsLoading(true);
    try {
      const promoData: any = {
        cafe_id: cafeId,
        name: formData.name.trim(),
        type: formData.type,
        is_active: true,
      };

      // Add type-specific fields
      if (formData.type === 'happy_hour') {
        promoData.start_time = formData.start_time;
        promoData.end_time = formData.end_time;
        promoData.days_of_week = formData.days_of_week;
        promoData.discount_type = 'percentage';
        promoData.discount_value = formData.discount_value;
      } else if (formData.type === 'combo') {
        promoData.combo_items = formData.combo_items;
        promoData.combo_price_cents = formData.combo_price_cents;
      } else if (formData.type === 'discount') {
        promoData.discount_type = formData.discount_type;
        promoData.discount_value = formData.discount_value;
        promoData.applies_to = formData.applies_to.length > 0 ? formData.applies_to : null;
      } else if (formData.type === 'buy_x_get_y') {
        promoData.buy_quantity = formData.buy_quantity;
        promoData.get_quantity = formData.get_quantity;
        promoData.applies_to = formData.applies_to.length > 0 ? formData.applies_to : null;
      }

      // Add validity dates if set
      if (formData.valid_from) promoData.valid_from = formData.valid_from;
      if (formData.valid_until) promoData.valid_until = formData.valid_until;

      const { data, error } = await supabase
        .from('promotions')
        .insert(promoData)
        .select()
        .single();

      if (error) throw error;

      setPromotions([data, ...promotions]);
      setShowAddModal(false);
      resetForm();
      toast.success('Promotion created!');
    } catch (error) {
      console.error('Error creating promotion:', error);
      toast.error('Failed to create promotion');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'happy_hour',
      start_time: '14:00',
      end_time: '18:00',
      days_of_week: [1, 2, 3, 4, 5],
      discount_type: 'percentage',
      discount_value: 20,
      combo_items: [],
      combo_price_cents: 0,
      buy_quantity: 2,
      get_quantity: 1,
      applies_to: [],
      valid_from: '',
      valid_until: '',
    });
    setSelectedType('happy_hour');
  };

  const toggleDay = (day: number) => {
    const days = formData.days_of_week;
    if (days.includes(day)) {
      setFormData({ ...formData, days_of_week: days.filter(d => d !== day) });
    } else {
      setFormData({ ...formData, days_of_week: [...days, day].sort() });
    }
  };

  const activePromotions = promotions.filter(p => p.is_active);
  const pausedPromotions = promotions.filter(p => !p.is_active);

  return (
    <CafePageLayout
      title="Smart Promotions"
      description={cafeName}
      actions={
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create
        </button>
      }
    >
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-green-700">
              <ToggleRight className="w-5 h-5" />
              <span className="font-medium">Active</span>
            </div>
            <div className="text-3xl font-bold text-green-700 mt-1">
              {activePromotions.length}
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <ToggleLeft className="w-5 h-5" />
              <span className="font-medium">Paused</span>
            </div>
            <div className="text-3xl font-bold text-gray-600 mt-1">
              {pausedPromotions.length}
            </div>
          </div>
        </div>

        {/* Active Promotions */}
        {activePromotions.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-green-50">
              <h2 className="font-bold text-green-800">Active Promotions</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {activePromotions.map(promo => (
                <div key={promo.id} className={`p-4 ${getTypeColor(promo.type)}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getTypeIcon(promo.type)}
                      <div>
                        <h3 className="font-medium text-gray-900">{promo.name}</h3>
                        <p className="text-sm text-gray-600">{formatPromoDetails(promo)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleActive(promo.id, promo.is_active)}
                        className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg"
                        title="Pause"
                      >
                        <ToggleRight className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => deletePromotion(promo.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Paused Promotions */}
        {pausedPromotions.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-100">
              <h2 className="font-bold text-gray-700">Paused Promotions</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {pausedPromotions.map(promo => (
                <div key={promo.id} className="p-4 bg-gray-50 opacity-75">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getTypeIcon(promo.type)}
                      <div>
                        <h3 className="font-medium text-gray-700">{promo.name}</h3>
                        <p className="text-sm text-gray-500">{formatPromoDetails(promo)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleActive(promo.id, promo.is_active)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        title="Activate"
                      >
                        <ToggleLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => deletePromotion(promo.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {promotions.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <Zap className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <h3 className="font-medium text-gray-900 mb-1">No Promotions Yet</h3>
            <p className="text-sm text-gray-500 mb-4">
              Create your first promotion to attract more customers
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800"
            >
              Create Promotion
            </button>
          </div>
        )}

        {/* Promo Ideas */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4">
          <h3 className="font-medium text-purple-800 mb-3">💡 Promotion Ideas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="bg-white/50 rounded-lg p-3">
              <strong>Happy Hour (2-5 PM)</strong>
              <p className="text-gray-600">20% off all drinks to boost slow afternoon sales</p>
            </div>
            <div className="bg-white/50 rounded-lg p-3">
              <strong>Chiya + Momo Combo</strong>
              <p className="text-gray-600">Bundle popular items at Rs 99 (save Rs 20)</p>
            </div>
            <div className="bg-white/50 rounded-lg p-3">
              <strong>Buy 4 Get 1 Free</strong>
              <p className="text-gray-600">Perfect for group orders and loyalty</p>
            </div>
            <div className="bg-white/50 rounded-lg p-3">
              <strong>Weekend Special</strong>
              <p className="text-gray-600">15% off everything on Saturdays</p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Promotion Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-bold">Create Promotion</h2>
              <button onClick={() => { setShowAddModal(false); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Promotion Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PROMO_TYPES.map(type => (
                    <button
                      key={type.value}
                      onClick={() => {
                        setSelectedType(type.value);
                        setFormData({ ...formData, type: type.value });
                      }}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        selectedType === type.value 
                          ? 'border-stone-500 bg-stone-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <type.icon className="w-5 h-5" />
                        <span className="font-medium">{type.label}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Promotion Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                  placeholder="e.g., Evening Happy Hour"
                />
              </div>

              {/* Happy Hour Fields */}
              {selectedType === 'happy_hour' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                      <input
                        type="time"
                        value={formData.end_time}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Days</label>
                    <div className="flex gap-2">
                      {DAYS.map((day, idx) => (
                        <button
                          key={day}
                          onClick={() => toggleDay(idx)}
                          className={`w-10 h-10 rounded-full font-medium text-sm ${
                            formData.days_of_week.includes(idx)
                              ? 'bg-stone-900 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {day[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                    />
                  </div>
                </>
              )}

              {/* Discount Fields */}
              {selectedType === 'discount' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={formData.discount_type}
                        onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount (Rs)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.discount_value}
                        onChange={(e) => setFormData({ ...formData, discount_value: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Buy X Get Y Fields */}
              {selectedType === 'buy_x_get_y' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Buy</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.buy_quantity}
                      onChange={(e) => setFormData({ ...formData, buy_quantity: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Get Free</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.get_quantity}
                      onChange={(e) => setFormData({ ...formData, get_quantity: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                    />
                  </div>
                </div>
              )}

              {/* Validity Period */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid From</label>
                  <input
                    type="date"
                    value={formData.valid_from}
                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                  <input
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t flex gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={isLoading || !formData.name.trim()}
                className="flex-1 px-4 py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Promotion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </CafePageLayout>
  );
}
