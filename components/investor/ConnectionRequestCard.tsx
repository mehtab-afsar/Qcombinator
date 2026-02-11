"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Check,
  X,
  DollarSign,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useState } from "react";

interface ConnectionRequest {
  id: string;
  founderName: string;
  startupName: string;
  oneLiner: string;
  qScore: number;
  qScorePercentile: number;
  qScoreBreakdown: {
    market: number;
    product: number;
    goToMarket: number;
    financial: number;
    team: number;
    traction: number;
  };
  personalMessage?: string;
  requestedDate: string;
  stage: string;
  industry: string;
  fundingTarget: string;
}

interface ConnectionRequestCardProps {
  request: ConnectionRequest;
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
}

export function ConnectionRequestCard({ request, onAccept, onDecline }: ConnectionRequestCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getQScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 70) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-orange-600 bg-orange-50 border-orange-200';
  };

  const getDimensionLabel = (key: string) => {
    const labels: Record<string, string> = {
      market: 'Market',
      product: 'Product',
      goToMarket: 'GTM',
      financial: 'Financial',
      team: 'Team',
      traction: 'Traction'
    };
    return labels[key] || key;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          {/* Founder Info */}
          <div className="flex items-start space-x-4 flex-1">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold">
                {request.founderName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-bold text-lg text-gray-900">{request.founderName}</h3>
                <span className="text-gray-500">•</span>
                <span className="font-semibold text-gray-700">{request.startupName}</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{request.oneLiner}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">{request.stage}</Badge>
                <Badge variant="outline" className="text-xs">{request.industry}</Badge>
                <Badge variant="outline" className="text-xs">
                  <DollarSign className="h-3 w-3 mr-1" />
                  {request.fundingTarget}
                </Badge>
              </div>
            </div>
          </div>

          {/* Q-Score Badge */}
          <div className={`text-center px-4 py-2 rounded-lg border-2 ${getQScoreColor(request.qScore)}`}>
            <div className="text-3xl font-bold">{request.qScore}</div>
            <div className="text-xs font-medium">Q-Score</div>
            <div className="text-xs opacity-75">{request.qScorePercentile}th percentile</div>
          </div>
        </div>

        {/* Personal Message */}
        {request.personalMessage && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-gray-700 italic">&quot;{request.personalMessage}&quot;</p>
          </div>
        )}

        {/* Q-Score Breakdown Toggle */}
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full justify-between"
          >
            <span className="text-sm font-medium">Q-Score Breakdown</span>
            {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {showDetails && (
            <div className="grid grid-cols-3 gap-3 mt-3 p-3 bg-gray-50 rounded-lg">
              {Object.entries(request.qScoreBreakdown).map(([key, value]) => (
                <div key={key} className="text-center">
                  <div className="text-lg font-bold text-gray-900">{value}</div>
                  <div className="text-xs text-gray-600">{getDimensionLabel(key)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-xs text-gray-500">
            Requested {new Date(request.requestedDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDecline(request.id)}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <X className="h-4 w-4 mr-1" />
              Decline
            </Button>
            <Button
              size="sm"
              onClick={() => onAccept(request.id)}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              <Check className="h-4 w-4 mr-1" />
              Accept & Schedule
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
