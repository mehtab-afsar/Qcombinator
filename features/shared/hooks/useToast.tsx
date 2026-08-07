'use client'

import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  toasts: Toast[]
  toast: {
    success: (msg: string, ms?: number) => void
    error: (msg: string, ms?: number) => void
    info: (msg: string, ms?: number) => void
    warning: (msg: string, ms?: number) => void
  }
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

// Mounted once at the root (app/layout.tsx). Every useToast() call — whether from a
// founder page, an investor page, or a layout's own ToastStack — reads/writes this one
// shared state. A page previously calling useToast() directly got its own independent
// local-state instance whose pushes nothing rendered (features/shared/hooks/useToast.ts's
// old implementation was a bare useState hook, no Context) — this is the fix for that.
export function ToastProvider({ children }: { children: ReactNode }) {
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

  const value: ToastContextValue = {
    toasts,
    toast: {
      success: (msg, ms) => push(msg, 'success', ms),
      error:   (msg, ms) => push(msg, 'error',   ms),
      info:    (msg, ms) => push(msg, 'info',    ms),
      warning: (msg, ms) => push(msg, 'warning', ms),
    },
    dismiss,
  }

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast() must be used within a ToastProvider (mounted in app/layout.tsx)')
  return ctx
}
