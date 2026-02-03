import { Badge } from "@/components/ui/badge";
import { Clock, Eye, Calendar, X } from "lucide-react";

export type ConnectionStatus = 'pending' | 'viewed' | 'meeting-scheduled' | 'passed' | 'none';

interface ConnectionStatusBadgeProps {
  status: ConnectionStatus;
}

export function ConnectionStatusBadge({ status }: ConnectionStatusBadgeProps) {
  if (status === 'none') return null;

  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          label: 'Request Sent',
          className: 'bg-gray-100 text-gray-700 border-gray-300'
        };
      case 'viewed':
        return {
          icon: Eye,
          label: 'Viewed by Investor',
          className: 'bg-blue-100 text-blue-700 border-blue-300'
        };
      case 'meeting-scheduled':
        return {
          icon: Calendar,
          label: 'Meeting Scheduled',
          className: 'bg-green-100 text-green-700 border-green-300'
        };
      case 'passed':
        return {
          icon: X,
          label: 'Not a Fit',
          className: 'bg-red-100 text-red-700 border-red-300'
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.className} flex items-center`}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}
