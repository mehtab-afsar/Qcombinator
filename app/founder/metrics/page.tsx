'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Target,
  BarChart3,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Minus
} from 'lucide-react';
import { useMetrics } from '@/lib/hooks/useFounderData';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function MetricsTracker() {
  const { metrics, healthStatus, loading } = useMetrics();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-light">Loading metrics...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="border-2 border-blue-200">
          <CardContent className="p-12 text-center">
            <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-light text-gray-900 mb-3">
              No Metrics Available
            </h2>
            <p className="text-gray-600 font-light mb-6">
              Complete your assessment to track your key metrics.
            </p>
            <Link href="/founder/assessment">
              <Button>Start Assessment</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-light text-gray-900">Metrics Tracker</h1>
          <p className="text-gray-600 font-light">Key performance indicators calculated from your assessment</p>
        </div>

        {/* Health Status */}
        {healthStatus && (
          <Card className={`border-2 ${
            healthStatus.overall === 'healthy' ? 'border-green-200 bg-green-50' :
            healthStatus.overall === 'warning' ? 'border-yellow-200 bg-yellow-50' :
            'border-red-200 bg-red-50'
          }`}>
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                {healthStatus.overall === 'healthy' ? (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                ) : (
                  <AlertCircle className="h-8 w-8 text-yellow-600" />
                )}
                <div className="flex-1">
                  <h3 className="font-normal text-lg text-gray-900 mb-2">
                    {healthStatus.overall === 'healthy' ? 'Metrics Look Healthy' :
                     healthStatus.overall === 'warning' ? 'Some Areas Need Attention' :
                     'Critical Issues Detected'}
                  </h3>
                  {healthStatus.strengths.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-700 font-light mb-1">Strengths:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {healthStatus.strengths.map((strength, i) => (
                          <li key={i} className="text-sm text-green-700 font-light">{strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {healthStatus.issues.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-700 font-light mb-1">Areas to improve:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {healthStatus.issues.map((issue, i) => (
                          <li key={i} className="text-sm text-yellow-700 font-light">{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Key Metrics Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="MRR"
            value={`$${metrics.mrr.toLocaleString()}`}
            change={metrics.mrrGrowth}
            icon={<DollarSign className="h-5 w-5" />}
            positive={metrics.mrrGrowth > 0}
          />
          <MetricCard
            title="ARR"
            value={`$${metrics.arr.toLocaleString()}`}
            subtitle="Annual Recurring Revenue"
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <MetricCard
            title="Customers"
            value={metrics.customers.toString()}
            icon={<Users className="h-5 w-5" />}
          />
          <MetricCard
            title="Runway"
            value={`${metrics.runway} months`}
            icon={<BarChart3 className="h-5 w-5" />}
            positive={metrics.runway >= 12}
          />
        </div>

        {/* Unit Economics */}
        <Card>
          <CardHeader>
            <CardTitle className="font-light">Unit Economics</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-6">
            <UnitEconomicMetric
              label="LTV"
              value={`$${metrics.ltv.toLocaleString()}`}
              description="Customer Lifetime Value"
            />
            <UnitEconomicMetric
              label="CAC"
              value={`$${metrics.cac.toLocaleString()}`}
              description="Customer Acquisition Cost"
            />
            <UnitEconomicMetric
              label="LTV:CAC Ratio"
              value={`${metrics.ltvCacRatio}:1`}
              description={metrics.ltvCacRatio >= 3 ? "Healthy ✓" : "Below target (3:1)"}
              highlight={metrics.ltvCacRatio >= 3}
            />
          </CardContent>
        </Card>

        {/* Financial Health */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-light">Financial Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <MetricRow
                label="Monthly Burn Rate"
                value={`$${metrics.burn.toLocaleString()}`}
              />
              <MetricRow
                label="Gross Margin"
                value={`${metrics.grossMargin}%`}
                progress={metrics.grossMargin}
              />
              <MetricRow
                label="MRR Growth"
                value={`${metrics.mrrGrowth}%`}
                trend={metrics.mrrGrowth > 0 ? 'up' : metrics.mrrGrowth < 0 ? 'down' : 'neutral'}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-light">Market Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <MetricRow
                label="Total Addressable Market"
                value={`$${(metrics.tam / 1000000).toFixed(1)}M`}
              />
              <MetricRow
                label="Serviceable Market (30%)"
                value={`$${(metrics.sam / 1000000).toFixed(1)}M`}
              />
              <MetricRow
                label="Conversion Rate"
                value={`${metrics.conversionRate}%`}
                progress={metrics.conversionRate}
              />
            </CardContent>
          </Card>
        </div>

        {/* Last Updated */}
        <div className="text-center">
          <p className="text-sm text-gray-500 font-light">
            Metrics calculated on {new Date(metrics.calculatedAt).toLocaleDateString()} at{' '}
            {new Date(metrics.calculatedAt).toLocaleTimeString()}
          </p>
          <Link href="/founder/assessment">
            <Button variant="ghost" size="sm" className="mt-2 font-light">
              Update Assessment to Refresh Metrics
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  change,
  subtitle,
  icon,
  positive
}: {
  title: string;
  value: string;
  change?: number;
  subtitle?: string;
  icon: React.ReactNode;
  positive?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-600 font-light">{title}</p>
          {icon}
        </div>
        <p className="text-2xl font-light text-gray-900 mb-1">{value}</p>
        {change !== undefined && (
          <div className={`flex items-center text-sm ${positive ? 'text-green-600' : 'text-red-600'}`}>
            {positive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            <span className="font-light">{Math.abs(change)}% MoM</span>
          </div>
        )}
        {subtitle && (
          <p className="text-xs text-gray-500 font-light">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

function UnitEconomicMetric({
  label,
  value,
  description,
  highlight
}: {
  label: string;
  value: string;
  description: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-sm text-gray-600 font-light mb-1">{label}</p>
      <p className={`text-3xl font-light mb-1 ${highlight ? 'text-green-600' : 'text-gray-900'}`}>
        {value}
      </p>
      <p className={`text-xs font-light ${highlight ? 'text-green-600' : 'text-gray-500'}`}>
        {description}
      </p>
    </div>
  );
}

function MetricRow({
  label,
  value,
  progress,
  trend
}: {
  label: string;
  value: string;
  progress?: number;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600 font-light">{label}</span>
        <div className="flex items-center space-x-2">
          <span className="font-normal text-gray-900">{value}</span>
          {trend && (
            trend === 'up' ? <TrendingUp className="h-4 w-4 text-green-600" /> :
            trend === 'down' ? <TrendingDown className="h-4 w-4 text-red-600" /> :
            <Minus className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>
      {progress !== undefined && (
        <Progress value={Math.min(progress, 100)} className="h-2" />
      )}
    </div>
  );
}
