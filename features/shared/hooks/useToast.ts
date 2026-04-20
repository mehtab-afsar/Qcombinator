'use client'

import { useState, useCallback, useRef } from 'react'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  variant: ToastVariant
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counterRef = useRef(0)

  const push = useCallback((message: string, variant: ToastVariant = 'info', duration = 3500) => {
    const id = `toast-${++counterRef.current}`
    setToasts(prev => [...prev, { id, message, variant }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return {
    toasts,
    toast: {
      success: (msg: string, ms?: number) => push(msg, 'success', ms),
      error:   (msg: string, ms?: number) => push(msg, 'error',   ms),
      info:    (msg: string, ms?: number) => push(msg, 'info',    ms),
      warning: (msg: string, ms?: number) => push(msg, 'warning', ms),
    },
    dismiss,
  }
}
