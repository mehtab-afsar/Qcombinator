import { Clock, Eye, Calendar, X } from "lucide-react";

// ─── palette ──────────────────────────────────────────────────────────────────
const bdr   = "#E2DDD5";
const ink   = "#18160F";
const muted = "#8A867C";
const blue  = "#2563EB";
const green = "#16A34A";
const red   = "#DC2626";
const amber = "#D97706";

export type ConnectionStatus = 'pending' | 'viewed' | 'meeting-scheduled' | 'passed' | 'none';

interface ConnectionStatusBadgeProps {
  status: ConnectionStatus;
}

const STATUS_CONFIG: Record<Exclude<ConnectionStatus, 'none'>, {
  icon: React.ElementType;
  label: string;
  color: string;
  bg: string;
  border: string;
}> = {
  pending: {
    icon: Clock,
    label: 'Request Sent',
    color: muted,
    bg: 'transparent',
    border: bdr,
  },
  viewed: {
    icon: Eye,
    label: 'Viewed',
    color: blue,
    bg: `${blue}10`,
    border: `${blue}30`,
  },
  'meeting-scheduled': {
    icon: Calendar,
    label: 'Meeting Scheduled',
    color: green,
    bg: `${green}10`,
    border: `${green}30`,
  },
  passed: {
    icon: X,
    label: 'Not a Fit',
    color: red,
    bg: `${red}10`,
    border: `${red}30`,
  },
};

export function ConnectionStatusBadge({ status }: ConnectionStatusBadgeProps) {
  if (status === 'none') return null;

  const cfg  = STATUS_CONFIG[status];
  if (!cfg) return null;

  const Icon = cfg.icon;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '4px 10px',
      fontSize: 11,
      fontWeight: 500,
      color: cfg.color,
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: 999,
      whiteSpace: 'nowrap',
    }}>
      <Icon style={{ height: 11, width: 11 }} />
      {cfg.label}
    </span>
  );
}
