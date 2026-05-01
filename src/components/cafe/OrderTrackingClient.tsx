'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { 
  Clock, 
  ChefHat, 
  Check, 
  Bell,
  UtensilsCrossed,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';

interface OrderTrackingClientProps {
  cafeId: string;
  cafeName: string;
  cafeSlug: string;
  order: {
    id: string;
    orderNumber: string;
    totalCents: number;
    paymentStatus: string;
    tableNumber: string | null;
    createdAt: string;
  };
  ticket: {
    id: string;
    tokenNumber: number;
    status: string;
    prepStartedAt: string | null;
    completedAt: string | null;
  } | null;
}

const STATUS_STEPS = [
  { key: 'pending', label: 'Order Received', icon: Clock, description: 'Your order is in the queue' },
  { key: 'preparing', label: 'Preparing', icon: ChefHat, description: 'Kitchen is making your order' },
  { key: 'ready', label: 'Ready!', icon: Bell, description: 'Pick up your order' },
  { key: 'served', label: 'Served', icon: Check, description: 'Enjoy your meal!' },
];

export default function OrderTrackingClient({
  cafeId,
  cafeName,
  cafeSlug,
  order,
  ticket: initialTicket,
}: OrderTrackingClientProps) {
  const supabase = createClient();
  const [ticket, setTicket] = useState(initialTicket);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!ticket?.id) return;

    const channel = supabase
      .channel(`ticket-${ticket.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'kitchen_tickets',
          filter: `id=eq.${ticket.id}`,
        },
        (payload) => {
          setTicket(prev => prev ? {
            ...prev,
            status: payload.new.status,
            prepStartedAt: payload.new.prep_started_at,
            completedAt: payload.new.completed_at,
          } : null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, ticket?.id]);

  // Manual refresh
  const refreshStatus = async () => {
    if (!ticket?.id) return;
    
    setIsRefreshing(true);
    try {
      const { data } = await supabase
        .from('kitchen_tickets')
        .select('status, prep_started_at, completed_at')
        .eq('id', ticket.id)
        .single();
      
      if (data) {
        setTicket(prev => prev ? {
          ...prev,
          status: data.status,
          prepStartedAt: data.prep_started_at,
          completedAt: data.completed_at,
        } : null);
      }
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatPrice = (cents: number) => `Rs ${(cents / 100).toLocaleString('en-NP')}`;
  
  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const currentStatus = ticket?.status || 'pending';
  const currentStepIndex = STATUS_STEPS.findIndex(s => s.key === currentStatus);

  // Get status-specific colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'yellow';
      case 'preparing': return 'blue';
      case 'ready': return 'green';
      case 'served': return 'gray';
      default: return 'yellow';
    }
  };

  const statusColor = getStatusColor(currentStatus);

  return (
    <div className={`min-h-screen bg-gradient-to-b from-${statusColor}-500 to-${statusColor}-600`}>
      {/* Header */}
      <header className="px-4 py-4 flex items-center justify-between">
        <Link 
          href={`/${cafeSlug}/menu`}
          className="flex items-center gap-2 text-white/80 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Menu</span>
        </Link>
        <button
          onClick={refreshStatus}
          disabled={isRefreshing}
          className="p-2 text-white/80 hover:text-white"
        >
          <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* Main Content */}
      <main className="px-4 pb-8">
        {/* Token Display */}
        <div className="text-center mb-8">
          <p className="text-white/80 text-sm mb-2">Your Token Number</p>
          <div className="inline-block bg-white rounded-xl px-8 py-4 shadow-lg">
            <span className="text-6xl font-bold text-gray-900">
              #{ticket?.tokenNumber || '—'}
            </span>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-3xl p-6 shadow-xl mb-6">
          {/* Current Status */}
          <div className="text-center mb-6">
            <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
              currentStatus === 'pending' ? 'bg-yellow-100' :
              currentStatus === 'preparing' ? 'bg-blue-100 animate-pulse' :
              currentStatus === 'ready' ? 'bg-green-100' :
              'bg-gray-100'
            }`}>
              {currentStatus === 'pending' && <Clock className="w-10 h-10 text-yellow-600" />}
              {currentStatus === 'preparing' && <ChefHat className="w-10 h-10 text-blue-600" />}
              {currentStatus === 'ready' && <Bell className="w-10 h-10 text-green-600" />}
              {currentStatus === 'served' && <Check className="w-10 h-10 text-gray-600" />}
            </div>
            <h2 className={`text-2xl font-bold ${
              currentStatus === 'pending' ? 'text-yellow-600' :
              currentStatus === 'preparing' ? 'text-blue-600' :
              currentStatus === 'ready' ? 'text-green-600' :
              'text-gray-600'
            }`}>
              {STATUS_STEPS[currentStepIndex]?.label || 'Processing'}
            </h2>
            <p className="text-gray-500 mt-1">
              {STATUS_STEPS[currentStepIndex]?.description}
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-6">
            {STATUS_STEPS.slice(0, 3).map((step, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const StepIcon = step.icon;
              
              return (
                <React.Fragment key={step.key}>
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isCompleted ? 'bg-green-500 text-white' :
                      isCurrent ? 'bg-stone-900 text-white' :
                      'bg-gray-200 text-gray-400'
                    }`}>
                      {isCompleted ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <StepIcon className="w-5 h-5" />
                      )}
                    </div>
                    <span className={`text-xs mt-1 ${
                      isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  {index < 2 && (
                    <div className={`flex-1 h-1 mx-2 rounded ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Order Details */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-between text-sm text-gray-500 mb-2">
              <span>Order #</span>
              <span className="font-medium text-gray-900">{order.orderNumber}</span>
            </div>
            {order.tableNumber && (
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>Table</span>
                <span className="font-medium text-gray-900">{order.tableNumber}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-500 mb-2">
              <span>Ordered at</span>
              <span className="font-medium text-gray-900">{formatTime(order.createdAt)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Total</span>
              <span className="font-bold text-stone-700">{formatPrice(order.totalCents)}</span>
            </div>
          </div>
        </div>

        {/* Payment Reminder */}
        {order.paymentStatus === 'unpaid' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-yellow-800 text-center">
              💰 Remember to pay <strong>{formatPrice(order.totalCents)}</strong> at the counter
            </p>
          </div>
        )}

        {/* Ready Alert */}
        {currentStatus === 'ready' && (
          <div className="bg-green-50 border-2 border-green-300 rounded-xl p-6 text-center animate-pulse">
            <Bell className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-green-800">Your Order is Ready!</h3>
            <p className="text-green-600 mt-1">Please collect from the counter</p>
          </div>
        )}

        {/* Cafe Info */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-white/80">
            <UtensilsCrossed className="w-4 h-4" />
            <span>{cafeName}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
