'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Loader2, Banknote, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

interface OpenShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShiftOpened: () => void;
  cafeId: string;
}

export default function OpenShiftModal({
  isOpen,
  onClose,
  onShiftOpened,
  cafeId,
}: OpenShiftModalProps) {
  const supabase = createClient();
  const [openingFloat, setOpeningFloat] = useState('0');
  const [isOpening, setIsOpening] = useState(false);

  const handleOpenShift = async () => {
    setIsOpening(true);
    try {
      const floatCents = Math.round(parseFloat(openingFloat || '0') * 100);
      
      const { data, error } = await supabase.rpc('open_cafe_shift', {
        p_cafe_id: cafeId,
        p_opening_float_cents: floatCents,
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Shift opened! Good luck today! 🎉');
        onShiftOpened();
        onClose();
        setOpeningFloat('0');
      } else {
        throw new Error(data?.error || 'Failed to open shift');
      }
    } catch (error) {
      console.error('Open shift error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to open shift');
    } finally {
      setIsOpening(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-stone-900">Open Today&apos;s Shift</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Explanation */}
          <p className="text-sm text-stone-500">
            A shift tracks all cash transactions until you close it. At the end, you&apos;ll count your cash and CafeOS will check if it matches.
          </p>

          {/* Time Info */}
          <div className="bg-stone-50 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-stone-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Starting at</p>
              <p className="font-semibold text-gray-900">
                {new Date().toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </p>
            </div>
          </div>

          {/* Opening Float Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Banknote className="w-4 h-4 inline mr-1" />
              Opening Float (Cash in Drawer)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">Rs</span>
              <input
                type="number"
                value={openingFloat}
                onChange={(e) => setOpeningFloat(e.target.value)}
                placeholder="0"
                className="w-full pl-12 pr-4 py-4 text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-stone-500 focus:ring-0"
                min="0"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Enter the amount of cash already in your drawer before starting
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleOpenShift}
              disabled={isOpening}
              className="flex-1 py-3 bg-stone-900 text-white rounded-xl font-semibold hover:bg-stone-800 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isOpening ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Opening...
                </>
              ) : (
                'Start Shift'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
