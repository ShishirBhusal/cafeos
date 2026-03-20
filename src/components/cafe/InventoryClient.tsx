'use client';

import React, { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Package,
  Plus,
  AlertTriangle,
  TrendingDown,
  Search,
  Edit2,
  Trash2,
  X,
  Check,
  Droplets,
  RefreshCw
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

interface MenuItem {
  id: string;
  name: string;
  price_cents: number;
  category_id: string | null;
  categories: { name: string } | null;
}

interface InventoryClientProps {
  cafeId: string;
  cafeName: string;
  initialIngredients: Ingredient[];
  stockAlerts: StockAlert[];
  menuItems: MenuItem[];
}

const UNITS = [
  { value: 'kg', label: 'Kilograms (kg)', baseUnit: 'g', multiplier: 1000 },
  { value: 'g', label: 'Grams (g)', baseUnit: 'g', multiplier: 1 },
  { value: 'L', label: 'Liters (L)', baseUnit: 'ml', multiplier: 1000 },
  { value: 'ml', label: 'Milliliters (ml)', baseUnit: 'ml', multiplier: 1 },
  { value: 'pcs', label: 'Pieces', baseUnit: 'pcs', multiplier: 1 },
  { value: 'dozen', label: 'Dozen (12 pcs)', baseUnit: 'pcs', multiplier: 12 },
  { value: 'packet', label: 'Packet', baseUnit: 'packet', multiplier: 1 },
];

const CATEGORIES = [
  { value: 'dairy', label: '🥛 Dairy', color: 'bg-blue-100 text-blue-700' },
  { value: 'spice', label: '🌶️ Spices', color: 'bg-red-100 text-red-700' },
  { value: 'grain', label: '🌾 Grains', color: 'bg-amber-100 text-amber-700' },
  { value: 'vegetable', label: '🥬 Vegetables', color: 'bg-green-100 text-green-700' },
  { value: 'meat', label: '🥩 Meat', color: 'bg-rose-100 text-rose-700' },
  { value: 'beverage', label: '☕ Beverages', color: 'bg-orange-100 text-orange-700' },
  { value: 'oil', label: '🫒 Oils', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'packaging', label: '📦 Packaging', color: 'bg-gray-100 text-gray-700' },
  { value: 'other', label: '📋 Other', color: 'bg-stone-100 text-stone-700' },
];

function formatRs(cents: number): string {
  return `Rs ${(cents / 100).toLocaleString('en-IN')}`;
}

export default function InventoryClient({
  cafeId,
  cafeName,
  initialIngredients,
  stockAlerts,
  menuItems,
}: InventoryClientProps) {
  const supabase = createClient();
  
  const [ingredients, setIngredients] = useState<Ingredient[]>(initialIngredients);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
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

  // Computed: cost per tracking unit (in paisa)
  const costPerUnit = newIngredient.packSize > 0
    ? Math.round((newIngredient.purchasePrice * 100) / newIngredient.packSize)
    : 0;

  const [stockUpdate, setStockUpdate] = useState({
    quantity: 0,
    cost_cents: 0,
    note: '',
  });

  // Filter ingredients by search
  const filteredIngredients = ingredients.filter(ing =>
    ing.name.toLowerCase().includes(searchTerm.toLowerCase())
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

    setIsLoading(true);
    try {
      // Calculate cost per unit in paisa (cents)
      const costPerUnitPaisa = newIngredient.packSize > 0
        ? Math.round((newIngredient.purchasePrice * 100) / newIngredient.packSize)
        : 0;

      const { data, error } = await supabase
        .from('cafe_ingredients')
        .insert({
          cafe_id: cafeId,
          name: newIngredient.name.trim(),
          unit: newIngredient.trackingUnit,
          current_stock: newIngredient.currentStock,
          min_stock_level: newIngredient.minStockLevel,
          purchase_price_cents: costPerUnitPaisa,
          unit_size: newIngredient.packSize,
          category: newIngredient.category,
        })
        .select()
        .single();

      if (error) throw error;

      setIngredients([...ingredients, data]);
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
      const { data, error } = await supabase.rpc('add_ingredient_stock', {
        p_cafe_id: cafeId,
        p_ingredient_id: selectedIngredient.id,
        p_quantity: stockUpdate.quantity,
        p_cost_cents: stockUpdate.cost_cents * 100,
        p_note: stockUpdate.note || null,
      });

      if (error) throw error;

      // Update local state
      setIngredients(ingredients.map(ing => 
        ing.id === selectedIngredient.id 
          ? { ...ing, current_stock: data.new_stock }
          : ing
      ));

      setShowStockModal(false);
      setSelectedIngredient(null);
      setStockUpdate({ quantity: 0, cost_cents: 0, note: '' });
      toast.success('Stock updated!');
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Failed to update stock');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete ingredient
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ingredient?')) return;

    try {
      const { error } = await supabase
        .from('cafe_ingredients')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setIngredients(ingredients.filter(ing => ing.id !== id));
      toast.success('Ingredient deleted');
    } catch (error) {
      console.error('Error deleting ingredient:', error);
      toast.error('Failed to delete ingredient');
    }
  };

  const formatPrice = (paisa: number) => `Rs ${(paisa / 100).toFixed(2)}`;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/cafe/dashboard" className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Saman Hisab</h1>
                <p className="text-sm text-gray-500">Inventory • {cafeName}</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Stock Alerts */}
        {stockAlerts.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-red-800 font-medium mb-3">
              <AlertTriangle className="w-5 h-5" />
              Low Stock Alerts ({stockAlerts.length})
            </div>
            <div className="space-y-2">
              {stockAlerts.slice(0, 5).map(alert => (
                <div key={alert.id} className="flex items-center justify-between bg-white rounded-lg p-3">
                  <div>
                    <span className="font-medium text-gray-900">{alert.name}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      {alert.current_stock} {alert.unit} left
                    </span>
                  </div>
                  <span className={`text-sm px-2 py-1 rounded-full ${
                    alert.severity === 'critical' ? 'bg-red-500 text-white' :
                    alert.severity === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {alert.severity === 'critical' ? 'Urgent!' : 'Low'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search ingredients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Ingredients List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-900">
              Ingredients ({filteredIngredients.length})
            </h2>
          </div>
          
          {filteredIngredients.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No ingredients yet</p>
              <p className="text-sm">Add your first ingredient to start tracking</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                Add Ingredient
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredIngredients.map(ing => {
                const status = getStockStatus(ing);
                const badge = getStatusBadge(status);
                
                return (
                  <div key={ing.id} className={`p-4 hover:bg-gray-50 ${getStatusColor(status)}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900">{ing.name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}>
                            {badge.text}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span>
                            <strong>{ing.current_stock}</strong> {ing.unit}
                          </span>
                          <span>
                            Cost: {formatPrice(ing.purchase_price_cents)}/{ing.unit}
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
                          onClick={() => handleDelete(ing.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete"
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
        <div className="grid grid-cols-2 gap-4">
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
      </main>

      {/* Add Ingredient Modal - PURCHASE-FIRST UX */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-orange-500 to-amber-500 rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold text-white">Add Ingredient</h2>
                <p className="text-sm text-orange-100">Tell us what you bought</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white/20 rounded-lg text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-5">
              {/* Step 1: What did you buy? */}
              <div className="bg-stone-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-stone-600">
                  <span className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs">1</span>
                  के किन्नुभयो? (What did you buy?)
                </div>
                <input
                  type="text"
                  value={newIngredient.name}
                  onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:outline-none focus:border-orange-500 text-lg"
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
                          ? 'ring-2 ring-orange-500 ring-offset-1 ' + cat.color
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
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-bold hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/25"
                >
                  {isLoading ? 'Adding...' : '+ Add Ingredient'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Stock Modal */}
      {showStockModal && selectedIngredient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
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
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-lg"
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
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
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
