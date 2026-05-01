'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Loader2, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface Category {
  id: string;
  name: string;
}

interface Variant {
  sku: string;
  price: string;
}

export default function NewMenuItemPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [variants, setVariants] = useState<Variant[]>([{ sku: '', price: '' }]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingCategories, setIsFetchingCategories] = useState(true);

  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');
      setCategories(data || []);
      setIsFetchingCategories(false);
    }
    fetchCategories();
  }, [supabase]);

  const addVariant = () => {
    setVariants([...variants, { sku: '', price: '' }]);
  };

  const removeVariant = (index: number) => {
    if (variants.length > 1) {
      setVariants(variants.filter((_, i) => i !== index));
    }
  };

  const updateVariant = (index: number, field: keyof Variant, value: string) => {
    const updated = [...variants];
    updated[index][field] = value;
    setVariants(updated);
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }
    
    if (!categoryId) {
      toast.error('Please select a category');
      return;
    }
    
    const validVariants = variants.filter(v => v.price && parseFloat(v.price) > 0);
    if (validVariants.length === 0) {
      toast.error('Please add at least one variant with a price');
      return;
    }

    setIsLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Not authenticated');
        return;
      }

      const slug = generateSlug(name);
      const skuPrefix = slug.substring(0, 10).toUpperCase().replace(/-/g, '');

      // Create product
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          vendor_id: user.id,
          name: name.trim(),
          slug,
          description: description.trim() || null,
          category_id: categoryId,
          is_active: true,
        })
        .select('id')
        .single();

      if (productError) {
        console.error('Product error:', productError);
        toast.error('Failed to create menu item');
        return;
      }

      // Create variants
      const variantInserts = validVariants.map((v, i) => ({
        product_id: product.id,
        sku: v.sku.trim() || `${skuPrefix}-V${i + 1}`,
        price: parseFloat(v.price),
        is_active: true,
      }));

      const { error: variantError } = await supabase
        .from('product_variants')
        .insert(variantInserts);

      if (variantError) {
        console.error('Variant error:', variantError);
        toast.error('Failed to create variants');
        return;
      }

      toast.success('Menu item created!');
      router.push('/cafe/menu');
      router.refresh();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link href="/cafe/menu" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Add Menu Item</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
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
                {isFetchingCategories ? (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading categories...
                  </div>
                ) : (
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
                )}
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
                <div key={index} className="flex gap-3 items-start">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={variant.sku}
                      onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                      placeholder="SKU (optional, e.g., Small, Large)"
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
            <p className="text-xs text-gray-500 mt-3">
              Add variants for different sizes or options (e.g., Small, Large, Fried)
            </p>
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
                Creating...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Create Menu Item
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
