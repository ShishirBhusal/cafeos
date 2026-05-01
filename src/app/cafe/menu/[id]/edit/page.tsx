'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Loader2, Save, ToggleLeft, ToggleRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface Category {
  id: string;
  name: string;
}

interface Variant {
  id?: string;
  sku: string;
  price: string;
  is_active: boolean;
}

export default function EditMenuItemPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const supabase = createClient();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // Fetch categories
      const { data: cats } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');
      setCategories(cats || []);

      // Fetch product
      const { data: product, error } = await supabase
        .from('products')
        .select(`
          id, name, description, category_id, is_active,
          product_variants(id, sku, price, is_active)
        `)
        .eq('id', productId)
        .single();

      if (error || !product) {
        toast.error('Menu item not found');
        router.push('/cafe/menu');
        return;
      }

      setName(product.name);
      setDescription(product.description || '');
      setCategoryId(product.category_id);
      setIsActive(product.is_active);
      setVariants(
        (product.product_variants || []).map((v: any) => ({
          id: v.id,
          sku: v.sku,
          price: v.price.toString(),
          is_active: v.is_active,
        }))
      );
      setIsFetching(false);
    }
    fetchData();
  }, [supabase, productId, router]);

  const addVariant = () => {
    setVariants([...variants, { sku: '', price: '', is_active: true }]);
  };

  const removeVariant = (index: number) => {
    if (variants.length > 1) {
      setVariants(variants.filter((_, i) => i !== index));
    }
  };

  const updateVariant = (index: number, field: keyof Variant, value: any) => {
    const updated = [...variants];
    (updated[index] as any)[field] = value;
    setVariants(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }
    
    const validVariants = variants.filter(v => v.price && parseFloat(v.price) > 0);
    if (validVariants.length === 0) {
      toast.error('Please add at least one variant with a price');
      return;
    }

    setIsLoading(true);

    try {
      // Update product
      const { error: productError } = await supabase
        .from('products')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          category_id: categoryId,
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId);

      if (productError) {
        console.error('Product error:', productError);
        toast.error('Failed to update menu item');
        return;
      }

      // Handle variants - update existing, insert new, delete removed
      for (const variant of validVariants) {
        if (variant.id) {
          // Update existing
          await supabase
            .from('product_variants')
            .update({
              sku: variant.sku,
              price: parseFloat(variant.price),
              is_active: variant.is_active,
              updated_at: new Date().toISOString(),
            })
            .eq('id', variant.id);
        } else {
          // Insert new
          await supabase
            .from('product_variants')
            .insert({
              product_id: productId,
              sku: variant.sku || `${name.substring(0, 5).toUpperCase()}-NEW`,
              price: parseFloat(variant.price),
              is_active: variant.is_active,
            });
        }
      }

      toast.success('Menu item updated!');
      router.push('/cafe/menu');
      router.refresh();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-stone-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link href="/cafe/menu" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Edit Menu Item</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Active Toggle */}
          <div className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Item Visibility</h3>
              <p className="text-sm text-gray-500">
                {isActive ? 'Visible to customers' : 'Hidden from customers'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`p-2 rounded-lg ${isActive ? 'text-green-600' : 'text-gray-400'}`}
            >
              {isActive ? (
                <ToggleRight className="w-8 h-8" />
              ) : (
                <ToggleLeft className="w-8 h-8" />
              )}
            </button>
          </div>

          {/* Basic Info */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">Basic Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Masala Tea"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-stone-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the item"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-stone-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-stone-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Variants/Pricing */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Pricing & Variants</h2>
              <button
                type="button"
                onClick={addVariant}
                className="text-sm text-stone-600 hover:text-stone-700 font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Variant
              </button>
            </div>

            <div className="space-y-3">
              {variants.map((variant, index) => (
                <div key={variant.id || index} className="flex gap-3 items-start">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={variant.sku}
                      onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                      placeholder="SKU (e.g., Small, Large)"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-stone-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div className="w-32">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rs</span>
                      <input
                        type="number"
                        value={variant.price}
                        onChange={(e) => updateVariant(index, 'price', e.target.value)}
                        placeholder="0"
                        min="0"
                        step="1"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-stone-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                  {variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVariant(index)}
                      className="p-3 text-red-500 hover:bg-red-50 rounded-xl"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Changes
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
