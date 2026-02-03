import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, ArrowRight, GraduationCap } from "lucide-react";
import Link from "next/link";
import { Workshop } from "@/app/types/edge-alpha";

interface WorkshopsPreviewProps {
  workshops: Workshop[];
}

export function WorkshopsPreview({ workshops }: WorkshopsPreviewProps) {
  const upcomingWorkshops = workshops.filter(w => !w.isPast).slice(0, 3);

  const getTopicColor = (topic: string) => {
    const colors: Record<string, string> = {
      'go-to-market': 'bg-blue-100 text-blue-700',
      'product': 'bg-purple-100 text-purple-700',
      'fundraising': 'bg-green-100 text-green-700',
      'team': 'bg-orange-100 text-orange-700',
      'sales': 'bg-pink-100 text-pink-700',
      'operations': 'bg-teal-100 text-teal-700'
    };
    return colors[topic] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          <GraduationCap className="h-6 w-6 mr-2 text-purple-600" />
          Upcoming Workshops
        </h2>
        <Link href="/founder/academy">
          <Button variant="ghost" size="sm">
            View All
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>

      {upcomingWorkshops.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600">No upcoming workshops scheduled</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {upcomingWorkshops.map((workshop) => (
            <Card key={workshop.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <Badge className={getTopicColor(workshop.topic)}>
                    {workshop.topic.replace('-', ' ').toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {workshop.spotsLeft} left
                  </Badge>
                </div>

                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[2.5rem]">
                  {workshop.title}
                </h3>

                <div className="space-y-1.5 mb-4 text-xs text-gray-600">
                  <div className="flex items-center">
                    <Calendar className="h-3.5 w-3.5 mr-1.5" />
                    {new Date(workshop.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-3.5 w-3.5 mr-1.5" />
                    {workshop.duration}
                  </div>
                  <div className="flex items-center">
                    <Users className="h-3.5 w-3.5 mr-1.5" />
                    {workshop.instructor}
                  </div>
                </div>

                <Link href="/founder/academy">
                  <Button variant="outline" size="sm" className="w-full">
                    Learn More
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
