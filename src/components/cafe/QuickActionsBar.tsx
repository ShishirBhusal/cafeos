'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Plus,
  Receipt,
  ChefHat,
  Calculator,
  QrCode,
  X,
  Sparkles,
  Grid3X3,
  Package
} from 'lucide-react';

interface QuickActionsBarProps {
  pendingKitchenCount?: number;
  unpaidCount?: number;
}

export default function QuickActionsBar({ 
  pendingKitchenCount = 0,
  unpaidCount = 0 
}: QuickActionsBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const actions = [
    {
      href: '/cafe/counter',
      icon: <Plus className="w-5 h-5" />,
      label: 'New Order',
      color: 'bg-stone-900 hover:bg-stone-800',
      primary: true,
    },
    {
      href: '/cafe/kitchen',
      icon: <ChefHat className="w-5 h-5" />,
      label: 'Kitchen',
      color: 'bg-blue-500 hover:bg-blue-600',
      badge: pendingKitchenCount > 0 ? pendingKitchenCount : undefined,
    },
    {
      href: '/cafe/orders?payment=unpaid',
      icon: <Receipt className="w-5 h-5" />,
      label: 'Unpaid',
      color: 'bg-rose-500 hover:bg-rose-600',
      badge: unpaidCount > 0 ? unpaidCount : undefined,
    },
    {
      href: '/cafe/shift',
      icon: <Calculator className="w-5 h-5" />,
      label: 'Shift',
      color: 'bg-emerald-500 hover:bg-emerald-600',
    },
    {
      href: '/cafe/tables',
      icon: <Grid3X3 className="w-5 h-5" />,
      label: 'Tables',
      color: 'bg-purple-500 hover:bg-purple-600',
    },
  ];

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Expanded Actions */}
        {isExpanded && (
          <div className="absolute bottom-16 right-0 flex flex-col gap-3 items-end mb-2">
            {actions.map((action, index) => (
              <Link
                key={action.href}
                href={action.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-white shadow-lg transition-all transform ${action.color}`}
                style={{
                  animation: `slideIn 0.2s ease-out ${index * 0.05}s both`,
                }}
                onClick={() => setIsExpanded(false)}
              >
                <span className="text-sm font-medium whitespace-nowrap">{action.label}</span>
                <div className="relative">
                  {action.icon}
                  {action.badge && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-xs font-bold rounded-full flex items-center justify-center text-rose-600">
                      {action.badge}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Main FAB */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${
            isExpanded 
              ? 'bg-stone-800 rotate-45' 
              : 'bg-gradient-to-br from-stone-700 to-stone-900'
          }`}
        >
          {isExpanded ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <Sparkles className="w-6 h-6 text-white" />
          )}
        </button>

        {/* Badge indicators on main button */}
        {!isExpanded && (pendingKitchenCount > 0 || unpaidCount > 0) && (
          <div className="absolute -top-1 -right-1 flex gap-1">
            {pendingKitchenCount > 0 && (
              <span className="w-5 h-5 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                {pendingKitchenCount}
              </span>
            )}
            {unpaidCount > 0 && (
              <span className="w-5 h-5 bg-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {unpaidCount}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Backdrop */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Animation styles */}
      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
}
