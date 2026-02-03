import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Recommendation } from "@/app/types/edge-alpha";
import { getPriorityColor } from "@/lib/recommendation-engine";

interface RecommendedActionsProps {
  recommendations: Recommendation[];
}

export function RecommendedActions({ recommendations }: RecommendedActionsProps) {
  const topThree = recommendations.slice(0, 3);

  const getPriorityIcon = (priority: Recommendation['priority']) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="h-5 w-5" />;
      case 'medium':
        return <TrendingUp className="h-5 w-5" />;
      case 'low':
        return <CheckCircle className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Top 3 Recommended Actions</h2>
        <Badge variant="outline" className="text-purple-600">
          AI-Powered
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topThree.map((rec, index) => {
          const colors = getPriorityColor(rec.priority);
          return (
            <Card
              key={rec.id}
              className={`hover:shadow-lg transition-all duration-200 border-2 ${colors.border} ${colors.bg}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className={`h-10 w-10 rounded-lg ${colors.bg} ${colors.text} flex items-center justify-center`}>
                    {getPriorityIcon(rec.priority)}
                  </div>
                  <Badge className={colors.text} variant="outline">
                    {rec.impact}
                  </Badge>
                </div>

                <h3 className="font-bold text-gray-900 mb-2">{rec.title}</h3>
                <p className="text-sm text-gray-600 mb-4">{rec.description}</p>

                <Link href={rec.ctaLink}>
                  <Button className="w-full" size="sm">
                    {rec.ctaText}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>

                <div className="mt-3 text-xs text-gray-500 flex items-center">
                  <span className={`inline-block w-2 h-2 rounded-full ${
                    rec.priority === 'high' ? 'bg-red-500' :
                    rec.priority === 'medium' ? 'bg-yellow-500' :
                    'bg-blue-500'
                  } mr-2`} />
                  {rec.priority === 'high' ? 'High Priority' :
                   rec.priority === 'medium' ? 'Medium Priority' :
                   'Low Priority'}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
