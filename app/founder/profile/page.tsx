'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Building2,
  Users,
  TrendingUp,
  Target,
  CheckCircle,
  AlertCircle,
  Edit,
  Eye,
  Share,
  RefreshCw
} from 'lucide-react';
import { useFounderData } from '@/lib/hooks/useFounderData';
import Link from 'next/link';

export default function ProfileBuilder() {
  const { profile, assessment, metrics, loading } = useFounderData();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-light">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile || !assessment) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="border-2 border-blue-200">
          <CardContent className="p-12 text-center">
            <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-light text-gray-900 mb-3">
              Complete Your Profile
            </h2>
            <p className="text-gray-600 font-light mb-6">
              Complete your assessment to build your founder profile.
            </p>
            <Link href="/founder/assessment">
              <Button>
                Start Assessment
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const calculateCompletionScore = () => {
    const fields = [
      profile.startupName,
      profile.industry,
      profile.description,
      assessment.problemStory,
      assessment.icpDescription,
      assessment.mrr !== undefined,
      assessment.channelsTried?.length,
    ];

    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  };

  const profileCompletion = calculateCompletionScore();

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light text-gray-900">Profile Builder</h1>
            <p className="text-gray-600 font-light">Your founder profile based on your assessment data</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" className="font-light">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button variant="outline" className="font-light">
              <Share className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        {/* Profile Overview */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Company Basics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between font-light">
                  <span>Company Basics</span>
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 font-light">Company Name</label>
                  <p className="font-normal text-gray-900">{profile.startupName || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 font-light">Industry</label>
                  <p className="font-normal text-gray-900">{profile.industry || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 font-light">Stage</label>
                  <p className="font-normal text-gray-900">{profile.stage}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 font-light">Description</label>
                  <p className="font-light text-gray-700">{profile.description || assessment.problemStory.substring(0, 200) + '...'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Problem & Solution */}
            <Card>
              <CardHeader>
                <CardTitle className="font-light">Problem & Solution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 font-light">Problem Statement</label>
                  <p className="font-light text-gray-700">{assessment.problemStory}</p>
                </div>
                {assessment.advantageExplanation && (
                  <div>
                    <label className="text-sm text-gray-600 font-light">Unique Advantage</label>
                    <p className="font-light text-gray-700">{assessment.advantageExplanation}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Market & Customers */}
            <Card>
              <CardHeader>
                <CardTitle className="font-light">Market & Customers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {assessment.icpDescription && (
                  <div>
                    <label className="text-sm text-gray-600 font-light">Ideal Customer Profile</label>
                    <p className="font-light text-gray-700">{assessment.icpDescription}</p>
                  </div>
                )}
                {assessment.targetCustomers && (
                  <div>
                    <label className="text-sm text-gray-600 font-light">Target Market Size</label>
                    <p className="font-normal text-gray-900">{assessment.targetCustomers.toLocaleString()} customers</p>
                  </div>
                )}
                {assessment.conversationCount && (
                  <div>
                    <label className="text-sm text-gray-600 font-light">Customer Conversations</label>
                    <p className="font-normal text-gray-900">{assessment.conversationCount} conversations</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financials */}
            {metrics && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-light">Financial Metrics</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600 font-light">MRR</label>
                    <p className="text-2xl font-light text-gray-900">${metrics.mrr.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 font-light">ARR</label>
                    <p className="text-2xl font-light text-gray-900">${metrics.arr.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 font-light">Burn Rate</label>
                    <p className="text-2xl font-light text-gray-900">${metrics.burn.toLocaleString()}/mo</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 font-light">Runway</label>
                    <p className="text-2xl font-light text-gray-900">{metrics.runway} months</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Completion Status */}
            <Card>
              <CardHeader>
                <CardTitle className="font-light">Profile Completion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="text-4xl font-light text-blue-600 mb-2">{profileCompletion}%</div>
                  <p className="text-sm text-gray-600 font-light">Complete</p>
                </div>
                <Progress value={profileCompletion} className="h-2 mb-4" />
                <div className="space-y-2">
                  <ProfileCheckItem
                    completed={!!profile.startupName}
                    label="Company name"
                  />
                  <ProfileCheckItem
                    completed={!!profile.industry}
                    label="Industry"
                  />
                  <ProfileCheckItem
                    completed={!!assessment.problemStory}
                    label="Problem statement"
                  />
                  <ProfileCheckItem
                    completed={!!assessment.icpDescription}
                    label="ICP description"
                  />
                  <ProfileCheckItem
                    completed={assessment.mrr !== undefined}
                    label="Financial metrics"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            {metrics && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-light">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <StatItem
                    icon={<Users className="w-4 h-4" />}
                    label="Customers"
                    value={metrics.customers.toString()}
                  />
                  <StatItem
                    icon={<TrendingUp className="w-4 h-4" />}
                    label="MRR Growth"
                    value={`${metrics.mrrGrowth}%`}
                  />
                  <StatItem
                    icon={<Target className="w-4 h-4" />}
                    label="LTV:CAC"
                    value={`${metrics.ltvCacRatio}:1`}
                  />
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="font-light">Next Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/founder/assessment">
                  <Button variant="outline" className="w-full justify-start font-light">
                    <Edit className="w-4 h-4 mr-2" />
                    Update Assessment
                  </Button>
                </Link>
                <Link href="/founder/dashboard">
                  <Button variant="outline" className="w-full justify-start font-light">
                    <Target className="w-4 h-4 mr-2" />
                    View Dashboard
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileCheckItem({ completed, label }: { completed: boolean; label: string }) {
  return (
    <div className="flex items-center space-x-2 text-sm">
      {completed ? (
        <CheckCircle className="w-4 h-4 text-green-600" />
      ) : (
        <AlertCircle className="w-4 h-4 text-gray-400" />
      )}
      <span className={`font-light ${completed ? 'text-gray-900' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  );
}

function StatItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        {icon}
        <span className="text-sm text-gray-600 font-light">{label}</span>
      </div>
      <span className="font-normal text-gray-900">{value}</span>
    </div>
  );
}
