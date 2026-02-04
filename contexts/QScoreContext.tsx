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

  // Fetch Q-Score from API or localStorage
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
        // Fallback to localStorage
        loadFromLocalStorage();
        setLoading(false);
        return;
      }

      const data = await response.json();

      // If API returns null (no Q-Score in database), check localStorage
      if (!data.qScore) {
        console.log('No Q-Score in database, checking localStorage...');
        loadFromLocalStorage();
      } else {
        setQScore(data.qScore);
      }
    } catch (error) {
      console.error('Error fetching Q-Score:', error);
      // Fallback to localStorage
      loadFromLocalStorage();
    } finally {
      setLoading(false);
    }
  };

  // Load Q-Score from localStorage (fallback)
  const loadFromLocalStorage = () => {
    try {
      const assessmentData = localStorage.getItem('assessmentData');

      if (assessmentData) {
        const assessment = JSON.parse(assessmentData);

        // Calculate a basic Q-Score from assessment data
        const calculatedScore = calculateLocalQScore(assessment);
        setQScore(calculatedScore);
        console.log('✅ Loaded Q-Score from localStorage:', calculatedScore);
      } else {
        setQScore(null);
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      setQScore(null);
    }
  };

  // Simple local Q-Score calculation
  const calculateLocalQScore = (assessment: any): PRDQScore => {
    // Basic scoring logic (simplified)
    const marketScore = Math.min(100, (assessment.targetCustomers || 0) / 1000);
    const productScore = Math.min(100, (assessment.conversationCount || 0) * 2);
    const gtmScore = Math.min(100, (assessment.channelsTried?.length || 0) * 20);
    const financialScore = assessment.mrr ? Math.min(100, (assessment.mrr / 100)) : 30;
    const teamScore = 50; // Default mid-range
    const tractionScore = Math.min(100, (assessment.conversationCount || 0) * 1.5);

    const overall = Math.round(
      marketScore * 0.20 +
      productScore * 0.18 +
      gtmScore * 0.17 +
      financialScore * 0.18 +
      teamScore * 0.15 +
      tractionScore * 0.12
    );

    return {
      overall,
      percentile: 50,
      grade: overall >= 80 ? 'A' : overall >= 65 ? 'B' : overall >= 50 ? 'C' : 'D',
      breakdown: {
        market: { score: Math.round(marketScore), weight: 0.20, change: 0, trend: 'neutral' },
        product: { score: Math.round(productScore), weight: 0.18, change: 0, trend: 'neutral' },
        goToMarket: { score: Math.round(gtmScore), weight: 0.17, change: 0, trend: 'neutral' },
        financial: { score: Math.round(financialScore), weight: 0.18, change: 0, trend: 'neutral' },
        team: { score: Math.round(teamScore), weight: 0.15, change: 0, trend: 'neutral' },
        traction: { score: Math.round(tractionScore), weight: 0.12, change: 0, trend: 'neutral' },
      },
      calculatedAt: new Date(),
      change: 0,
    };
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
