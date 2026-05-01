'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, Loader2, Calendar } from 'lucide-react';
import DailyStoryCard from '@/components/cafe/DailyStoryCard';

// Nepal timezone offset: UTC+5:45 = 345 minutes
const NEPAL_OFFSET_MINUTES = 5 * 60 + 45;

function getNepaliDateStringClient(): string {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const nepalMs = utcMs + NEPAL_OFFSET_MINUTES * 60000;
  return new Date(nepalMs).toISOString().split('T')[0];
}

interface DailyStoryPageClientProps {
  cafeId: string;
  cafeName: string;
  initialStory: any;
}

export default function DailyStoryPageClient({ cafeId, cafeName, initialStory }: DailyStoryPageClientProps) {
  const supabase = createClient();
  const [story, setStory] = useState(initialStory);
  
  // Use Nepal timezone for date calculations
  const todayStr = useMemo(() => getNepaliDateStringClient(), []);
  const [currentDate, setCurrentDate] = useState(todayStr);
  const [isLoading, setIsLoading] = useState(false);

  const isToday = currentDate === todayStr;

  const fetchStory = useCallback(async (dateStr: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_daily_story', {
        p_cafe_id: cafeId,
        p_date: dateStr,
      });
      if (error) throw error;
      setStory(data);
      setCurrentDate(dateStr);
    } catch (err) {
      console.error('Failed to fetch story:', err);
    } finally {
      setIsLoading(false);
    }
  }, [cafeId, supabase]);

  const goToPrevDay = useCallback(() => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 1);
    fetchStory(prev.toISOString().slice(0, 10));
  }, [currentDate, fetchStory]);

  const goToNextDay = useCallback(() => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    const nextStr = next.toISOString().slice(0, 10);
    if (nextStr <= todayStr) {
      fetchStory(nextStr);
    }
  }, [currentDate, todayStr, fetchStory]);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/cafe/dashboard"
              className="p-2 hover:bg-stone-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-stone-600" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-stone-900">Aaja Ko Katha</h1>
              <p className="text-sm text-stone-500">Daily Business Story</p>
            </div>
          </div>
          <Link
            href="/cafe/story/weekly"
            className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 border border-stone-200 text-stone-700 rounded-xl text-sm font-medium hover:bg-stone-200 transition-colors"
          >
            <Calendar className="w-4 h-4" />
            <span>This Week</span>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-stone-500" />
            <span className="ml-3 text-stone-500">Loading story...</span>
          </div>
        ) : story ? (
          <DailyStoryCard
            story={story}
            cafeName={cafeName}
            onPrevDay={goToPrevDay}
            onNextDay={!isToday ? goToNextDay : undefined}
            isToday={isToday}
          />
        ) : (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📖</div>
            <p className="text-stone-600 text-lg font-medium">No story for this day</p>
            <p className="text-stone-400 text-sm mt-2">Orders banaunu bhayo bhane katha aaucha!</p>
          </div>
        )}
      </main>
    </div>
  );
}
