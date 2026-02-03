import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, Eye, MessageSquare, ArrowRight } from "lucide-react";
import Link from "next/link";

interface InvestorNotification {
  id: string;
  type: 'new_match' | 'profile_view' | 'interest' | 'message';
  investorName: string;
  message: string;
  timestamp: string;
  urgent: boolean;
}

interface InvestorNotificationsProps {
  notifications?: InvestorNotification[];
  newMatchesCount?: number;
}

export function InvestorNotifications({
  notifications = [],
  newMatchesCount = 3
}: InvestorNotificationsProps) {
  // Mock notifications if none provided
  const displayNotifications: InvestorNotification[] = notifications.length > 0
    ? notifications
    : [
        {
          id: 'notif-1',
          type: 'new_match',
          investorName: 'Sequoia Capital',
          message: 'New match (95% fit)',
          timestamp: '1 hour ago',
          urgent: true
        },
        {
          id: 'notif-2',
          type: 'profile_view',
          investorName: 'Andreessen Horowitz',
          message: 'Viewed your profile',
          timestamp: '3 hours ago',
          urgent: false
        },
        {
          id: 'notif-3',
          type: 'interest',
          investorName: 'Benchmark Capital',
          message: 'Expressed interest',
          timestamp: '1 day ago',
          urgent: true
        }
      ];

  const getIcon = (type: InvestorNotification['type']) => {
    switch (type) {
      case 'new_match':
        return <Star className="h-4 w-4 text-yellow-600" />;
      case 'profile_view':
        return <Eye className="h-4 w-4 text-blue-600" />;
      case 'interest':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'message':
        return <MessageSquare className="h-4 w-4 text-purple-600" />;
    }
  };

  const getTypeLabel = (type: InvestorNotification['type']) => {
    switch (type) {
      case 'new_match':
        return 'New Match';
      case 'profile_view':
        return 'Profile View';
      case 'interest':
        return 'Interest';
      case 'message':
        return 'Message';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Investor Activity</h2>
        <Link href="/founder/matching">
          <Button variant="ghost" size="sm">
            View All Matches
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>

      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-purple-600 mb-1">
                {newMatchesCount}
              </div>
              <p className="text-sm text-gray-700">New investor matches this week</p>
            </div>
            <div className="h-16 w-16 rounded-full bg-purple-600 flex items-center justify-center">
              <Star className="h-8 w-8 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {displayNotifications.map((notif) => (
          <Card key={notif.id} className={`hover:shadow-md transition-shadow ${notif.urgent ? 'border-l-4 border-l-purple-500' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h3 className="font-semibold text-gray-900">{notif.investorName}</h3>
                      <p className="text-sm text-gray-600">{notif.message}</p>
                    </div>
                    {notif.urgent && (
                      <Badge className="bg-purple-500 text-white ml-2">Urgent</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">{notif.timestamp}</span>
                    <Link href="/founder/matching">
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        View Profile
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
