'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { 
  Search, 
  Clock,
  CheckCircle,
  ChefHat,
  Banknote,
  Smartphone,
  AlertCircle,
  Eye,
  Printer,
  RefreshCw,
  X,
  MapPin,
  User,
  Receipt,
  CreditCard,
  MoreHorizontal,
  Filter,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatRs } from '@/lib/formatRs';

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string | null;
  total_cents: number;
  table_number: string | null;
  order_type: string;
  primary_customer_name: string | null;
  source: string | null;
  created_at: string;
  kitchen_tickets: { token_number: number; status: string }[];
  order_items?: { quantity: number; product_name: string; unit_price_cents: number }[];
}

interface OrderStats {
  totalOrders: number;
  paidCount: number;
  unpaidCount: number;
  paidAmount: number;
  unpaidAmount: number;
  cashAmount: number;
  digitalAmount: number;
}

interface OrdersClientProps {
  cafeId: string;
  cafeName: string;
  initialOrders: Order[];
  initialStats: OrderStats;
  initialFilter: {
    payment?: string;
    status?: string;
    date?: string;
  };
}

const PAYMENT_FILTERS = [
  { value: '', label: 'All Orders', color: 'bg-stone-100 text-stone-700' },
  { value: 'unpaid', label: 'Unpaid', color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
  { value: 'paid', label: 'Paid', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
];

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  processing: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
};

const KITCHEN_STATUS_STYLES: Record<string, { bg: string; text: string; pulse?: boolean }> = {
  pending: { bg: 'bg-amber-500', text: 'text-white', pulse: true },
  preparing: { bg: 'bg-blue-500', text: 'text-white', pulse: true },
  ready: { bg: 'bg-emerald-500', text: 'text-white' },
  served: { bg: 'bg-stone-400', text: 'text-white' },
};

export default function OrdersClient({
  cafeId,
  cafeName,
  initialOrders,
  initialStats,
  initialFilter,
}: OrdersClientProps) {
  const supabase = createClient();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [stats, setStats] = useState<OrderStats>(initialStats);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState(initialFilter.payment || '');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreOrders, setHasMoreOrders] = useState(initialOrders.length >= 30);
  const [oldestOrderDate, setOldestOrderDate] = useState<string | null>(
    initialOrders.length > 0 ? initialOrders[initialOrders.length - 1].created_at : null
  );
  
  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.primary_customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.table_number?.includes(searchTerm) ||
      order.kitchen_tickets?.[0]?.token_number?.toString().includes(searchTerm);
    
    const matchesPayment = !paymentFilter || order.payment_status === paymentFilter;
    
    return matchesSearch && matchesPayment;
  });

  // Group orders by time
  const groupOrdersByTime = (orders: Order[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    const groups: { label: string; orders: Order[] }[] = [
      { label: 'Now', orders: [] },
      { label: 'Earlier Today', orders: [] },
      { label: 'Yesterday', orders: [] },
      { label: 'Older', orders: [] },
    ];
    
    orders.forEach(order => {
      const orderDate = new Date(order.created_at);
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      if (orderDate >= hourAgo) {
        groups[0].orders.push(order);
      } else if (orderDate >= today) {
        groups[1].orders.push(order);
      } else if (orderDate >= yesterday) {
        groups[2].orders.push(order);
      } else {
        groups[3].orders.push(order);
      }
    });
    
    return groups.filter(g => g.orders.length > 0);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const getSourceIcon = (source: string | null) => {
    switch (source) {
      case 'pos': return <Receipt className="w-3.5 h-3.5" />;
      case 'qr_menu': return <Smartphone className="w-3.5 h-3.5" />;
      case 'waiter_app': return <User className="w-3.5 h-3.5" />;
      default: return <Receipt className="w-3.5 h-3.5" />;
    }
  };

  const loadMoreOrders = async () => {
    if (!oldestOrderDate || isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      const { data: moreOrders, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          payment_status,
          payment_method,
          total_cents,
          table_number,
          order_type,
          primary_customer_name,
          source,
          created_at,
          kitchen_tickets(token_number, status)
        `)
        .eq('cafe_id', cafeId)
        .lt('created_at', oldestOrderDate)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;

      if (moreOrders && moreOrders.length > 0) {
        const mappedOrders: Order[] = moreOrders.map((o: any) => ({
          id: o.id,
          order_number: o.order_number,
          status: o.status,
          payment_status: o.payment_status,
          payment_method: o.payment_method || null,
          total_cents: o.total_cents,
          table_number: o.table_number,
          order_type: o.order_type,
          primary_customer_name: o.primary_customer_name,
          source: o.source || null,
          created_at: o.created_at,
          kitchen_tickets: o.kitchen_tickets || [],
        }));
        
        setOrders(prev => [...prev, ...mappedOrders]);
        setOldestOrderDate(mappedOrders[mappedOrders.length - 1].created_at);
        setHasMoreOrders(mappedOrders.length >= 30);
      } else {
        setHasMoreOrders(false);
      }
    } catch (error) {
      console.error('Error loading more orders:', error);
      toast.error('Failed to load more orders');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleMarkPaid = async (orderId: string, method: 'cash' | 'esewa' | 'fonepay' | 'card') => {
    setIsMarkingPaid(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          payment_status: 'paid',
          payment_method: method,
          paid_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      // Update local state
      setOrders(orders.map(o => 
        o.id === orderId 
          ? { ...o, payment_status: 'paid', payment_method: method }
          : o
      ));
      
      // Update stats
      const order = orders.find(o => o.id === orderId);
      if (order) {
        setStats({
          ...stats,
          paidCount: stats.paidCount + 1,
          unpaidCount: stats.unpaidCount - 1,
          paidAmount: stats.paidAmount + order.total_cents,
          unpaidAmount: stats.unpaidAmount - order.total_cents,
          cashAmount: method === 'cash' ? stats.cashAmount + order.total_cents : stats.cashAmount,
          digitalAmount: method !== 'cash' ? stats.digitalAmount + order.total_cents : stats.digitalAmount,
        });
      }
      
      setSelectedOrder(null);
      toast.success('Payment recorded!');
    } catch (error) {
      console.error('Error marking paid:', error);
      toast.error('Failed to update payment');
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const groupedOrders = groupOrdersByTime(filteredOrders);

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Header with Stats */}
      <header className="bg-gradient-to-br from-stone-800 to-stone-900 text-white px-4 py-5 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link href="/cafe/dashboard" className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <Receipt className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-lg font-bold">Orders</h1>
                <p className="text-xs text-stone-400">{cafeName}</p>
              </div>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {/* Live Stats Bar */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <div className="text-2xl font-bold tabular-nums">{stats.totalOrders}</div>
              <div className="text-xs text-stone-400">Total</div>
            </div>
            <div className="bg-emerald-500/20 backdrop-blur rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-emerald-400 tabular-nums">{formatRs(stats.paidAmount)}</div>
              <div className="text-xs text-emerald-300">{stats.paidCount} paid</div>
            </div>
            <div className="bg-amber-500/20 backdrop-blur rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-amber-400 tabular-nums">{formatRs(stats.unpaidAmount)}</div>
              <div className="text-xs text-amber-300">{stats.unpaidCount} unpaid</div>
            </div>
            <div className="bg-blue-500/20 backdrop-blur rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-2">
                <Banknote className="w-4 h-4 text-green-400" />
                <span className="text-sm font-bold text-green-400">{Math.round(stats.cashAmount / (stats.paidAmount || 1) * 100)}%</span>
              </div>
              <div className="text-xs text-stone-400">Cash</div>
            </div>
          </div>
        </div>
      </header>

      {/* Search & Filters */}
      <div className="bg-white border-b border-stone-200 px-4 py-3 sticky top-[140px] z-10">
        <div className="max-w-4xl mx-auto space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by token, table, customer..."
              className="w-full pl-12 pr-4 py-3 bg-stone-100 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-stone-200 rounded-full"
              >
                <X className="w-4 h-4 text-stone-400" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {PAYMENT_FILTERS.map(filter => (
              <button
                key={filter.value}
                onClick={() => setPaymentFilter(filter.value)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  paymentFilter === filter.value
                    ? 'bg-stone-800 text-white shadow-lg'
                    : filter.color
                }`}
              >
                {filter.icon && <filter.icon className="w-4 h-4" />}
                {filter.label}
                {filter.value === 'unpaid' && stats.unpaidCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                    {stats.unpaidCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders List */}
      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {groupedOrders.length > 0 ? (
          groupedOrders.map(group => (
            <div key={group.label}>
              <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 px-1">
                {group.label}
              </h3>
              <div className="space-y-2">
                {group.orders.map(order => {
                  const kitchenStatus = order.kitchen_tickets?.[0]?.status;
                  const kitchenStyle = kitchenStatus ? KITCHEN_STATUS_STYLES[kitchenStatus] : null;
                  
                  return (
                    <div
                      key={order.id}
                      className={`bg-white rounded-2xl p-4 shadow-sm border-2 transition-all hover:shadow-md cursor-pointer ${
                        order.payment_status === 'unpaid' 
                          ? 'border-amber-200 hover:border-amber-300' 
                          : 'border-transparent hover:border-stone-200'
                      }`}
                      onClick={() => setSelectedOrder(order)}
                    >
                      <div className="flex items-start justify-between">
                        {/* Left: Token & Info */}
                        <div className="flex items-start gap-3">
                          {/* Token Number */}
                          <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center ${
                            kitchenStyle ? kitchenStyle.bg : 'bg-stone-100'
                          } ${kitchenStyle?.pulse ? 'animate-pulse' : ''}`}>
                            <span className={`text-xl font-bold ${kitchenStyle ? kitchenStyle.text : 'text-stone-600'}`}>
                              {order.kitchen_tickets?.[0]?.token_number || '—'}
                            </span>
                            {kitchenStatus && (
                              <span className={`text-[10px] uppercase ${kitchenStyle?.text}`}>
                                {kitchenStatus}
                              </span>
                            )}
                          </div>
                          
                          {/* Order Info */}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-stone-900">{formatRs(order.total_cents)}</span>
                              {order.payment_status === 'unpaid' && (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  Unpaid
                                </span>
                              )}
                              {order.payment_status === 'paid' && (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  {order.payment_method === 'cash' || !order.payment_method ? 'Cash' : 'Digital'}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-sm text-stone-500">
                              {order.table_number && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  Table {order.table_number}
                                </span>
                              )}
                              {order.primary_customer_name && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {order.primary_customer_name}
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-stone-400">
                                {getSourceIcon(order.source)}
                                {formatTime(order.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Quick Action */}
                        {order.payment_status === 'unpaid' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrder(order);
                            }}
                            className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors"
                          >
                            Collect
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-8 h-8 text-stone-400" />
            </div>
            <h3 className="font-medium text-stone-900 mb-1">No orders found</h3>
            <p className="text-sm text-stone-500">
              {searchTerm ? 'Try a different search term' : 'Orders will appear here as they come in'}
            </p>
          </div>
        )}

        {/* Load More Button */}
        {hasMoreOrders && !searchTerm && !paymentFilter && (
          <div className="text-center py-6">
            <button
              onClick={loadMoreOrders}
              disabled={isLoadingMore}
              className="px-6 py-3 bg-white border border-stone-200 rounded-xl font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 transition-colors"
            >
              {isLoadingMore ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Loading...
                </span>
              ) : (
                'Load More Orders'
              )}
            </button>
          </div>
        )}
      </main>

      {/* Order Detail / Payment Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white rounded-t-3xl sm:rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  selectedOrder.payment_status === 'unpaid' ? 'bg-amber-100' : 'bg-emerald-100'
                }`}>
                  <span className={`text-xl font-bold ${
                    selectedOrder.payment_status === 'unpaid' ? 'text-amber-700' : 'text-emerald-700'
                  }`}>
                    {selectedOrder.kitchen_tickets?.[0]?.token_number || '#'}
                  </span>
                </div>
                <div>
                  <h2 className="font-bold text-stone-900">Order #{selectedOrder.order_number.slice(-6)}</h2>
                  <p className="text-sm text-stone-500">{formatTime(selectedOrder.created_at)}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-stone-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order Summary */}
            <div className="p-4 space-y-4">
              {/* Amount */}
              <div className="text-center py-4">
                <div className="text-4xl font-bold text-stone-900">{formatRs(selectedOrder.total_cents)}</div>
                <div className={`inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-sm font-medium ${
                  selectedOrder.payment_status === 'unpaid' 
                    ? 'bg-amber-100 text-amber-700' 
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {selectedOrder.payment_status === 'unpaid' ? (
                    <><AlertCircle className="w-4 h-4" /> Payment Pending</>
                  ) : (
                    <><CheckCircle className="w-4 h-4" /> Paid via {selectedOrder.payment_method}</>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="bg-stone-50 rounded-xl p-3 space-y-2 text-sm">
                {selectedOrder.table_number && (
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Table</span>
                    <span className="font-medium">{selectedOrder.table_number}</span>
                  </div>
                )}
                {selectedOrder.primary_customer_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Customer</span>
                    <span className="font-medium">{selectedOrder.primary_customer_name}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Type</span>
                  <span className="font-medium capitalize">{selectedOrder.order_type?.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Kitchen</span>
                  <span className={`font-medium capitalize ${
                    selectedOrder.kitchen_tickets?.[0]?.status === 'ready' ? 'text-emerald-600' :
                    selectedOrder.kitchen_tickets?.[0]?.status === 'preparing' ? 'text-blue-600' :
                    'text-amber-600'
                  }`}>
                    {selectedOrder.kitchen_tickets?.[0]?.status || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Payment Actions */}
              {selectedOrder.payment_status === 'unpaid' && (
                <div className="space-y-3">
                  <p className="text-sm text-stone-500 text-center">Select payment method:</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleMarkPaid(selectedOrder.id, 'cash')}
                      disabled={isMarkingPaid}
                      className="flex flex-col items-center gap-2 p-4 bg-green-50 hover:bg-green-100 border-2 border-green-200 rounded-2xl transition-colors disabled:opacity-50"
                    >
                      <Banknote className="w-8 h-8 text-green-600" />
                      <span className="font-medium text-green-700">Cash</span>
                    </button>
                    <button
                      onClick={() => handleMarkPaid(selectedOrder.id, 'esewa')}
                      disabled={isMarkingPaid}
                      className="flex flex-col items-center gap-2 p-4 bg-green-50 hover:bg-green-100 border-2 border-green-200 rounded-2xl transition-colors disabled:opacity-50"
                    >
                      <Smartphone className="w-8 h-8 text-green-600" />
                      <span className="font-medium text-green-700">eSewa</span>
                    </button>
                    <button
                      onClick={() => handleMarkPaid(selectedOrder.id, 'fonepay')}
                      disabled={isMarkingPaid}
                      className="flex flex-col items-center gap-2 p-4 bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 rounded-2xl transition-colors disabled:opacity-50"
                    >
                      <Smartphone className="w-8 h-8 text-purple-600" />
                      <span className="font-medium text-purple-700">FonePay</span>
                    </button>
                    <button
                      onClick={() => handleMarkPaid(selectedOrder.id, 'card')}
                      disabled={isMarkingPaid}
                      className="flex flex-col items-center gap-2 p-4 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 rounded-2xl transition-colors disabled:opacity-50"
                    >
                      <CreditCard className="w-8 h-8 text-blue-600" />
                      <span className="font-medium text-blue-700">Card</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-stone-100 hover:bg-stone-200 rounded-xl font-medium transition-colors">
                  <Eye className="w-5 h-5" />
                  View Details
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-stone-100 hover:bg-stone-200 rounded-xl font-medium transition-colors">
                  <Printer className="w-5 h-5" />
                  Print Bill
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
