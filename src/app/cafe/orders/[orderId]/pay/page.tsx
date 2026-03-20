'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Loader2,
  CreditCard,
  Banknote,
  Smartphone
} from 'lucide-react';

interface OrderDetails {
  id: string;
  order_number: string;
  total_cents: number;
  payment_status: string;
  primary_customer_name: string | null;
  table_number: string | null;
  order_type: string;
  kitchen_tickets: { token_number: number }[];
}

export default function MarkOrderPaidPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;
  
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'esewa'>('cash');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetchOrder() {
      try {
        const { data, error: fetchError } = await supabase
          .from('orders')
          .select(`
            id,
            order_number,
            total_cents,
            payment_status,
            primary_customer_name,
            table_number,
            order_type,
            kitchen_tickets(token_number)
          `)
          .eq('id', orderId)
          .single();

        if (fetchError) throw fetchError;
        setOrder(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load order');
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [orderId, supabase]);

  async function handleMarkPaid() {
    if (!order) return;
    
    setProcessing(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('You must be logged in');
      }

      const { data, error: rpcError } = await supabase.rpc('mark_order_paid', {
        p_order_id: orderId,
        p_received_by: user.id
      });

      if (rpcError) throw rpcError;
      
      const result = data as { success: boolean; error?: string };
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to mark order as paid');
      }

      setSuccess(true);
      
      // Redirect back to orders after 2 seconds
      setTimeout(() => {
        router.push('/cafe/orders');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to process payment');
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'This order does not exist'}</p>
          <Link href="/cafe/orders" className="text-orange-600 hover:underline">
            ← Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  if (order.payment_status === 'paid') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Already Paid</h1>
          <p className="text-gray-600 mb-6">This order has already been marked as paid</p>
          <Link href="/cafe/orders" className="text-orange-600 hover:underline">
            ← Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Recorded!</h1>
          <p className="text-gray-600 mb-2">
            Order {order.order_number} marked as paid
          </p>
          <p className="text-2xl font-bold text-green-600 mb-6">
            Rs {(order.total_cents / 100).toFixed(0)}
          </p>
          <p className="text-sm text-gray-500">Redirecting to orders...</p>
        </div>
      </div>
    );
  }

  const tokenNumber = order.kitchen_tickets?.[0]?.token_number;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/cafe/orders" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Receive Payment</h1>
            <p className="text-sm text-gray-500">Order {order.order_number}</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-6">
        {/* Order Summary */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              {tokenNumber && (
                <span className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-bold mb-2">
                  Token #{tokenNumber}
                </span>
              )}
              <p className="text-gray-600">
                {order.primary_customer_name || 'Walk-in Customer'}
              </p>
              {order.table_number && (
                <p className="text-sm text-gray-500">Table {order.table_number}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 uppercase">{order.order_type}</p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-lg text-gray-600">Total Amount</span>
              <span className="text-3xl font-bold text-gray-900">
                Rs {(order.total_cents / 100).toFixed(0)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Payment Method</h2>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`p-4 rounded-xl border-2 transition-colors ${
                paymentMethod === 'cash'
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Banknote className={`w-6 h-6 mx-auto mb-2 ${
                paymentMethod === 'cash' ? 'text-orange-600' : 'text-gray-400'
              }`} />
              <span className={`text-sm font-medium ${
                paymentMethod === 'cash' ? 'text-orange-700' : 'text-gray-600'
              }`}>Cash</span>
            </button>
            
            <button
              onClick={() => setPaymentMethod('card')}
              className={`p-4 rounded-xl border-2 transition-colors ${
                paymentMethod === 'card'
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <CreditCard className={`w-6 h-6 mx-auto mb-2 ${
                paymentMethod === 'card' ? 'text-orange-600' : 'text-gray-400'
              }`} />
              <span className={`text-sm font-medium ${
                paymentMethod === 'card' ? 'text-orange-700' : 'text-gray-600'
              }`}>Card</span>
            </button>
            
            <button
              onClick={() => setPaymentMethod('esewa')}
              className={`p-4 rounded-xl border-2 transition-colors ${
                paymentMethod === 'esewa'
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Smartphone className={`w-6 h-6 mx-auto mb-2 ${
                paymentMethod === 'esewa' ? 'text-orange-600' : 'text-gray-400'
              }`} />
              <span className={`text-sm font-medium ${
                paymentMethod === 'esewa' ? 'text-orange-700' : 'text-gray-600'
              }`}>eSewa</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 text-red-700">
              <XCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Confirm Button */}
        <button
          onClick={handleMarkPaid}
          disabled={processing}
          className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              Confirm Payment - Rs {(order.total_cents / 100).toFixed(0)}
            </>
          )}
        </button>

        <Link 
          href="/cafe/orders"
          className="block text-center text-gray-500 hover:text-gray-700 mt-4"
        >
          Cancel
        </Link>
      </main>
    </div>
  );
}
