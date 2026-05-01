'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
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
  ArrowLeft,
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

  const [tickets, setTickets] = useState<KitchenTicket[]>(initialTickets);
  const [isLoading, setIsLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundReady, setSoundReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [newOrderFlash, setNewOrderFlash] = useState(false);
  const prevTicketCountRef = useRef(initialTickets.length);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const initAudio = useCallback(() => {
    if (audioContextRef.current) return;
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      setSoundReady(true);
    } catch (e) {
      console.warn('AudioContext init failed:', e);
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      initAudio();
      document.removeEventListener('click', handler);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [initAudio]);

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled || !audioContextRef.current) return;
    try {
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();
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
      playTone(880, now, 0.3, 0.3);
      playTone(1100, now + 0.2, 0.3, 0.25);
      playTone(1320, now + 0.4, 0.4, 0.2);
    } catch (error) {
      console.warn('Audio notification failed:', error);
    }
  }, [soundEnabled]);

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

  useEffect(() => {
    if (tickets.length > prevTicketCountRef.current) {
      playNotificationSound();
      setNewOrderFlash(true);
      toast.success('New order!', { duration: 3000, icon: '🔔' });
      setTimeout(() => setNewOrderFlash(false), 2000);
    }
    prevTicketCountRef.current = tickets.length;
  }, [tickets.length, playNotificationSound]);

  useEffect(() => {
    fetchTickets();
    const pollInterval = setInterval(fetchTickets, 5000);
    const channel = supabase
      .channel('kitchen-tickets')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'kitchen_tickets',
        filter: `cafe_id=eq.${cafeId}`
      }, () => fetchTickets())
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      channel.unsubscribe();
    };
  }, [cafeId, fetchTickets, supabase]);

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
      fetchTickets();
    } catch (error) {
      console.error('Failed to update ticket:', error);
      toast.error('Failed to update order');
    } finally {
      setIsLoading(false);
    }
  };

  const getWaitTime = (createdAt: string) => {
    const created = new Date(createdAt);
    return Math.floor((currentTime.getTime() - created.getTime()) / 1000 / 60);
  };

  const getStatusColor = (waitMinutes: number, status: string) => {
    if (status === 'preparing') return 'border-blue-500 bg-blue-50';
    if (waitMinutes >= 15) return 'border-red-500 bg-red-50 animate-pulse';
    if (waitMinutes >= 10) return 'border-yellow-500 bg-yellow-50';
    if (waitMinutes >= 5) return 'border-yellow-500 bg-yellow-50';
    return 'border-emerald-500 bg-emerald-50';
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const pendingTickets = tickets.filter(t => t.status === 'pending');
  const preparingTickets = tickets.filter(t => t.status === 'preparing');

  return (
    <div className="min-h-screen bg-stone-900 text-white flex flex-col">
      {/* New order flash */}
      {newOrderFlash && (
        <div className="fixed inset-0 bg-white/5 pointer-events-none z-40 animate-pulse" />
      )}

      {/* Sound init prompt */}
      {!soundReady && soundEnabled && (
        <div
          className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-white text-stone-900 px-5 py-3 rounded-lg text-sm font-medium shadow-lg cursor-pointer animate-bounce"
          onClick={initAudio}
        >
          Tap anywhere to enable sound notifications
        </div>
      )}

      {/* ═══ HEADER ═══ */}
      <header className="bg-stone-800 border-b border-stone-700 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/cafe/dashboard"
            className="flex items-center gap-1.5 text-stone-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">Dashboard</span>
          </Link>
          <div className="h-5 w-px bg-stone-600" />
          <div className="flex items-center gap-3">
            <ChefHat className="w-7 h-7 text-white" />
            <div>
              <h1 className="text-xl font-bold">{cafeName}</h1>
              <p className="text-stone-400 text-xs">Kitchen Display</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Stats */}
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-white tabular-nums">{pendingTickets.length}</div>
              <div className="text-xs text-stone-400 font-medium">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 tabular-nums">{preparingTickets.length}</div>
              <div className="text-xs text-stone-400 font-medium">Preparing</div>
            </div>
          </div>

          {/* Clock */}
          <div className="text-right">
            <div className="text-3xl font-mono font-bold tabular-nums">
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-stone-400 text-xs">
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
              className={`p-3 rounded-xl transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center ${
                soundEnabled && soundReady ? 'bg-emerald-600 hover:bg-emerald-700' :
                soundEnabled ? 'bg-stone-500 hover:bg-stone-400' :
                'bg-stone-600 hover:bg-stone-500'
              }`}
              title={soundEnabled ? (soundReady ? 'Sound on' : 'Click to activate sound') : 'Sound off'}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <button
              onClick={fetchTickets}
              className="p-3 bg-stone-700 hover:bg-stone-600 rounded-xl transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-3 bg-stone-700 hover:bg-stone-600 rounded-xl transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
              title="Fullscreen"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="flex-1 p-6 overflow-auto">
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-stone-400">
            <ChefHat className="w-20 h-20 mb-4 text-stone-600" />
            <p className="text-3xl font-bold text-white mb-2">Kitchen all clear!</p>
            <p className="text-stone-500 text-lg">New orders will appear here automatically</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tickets.map(ticket => {
              const waitMinutes = getWaitTime(ticket.created_at);
              const statusColor = getStatusColor(waitMinutes, ticket.status);

              return (
                <div
                  key={ticket.ticket_id}
                  className={`rounded-xl border-4 ${statusColor} overflow-hidden transition-all shadow-lg`}
                >
                  {/* Ticket Header — BIG token number */}
                  <div className="bg-stone-800 px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-5xl font-black text-white tracking-tight">
                        #{ticket.token_number}
                      </span>
                      {ticket.priority === 'rush' && (
                        <span className="bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg animate-pulse uppercase">
                          Rush
                        </span>
                      )}
                      {ticket.priority === 'vip' && (
                        <span className="bg-purple-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg uppercase">
                          VIP
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`flex items-center gap-1.5 text-xl font-bold ${
                        waitMinutes >= 15 ? 'text-red-400' :
                        waitMinutes >= 10 ? 'text-yellow-400' :
                        waitMinutes >= 5 ? 'text-yellow-400' : 'text-emerald-400'
                      }`}>
                        <Clock className="w-5 h-5" />
                        {waitMinutes}m
                      </div>
                      <div className="text-xs text-stone-400 font-medium mt-0.5">
                        {ticket.status === 'preparing' ? 'PREPARING' : 'WAITING'}
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="p-4 space-y-2 bg-white text-stone-900">
                    {ticket.items?.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 py-2 border-b border-stone-100 last:border-0"
                      >
                        <span className="text-2xl font-black text-stone-900 min-w-[2.5rem]">
                          {item.quantity}x
                        </span>
                        <div className="flex-1">
                          <div className="font-bold text-lg leading-tight">{item.name}</div>
                          {item.notes && (
                            <div className="text-sm text-stone-500 font-medium mt-1">
                              Note: {item.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons — BIG touch targets */}
                  <div className="bg-stone-100 p-3 flex gap-2">
                    {ticket.status === 'pending' && (
                      <button
                        onClick={() => updateTicketStatus(ticket.ticket_id, 'preparing')}
                        disabled={isLoading}
                        className="flex-1 flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black rounded-xl transition-colors text-lg min-h-[56px]"
                      >
                        <Play className="w-6 h-6" />
                        START
                      </button>
                    )}
                    {ticket.status === 'preparing' && (
                      <button
                        onClick={() => updateTicketStatus(ticket.ticket_id, 'ready')}
                        disabled={isLoading}
                        className="flex-1 flex items-center justify-center gap-2 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl transition-colors text-lg min-h-[56px]"
                      >
                        <Check className="w-6 h-6" />
                        READY
                      </button>
                    )}
                    <button
                      onClick={() => updateTicketStatus(ticket.ticket_id, 'served')}
                      disabled={isLoading}
                      className="px-5 py-4 bg-stone-600 hover:bg-stone-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors min-h-[56px]"
                      title="Mark as served"
                    >
                      <Bell className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer className="bg-stone-800 border-t border-stone-700 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-stone-400">&lt; 5 min</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-stone-400">5-10 min</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-stone-400">10-15 min</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-stone-400">&gt; 15 min</span>
          </div>
        </div>
        <div className="text-stone-500 text-sm flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Live · {soundReady ? 'Sound active' : 'Click to enable sound'}
        </div>
      </footer>
    </div>
  );
}
