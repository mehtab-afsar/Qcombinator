import { CSSProperties } from 'react';
import { AlertTriangle } from 'lucide-react';
import { red, alpha } from '@/lib/constants/colors';

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  style?: CSSProperties;
}

export function ErrorBanner({ message, onDismiss, style }: ErrorBannerProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 14px', borderRadius: 8,
      background: alpha(red, 0.06), border: `1px solid ${alpha(red, 0.3)}`,
      fontSize: 13, color: red, lineHeight: 1.5,
      ...style,
    }}>
      <AlertTriangle size={15} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
      <span style={{ flex: 1 }}>{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Dismiss" style={{
          background: 'none', border: 'none', cursor: 'pointer', color: red,
          fontSize: 13, lineHeight: 1, padding: 0, flexShrink: 0,
        }}>✕</button>
      )}
    </div>
  );
}
