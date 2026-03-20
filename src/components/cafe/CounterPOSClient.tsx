'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote,
  Smartphone,
  UtensilsCrossed,
  Package,
  Truck,
  X,
  Check,
  Loader2,
  Search,
  Grid3X3,
  List,
  Clock,
  DollarSign,
  User,
  Star
} from 'lucide-react';
import CloseShiftModal from './CloseShiftModal';
import OpenShiftModal from './OpenShiftModal';
import toast from 'react-hot-toast';

interface MenuItem {
  id: string;
  name: string;
  slug: string;
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
  notes?: string;
}

// Extract variant display name from SKU (e.g., "TTH-TEA-S" → "S", "TTH-VMOMO-F" → "Fried")
function getVariantDisplayName(sku: string): string {
  const suffix = sku.split('-').pop() || '';
  const displayMap: Record<string, string> = {
    'S': 'Small', 'L': 'Large', 'R': 'Regular', 'F': 'Fried',
  };
  return displayMap[suffix] || suffix;
}

interface CounterPOSClientProps {
  cafeId: string;
  cafeName: string;
  menuItems: MenuItem[];
  categories: Category[];
  userId: string;
}

type OrderType = 'dine_in' | 'takeaway' | 'delivery';
type PaymentMethod = 'cash' | 'esewa' | 'khalti';

export default function CounterPOSClient({
  cafeId,
  cafeName,
  menuItems,
  categories,
  userId,
}: CounterPOSClientProps) {
  const supabase = createClient();
  
  // State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [partySize, setPartySize] = useState(1);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [lastOrder, setLastOrder] = useState<{
    orderNumber: string;
    tokenNumber: number;
    totalCents: number;
  } | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCustomerFields, setShowCustomerFields] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  const validateNepalPhone = (phone: string): boolean => {
    if (!phone) return true; // Empty is fine (optional)
    const cleaned = phone.replace(/\s|-/g, '');
    return /^(97|98)\d{8}$/.test(cleaned);
  };
  
  // Shift state
  const [shiftData, setShiftData] = useState<{
    has_open_shift: boolean;
    shift_id?: string;
    opened_at?: string;
    opening_float_cents?: number;
    current_cash_cents?: number;
    order_count?: number;
  } | null>(null);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  
  // Customer recognition state
  const [recognizedCustomer, setRecognizedCustomer] = useState<{
    name: string;
    total_visits: number;
    usual_items: { product_id: string; name: string; count: number }[];
  } | null>(null);
  const [recentCustomers, setRecentCustomers] = useState<
    { id: string; name: string; phone: string; total_visits: number }[]
  >([]);

  // Cart persistence key
  const CART_STORAGE_KEY = `cafeos_pos_cart_${cafeId}`;

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCart(parsed);
          toast.success(`${parsed.length} items restored from previous session`);
        }
      }
    } catch (err) {
      console.error('Failed to restore cart:', err);
    }
  }, [cafeId]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      if (cart.length > 0) {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      } else {
        localStorage.removeItem(CART_STORAGE_KEY);
      }
    } catch (err) {
      console.error('Failed to save cart:', err);
    }
  }, [cart, CART_STORAGE_KEY]);

  // Fetch shift status on mount
  useEffect(() => {
    fetchShiftStatus();
    fetchRecentCustomers();
  }, [cafeId]);
  
  const fetchShiftStatus = async () => {
    const { data, error } = await supabase.rpc('get_current_shift', { p_cafe_id: cafeId });
    if (!error && data) {
      setShiftData(data);
    }
  };
  
  const fetchRecentCustomers = async () => {
    const { data, error } = await supabase.rpc('get_recent_cafe_customers', { 
      p_cafe_id: cafeId, 
      p_limit: 5 
    });
    if (!error && data) {
      setRecentCustomers(data || []);
    }
  };
  
  // Customer phone lookup with debounce
  useEffect(() => {
    if (customerPhone.length >= 10) {
      const timer = setTimeout(async () => {
        const { data } = await supabase.rpc('get_cafe_customer', {
          p_cafe_id: cafeId,
          p_phone: customerPhone
        });
        if (data?.found) {
          setRecognizedCustomer(data.customer);
          if (data.customer.name && !customerName) {
            setCustomerName(data.customer.name);
          }
        } else {
          setRecognizedCustomer(null);
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setRecognizedCustomer(null);
    }
  }, [customerPhone, cafeId]);

  // Computed values
  const subtotalCents = cart.reduce((sum, item) => sum + (item.quantity * item.unit_price_cents), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Filter menu items
  const filteredItems = menuItems.filter(item => {
    const matchesCategory = !selectedCategory || item.category_id === selectedCategory;
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.variants.some(v => v.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Get unique categories from menu items
  const activeCategories = categories.filter(cat => 
    menuItems.some(item => item.category_id === cat.id)
  );

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
    
    // Quick feedback
    toast.success(`${item.name} added`, { duration: 1000, position: 'bottom-right' });
  }, []);

  // Update cart item quantity
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

  // Remove item from cart
  const removeFromCart = useCallback((variantId: string) => {
    setCart(prev => prev.filter(item => item.variant_id !== variantId));
  }, []);

  // Clear cart
  const clearCart = useCallback(() => {
    setCart([]);
    setTableNumber('');
    setCustomerName('');
    setCustomerPhone('');
    setPartySize(1);
  }, []);

  // Place order
  const placeOrder = async (paymentMethod: PaymentMethod, isPaid: boolean) => {
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
        notes: item.notes || null,
      }));

      const { data, error } = await supabase.rpc('place_cafe_order', {
        p_cafe_id: cafeId,
        p_items: items,
        p_order_type: orderType,
        p_table_number: tableNumber || null,
        p_customer_name: customerName || null,
        p_customer_phone: customerPhone || null,
        p_party_size: partySize,
        p_notes: null,
        p_payment_method: paymentMethod,
        p_is_paid: isPaid,
      });

      if (error) throw error;
      
      if (data?.success) {
        setLastOrder({
          orderNumber: data.order_number,
          tokenNumber: data.token_number,
          totalCents: data.total_cents,
        });
        
        // UF-6: Track customer if phone provided
        if (customerPhone) {
          const orderItems = cart.map(item => ({
            product_id: item.product_id,
            name: item.name,
            quantity: item.quantity,
          }));
          
          await supabase.rpc('upsert_cafe_customer', {
            p_cafe_id: cafeId,
            p_phone: customerPhone,
            p_name: customerName || null,
            p_order_total_cents: data.total_cents,
            p_order_items: orderItems,
          });
          
          // Refresh recent customers list
          fetchRecentCustomers();
        }
        
        // Refresh shift data to update cash totals
        if (shiftData?.has_open_shift) {
          fetchShiftStatus();
        }
        
        toast.success(`Order placed! Token #${data.token_number}`, { duration: 3000 });
        clearCart();
        setShowPaymentModal(false);
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
  const formatPrice = (cents: number) => {
    return `Rs ${(cents / 100).toLocaleString('en-NP')}`;
  };

  const formatShiftTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* Shift Banner */}
      {shiftData && (
        <div className={`px-4 py-2 flex items-center justify-between shrink-0 ${
          shiftData.has_open_shift 
            ? 'bg-green-50 border-b border-green-200' 
            : 'bg-amber-50 border-b border-amber-200'
        }`}>
          {shiftData.has_open_shift ? (
            <>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-green-700">
                    Shift Open: {formatShiftTime(shiftData.opened_at!)}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <DollarSign className="w-4 h-4" />
                  <span>Cash: {formatPrice(shiftData.current_cash_cents || 0)}</span>
                </div>
                <div className="text-sm text-green-600">
                  {shiftData.order_count} orders
                </div>
              </div>
              <button
                onClick={() => setShowCloseShiftModal(true)}
                className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                Close Day
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-700">
                  No active shift — Start your shift to begin taking orders
                </span>
              </div>
              <button
                onClick={() => setShowOpenShiftModal(true)}
                className="px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
              >
                Start Shift
              </button>
            </>
          )}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <UtensilsCrossed className="w-6 h-6 text-orange-600" />
          <h1 className="text-xl font-bold text-gray-900">{cafeName}</h1>
          <span className="text-sm text-gray-500">Counter POS</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Order Type Selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setOrderType('dine_in')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                orderType === 'dine_in' 
                  ? 'bg-white shadow-sm text-orange-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <UtensilsCrossed className="w-4 h-4" />
              Dine-in
            </button>
            <button
              onClick={() => setOrderType('takeaway')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                orderType === 'takeaway' 
                  ? 'bg-white shadow-sm text-orange-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Package className="w-4 h-4" />
              Takeaway
            </button>
            <button
              onClick={() => setOrderType('delivery')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                orderType === 'delivery' 
                  ? 'bg-white shadow-sm text-orange-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Truck className="w-4 h-4" />
              Delivery
            </button>
          </div>
          
          {orderType === 'dine_in' && (
            <input
              type="text"
              placeholder="Table #"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Menu Section */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search & Category Filter */}
          <div className="bg-white border-b border-gray-200 p-4 space-y-3 shrink-0">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            
            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  !selectedCategory 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {activeCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat.id 
                      ? 'bg-orange-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredItems.map(item => (
                <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  {/* Item Image */}
                  {item.image_url && (
                    <div className="aspect-square bg-gray-100 relative">
                      <img 
                        src={item.image_url} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  {/* Item Info */}
                  <div className="p-3">
                    <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">{item.name}</h3>
                    <p className="text-xs text-gray-500 mb-2">{item.category_name}</p>
                    
                    {/* Variants */}
                    <div className="space-y-1.5">
                      {item.variants.map(variant => (
                        <button
                          key={variant.id}
                          onClick={() => addToCart(item, variant)}
                          className="w-full flex items-center justify-between px-3 py-2 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors group"
                        >
                          <span className="text-sm text-gray-700 truncate">
                            {getVariantDisplayName(variant.sku)}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-orange-600">
                              {formatPrice(variant.price_cents)}
                            </span>
                            <Plus className="w-4 h-4 text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {filteredItems.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Search className="w-12 h-12 mb-3 opacity-50" />
                <p>No items found</p>
              </div>
            )}
          </div>
        </div>

        {/* Cart Sidebar */}
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col shrink-0">
          {/* Cart Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-gray-700" />
              <h2 className="font-semibold text-gray-900">Current Order</h2>
              {totalItems > 0 && (
                <span className="bg-orange-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {totalItems}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Clear
              </button>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <ShoppingCart className="w-16 h-16 mb-3 opacity-50" />
                <p className="text-sm">No items in cart</p>
                <p className="text-xs">Tap menu items to add</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div 
                    key={item.variant_id}
                    className="flex items-center gap-3 bg-gray-50 rounded-lg p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm truncate">
                        {item.name}
                      </h4>
                      <p className="text-xs text-gray-500">{getVariantDisplayName(item.variant_sku)}</p>
                      <p className="text-sm font-semibold text-orange-600 mt-1">
                        {formatPrice(item.unit_price_cents * item.quantity)}
                      </p>
                    </div>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.variant_id, -1)}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.variant_id, 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-orange-100 hover:bg-orange-200 text-orange-600 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <button
                      onClick={() => removeFromCart(item.variant_id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer Info — Progressive Disclosure */}
          {cart.length > 0 && (
            <div className="border-t border-gray-200">
              {/* Recognized Customer Banner (always visible when recognized) */}
              {recognizedCustomer && (
                <div className="bg-orange-50 border-b border-orange-200 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium text-orange-700">
                      {recognizedCustomer.name || 'Regular Customer'} — {recognizedCustomer.total_visits} visits!
                    </span>
                  </div>
                  {recognizedCustomer.usual_items?.length > 0 && (
                    <p className="text-xs text-orange-600 mt-0.5">
                      Usual: {recognizedCustomer.usual_items.slice(0, 3).map(i => i.name).join(', ')}
                    </p>
                  )}
                </div>
              )}
              
              {!showCustomerFields && !recognizedCustomer ? (
                <button
                  onClick={() => setShowCustomerFields(true)}
                  className="w-full px-4 py-2.5 text-sm text-gray-500 hover:text-orange-600 hover:bg-orange-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5" />
                  Add customer info
                </button>
              ) : (
                <div className="p-3 space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1 flex flex-col gap-0.5">
                      <input
                        type="tel"
                        placeholder="98XXXXXXXX"
                        value={customerPhone}
                        onChange={(e) => {
                          setCustomerPhone(e.target.value);
                          setPhoneError('');
                        }}
                        onBlur={() => {
                          if (customerPhone && !validateNepalPhone(customerPhone)) {
                            setPhoneError('Nepal number: 10 digits starting with 97/98');
                          } else {
                            setPhoneError('');
                          }
                        }}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                          phoneError ? 'border-red-400 bg-red-50' : 'border-gray-300'
                        }`}
                        autoFocus={showCustomerFields}
                        maxLength={10}
                      />
                      {phoneError && (
                        <p className="text-xs text-red-500 px-1">{phoneError}</p>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  {/* Recent Customers Quick Select */}
                  {!customerPhone && recentCustomers.length > 0 && (
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {recentCustomers.slice(0, 4).map(c => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setCustomerPhone(c.phone);
                            setCustomerName(c.name || '');
                          }}
                          className="px-2.5 py-1.5 bg-gray-100 hover:bg-orange-50 rounded-lg text-xs font-medium text-gray-700 whitespace-nowrap flex-shrink-0"
                        >
                          {c.name || c.phone}
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setShowCustomerFields(false);
                      setCustomerName('');
                      setCustomerPhone('');
                      setPhoneError('');
                    }}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Clear & hide
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Cart Footer - Total & Payment */}
          <div className="p-4 border-t border-gray-200 space-y-3 bg-gray-50">
            {/* Total */}
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-gray-900">Total</span>
              <span className="text-2xl font-bold text-orange-600">
                {formatPrice(subtotalCents)}
              </span>
            </div>

            {/* Payment Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => placeOrder('cash', true)}
                disabled={cart.length === 0 || isPlacingOrder}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors"
              >
                {isPlacingOrder ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Banknote className="w-5 h-5" />
                    Cash
                  </>
                )}
              </button>
              <button
                onClick={() => setShowPaymentModal(true)}
                disabled={cart.length === 0 || isPlacingOrder}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors"
              >
                <Smartphone className="w-5 h-5" />
                Digital
              </button>
            </div>
            
            {/* Pay Later Button */}
            <button
              onClick={() => placeOrder('cash', false)}
              disabled={cart.length === 0 || isPlacingOrder}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors"
            >
              <Check className="w-5 h-5" />
              Send to Kitchen (Pay Later)
            </button>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 m-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Select Payment</h3>
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => placeOrder('esewa', true)}
                disabled={isPlacingOrder}
                className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 hover:border-green-500 rounded-xl transition-colors"
              >
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-900">eSewa</div>
                  <div className="text-sm text-gray-500">Digital wallet payment</div>
                </div>
              </button>
              
              <button
                onClick={() => placeOrder('khalti', true)}
                disabled={isPlacingOrder}
                className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 hover:border-purple-500 rounded-xl transition-colors"
              >
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-900">Khalti</div>
                  <div className="text-sm text-gray-500">Digital wallet payment</div>
                </div>
              </button>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-lg">
                <span className="font-medium">Total to Pay</span>
                <span className="font-bold text-orange-600">{formatPrice(subtotalCents)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Success Toast */}
      {lastOrder && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white p-4 rounded-xl shadow-2xl animate-in slide-in-from-right z-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-lg">Token #{lastOrder.tokenNumber}</div>
              <div className="text-sm opacity-90">{lastOrder.orderNumber}</div>
              <div className="text-sm opacity-90">{formatPrice(lastOrder.totalCents)}</div>
            </div>
            <button 
              onClick={() => setLastOrder(null)}
              className="ml-4 p-1 hover:bg-white/20 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Open Shift Modal */}
      <OpenShiftModal
        isOpen={showOpenShiftModal}
        onClose={() => setShowOpenShiftModal(false)}
        onShiftOpened={() => {
          fetchShiftStatus();
          setShowOpenShiftModal(false);
        }}
        cafeId={cafeId}
      />

      {/* Close Shift Modal */}
      {shiftData?.has_open_shift && shiftData.shift_id && (
        <CloseShiftModal
          isOpen={showCloseShiftModal}
          onClose={() => setShowCloseShiftModal(false)}
          onShiftClosed={() => {
            fetchShiftStatus();
            setShowCloseShiftModal(false);
          }}
          cafeId={cafeId}
          shiftData={{
            shift_id: shiftData.shift_id,
            opened_at: shiftData.opened_at!,
            opening_float_cents: shiftData.opening_float_cents || 0,
            current_cash_cents: shiftData.current_cash_cents || 0,
            order_count: shiftData.order_count || 0,
          }}
        />
      )}
    </div>
  );
}
