"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { PRDQScore } from '@/features/qscore/types/qscore.types';
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
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null);

  // Initialize Supabase client
  useEffect(() => {
    try {
      const client = createClient();
      setSupabase(client);
    } catch (_err: unknown) {
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
      } else {
        setQScore(null);
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      setQScore(null);
    }
  };

  // Simple local Q-Score calculation
  const calculateLocalQScore = (assessment: Record<string, unknown>): PRDQScore => {
    // Basic scoring logic (simplified)
    const targetCustomers = (assessment.targetCustomers as number) || 0;
    const conversationCount = (assessment.conversationCount as number) || 0;
    const channelsTried = (assessment.channelsTried as string[]) || [];
    const mrr = (assessment.mrr as number) || 0;
    const marketScore = Math.min(100, targetCustomers / 1000);
    const productScore = Math.min(100, conversationCount * 2);
    const gtmScore = Math.min(100, channelsTried.length * 20);
    const financialScore = mrr ? Math.min(100, mrr / 100) : 30;
    const teamScore = 50; // Default mid-range
    const tractionScore = Math.min(100, conversationCount * 1.5);

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
        market: { score: Math.round(marketScore), weight: 0.20, rawPoints: Math.round(marketScore), maxPoints: 100, change: 0, trend: 'neutral' },
        product: { score: Math.round(productScore), weight: 0.18, rawPoints: Math.round(productScore), maxPoints: 100, change: 0, trend: 'neutral' },
        goToMarket: { score: Math.round(gtmScore), weight: 0.17, rawPoints: Math.round(gtmScore), maxPoints: 100, change: 0, trend: 'neutral' },
        financial: { score: Math.round(financialScore), weight: 0.18, rawPoints: Math.round(financialScore), maxPoints: 100, change: 0, trend: 'neutral' },
        team: { score: Math.round(teamScore), weight: 0.15, rawPoints: Math.round(teamScore), maxPoints: 100, change: 0, trend: 'neutral' },
        traction: { score: Math.round(tractionScore), weight: 0.12, rawPoints: Math.round(tractionScore), maxPoints: 100, change: 0, trend: 'neutral' },
      },
      calculatedAt: new Date(),
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        (payload: { new: Record<string, unknown> }) => {
          // Refetch to get formatted data with trends
          fetchQScore();

          // Show toast notification
          const newScore = payload.new as Record<string, number>;
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, supabase, qScore]);

  const value = {
    qScore,
    loading,
    refetch: fetchQScore,
  };

  return <QScoreContext.Provider value={value}>{children}</QScoreContext.Provider>;
}
