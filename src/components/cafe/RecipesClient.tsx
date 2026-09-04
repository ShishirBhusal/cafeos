'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import {
  Plus,
  Trash2,
  X,
  ChefHat,
  Search,
  Save,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatRs } from '@/lib/formatRs';
import CafePageLayout from '@/components/cafe/CafePageLayout';

interface MenuItem {
  id: string;
  name: string;
  price_cents: number;
  category: string;
}

interface IngredientOption {
  id: string;
  name: string;
  unit: string;
  purchase_price_cents: number;
  unit_size: number;
}

interface RecipeIngredient {
  id: string;
  ingredient_id: string;
  quantity: number;
  unit: string;
  waste_factor: number;
  ingredient_name: string;
  ingredient_unit: string;
  cost_per_unit: number;
}

interface Recipe {
  id: string;
  product_id: string;
  servings: number;
  notes: string | null;
  ingredients: RecipeIngredient[];
}

interface RecipesClientProps {
  cafeId: string;
  cafeName: string;
  menuItems: MenuItem[];
  ingredients: IngredientOption[];
  initialRecipes: Recipe[];
}

export default function RecipesClient({
  cafeId,
  cafeName,
  menuItems,
  ingredients,
  initialRecipes,
}: RecipesClientProps) {
  const supabase = createClient();
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [recipeIngredients, setRecipeIngredients] = useState<
    { ingredient_id: string; quantity: number; waste_factor: number }[]
  >([]);
  const [servings, setServings] = useState(1);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Filter menu items that don't have recipes yet
  const linkedProductIds = new Set(recipes.map(r => r.product_id));
  const unlinkedItems = menuItems.filter(m => !linkedProductIds.has(m.id));
  
  const filteredItems = menuItems.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRecipeForProduct = (productId: string) => 
    recipes.find(r => r.product_id === productId);

  const calculateRecipeCost = (recipe: Recipe) => {
    const totalBatchCost = recipe.ingredients.reduce((sum, ri) => {
      return sum + (ri.quantity * ri.waste_factor * ri.cost_per_unit);
    }, 0);
    // CRITICAL: Divide by servings to get per-serving cost
    return totalBatchCost / (recipe.servings || 1);
  };

  const getMarginPercent = (item: MenuItem, recipe: Recipe | undefined) => {
    if (!recipe || item.price_cents === 0) return null;
    const cost = calculateRecipeCost(recipe);
    return Math.round(((item.price_cents - cost) / item.price_cents) * 100);
  };

  const handleAddIngredientRow = () => {
    setRecipeIngredients([
      ...recipeIngredients,
      { ingredient_id: '', quantity: 0, waste_factor: 1.0 },
    ]);
  };

  const handleRemoveIngredientRow = (index: number) => {
    setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index));
  };

  const handleSaveRecipe = async () => {
    if (!selectedProduct) {
      toast.error('Select a menu item');
      return;
    }
    if (recipeIngredients.length === 0 || recipeIngredients.some(ri => !ri.ingredient_id || ri.quantity <= 0)) {
      toast.error('Add at least one ingredient with quantity');
      return;
    }

    setIsSaving(true);
    try {
      // Create recipe
      const { data: recipe, error: recipeError } = await supabase
        .from('cafe_recipes')
        .insert({
          cafe_id: cafeId,
          product_id: selectedProduct,
          servings,
          notes: notes || null,
        })
        .select()
        .single();

      if (recipeError) throw recipeError;

      // Add ingredients
      const ingredientRows = recipeIngredients.map(ri => ({
        recipe_id: recipe.id,
        cafe_id: cafeId,
        ingredient_id: ri.ingredient_id,
        quantity: ri.quantity,
        unit: ingredients.find(i => i.id === ri.ingredient_id)?.unit || '',
        waste_factor: ri.waste_factor,
      }));

      const { error: ingError } = await supabase
        .from('cafe_recipe_ingredients')
        .insert(ingredientRows);

      if (ingError) throw ingError;

      // Build local recipe object
      const newRecipe: Recipe = {
        id: recipe.id,
        product_id: selectedProduct,
        servings,
        notes: notes || null,
        ingredients: recipeIngredients.map(ri => {
          const ing = ingredients.find(i => i.id === ri.ingredient_id)!;
          return {
            id: crypto.randomUUID(),
            ingredient_id: ri.ingredient_id,
            quantity: ri.quantity,
            unit: ing.unit,
            waste_factor: ri.waste_factor,
            ingredient_name: ing.name,
            ingredient_unit: ing.unit,
            cost_per_unit: ing.unit_size > 0 ? ing.purchase_price_cents / ing.unit_size : 0,
          };
        }),
      };

      setRecipes([...recipes, newRecipe]);
      resetForm();
      toast.success('Recipe saved!');
    } catch (error) {
      console.error('Error saving recipe:', error);
      toast.error('Failed to save recipe');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    if (!confirm('Delete this recipe? This cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('cafe_recipes')
        .delete()
        .eq('id', recipeId);

      if (error) throw error;

      setRecipes(recipes.filter(r => r.id !== recipeId));
      toast.success('Recipe deleted');
    } catch (error) {
      console.error('Error deleting recipe:', error);
      toast.error('Failed to delete recipe');
    }
  };

  const resetForm = () => {
    setShowAddModal(false);
    setSelectedProduct('');
    setRecipeIngredients([]);
    setServings(1);
    setNotes('');
  };

  return (
    <CafePageLayout
      title="Recipes"
      description={`Link ingredients to menu items • ${cafeName}`}
      actions={
        <button
          onClick={() => {
            if (ingredients.length === 0) {
              toast.error('Add ingredients first in Inventory');
              return;
            }
            if (unlinkedItems.length === 0) {
              toast.error('All menu items have recipes');
              return;
            }
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Recipe
        </button>
      }
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 border border-stone-200">
            <div className="text-sm text-stone-500 mb-1">Menu Items</div>
            <div className="text-2xl font-bold text-stone-900 tabular-nums">{menuItems.length}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-stone-200">
            <div className="text-sm text-stone-500 mb-1">With Recipe</div>
            <div className="text-2xl font-bold text-emerald-600 tabular-nums">{recipes.length}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-stone-200">
            <div className="text-sm text-stone-500 mb-1">No Recipe</div>
            <div className="text-2xl font-bold text-stone-500 tabular-nums">{unlinkedItems.length}</div>
          </div>
        </div>

        {/* No ingredients warning */}
        {ingredients.length === 0 && (
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-stone-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-stone-800">No Ingredients Added</h3>
              <p className="text-sm text-stone-700 mt-1">
                You need to add ingredients in the Inventory page before creating recipes.
              </p>
              <Link
                href="/cafe/inventory"
                className="mt-2 inline-block px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 text-sm"
              >
                Go to Inventory →
              </Link>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-500"
          />
        </div>

        {/* Menu Items with Recipe Status */}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-stone-200 bg-stone-50">
            <h2 className="font-bold text-stone-900">Menu Items</h2>
          </div>
          
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-stone-500">
              <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No menu items found</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {filteredItems.map(item => {
                const recipe = getRecipeForProduct(item.id);
                const margin = getMarginPercent(item, recipe);
                const recipeCost = recipe ? calculateRecipeCost(recipe) : 0;

                return (
                  <div key={item.id} className="p-4 hover:bg-stone-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-stone-900">{item.name}</h3>
                          <span className="text-xs text-stone-400">{item.category}</span>
                          {recipe ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                              Recipe linked
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                              No recipe
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-stone-500">
                          <span>Sell: {formatRs(item.price_cents)}</span>
                          {recipe && (
                            <>
                              <span>Cost/serving: {formatRs(Math.round(recipeCost))}</span>
                              {margin !== null && (
                                <span className={`font-medium ${
                                  margin >= 60 ? 'text-emerald-600' :
                                  margin >= 40 ? 'text-stone-500' :
                                  margin >= 0 ? 'text-stone-500' : 'text-rose-600'
                                }`}>
                                  {margin}% margin
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        {recipe && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {recipe.ingredients.map(ri => (
                              <span key={ri.id} className="text-xs bg-stone-100 px-2 py-0.5 rounded text-stone-600">
                                {ri.ingredient_name} ({ri.quantity}{ri.ingredient_unit})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {recipe && (
                        <button
                          onClick={() => handleDeleteRecipe(recipe.id)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                          title="Delete recipe"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Recipe Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold text-stone-900">Add Recipe</h2>
              <button onClick={resetForm} className="p-2 hover:bg-stone-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Menu Item Select */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Menu Item *
                </label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                >
                  <option value="">Select a menu item...</option>
                  {unlinkedItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({formatRs(item.price_cents)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Servings */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Servings per recipe
                </label>
                <input
                  type="number"
                  value={servings}
                  onChange={(e) => setServings(parseInt(e.target.value) || 1)}
                  min={1}
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500"
                />
              </div>

              {/* Ingredients */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-stone-700">Ingredients *</label>
                  <button
                    onClick={handleAddIngredientRow}
                    className="text-sm text-stone-500 hover:text-stone-700 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Add ingredient
                  </button>
                </div>
                
                {recipeIngredients.length === 0 ? (
                  <div className="text-sm text-stone-400 text-center py-4 border border-dashed border-stone-200 rounded-lg">
                    Click &quot;Add ingredient&quot; to start building the recipe
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recipeIngredients.map((ri, index) => (
                      <div key={index} className="flex items-center gap-2 bg-stone-50 p-2 rounded-lg">
                        <select
                          value={ri.ingredient_id}
                          onChange={(e) => {
                            const updated = [...recipeIngredients];
                            updated[index].ingredient_id = e.target.value;
                            setRecipeIngredients(updated);
                          }}
                          className="flex-1 px-2 py-1.5 border border-stone-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-500"
                        >
                          <option value="">Select...</option>
                          {ingredients.map(ing => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name} ({ing.unit})
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="0.1"
                          value={ri.quantity || ''}
                          onChange={(e) => {
                            const updated = [...recipeIngredients];
                            updated[index].quantity = parseFloat(e.target.value) || 0;
                            setRecipeIngredients(updated);
                          }}
                          placeholder="Qty"
                          className="w-20 px-2 py-1.5 border border-stone-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-500"
                        />
                        <span className="text-xs text-stone-400 w-8">
                          {ingredients.find(i => i.id === ri.ingredient_id)?.unit || ''}
                        </span>
                        <button
                          onClick={() => handleRemoveIngredientRow(index)}
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Boil water first, then add tea leaves..."
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 resize-none"
                  rows={2}
                />
              </div>

              {/* Cost Preview */}
              {selectedProduct && recipeIngredients.some(ri => ri.ingredient_id && ri.quantity > 0) && (() => {
                const item = menuItems.find(m => m.id === selectedProduct);
                const batchCost = recipeIngredients.reduce((sum, ri) => {
                  const ing = ingredients.find(i => i.id === ri.ingredient_id);
                  if (!ing || ing.unit_size === 0) return sum;
                  return sum + (ri.quantity * ri.waste_factor * (ing.purchase_price_cents / ing.unit_size));
                }, 0);
                const perServingCost = batchCost / (servings || 1);
                const margin = item && item.price_cents > 0
                  ? Math.round(((item.price_cents - perServingCost) / item.price_cents) * 100)
                  : 0;
                return (
                  <div className="bg-stone-50 rounded-xl p-3 text-sm space-y-1">
                    {servings > 1 && (
                      <div className="flex justify-between text-stone-500">
                        <span>Batch cost ({servings} servings):</span>
                        <span>{formatRs(Math.round(batchCost))}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-stone-700">
                      <span className="font-medium">Cost per serving:</span>
                      <span className="font-bold text-stone-900">
                        {formatRs(Math.round(perServingCost))}
                      </span>
                    </div>
                    {item && (
                      <div className="flex justify-between">
                        <span className="text-stone-600">Margin:</span>
                        <span className={`font-bold ${
                          margin >= 60 ? 'text-emerald-600' :
                          margin >= 40 ? 'text-stone-500' :
                          margin >= 0 ? 'text-stone-500' : 'text-rose-600'
                        }`}>
                          {margin}%
                        </span>
                      </div>
                    )}
                    {margin < 0 && (
                      <div className="mt-2 p-2 bg-rose-100 rounded-lg text-xs text-rose-700 flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>Negative margin! Check ingredient quantities — enter amount per batch, not total purchased.</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            <div className="p-4 border-t flex gap-3">
              <button
                onClick={resetForm}
                className="flex-1 px-4 py-3 border border-stone-300 rounded-xl font-medium hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRecipe}
                disabled={isSaving}
                className="flex-1 px-4 py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? 'Saving...' : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Recipe
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </CafePageLayout>
  );
}
