'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Banknote,
  Smartphone,
  UtensilsCrossed,
  Package,
  Truck,
  X,
  Check,
  Loader2,
  Search,
  Clock,
  DollarSign,
  User,
  Star,
  ArrowLeft,
  CreditCard,
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
  const [showCustomerFields, setShowCustomerFields] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  const validateNepalPhone = (phone: string): boolean => {
    if (!phone) return true;
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

  const CART_STORAGE_KEY = `cafeos_pos_cart_${cafeId}`;

  // Load cart from localStorage
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

  // Save cart to localStorage
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

  useEffect(() => {
    fetchShiftStatus();
    fetchRecentCustomers();
  }, [cafeId]);

  const fetchShiftStatus = async () => {
    const { data, error } = await supabase.rpc('get_current_shift', { p_cafe_id: cafeId });
    if (!error && data) setShiftData(data);
  };

  const fetchRecentCustomers = async () => {
    const { data, error } = await supabase.rpc('get_recent_cafe_customers', {
      p_cafe_id: cafeId,
      p_limit: 5
    });
    if (!error && data) setRecentCustomers(data || []);
  };

  // Customer phone lookup
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

  // Computed
  const subtotalCents = cart.reduce((sum, item) => sum + (item.quantity * item.unit_price_cents), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = !selectedCategory || item.category_id === selectedCategory;
    const matchesSearch = !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.variants.some(v => v.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const activeCategories = categories.filter(cat =>
    menuItems.some(item => item.category_id === cat.id)
  );

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
    toast.success(`${item.name} added`, { duration: 1000, position: 'bottom-right' });
  }, []);

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

  const removeFromCart = useCallback((variantId: string) => {
    setCart(prev => prev.filter(item => item.variant_id !== variantId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setTableNumber('');
    setCustomerName('');
    setCustomerPhone('');
    setPartySize(1);
    setRecognizedCustomer(null);
    setShowCustomerFields(false);
  }, []);

  const placeOrder = async (paymentMethod: PaymentMethod, isPaid: boolean) => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (!shiftData?.has_open_shift) {
      toast.error('Open a shift before placing orders', { duration: 4000 });
      setShowOpenShiftModal(true);
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

          fetchRecentCustomers();
        }

        fetchShiftStatus();

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

  const formatPrice = (cents: number) => `Rs ${(cents / 100).toLocaleString('en-NP')}`;

  const formatShiftTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="h-screen flex flex-col bg-stone-100 overflow-hidden">
      {/* ═══ TOP BAR: Back + Shift + Order Type ═══ */}
      <header className="bg-white border-b border-stone-200 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/cafe/dashboard"
            className="flex items-center gap-1.5 text-stone-500 hover:text-stone-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">Dashboard</span>
          </Link>
          <div className="h-5 w-px bg-stone-200" />
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-stone-700" />
            <h1 className="text-lg font-bold text-stone-900">{cafeName}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Order Type Toggle */}
          <div className="flex bg-stone-100 rounded-xl p-1">
            {([
              { type: 'dine_in' as const, label: 'Dine-in', icon: UtensilsCrossed },
              { type: 'takeaway' as const, label: 'Takeaway', icon: Package },
              { type: 'delivery' as const, label: 'Delivery', icon: Truck },
            ]).map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                onClick={() => setOrderType(type)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  orderType === type
                    ? 'bg-white shadow-sm text-stone-900'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {orderType === 'dine_in' && (
            <input
              type="text"
              placeholder="Table #"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="w-20 px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-stone-400 focus:border-transparent"
            />
          )}

          {/* Shift Status */}
          {shiftData && (
            <div className="flex items-center gap-2">
              <div className="h-5 w-px bg-stone-200" />
              {shiftData.has_open_shift ? (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-emerald-700 font-medium hidden md:inline">
                      {formatShiftTime(shiftData.opened_at!)}
                    </span>
                    <span className="text-stone-500 hidden lg:inline">
                      · {formatPrice(shiftData.current_cash_cents || 0)} · {shiftData.order_count} orders
                    </span>
                  </div>
                  <button
                    onClick={() => setShowCloseShiftModal(true)}
                    className="px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Close Day
                  </button>
                </>
              ) : (
                <>
                  <span className="text-xs text-stone-400 hidden md:inline">No shift open</span>
                  <button
                    onClick={() => setShowOpenShiftModal(true)}
                    className="px-3 py-1.5 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-800 transition-colors"
                    title="Start tracking cash for today's shift. You'll count the cash at the end."
                  >
                    Open Today&apos;s Shift
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* ═══ MENU SECTION (Left) ═══ */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search & Categories */}
          <div className="bg-white border-b border-stone-200 p-4 space-y-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-stone-400 focus:border-transparent text-sm"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  !selectedCategory
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                All Items
              </button>
              {activeCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
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
                <div key={item.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden hover:shadow-md hover:border-stone-300 transition-all">
                  {item.image_url && (
                    <div className="aspect-[4/3] bg-stone-100 relative">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="p-3">
                    <h3 className="font-semibold text-stone-900 text-sm line-clamp-1">{item.name}</h3>
                    <p className="text-xs text-stone-400 mb-2">{item.category_name}</p>

                    <div className="space-y-1.5">
                      {item.variants.map(variant => (
                        <button
                          key={variant.id}
                          onClick={() => addToCart(item, variant)}
                          className="w-full flex items-center justify-between px-3 py-2.5 bg-stone-50 hover:bg-stone-100 rounded-lg transition-colors group min-h-[44px]"
                        >
                          <span className="text-sm text-stone-700 truncate">
                            {getVariantDisplayName(variant.sku)}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-stone-900">
                              {formatPrice(variant.price_cents)}
                            </span>
                            <Plus className="w-4 h-4 text-stone-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredItems.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-stone-400">
                <Search className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">No items found</p>
                <p className="text-sm">Try a different search or category</p>
              </div>
            )}
          </div>
        </div>

        {/* ═══ CART SIDEBAR (Right) ═══ */}
        <div className="w-96 bg-white border-l border-stone-200 flex flex-col shrink-0">
          {/* Cart Header */}
          <div className="p-4 border-b border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-stone-700" />
              <h2 className="font-bold text-stone-900">Current Order</h2>
              {totalItems > 0 && (
                <span className="bg-stone-900 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {totalItems}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-sm text-rose-600 hover:text-rose-700 font-medium"
              >
                Clear
              </button>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-stone-400">
                <ShoppingCart className="w-16 h-16 mb-3 opacity-30" />
                <p className="text-sm font-medium">No items in cart</p>
                <p className="text-xs">Tap menu items to add</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div
                    key={item.variant_id}
                    className="flex items-center gap-3 bg-stone-50 rounded-xl p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-stone-900 text-sm truncate">
                        {item.name}
                      </h4>
                      <p className="text-xs text-stone-500">{getVariantDisplayName(item.variant_sku)}</p>
                      <p className="text-sm font-bold text-stone-900 mt-1">
                        {formatPrice(item.unit_price_cents * item.quantity)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQuantity(item.variant_id, -1)}
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-stone-200 hover:bg-stone-300 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-bold text-stone-900">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.variant_id, 1)}
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-stone-200 hover:bg-stone-300 text-stone-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.variant_id)}
                      className="p-2 text-stone-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer Info */}
          {cart.length > 0 && (
            <div className="border-t border-stone-200">
              {recognizedCustomer && (
                <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700">
                      {recognizedCustomer.name || 'Regular Customer'} — {recognizedCustomer.total_visits} visits
                    </span>
                  </div>
                  {recognizedCustomer.usual_items?.length > 0 && (
                    <p className="text-xs text-emerald-600 mt-0.5">
                      Usual: {recognizedCustomer.usual_items.slice(0, 3).map(i => i.name).join(', ')}
                    </p>
                  )}
                </div>
              )}

              {!showCustomerFields && !recognizedCustomer ? (
                <button
                  onClick={() => setShowCustomerFields(true)}
                  className="w-full px-4 py-3 text-sm text-stone-500 hover:text-stone-700 hover:bg-stone-50 transition-colors flex items-center justify-center gap-1.5 min-h-[44px]"
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
                        className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-stone-400 focus:border-transparent ${
                          phoneError ? 'border-rose-400 bg-rose-50' : 'border-stone-300'
                        }`}
                        autoFocus={showCustomerFields}
                        maxLength={10}
                      />
                      {phoneError && (
                        <p className="text-xs text-rose-500 px-1">{phoneError}</p>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="flex-1 px-3 py-2.5 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-stone-400 focus:border-transparent"
                    />
                  </div>
                  {!customerPhone && recentCustomers.length > 0 && (
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                      {recentCustomers.slice(0, 4).map(c => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setCustomerPhone(c.phone);
                            setCustomerName(c.name || '');
                          }}
                          className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-medium text-stone-700 whitespace-nowrap flex-shrink-0"
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
                    className="text-xs text-stone-400 hover:text-stone-600"
                  >
                    Clear & hide
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Cart Footer */}
          <div className="p-4 border-t border-stone-200 space-y-3 bg-stone-50">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-stone-900">Total</span>
              <span className="text-2xl font-bold text-stone-900">
                {formatPrice(subtotalCents)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => placeOrder('cash', true)}
                disabled={cart.length === 0 || isPlacingOrder}
                className="flex items-center justify-center gap-2 px-4 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 text-white font-bold rounded-xl transition-colors min-h-[48px]"
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
                className="flex items-center justify-center gap-2 px-4 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-stone-300 text-white font-bold rounded-xl transition-colors min-h-[48px]"
              >
                <Smartphone className="w-5 h-5" />
                Digital
              </button>
            </div>

            <button
              onClick={() => placeOrder('cash', false)}
              disabled={cart.length === 0 || isPlacingOrder}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-stone-700 hover:bg-stone-800 disabled:bg-stone-300 text-white font-bold rounded-xl transition-colors min-h-[48px]"
            >
              <Check className="w-5 h-5" />
              Send to Kitchen (Pay Later)
            </button>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 m-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-stone-900">Select Payment</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-2 hover:bg-stone-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => placeOrder('esewa', true)}
                disabled={isPlacingOrder}
                className="w-full flex items-center gap-4 p-4 border-2 border-stone-200 hover:border-emerald-500 hover:bg-emerald-50 rounded-xl transition-all min-h-[64px]"
              >
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-stone-900">eSewa</div>
                  <div className="text-sm text-stone-500">Digital wallet payment</div>
                </div>
              </button>

              <button
                onClick={() => placeOrder('khalti', true)}
                disabled={isPlacingOrder}
                className="w-full flex items-center gap-4 p-4 border-2 border-stone-200 hover:border-purple-500 hover:bg-purple-50 rounded-xl transition-all min-h-[64px]"
              >
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-stone-900">Khalti</div>
                  <div className="text-sm text-stone-500">Digital wallet payment</div>
                </div>
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-stone-200">
              <div className="flex items-center justify-between text-lg">
                <span className="font-medium text-stone-700">Total to Pay</span>
                <span className="font-bold text-stone-900">{formatPrice(subtotalCents)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Success Toast */}
      {lastOrder && (
        <div className="fixed bottom-4 right-4 bg-emerald-600 text-white p-4 rounded-xl shadow-2xl z-50">
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

      {/* Shift Modals */}
      <OpenShiftModal
        isOpen={showOpenShiftModal}
        onClose={() => setShowOpenShiftModal(false)}
        onShiftOpened={() => {
          fetchShiftStatus();
          setShowOpenShiftModal(false);
        }}
        cafeId={cafeId}
      />

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
