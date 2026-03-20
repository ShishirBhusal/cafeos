'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Clock, 
  ChefHat, 
  Check, 
  CreditCard,
  UtensilsCrossed,
  RefreshCw
} from 'lucide-react';

interface OrderItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  kitchenStatus: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalCents: number;
  tableNumber: string | null;
  createdAt: string;
  tokenNumber?: number;
  kitchenStatus: string;
  items: OrderItem[];
}

interface OrderStatusClientProps {
  order: Order;
  cafeName: string;
}

function getVariantDisplayName(sku: string): string {
  const suffix = sku.split('-').pop() || '';
  const displayMap: Record<string, string> = {
    'S': 'Small', 'L': 'Large', 'R': 'Regular', 'F': 'Fried',
  };
  return displayMap[suffix] || suffix;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Waiting', color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-5 h-5" /> },
  preparing: { label: 'Preparing', color: 'bg-blue-100 text-blue-800', icon: <ChefHat className="w-5 h-5" /> },
  ready: { label: 'Ready!', color: 'bg-green-100 text-green-800', icon: <Check className="w-5 h-5" /> },
  served: { label: 'Served', color: 'bg-gray-100 text-gray-800', icon: <UtensilsCrossed className="w-5 h-5" /> },
};

export default function OrderStatusClient({ order: initialOrder, cafeName }: OrderStatusClientProps) {
  const supabase = createClient();
  const [order, setOrder] = useState(initialOrder);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel(`order-${order.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'kitchen_tickets',
        filter: `order_id=eq.${order.id}`
      }, (payload) => {
        console.log('Kitchen ticket update:', payload);
        setOrder(prev => ({
          ...prev,
          kitchenStatus: payload.new.status,
        }));
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [order.id, supabase]);

  // Manual refresh
  const refreshStatus = async () => {
    setIsRefreshing(true);
    try {
      const { data } = await supabase
        .from('kitchen_tickets')
        .select('status')
        .eq('order_id', order.id)
        .single();
      
      if (data) {
        setOrder(prev => ({ ...prev, kitchenStatus: data.status }));
      }
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const status = statusConfig[order.kitchenStatus] || statusConfig.pending;
  const formatPrice = (cents: number) => `Rs ${(cents / 100).toLocaleString('en-NP')}`;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{cafeName}</h1>
            <p className="text-sm text-gray-500">Order Status</p>
          </div>
          <button
            onClick={refreshStatus}
            disabled={isRefreshing}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto">
        {/* Token Number */}
        <div className="bg-white rounded-2xl p-6 text-center mb-4 shadow-sm">
          <p className="text-sm text-gray-500 mb-2">Your Token</p>
          <div className="text-6xl font-bold text-orange-600 mb-2">
            #{order.tokenNumber || '—'}
          </div>
          <p className="text-sm text-gray-500">{order.orderNumber}</p>
        </div>

        {/* Status Card */}
        <div className={`rounded-2xl p-6 mb-4 ${status.color}`}>
          <div className="flex items-center justify-center gap-3">
            {status.icon}
            <span className="text-xl font-bold">{status.label}</span>
          </div>
          
          {order.kitchenStatus === 'preparing' && (
            <p className="text-center mt-2 text-sm opacity-80">
              Your order is being prepared
            </p>
          )}
          
          {order.kitchenStatus === 'ready' && (
            <p className="text-center mt-2 text-sm opacity-80">
              Please collect your order!
            </p>
          )}
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-3">Order Items</h2>
          <div className="space-y-2">
            {order.items.map(item => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <span className="font-medium text-gray-900">{item.quantity}x </span>
                  <span className="text-gray-700">{item.name}</span>
                  <span className="text-gray-500 text-sm ml-1">({getVariantDisplayName(item.sku)})</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Status */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900">{formatPrice(order.totalCents)}</p>
            </div>
            <div className={`px-4 py-2 rounded-full text-sm font-medium ${
              order.paymentStatus === 'paid' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {order.paymentStatus === 'paid' ? '✓ Paid' : '💰 Pay at Counter'}
            </div>
          </div>
          
          {order.tableNumber && (
            <p className="text-sm text-gray-500 mt-3">
              Table: {order.tableNumber}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
