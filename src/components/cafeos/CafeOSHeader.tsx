'use client';

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { 
  Coffee, 
  Menu, 
  X, 
  User,
  LogOut,
  LayoutDashboard,
  ChefHat,
  Receipt,
  BarChart3,
  Settings,
  MapPin,
  ChevronDown
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface CafeOSHeaderProps {
  isAuthed?: boolean;
}

interface UserInfo {
  id: string;
  email: string;
  displayName: string;
}

/**
 * Real top-level route segments under src/app. Any other single segment at the
 * root is a public cafe microsite slug (/[cafeSlug]), which renders its own nav.
 */
const APP_ROUTE_SEGMENTS = new Set([
  'about', 'actions', 'admin', 'auth', 'book-a-stylist', 'bookings', 'cafe',
  'checkout', 'explore', 'legal', 'order-confirmation', 'order', 'payment',
  'product', 'profile', 'shop', 'stylist', 'support', 'track-order', 'vendor',
]);

export default function CafeOSHeader({ isAuthed = false }: CafeOSHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [hasCafeAccess, setHasCafeAccess] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fetch user info when authenticated
  useEffect(() => {
    async function fetchUserInfo() {
      if (!isAuthed) {
        setUserInfo(null);
        setHasCafeAccess(false);
        return;
      }

      try {
        const response = await fetch('/api/user/roles');
        if (response.ok) {
          const data = await response.json();
          setUserInfo(data.user || null);
          // Check if user has cafe access (vendor role or cafe capabilities)
          const roles = data.roles || [];
          setHasCafeAccess(roles.includes('vendor') || roles.includes('cafe_manager'));
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error);
      }
    }
    fetchUserInfo();
  }, [isAuthed]);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      setUserMenuOpen(false);
    }
  };

  // Check if we're on a cafe management page
  const isCafePage = pathname?.startsWith('/cafe/');
  
  // Public navigation links (shown on landing, explore, etc.)
  const publicNavLinks = [
    { href: '/explore', label: 'Explore Cafes' },
  ];

  // Cafe dashboard navigation links
  const cafeNavLinks = [
    { href: '/cafe/dashboard', label: 'Dashboard' },
    { href: '/cafe/menu', label: 'Menu' },
    { href: '/cafe/orders', label: 'Orders' },
    { href: '/cafe/reports', label: 'Reports' },
  ];

  const cafeMenuItems = [
    { href: '/cafe/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/cafe/counter', label: 'Counter POS', icon: Receipt },
    { href: '/cafe/kitchen', label: 'Kitchen Display', icon: ChefHat },
    { href: '/cafe/menu', label: 'Menu Management', icon: Coffee },
    { href: '/cafe/orders', label: 'Orders', icon: Receipt },
    { href: '/cafe/reports', label: 'Reports', icon: BarChart3 },
    { href: '/cafe/settings', label: 'Settings', icon: Settings },
  ];

  // Don't show header on cafe management pages (sidebar handles navigation)
  if (pathname?.startsWith('/cafe/')) {
    return null;
  }

  // Don't show it on a public cafe microsite either. Those live at the root as
  // /[cafeSlug] and carry their own branded nav over the hero image, so the
  // global header would stack a second bar on top of it. Anything whose first
  // path segment isn't a real app route is a cafe slug.
  const firstSegment = pathname?.split('/').filter(Boolean)[0];
  if (firstSegment && !APP_ROUTE_SEGMENTS.has(firstSegment)) {
    return null;
  }

  // Choose which nav links to show based on current page
  const navLinks = isCafePage ? cafeNavLinks : publicNavLinks;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Coffee className="w-8 h-8 text-stone-900" />
            <span className="text-xl font-bold text-gray-900">CafeOS</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  pathname === link.href 
                    ? 'text-stone-900' 
                    : 'text-gray-600 hover:text-stone-900'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {isAuthed ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-stone-900" />
                  </div>
                  <span className="hidden md:block text-sm font-medium text-gray-700">
                    {userInfo?.displayName || 'Account'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                    {hasCafeAccess && (
                      <>
                        <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">
                          My Cafe
                        </div>
                        {cafeMenuItems.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-stone-50 hover:text-stone-900"
                          >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                          </Link>
                        ))}
                        <div className="border-t border-gray-100 my-2" />
                      </>
                    )}
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                    >
                      <LogOut className="w-4 h-4" />
                      {isLoggingOut ? 'Logging out...' : 'Logout'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/auth/login"
                  className="text-sm font-medium text-gray-600 hover:text-stone-900"
                >
                  Login
                </Link>
                <Link
                  href="/auth/login?mode=signup"
                  className="bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-600" />
              ) : (
                <Menu className="w-6 h-6 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100">
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    pathname === link.href
                      ? 'bg-stone-50 text-stone-900'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              
              {isAuthed && hasCafeAccess && (
                <>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase mt-4">
                    My Cafe
                  </div>
                  {cafeMenuItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  ))}
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
