'use client';

import React, { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import {
  Package,
  Plus,
  AlertTriangle,
  TrendingDown,
  Search,
  Trash2,
  X,
  Droplets,
  Pencil,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Ingredient {
  id: string;
  cafe_id: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock_level: number;
  purchase_price_cents: number;
  unit_size: number;
  category?: string;
  supplier_id?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

interface StockAlert {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock_level: number;
  severity: 'critical' | 'warning' | 'ok';
}

interface InventoryClientProps {
  cafeId: string;
  cafeName: string;
  initialIngredients: Ingredient[];
  stockAlerts: StockAlert[];
}

const UNITS = [
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'g', label: 'Grams (g)' },
  { value: 'L', label: 'Liters (L)' },
  { value: 'ml', label: 'Milliliters (ml)' },
  { value: 'pcs', label: 'Pieces' },
  { value: 'dozen', label: 'Dozen (12 pcs)' },
  { value: 'packet', label: 'Packet' },
  { value: 'loaf', label: 'Loaf' },
];

// Values match what is already stored in cafe_ingredients.category.
const CATEGORIES = [
  { value: 'dairy', label: '🥛 Dairy', color: 'bg-blue-100 text-blue-700' },
  { value: 'beverages', label: '☕ Beverages', color: 'bg-sky-100 text-sky-700' },
  { value: 'spices', label: '🌶️ Spices', color: 'bg-red-100 text-red-700' },
  { value: 'grains', label: '🌾 Grains', color: 'bg-amber-100 text-amber-700' },
  { value: 'vegetables', label: '🥬 Vegetables', color: 'bg-green-100 text-green-700' },
  { value: 'meat', label: '🥩 Meat', color: 'bg-rose-100 text-rose-700' },
  { value: 'basics', label: '🧂 Basics', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'packaging', label: '📦 Packaging', color: 'bg-gray-100 text-gray-700' },
  { value: 'other', label: '📋 Other', color: 'bg-stone-100 text-stone-700' },
];

// Tolerant lookup: legacy singular values ("spice") still resolve to a chip.
const LEGACY_CATEGORY_ALIASES: Record<string, string> = {
  spice: 'spices',
  grain: 'grains',
  vegetable: 'vegetables',
  beverage: 'beverages',
  oil: 'basics',
};

function categoryMeta(value?: string | null) {
  if (!value) return null;
  const key = LEGACY_CATEGORY_ALIASES[value] ?? value;
  return CATEGORIES.find((c) => c.value === key) ?? null;
}

/**
 * `purchase_price_cents` holds the price paid for one whole pack (in paisa) and
 * `unit_size` holds how many tracking units that pack contains. Cost per tracking
 * unit is therefore price / size. Recipe costing relies on this same convention.
 */
function costPerUnitPaisa(ing: Pick<Ingredient, 'purchase_price_cents' | 'unit_size'>): number {
  const size = ing.unit_size && ing.unit_size > 0 ? ing.unit_size : 1;
  return (ing.purchase_price_cents || 0) / size;
}

export default function InventoryClient({
  cafeId,
  cafeName,
  initialIngredients,
  stockAlerts,
}: InventoryClientProps) {
  const supabase = createClient();

  const [ingredients, setIngredients] = useState<Ingredient[]>(initialIngredients);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form state - PURCHASE-FIRST UX
  // User thinks: "I bought 1L milk for Rs 80"
  // NOT: "milk costs Rs 0.08 per ml"
  const [newIngredient, setNewIngredient] = useState({
    name: '',
    category: 'other',
    // Purchase info (what the user actually knows)
    purchasePrice: 80,       // Rs paid for the pack
    packSize: 1,             // e.g., 1 liter, 500g
    packUnit: 'L',           // Unit of the pack
    // Stock tracking
    trackingUnit: 'L',       // How we track usage (same as packUnit usually)
    currentStock: 0,         // Current stock in tracking units
    minStockLevel: 1,        // Alert when below this
  });

  const [stockUpdate, setStockUpdate] = useState({
    quantity: 0,
    cost_cents: 0,
    note: '',
  });

  // Filter ingredients by search + category
  const filteredIngredients = ingredients.filter(ing => {
    const matchesSearch = ing.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (categoryFilter === 'all') return true;
    return (categoryMeta(ing.category)?.value ?? 'other') === categoryFilter;
  });

  // Categories that actually have ingredients, for the filter row
  const usedCategories = CATEGORIES.filter(cat =>
    ingredients.some(ing => (categoryMeta(ing.category)?.value ?? 'other') === cat.value)
  );

  // Get stock status
  const getStockStatus = (ing: Ingredient) => {
    if (ing.current_stock <= 0) return 'out_of_stock';
    if (ing.current_stock <= ing.min_stock_level) return 'critical';
    if (ing.current_stock <= ing.min_stock_level * 2) return 'warning';
    return 'ok';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'out_of_stock': return 'bg-red-100 text-red-800 border-red-200';
      case 'critical': return 'bg-red-50 text-red-700 border-red-100';
      case 'warning': return 'bg-yellow-50 text-yellow-700 border-yellow-100';
      default: return 'bg-green-50 text-green-700 border-green-100';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'out_of_stock': return { text: 'Out of Stock', color: 'bg-red-500 text-white' };
      case 'critical': return { text: 'Low Stock', color: 'bg-red-100 text-red-700' };
      case 'warning': return { text: 'Running Low', color: 'bg-yellow-100 text-yellow-700' };
      default: return { text: 'In Stock', color: 'bg-green-100 text-green-700' };
    }
  };

  // Add new ingredient
  const handleAddIngredient = async () => {
    if (!newIngredient.name.trim()) {
      toast.error('Please enter ingredient name');
      return;
    }

    if (newIngredient.packSize <= 0) {
      toast.error('Pack size must be greater than zero');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('cafe_ingredients')
        .insert({
          cafe_id: cafeId,
          name: newIngredient.name.trim(),
          unit: newIngredient.trackingUnit,
          current_stock: newIngredient.currentStock,
          min_stock_level: newIngredient.minStockLevel,
          // Whole-pack price in paisa, paired with the pack size below.
          purchase_price_cents: Math.round(newIngredient.purchasePrice * 100),
          unit_size: newIngredient.packSize,
          category: newIngredient.category,
        })
        .select()
        .single();

      if (error) throw error;

      setIngredients([...ingredients, data].sort((a, b) => a.name.localeCompare(b.name)));
      setShowAddModal(false);
      setNewIngredient({
        name: '',
        category: 'other',
        purchasePrice: 80,
        packSize: 1,
        packUnit: 'L',
        trackingUnit: 'L',
        currentStock: 0,
        minStockLevel: 1,
      });
      toast.success('Ingredient added!');
    } catch (error) {
      console.error('Error adding ingredient:', error);
      toast.error('Failed to add ingredient');
    } finally {
      setIsLoading(false);
    }
  };

  // Update stock
  const handleUpdateStock = async () => {
    if (!selectedIngredient || stockUpdate.quantity === 0) {
      toast.error('Please enter quantity');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('add_ingredient_stock', {
        p_cafe_id: cafeId,
        p_ingredient_id: selectedIngredient.id,
        p_quantity: stockUpdate.quantity,
        p_cost_cents: Math.round(stockUpdate.cost_cents * 100),
        p_note: stockUpdate.note || null,
      });

      if (error) throw error;

      // Read the authoritative stock back rather than trusting the RPC payload shape.
      const { data: fresh } = await supabase
        .from('cafe_ingredients')
        .select('current_stock')
        .eq('id', selectedIngredient.id)
        .single();

      const newStock = fresh?.current_stock ?? selectedIngredient.current_stock + stockUpdate.quantity;

      setIngredients(ingredients.map(ing =>
        ing.id === selectedIngredient.id ? { ...ing, current_stock: newStock } : ing
      ));

      setShowStockModal(false);
      setSelectedIngredient(null);
      setStockUpdate({ quantity: 0, cost_cents: 0, note: '' });
      toast.success('Stock updated!');
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update stock');
    } finally {
      setIsLoading(false);
    }
  };

  // Save edits to an existing ingredient
  const handleSaveEdit = async () => {
    if (!editingIngredient) return;
    if (!editingIngredient.name.trim()) {
      toast.error('Please enter ingredient name');
      return;
    }
    if (!editingIngredient.unit_size || editingIngredient.unit_size <= 0) {
      toast.error('Pack size must be greater than zero');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('cafe_ingredients')
        .update({
          name: editingIngredient.name.trim(),
          unit: editingIngredient.unit,
          min_stock_level: editingIngredient.min_stock_level,
          purchase_price_cents: editingIngredient.purchase_price_cents,
          unit_size: editingIngredient.unit_size,
          category: editingIngredient.category,
        })
        .eq('id', editingIngredient.id);

      if (error) throw error;

      setIngredients(
        ingredients
          .map(ing => (ing.id === editingIngredient.id ? editingIngredient : ing))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingIngredient(null);
      toast.success('Ingredient updated');
    } catch (error) {
      console.error('Error updating ingredient:', error);
      toast.error('Failed to update ingredient');
    } finally {
      setIsLoading(false);
    }
  };

  // Remove ingredient. Deactivates rather than hard-deletes so recipes and the
  // stock-movement history that reference it stay intact.
  const handleDelete = async (ing: Ingredient) => {
    if (!confirm(`Remove "${ing.name}" from your inventory?\n\nPast purchase history and any recipes using it are kept.`)) return;

    try {
      const { error } = await supabase
        .from('cafe_ingredients')
        .update({ is_active: false })
        .eq('id', ing.id);

      if (error) throw error;

      setIngredients(ingredients.filter(i => i.id !== ing.id));
      toast.success(`${ing.name} removed`);
    } catch (error) {
      console.error('Error removing ingredient:', error);
      toast.error('Failed to remove ingredient');
    }
  };

  const formatPrice = (paisa: number) => `Rs ${(paisa / 100).toFixed(2)}`;

  return (
    <div className="space-y-4">
        {/* Stock Alerts */}
        {stockAlerts.length > 0 && (
          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <div className="flex items-center gap-2 text-stone-900 font-semibold text-sm mb-3">
              <AlertTriangle className="w-4 h-4 text-stone-400" />
              Low Stock Alerts ({stockAlerts.length})
            </div>
            <div className="space-y-2">
              {stockAlerts.slice(0, 5).map(alert => (
                <div key={alert.id} className="flex items-center justify-between bg-stone-50 rounded-xl p-3">
                  <div>
                    <span className="font-medium text-stone-900">{alert.name}</span>
                    <span className="text-sm text-stone-500 ml-2">
                      {alert.current_stock} {alert.unit} left
                    </span>
                  </div>
                  <span className={`text-sm px-2.5 py-1 rounded-full font-medium ${
                    alert.severity === 'critical' ? 'bg-rose-500 text-white' :
                    alert.severity === 'warning' ? 'bg-stone-100 text-stone-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {alert.severity === 'critical' ? 'Urgent!' : 'Low'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search + Add */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input
              type="text"
              placeholder="Search ingredients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300 text-sm"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-stone-900 text-white rounded-lg font-medium hover:bg-stone-800 transition-colors whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            Add Ingredient
          </button>
        </div>

        {/* Category filter */}
        {usedCategories.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                categoryFilter === 'all'
                  ? 'bg-stone-900 text-white'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              All ({ingredients.length})
            </button>
            {usedCategories.map(cat => {
              const count = ingredients.filter(
                ing => (categoryMeta(ing.category)?.value ?? 'other') === cat.value
              ).length;
              return (
                <button
                  key={cat.value}
                  onClick={() => setCategoryFilter(cat.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    categoryFilter === cat.value
                      ? 'ring-2 ring-stone-500 ring-offset-1 ' + cat.color
                      : cat.color + ' opacity-70 hover:opacity-100'
                  }`}
                >
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Ingredients List */}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-200 bg-stone-50">
            <h2 className="font-bold text-stone-900">
              Ingredients ({filteredIngredients.length})
            </h2>
          </div>
          
          {filteredIngredients.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              {ingredients.length === 0 ? (
                <>
                  <p className="font-medium">No ingredients yet</p>
                  <p className="text-sm">Add your first ingredient to start tracking</p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="mt-4 px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800"
                  >
                    Add Ingredient
                  </button>
                </>
              ) : (
                <>
                  <p className="font-medium">No matching ingredients</p>
                  <p className="text-sm">Try a different search or category</p>
                  <button
                    onClick={() => { setSearchTerm(''); setCategoryFilter('all'); }}
                    className="mt-4 px-4 py-2 border border-stone-300 rounded-lg hover:bg-stone-50"
                  >
                    Clear filters
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredIngredients.map(ing => {
                const status = getStockStatus(ing);
                const badge = getStatusBadge(status);
                const cat = categoryMeta(ing.category);

                return (
                  <div key={ing.id} className={`p-4 hover:bg-gray-50 ${getStatusColor(status)}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-gray-900">{ing.name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}>
                            {badge.text}
                          </span>
                          {cat && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${cat.color}`}>
                              {cat.label}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 flex-wrap">
                          <span>
                            <strong>{ing.current_stock}</strong> {ing.unit}
                          </span>
                          <span>
                            Cost: {formatPrice(costPerUnitPaisa(ing))}/{ing.unit}
                          </span>
                          <span className="text-gray-400">
                            {formatPrice(ing.purchase_price_cents)} per {ing.unit_size} {ing.unit} pack
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedIngredient(ing);
                            setShowStockModal(true);
                          }}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Add Stock"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setEditingIngredient({ ...ing })}
                          className="p-2 text-stone-600 hover:bg-stone-100 rounded-lg"
                          title="Edit"
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(ing)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Remove"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/cafe/inventory/insights"
            className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3 col-span-2 lg:col-span-1"
          >
            <div className="p-2 bg-white/20 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-medium">Smart Insights</h4>
              <p className="text-sm text-white/80">Forecast &amp; ABC analysis</p>
            </div>
          </Link>

          <Link
            href="/cafe/inventory/recipes"
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3"
          >
            <div className="p-2 bg-purple-100 rounded-lg">
              <Droplets className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Recipes</h4>
              <p className="text-sm text-gray-500">Link to menu items</p>
            </div>
          </Link>
          
          <Link
            href="/cafe/inventory/costs"
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3"
          >
            <div className="p-2 bg-emerald-100 rounded-lg">
              <TrendingDown className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Food Costs</h4>
              <p className="text-sm text-gray-500">Analyze margins</p>
            </div>
          </Link>
        </div>

      {/* Add Ingredient Modal - PURCHASE-FIRST UX */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b bg-stone-900 rounded-t-xl">
              <div>
                <h2 className="text-lg font-bold text-white">Add Ingredient</h2>
                <p className="text-sm text-stone-400">Add a new stock item</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white/10 rounded-lg text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-5">
              {/* Step 1: What did you buy? */}
              <div className="bg-stone-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-stone-600">
                  <span className="w-6 h-6 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs">1</span>
                  के किन्नुभयो? (What did you buy?)
                </div>
                <input
                  type="text"
                  value={newIngredient.name}
                  onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:outline-none focus:border-stone-500 text-lg"
                  placeholder="e.g., Dudh, Chiya Patti, Chini..."
                  autoFocus
                />
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => setNewIngredient({ ...newIngredient, category: cat.value })}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        newIngredient.category === cat.value
                          ? 'ring-2 ring-stone-500 ring-offset-1 ' + cat.color
                          : cat.color + ' opacity-60 hover:opacity-100'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: How much did you pay? */}
              <div className="bg-emerald-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">2</span>
                  कति तिर्नुभयो? (How much did you pay?)
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-emerald-600 mb-1">Pack Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-medium">Rs</span>
                      <input
                        type="number"
                        value={newIngredient.purchasePrice || ''}
                        onChange={(e) => setNewIngredient({ ...newIngredient, purchasePrice: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-10 pr-4 py-3 border-2 border-emerald-200 rounded-xl focus:outline-none focus:border-emerald-500 text-lg font-bold"
                        placeholder="80"
                      />
                    </div>
                  </div>
                  <div className="text-2xl text-stone-300">/</div>
                  <div className="flex-1">
                    <label className="block text-xs text-emerald-600 mb-1">Pack Size</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={newIngredient.packSize || ''}
                        onChange={(e) => setNewIngredient({ ...newIngredient, packSize: parseFloat(e.target.value) || 0 })}
                        className="w-20 px-3 py-3 border-2 border-emerald-200 rounded-xl focus:outline-none focus:border-emerald-500 text-lg font-bold"
                        placeholder="1"
                      />
                      <select
                        value={newIngredient.packUnit}
                        onChange={(e) => setNewIngredient({ 
                          ...newIngredient, 
                          packUnit: e.target.value,
                          trackingUnit: e.target.value 
                        })}
                        className="flex-1 px-2 py-3 border-2 border-emerald-200 rounded-xl focus:outline-none focus:border-emerald-500 font-medium"
                      >
                        {UNITS.map(u => (
                          <option key={u.value} value={u.value}>{u.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                
                {/* Auto-calculated cost display */}
                {newIngredient.purchasePrice > 0 && newIngredient.packSize > 0 && (
                  <div className="bg-white rounded-lg p-3 flex items-center justify-between">
                    <span className="text-sm text-emerald-700">✓ Cost per {newIngredient.packUnit}:</span>
                    <span className="text-lg font-bold text-emerald-700">
                      Rs {(newIngredient.purchasePrice / newIngredient.packSize).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Step 3: Stock tracking */}
              <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                  <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">3</span>
                  Stock कति छ? (Current stock)
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-blue-600 mb-1">Current Stock</label>
                    <div className="flex">
                      <input
                        type="number"
                        value={newIngredient.currentStock || ''}
                        onChange={(e) => setNewIngredient({ ...newIngredient, currentStock: parseFloat(e.target.value) || 0 })}
                        className="flex-1 px-3 py-2.5 border-2 border-blue-200 rounded-l-xl focus:outline-none focus:border-blue-500 font-bold"
                        placeholder="10"
                      />
                      <span className="px-3 py-2.5 bg-blue-100 border-2 border-l-0 border-blue-200 rounded-r-xl text-blue-700 font-medium">
                        {newIngredient.trackingUnit}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-blue-600 mb-1">Alert when below</label>
                    <div className="flex">
                      <input
                        type="number"
                        value={newIngredient.minStockLevel || ''}
                        onChange={(e) => setNewIngredient({ ...newIngredient, minStockLevel: parseFloat(e.target.value) || 0 })}
                        className="flex-1 px-3 py-2.5 border-2 border-blue-200 rounded-l-xl focus:outline-none focus:border-blue-500 font-bold"
                        placeholder="2"
                      />
                      <span className="px-3 py-2.5 bg-blue-100 border-2 border-l-0 border-blue-200 rounded-r-xl text-blue-700 font-medium">
                        {newIngredient.trackingUnit}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary & Actions */}
            <div className="p-4 border-t bg-stone-50 rounded-b-2xl">
              {newIngredient.name && newIngredient.purchasePrice > 0 && (
                <div className="mb-3 p-3 bg-white rounded-xl text-sm">
                  <span className="text-stone-500">Adding:</span>{' '}
                  <span className="font-bold text-stone-900">{newIngredient.name}</span>
                  <span className="text-stone-500"> at </span>
                  <span className="font-bold text-emerald-600">Rs {newIngredient.purchasePrice}</span>
                  <span className="text-stone-500"> per </span>
                  <span className="font-bold">{newIngredient.packSize} {newIngredient.packUnit}</span>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 border border-stone-300 rounded-xl font-medium hover:bg-stone-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddIngredient}
                  disabled={isLoading || !newIngredient.name.trim()}
                  className="flex-1 px-4 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Adding...' : '+ Add Ingredient'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Ingredient Modal */}
      {editingIngredient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b bg-stone-900 rounded-t-xl">
              <div>
                <h2 className="text-lg font-bold text-white">Edit Ingredient</h2>
                <p className="text-sm text-stone-400">{editingIngredient.name}</p>
              </div>
              <button onClick={() => setEditingIngredient(null)} className="p-2 hover:bg-white/10 rounded-lg text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editingIngredient.name}
                  onChange={(e) => setEditingIngredient({ ...editingIngredient, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:outline-none focus:border-stone-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => {
                    const current = categoryMeta(editingIngredient.category)?.value ?? 'other';
                    return (
                      <button
                        key={cat.value}
                        onClick={() => setEditingIngredient({ ...editingIngredient, category: cat.value })}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          current === cat.value
                            ? 'ring-2 ring-stone-500 ring-offset-1 ' + cat.color
                            : cat.color + ' opacity-60 hover:opacity-100'
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-emerald-50 rounded-xl p-4 space-y-3">
                <p className="text-sm font-medium text-emerald-700">Pack price &amp; size</p>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-emerald-600 mb-1">Pack Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-medium">Rs</span>
                      <input
                        type="number"
                        value={editingIngredient.purchase_price_cents / 100}
                        onChange={(e) =>
                          setEditingIngredient({
                            ...editingIngredient,
                            purchase_price_cents: Math.round((parseFloat(e.target.value) || 0) * 100),
                          })
                        }
                        className="w-full pl-10 pr-3 py-2.5 border-2 border-emerald-200 rounded-xl focus:outline-none focus:border-emerald-500 font-bold"
                      />
                    </div>
                  </div>
                  <div className="text-xl text-stone-300 pb-2">/</div>
                  <div className="flex-1">
                    <label className="block text-xs text-emerald-600 mb-1">Pack Size</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={editingIngredient.unit_size}
                        onChange={(e) =>
                          setEditingIngredient({ ...editingIngredient, unit_size: parseFloat(e.target.value) || 0 })
                        }
                        className="w-16 px-2 py-2.5 border-2 border-emerald-200 rounded-xl focus:outline-none focus:border-emerald-500 font-bold"
                      />
                      <select
                        value={editingIngredient.unit}
                        onChange={(e) => setEditingIngredient({ ...editingIngredient, unit: e.target.value })}
                        className="flex-1 px-2 py-2.5 border-2 border-emerald-200 rounded-xl focus:outline-none focus:border-emerald-500 font-medium"
                      >
                        {UNITS.some(u => u.value === editingIngredient.unit) ? null : (
                          <option value={editingIngredient.unit}>{editingIngredient.unit}</option>
                        )}
                        {UNITS.map(u => (
                          <option key={u.value} value={u.value}>{u.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                {editingIngredient.unit_size > 0 && (
                  <div className="bg-white rounded-lg p-3 flex items-center justify-between">
                    <span className="text-sm text-emerald-700">✓ Cost per {editingIngredient.unit}:</span>
                    <span className="text-lg font-bold text-emerald-700">
                      {formatPrice(costPerUnitPaisa(editingIngredient))}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Alert when below ({editingIngredient.unit})
                </label>
                <input
                  type="number"
                  value={editingIngredient.min_stock_level}
                  onChange={(e) =>
                    setEditingIngredient({ ...editingIngredient, min_stock_level: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:outline-none focus:border-stone-500 font-bold"
                />
                <p className="mt-1 text-xs text-stone-500">
                  Current stock is {editingIngredient.current_stock} {editingIngredient.unit}. Use &ldquo;Add Stock&rdquo; to record a purchase.
                </p>
              </div>
            </div>

            <div className="p-4 border-t bg-stone-50 rounded-b-xl flex gap-3">
              <button
                onClick={() => setEditingIngredient(null)}
                className="flex-1 px-4 py-3 border border-stone-300 rounded-xl font-medium hover:bg-stone-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isLoading || !editingIngredient.name.trim()}
                className="flex-1 px-4 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Stock Modal */}
      {showStockModal && selectedIngredient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold">Add Stock: {selectedIngredient.name}</h2>
              <button 
                onClick={() => {
                  setShowStockModal(false);
                  setSelectedIngredient(null);
                }} 
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-sm text-gray-500">Current Stock</p>
                <p className="text-2xl font-bold text-gray-900">
                  {selectedIngredient.current_stock} {selectedIngredient.unit}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity to Add ({selectedIngredient.unit}) *
                </label>
                <input
                  type="number"
                  value={stockUpdate.quantity}
                  onChange={(e) => setStockUpdate({ ...stockUpdate, quantity: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 text-lg"
                  placeholder="Enter quantity"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Cost (Rs)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={stockUpdate.cost_cents}
                  onChange={(e) => setStockUpdate({ ...stockUpdate, cost_cents: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note
                </label>
                <input
                  type="text"
                  value={stockUpdate.note}
                  onChange={(e) => setStockUpdate({ ...stockUpdate, note: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                  placeholder="e.g., Weekly purchase"
                />
              </div>
            </div>
            <div className="p-4 border-t flex gap-3">
              <button
                onClick={() => {
                  setShowStockModal(false);
                  setSelectedIngredient(null);
                }}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStock}
                disabled={isLoading || stockUpdate.quantity === 0}
                className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 disabled:opacity-50"
              >
                {isLoading ? 'Updating...' : 'Add Stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
