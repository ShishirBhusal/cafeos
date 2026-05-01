'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard,
  UtensilsCrossed,
  ChefHat,
  Receipt,
  Package,
  Users,
  Wallet,
  BarChart3,
  Settings,
  Coffee,
  LogOut,
  Menu,
  X,
  CircleDot,
  UserCog,
  Clock,
  Tag,
  Grid3X3,
} from 'lucide-react';

interface CafeSidebarProps {
  cafeId: string;
  cafeName: string;
  cafeSlug?: string;
}

export default function CafeSidebar({ cafeId, cafeName, cafeSlug }: CafeSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingKitchen, setPendingKitchen] = useState(0);
  const [unpaidOrders, setUnpaidOrders] = useState(0);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function fetchCounts() {
      const [kitchenResult, unpaidResult] = await Promise.all([
        supabase
          .from('kitchen_tickets')
          .select('*', { count: 'exact', head: true })
          .eq('cafe_id', cafeId)
          .in('status', ['pending', 'preparing']),
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('cafe_id', cafeId)
          .eq('payment_status', 'unpaid')
          .not('status', 'eq', 'cancelled'),
      ]);
      setPendingKitchen(kitchenResult.count || 0);
      setUnpaidOrders(unpaidResult.count || 0);
    }

    fetchCounts();

    const channel = supabase
      .channel('sidebar-badges')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kitchen_tickets', filter: `cafe_id=eq.${cafeId}` }, () => fetchCounts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `cafe_id=eq.${cafeId}` }, () => fetchCounts())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [cafeId]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const isActive = (href: string) => {
    if (href === '/cafe/dashboard') return pathname === '/cafe/dashboard' || pathname === '/cafe';
    return pathname?.startsWith(href);
  };

  const Badge = ({ count }: { count: number }) => {
    if (!count) return null;
    return (
      <span className="min-w-5 h-5 px-1.5 text-[11px] font-semibold rounded-full flex items-center justify-center bg-red-500 text-white">
        {count > 99 ? '99+' : count}
      </span>
    );
  };

  const NavLink = ({ href, label, icon: Icon, badge, onClick }: {
    href: string; label: string; icon: React.ElementType; badge?: number; onClick?: () => void;
  }) => {
    const active = isActive(href);
    return (
      <Link
        href={href}
        onClick={() => { setMobileOpen(false); onClick?.(); }}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
          active
            ? 'bg-stone-900 text-white'
            : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
        }`}
      >
        <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${active ? 'text-white' : 'text-stone-400'}`} />
        <span className="flex-1">{label}</span>
        {badge !== undefined && <Badge count={badge} />}
      </Link>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center">
            <Coffee className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-stone-900 truncate leading-tight">{cafeName}</h2>
            <p className="text-[11px] text-stone-400 leading-tight">CafeOS</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-3 pt-3 pb-1 space-y-1.5">
        <Link
          href="/cafe/counter"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2.5 w-full px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          <UtensilsCrossed className="w-4 h-4" />
          <span>Open Counter</span>
        </Link>
        <Link
          href="/cafe/kitchen"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2.5 w-full px-3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-sm font-medium transition-colors"
        >
          <ChefHat className="w-4 h-4" />
          <span className="flex-1">Kitchen Display</span>
          {pendingKitchen > 0 && <Badge count={pendingKitchen} />}
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <div className="space-y-0.5">
          <NavLink href="/cafe/dashboard" label="Dashboard" icon={LayoutDashboard} />
          <NavLink href="/cafe/orders" label="Orders" icon={Receipt} badge={unpaidOrders} />
          <NavLink href="/cafe/menu" label="Menu" icon={CircleDot} />
          <NavLink href="/cafe/tables" label="Tables" icon={Grid3X3} />
          <NavLink href="/cafe/inventory" label="Inventory" icon={Package} />
          <NavLink href="/cafe/promotions" label="Promotions" icon={Tag} />
        </div>

        <div className="my-3 mx-3 border-t border-stone-100" />

        <div className="space-y-0.5">
          <NavLink href="/cafe/customers" label="Customers" icon={Users} />
          <NavLink href="/cafe/staff" label="Staff" icon={UserCog} />
          <NavLink href="/cafe/expenses" label="Expenses" icon={Wallet} />
          <NavLink href="/cafe/shift" label="Shift History" icon={Clock} />
          <NavLink href="/cafe/reports" label="Reports" icon={BarChart3} />
        </div>

        <div className="my-3 mx-3 border-t border-stone-100" />

        <div className="space-y-0.5">
          <NavLink href="/cafe/settings" label="Settings" icon={Settings} />
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-stone-100 px-3 py-2">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-700 transition-colors"
        >
          <LogOut className="w-[18px] h-[18px]" />
          <span>{isLoggingOut ? 'Signing out...' : 'Sign out'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 bg-white rounded-lg shadow-sm border border-stone-200 hover:bg-stone-50 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-stone-600" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-stone-200 transform transition-transform duration-200 ease-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-stone-100 transition-colors"
        >
          <X className="w-4 h-4 text-stone-400" />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-56 lg:flex-shrink-0 bg-white border-r border-stone-100 h-screen sticky top-0">
        {sidebarContent}
      </aside>
    </>
  );
}
