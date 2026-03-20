'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  ChefHat,
  Clock,
  Check,
  Play,
  Bell,
  RefreshCw,
  Volume2,
  VolumeX,
  Maximize2,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface KitchenTicket {
  ticket_id: string;
  token_number: number;
  order_id: string;
  status: string;
  priority: string;
  created_at: string;
  started_at: string | null;
  items: {
    name: string;
    quantity: number;
    notes: string | null;
    kitchen_status: string;
  }[];
}

interface KitchenDisplayClientProps {
  cafeId: string;
  cafeName: string;
  initialTickets: KitchenTicket[];
  userId: string;
}

export default function KitchenDisplayClient({
  cafeId,
  cafeName,
  initialTickets,
  userId,
}: KitchenDisplayClientProps) {
  const supabase = createClient();
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // State
  const [tickets, setTickets] = useState<KitchenTicket[]>(initialTickets);
  const [isLoading, setIsLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundReady, setSoundReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [newOrderFlash, setNewOrderFlash] = useState(false);
  const prevTicketCountRef = useRef(initialTickets.length);

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Initialize AudioContext on user gesture (required by browsers)
  const initAudio = useCallback(() => {
    if (audioContextRef.current) return;
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      setSoundReady(true);
    } catch (e) {
      console.warn('AudioContext init failed:', e);
    }
  }, []);

  // Enable sound on first click anywhere
  useEffect(() => {
    const handler = () => {
      initAudio();
      document.removeEventListener('click', handler);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [initAudio]);

  // Play notification sound using Web Audio API
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled || !audioContextRef.current) return;
    
    try {
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      
      // Create a pleasant "ding-ding" sound
      const playTone = (freq: number, startTime: number, duration: number, volume: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, startTime);
        osc.type = 'sine';
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(volume, startTime + 0.03);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      
      const now = ctx.currentTime;
      playTone(880, now, 0.3, 0.3);        // A5
      playTone(1100, now + 0.2, 0.3, 0.25); // C#6
      playTone(1320, now + 0.4, 0.4, 0.2);  // E6 - triumphant resolution
    } catch (error) {
      console.warn('Audio notification failed:', error);
    }
  }, [soundEnabled]);

  // Fetch tickets
  const fetchTickets = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_kitchen_queue', { p_cafe_id: cafeId });
      
      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    }
  }, [cafeId, supabase]);

  // Detect new orders and play sound
  useEffect(() => {
    if (tickets.length > prevTicketCountRef.current) {
      playNotificationSound();
      setNewOrderFlash(true);
      toast.success('New order!', { duration: 3000, icon: '🔔' });
      setTimeout(() => setNewOrderFlash(false), 2000);
    }
    prevTicketCountRef.current = tickets.length;
  }, [tickets.length, playNotificationSound]);

  // Subscribe to real-time updates + GUARANTEED polling backup
  useEffect(() => {
    // Initial fetch
    fetchTickets();

    // GUARANTEED: Poll every 5 seconds regardless of real-time status
    const pollInterval = setInterval(fetchTickets, 5000);

    // Subscribe to kitchen_tickets changes (bonus speed on top of polling)
    const channel = supabase
      .channel('kitchen-tickets')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'kitchen_tickets',
        filter: `cafe_id=eq.${cafeId}`
      }, () => {
        // Real-time event — fetch immediately (faster than polling)
        fetchTickets();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Real-time subscription active (+ 5s polling backup)');
        }
      });

    return () => {
      clearInterval(pollInterval);
      channel.unsubscribe();
    };
  }, [cafeId, fetchTickets, supabase]);

  // Update ticket status
  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .rpc('update_kitchen_ticket_status', {
          p_ticket_id: ticketId,
          p_new_status: newStatus
        });
      
      if (error) throw error;
      
      toast.success(
        newStatus === 'preparing' ? 'Started preparing' :
        newStatus === 'ready' ? 'Marked ready!' :
        newStatus === 'served' ? 'Served!' : 'Updated'
      );
      
      // Refetch tickets
      fetchTickets();
    } catch (error) {
      console.error('Failed to update ticket:', error);
      toast.error('Failed to update order');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate wait time
  const getWaitTime = (createdAt: string) => {
    const created = new Date(createdAt);
    const diff = Math.floor((currentTime.getTime() - created.getTime()) / 1000 / 60);
    return diff;
  };

  // Get status color
  const getStatusColor = (waitMinutes: number, status: string) => {
    if (status === 'preparing') return 'border-blue-500 bg-blue-50';
    if (waitMinutes >= 15) return 'border-red-500 bg-red-50 animate-pulse';
    if (waitMinutes >= 10) return 'border-orange-500 bg-orange-50';
    if (waitMinutes >= 5) return 'border-yellow-500 bg-yellow-50';
    return 'border-green-500 bg-green-50';
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Separate tickets by status
  const pendingTickets = tickets.filter(t => t.status === 'pending');
  const preparingTickets = tickets.filter(t => t.status === 'preparing');

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* New order flash overlay */}
      {newOrderFlash && (
        <div className="fixed inset-0 bg-orange-500/10 pointer-events-none z-40 animate-pulse" />
      )}

      {/* Sound initialization prompt */}
      {!soundReady && soundEnabled && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-yellow-500 text-gray-900 px-4 py-2 rounded-lg text-sm font-medium shadow-lg cursor-pointer animate-bounce"
          onClick={initAudio}
        >
          🔔 Tap anywhere to enable sound notifications
        </div>
      )}

      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <ChefHat className="w-8 h-8 text-orange-500" />
          <div>
            <h1 className="text-2xl font-bold">{cafeName}</h1>
            <p className="text-gray-400 text-sm">Kitchen Display</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {/* Stats */}
          <div className="flex gap-6 text-sm">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-500">{pendingTickets.length}</div>
              <div className="text-gray-400">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-500">{preparingTickets.length}</div>
              <div className="text-gray-400">Preparing</div>
            </div>
          </div>
          
          {/* Clock */}
          <div className="text-right">
            <div className="text-3xl font-mono font-bold">
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-gray-400 text-sm">
              {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                initAudio();
                setSoundEnabled(!soundEnabled);
              }}
              className={`p-3 rounded-lg transition-colors ${
                soundEnabled && soundReady ? 'bg-green-600 hover:bg-green-700' : 
                soundEnabled ? 'bg-yellow-600 hover:bg-yellow-700' :
                'bg-gray-600 hover:bg-gray-500'
              }`}
              title={soundEnabled ? (soundReady ? 'Sound on' : 'Click to activate sound') : 'Sound off'}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <button
              onClick={fetchTickets}
              className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              title="Fullscreen"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="text-6xl mb-4">☕</div>
            <p className="text-3xl font-bold text-white mb-2">Kitchen all clear!</p>
            <p className="text-gray-500 text-lg">Take a breather — new orders will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tickets.map(ticket => {
              const waitMinutes = getWaitTime(ticket.created_at);
              const statusColor = getStatusColor(waitMinutes, ticket.status);
              
              return (
                <div
                  key={ticket.ticket_id}
                  className={`rounded-xl border-4 ${statusColor} overflow-hidden transition-all`}
                >
                  {/* Ticket Header */}
                  <div className="bg-gray-800 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl font-bold text-white">
                        #{ticket.token_number}
                      </span>
                      {ticket.priority === 'rush' && (
                        <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded animate-pulse">
                          RUSH
                        </span>
                      )}
                      {ticket.priority === 'vip' && (
                        <span className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded">
                          VIP
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`flex items-center gap-1 text-lg font-semibold ${
                        waitMinutes >= 15 ? 'text-red-400' :
                        waitMinutes >= 10 ? 'text-orange-400' :
                        waitMinutes >= 5 ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        <Clock className="w-4 h-4" />
                        {waitMinutes}m
                      </div>
                      <div className="text-xs text-gray-400">
                        {ticket.status === 'preparing' ? 'PREPARING' : 'WAITING'}
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="p-4 space-y-2 bg-white text-gray-900">
                    {ticket.items?.map((item, idx) => (
                      <div 
                        key={idx}
                        className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0"
                      >
                        <span className="text-2xl font-bold text-orange-600 min-w-[2rem]">
                          {item.quantity}x
                        </span>
                        <div className="flex-1">
                          <div className="font-semibold text-lg">{item.name}</div>
                          {item.notes && (
                            <div className="text-sm text-orange-600 italic mt-1">
                              📝 {item.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="bg-gray-100 p-3 flex gap-2">
                    {ticket.status === 'pending' && (
                      <button
                        onClick={() => updateTicketStatus(ticket.ticket_id, 'preparing')}
                        disabled={isLoading}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
                      >
                        <Play className="w-5 h-5" />
                        START
                      </button>
                    )}
                    {ticket.status === 'preparing' && (
                      <button
                        onClick={() => updateTicketStatus(ticket.ticket_id, 'ready')}
                        disabled={isLoading}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
                      >
                        <Check className="w-5 h-5" />
                        READY
                      </button>
                    )}
                    <button
                      onClick={() => updateTicketStatus(ticket.ticket_id, 'served')}
                      disabled={isLoading}
                      className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-colors"
                      title="Mark as served"
                    >
                      <Bell className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer - Quick Stats */}
      <footer className="bg-gray-800 border-t border-gray-700 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-400">&lt; 5 min</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-gray-400">5-10 min</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-gray-400">10-15 min</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-gray-400">&gt; 15 min (URGENT)</span>
          </div>
        </div>
        <div className="text-gray-500 text-sm flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Auto-refresh every 5s • {soundReady ? 'Sound active' : 'Click to enable sound'}
        </div>
      </footer>
    </div>
  );
}
