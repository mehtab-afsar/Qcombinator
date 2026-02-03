"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './AuthContext';
import { PRDQScore } from '@/lib/scoring/prd-types';
import { toast } from 'sonner';

interface QScoreContextType {
  qScore: PRDQScore | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const QScoreContext = createContext<QScoreContextType | undefined>(undefined);

export function useQScore() {
  const context = useContext(QScoreContext);
  if (context === undefined) {
    throw new Error('useQScore must be used within a QScoreProvider');
  }
  return context;
}

export function QScoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [qScore, setQScore] = useState<PRDQScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabase, setSupabase] = useState<any>(null);

  // Initialize Supabase client
  useEffect(() => {
    try {
      const client = createClient();
      setSupabase(client);
    } catch (err: any) {
      console.warn('⚠️  QScoreProvider: Supabase not configured, real-time updates disabled');
    }
  }, []);

  // Fetch Q-Score from API
  const fetchQScore = async () => {
    if (!user) {
      setQScore(null);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/qscore/latest');

      if (!response.ok) {
        console.error('Failed to fetch Q-Score:', response.statusText);
        setLoading(false);
        return;
      }

      const data = await response.json();
      setQScore(data.qScore);
    } catch (error) {
      console.error('Error fetching Q-Score:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchQScore();
    } else {
      setQScore(null);
      setLoading(false);
    }
  }, [user]);

  // Subscribe to real-time Q-Score updates
  useEffect(() => {
    if (!user || !supabase) return;

    const channel = supabase
      .channel('qscore_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'qscore_history',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('New Q-Score received:', payload.new);

          // Refetch to get formatted data with trends
          fetchQScore();

          // Show toast notification
          const newScore = payload.new as any;
          const previousScore = qScore?.overall || 0;
          const change = newScore.overall_score - previousScore;

          if (change > 0) {
            toast.success(`Q-Score Updated! +${change} points`, {
              description: `Your new score is ${newScore.overall_score}`,
              duration: 5000,
            });
          } else if (change < 0) {
            toast.info(`Q-Score Updated`, {
              description: `Your new score is ${newScore.overall_score}`,
              duration: 5000,
            });
          } else {
            toast.info('Q-Score recalculated', {
              description: `Your score remains ${newScore.overall_score}`,
              duration: 3000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase, qScore]);

  const value = {
    qScore,
    loading,
    refetch: fetchQScore,
  };

  return <QScoreContext.Provider value={value}>{children}</QScoreContext.Provider>;
}
