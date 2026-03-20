'use client';

import React, { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2,
  X,
  Check,
  Loader2,
  Search,
  UtensilsCrossed,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

interface MenuItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string;
  category_name: string;
  variants: {
    id: string;
    sku: string;
    price_cents: number;
  }[];
  image_url: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface CartItem {
  variant_id: string;
  product_id: string;
  name: string;
  variant_sku: string;
  quantity: number;
  unit_price_cents: number;
}

interface CustomerMenuClientProps {
  cafeId: string;
  cafeName: string;
  menuItems: MenuItem[];
  categories: Category[];
  tableNumber?: string;
}

function getVariantDisplayName(sku: string): string {
  const suffix = sku.split('-').pop() || '';
  const displayMap: Record<string, string> = {
    'S': 'Small', 'L': 'Large', 'R': 'Regular', 'F': 'Fried',
  };
  return displayMap[suffix] || suffix;
}

export default function CustomerMenuClient({
  cafeId,
  cafeName,
  menuItems,
  categories,
  tableNumber,
}: CustomerMenuClientProps) {
  const supabase = createClient();
  
  // State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderSuccess, setOrderSuccess] = useState<{
    orderId: string;
    orderNumber: string;
    tokenNumber: number;
  } | null>(null);

  // Computed values
  const subtotalCents = cart.reduce((sum, item) => sum + (item.quantity * item.unit_price_cents), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Filter menu items
  const filteredItems = menuItems.filter(item => {
    const matchesCategory = !selectedCategory || item.category_id === selectedCategory;
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Group items by category
  const groupedItems = filteredItems.reduce((acc, item) => {
    const catName = item.category_name;
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  // Add item to cart
  const addToCart = useCallback((item: MenuItem, variant: MenuItem['variants'][0]) => {
    setCart(prev => {
      const existing = prev.find(c => c.variant_id === variant.id);
      if (existing) {
        return prev.map(c => 
          c.variant_id === variant.id 
            ? { ...c, quantity: c.quantity + 1 }
            : c
        );
      }
      return [...prev, {
        variant_id: variant.id,
        product_id: item.id,
        name: item.name,
        variant_sku: variant.sku,
        quantity: 1,
        unit_price_cents: variant.price_cents,
      }];
    });
    toast.success(`${item.name} added`, { duration: 1000 });
  }, []);

  // Update quantity
  const updateQuantity = useCallback((variantId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.variant_id === variantId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  }, []);

  // Remove from cart
  const removeFromCart = useCallback((variantId: string) => {
    setCart(prev => prev.filter(item => item.variant_id !== variantId));
  }, []);

  // Place order (unpaid - pay later)
  const placeOrder = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setIsPlacingOrder(true);
    
    try {
      const items = cart.map(item => ({
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_price_cents: item.unit_price_cents,
        notes: null,
      }));

      const { data, error } = await supabase.rpc('place_cafe_order', {
        p_cafe_id: cafeId,
        p_items: items,
        p_order_type: 'dine_in',
        p_table_number: tableNumber || null,
        p_customer_name: customerName || null,
        p_customer_phone: customerPhone || null,
        p_party_size: 1,
        p_notes: null,
        p_payment_method: 'cash',
        p_is_paid: false, // Deferred payment
      });

      if (error) throw error;
      
      if (data?.success) {
        setOrderSuccess({
          orderId: data.order_id,
          orderNumber: data.order_number,
          tokenNumber: data.token_number,
        });
        setCart([]);
        setShowCart(false);
      } else {
        throw new Error(data?.error || 'Failed to place order');
      }
    } catch (error) {
      console.error('Order error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to place order');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Format price
  const formatPrice = (cents: number) => `Rs ${(cents / 100).toLocaleString('en-NP')}`;

  // Generate cafe slug for tracking link
  const cafeSlug = cafeName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  // Order success screen
  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-500 to-green-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h1>
          <p className="text-gray-600 mb-6">Your order has been sent to the kitchen</p>
          
          <div className="bg-gray-100 rounded-2xl p-6 mb-6">
            <div className="text-6xl font-bold text-orange-600 mb-2">
              #{orderSuccess.tokenNumber}
            </div>
            <div className="text-sm text-gray-500">Your Token Number</div>
          </div>
          
          <p className="text-sm text-gray-500 mb-4">
            Order: {orderSuccess.orderNumber}
          </p>
          
          {tableNumber && (
            <p className="text-sm text-gray-600 mb-4">
              Table: {tableNumber}
            </p>
          )}
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-yellow-800">
              💰 Please pay at the counter when you're ready to leave
            </p>
          </div>
          
          <div className="space-y-3">
            <a
              href={`/${cafeSlug}/order/${orderSuccess.orderId}`}
              className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <ChevronRight className="w-5 h-5" />
              Track Order Status
            </a>
            
            <button
              onClick={() => {
                setOrderSuccess(null);
                setCustomerName('');
                setCustomerPhone('');
              }}
              className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl transition-colors"
            >
              Order More
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-6 h-6 text-orange-600" />
              <h1 className="text-xl font-bold text-gray-900">{cafeName}</h1>
            </div>
            {tableNumber && (
              <span className="px-3 py-1 bg-orange-100 text-orange-600 text-sm font-medium rounded-full">
                Table {tableNumber}
              </span>
            )}
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-0 rounded-xl focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
        
        {/* Category Pills */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              !selectedCategory 
                ? 'bg-orange-600 text-white' 
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id 
                  ? 'bg-orange-600 text-white' 
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </header>

      {/* Menu Content */}
      <main className="pb-32 px-4 py-4">
        {Object.entries(groupedItems).map(([categoryName, items]) => (
          <div key={categoryName} className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">{categoryName}</h2>
            <div className="space-y-3">
              {items.map(item => (
                <div 
                  key={item.id}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                >
                  <div className="flex gap-4">
                    {item.image_url && (
                      <img 
                        src={item.image_url} 
                        alt={item.name}
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      {item.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                      )}
                      
                      {/* Variants */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {item.variants.map(variant => (
                          <button
                            key={variant.id}
                            onClick={() => addToCart(item, variant)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
                          >
                            <span className="text-sm text-gray-700">
                              {getVariantDisplayName(variant.sku)}
                            </span>
                            <span className="text-sm font-semibold text-orange-600">
                              {formatPrice(variant.price_cents)}
                            </span>
                            <Plus className="w-4 h-4 text-orange-600" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {filteredItems.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No items found</p>
          </div>
        )}
      </main>

      {/* Cart Button */}
      {totalItems > 0 && !showCart && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-4 left-4 right-4 bg-orange-600 hover:bg-orange-700 text-white py-4 px-6 rounded-2xl flex items-center justify-between shadow-lg z-50"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingCart className="w-6 h-6" />
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-orange-600 text-xs font-bold rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            </div>
            <span className="font-semibold">View Cart</span>
          </div>
          <span className="font-bold text-lg">{formatPrice(subtotalCents)}</span>
        </button>
      )}

      {/* Cart Modal */}
      {showCart && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white rounded-t-3xl w-full max-h-[85vh] flex flex-col animate-in slide-in-from-bottom">
            {/* Cart Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Your Order</h2>
              <button 
                onClick={() => setShowCart(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.map(item => (
                <div 
                  key={item.variant_id}
                  className="flex items-center gap-3 bg-gray-50 rounded-xl p-3"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                    <p className="text-sm text-gray-500">{getVariantDisplayName(item.variant_sku)}</p>
                    <p className="text-sm font-semibold text-orange-600 mt-1">
                      {formatPrice(item.unit_price_cents * item.quantity)}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.variant_id, -1)}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.variant_id, 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-orange-100 text-orange-600"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <button
                    onClick={() => removeFromCart(item.variant_id)}
                    className="p-2 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            
            {/* Customer Info */}
            <div className="p-4 border-t border-gray-200 space-y-3">
              <input
                type="text"
                placeholder="Your name (optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
              />
              <input
                type="tel"
                placeholder="Phone number (optional)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
              />
            </div>
            
            {/* Cart Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-2xl font-bold text-orange-600">
                  {formatPrice(subtotalCents)}
                </span>
              </div>
              
              <button
                onClick={placeOrder}
                disabled={isPlacingOrder || cart.length === 0}
                className="w-full py-4 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white font-bold rounded-xl flex items-center justify-center gap-2"
              >
                {isPlacingOrder ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Place Order (Pay at Counter)
                  </>
                )}
              </button>
              
              <p className="text-xs text-center text-gray-500 mt-3">
                You can pay when you're ready to leave
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
