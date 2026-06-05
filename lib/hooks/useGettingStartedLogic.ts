import { useState, useEffect } from 'react'
import type { CardId } from '@/lib/constants/getting-started-cards'

interface GettingStartedState {
  lastShownDate: string | null
  hiddenAfterScore: boolean
  dismissedCards: Partial<Record<CardId, number>>
}

const STORAGE_KEY = 'qc_getting_started_logic'

/**
 * Manages Getting Started cards logic:
 * - Shows cards once per day (reset at midnight UTC)
 * - Hides permanently once Q-Score is calculated (score > 0)
 * - Tracks card dismissals (stops showing after 3 dismisses)
 */
export function useGettingStartedLogic(qscoreOverall: number | null) {
  const [shouldShow, setShouldShow] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dismissedCards, setDismissedCards] = useState<Partial<Record<CardId, number>>>({})

  useEffect(() => {
    // If Q-Score has been calculated, never show cards again
    if (qscoreOverall && qscoreOverall > 0) {
      setShouldShow(false)
      setLoading(false)
      return
    }

    // Get stored state
    const stored = localStorage.getItem(STORAGE_KEY)
    const state: GettingStartedState = stored
      ? JSON.parse(stored)
      : { lastShownDate: null, hiddenAfterScore: false, dismissedCards: {} }

    // If already hidden after score completion, stay hidden
    if (state.hiddenAfterScore) {
      setShouldShow(false)
      setLoading(false)
      return
    }

    // Get today's date (UTC) in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0]

    // Show cards if:
    // 1. Never shown before (lastShownDate is null)
    // 2. Last shown on a different day than today
    const show = !state.lastShownDate || state.lastShownDate !== today
    setShouldShow(show)
    setDismissedCards(state.dismissedCards || {})
    setLoading(false)
  }, [qscoreOverall])

  // Mark as shown today
  const markAsShown = () => {
    const today = new Date().toISOString().split('T')[0]
    const stored = localStorage.getItem(STORAGE_KEY)
    const state: GettingStartedState = stored
      ? JSON.parse(stored)
      : { lastShownDate: null, hiddenAfterScore: false, dismissedCards: {} }

    state.lastShownDate = today
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }

  // Mark as hidden after Q-Score completion
  const markAsHiddenAfterScore = () => {
    const stored = localStorage.getItem(STORAGE_KEY)
    const state: GettingStartedState = stored
      ? JSON.parse(stored)
      : { lastShownDate: null, hiddenAfterScore: false, dismissedCards: {} }

    state.lastShownDate = new Date().toISOString().split('T')[0]
    state.hiddenAfterScore = true
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    setShouldShow(false)
  }

  // Dismiss a specific card (increment dismiss count)
  const dismissCard = (cardId: CardId) => {
    const stored = localStorage.getItem(STORAGE_KEY)
    const state: GettingStartedState = stored
      ? JSON.parse(stored)
      : { lastShownDate: null, hiddenAfterScore: false, dismissedCards: {} }

    state.dismissedCards = state.dismissedCards || {}
    state.dismissedCards[cardId] = (state.dismissedCards[cardId] ?? 0) + 1

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    setDismissedCards(state.dismissedCards)
  }

  // Dismiss all cards for today (will show again tomorrow)
  const dismissForToday = () => {
    markAsShown()
    setShouldShow(false)
  }

  return {
    shouldShow,
    loading,
    dismissedCards,
    markAsShown,
    markAsHiddenAfterScore,
    dismissCard,
    dismissForToday,
  }
}
