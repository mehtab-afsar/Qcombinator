import { CSSProperties, ReactNode } from 'react';

// The one thing proven duplicated identically across the "hub" pages (Dashboard, Metrics,
// Academy, Executive Team, Executive Documents, Improve-Qscore) — a page silently drifting
// to a different maxWidth here is what made switching between hub pages visibly "jump."
// Deliberately doesn't own padding/background: those already vary even within this cohort.
export type PageContainerSize = 'hub';

const SIZE: Record<PageContainerSize, number> = {
  hub: 1120,
};

interface PageContainerProps {
  size?: PageContainerSize;
  children: ReactNode;
  style?: CSSProperties;
}

export function PageContainer({ size = 'hub', children, style }: PageContainerProps) {
  return (
    <div style={{ maxWidth: SIZE[size], margin: '0 auto', ...style }}>
      {children}
    </div>
  );
}
