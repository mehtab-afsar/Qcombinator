"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  Calendar,
  Users,
  Clock,
  Star,
  Award,
  ArrowRight,
  Video,
  Sparkles
} from "lucide-react";
import { getUpcomingWorkshops, getPastWorkshops, mentors, academyPrograms, getOpenPrograms } from "@/features/academy/data/workshops";

export default function Academy() {
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const upcomingWorkshops = getUpcomingWorkshops();
  const pastWorkshops = getPastWorkshops();
  const openPrograms = getOpenPrograms();

  const handleRegister = () => {
    setShowComingSoonModal(true);
    setTimeout(() => setShowComingSoonModal(false), 2000);
  };

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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <GraduationCap className="h-8 w-8 mr-3 text-purple-600" />
            Academy & Workshops
          </h1>
          <p className="text-gray-600 mt-1">Learn from experts, connect with mentors, and accelerate your growth</p>
        </div>
        <Badge variant="outline" className="text-purple-600 border-purple-300 bg-purple-50">
          NEW
        </Badge>
      </div>

      {/* Coming Soon Modal */}
      {showComingSoonModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in">
          <Card className="max-w-sm">
            <CardContent className="p-6 text-center">
              <Sparkles className="h-12 w-12 text-purple-600 mx-auto mb-3" />
              <h3 className="font-bold text-lg mb-2">Coming Soon!</h3>
              <p className="text-gray-600 text-sm">Registration will open shortly. Stay tuned!</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="workshops" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="workshops">Workshops</TabsTrigger>
          <TabsTrigger value="mentors">Mentors</TabsTrigger>
          <TabsTrigger value="programs">Programs</TabsTrigger>
        </TabsList>

        {/* WORKSHOPS TAB */}
        <TabsContent value="workshops" className="space-y-6 mt-6">
          {/* Upcoming Workshops */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Upcoming Workshops</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {upcomingWorkshops.map((workshop) => (
                <Card key={workshop.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <Badge className={getTopicColor(workshop.topic)}>
                        {workshop.topic.replace('-', ' ').toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {workshop.spotsLeft} spots left
                      </Badge>
                    </div>

                    <h3 className="font-bold text-lg text-gray-900 mb-2">{workshop.title}</h3>
                    <p className="text-sm text-gray-600 mb-4">{workshop.description}</p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        {new Date(workshop.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} at {workshop.time}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-2" />
                        {workshop.duration}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="h-4 w-4 mr-2" />
                        {workshop.instructor} • {workshop.instructorTitle}
                      </div>
                    </div>

                    <Button className="w-full" onClick={handleRegister}>
                      Register for Workshop
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Past Workshops */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Past Workshops (Recordings Available)</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {pastWorkshops.map((workshop) => (
                <Card key={workshop.id} className="hover:shadow-lg transition-shadow opacity-90">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <Badge className={getTopicColor(workshop.topic)}>
                        {workshop.topic.replace('-', ' ').toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="bg-gray-100">
                        <Video className="h-3 w-3 mr-1" />
                        Recording
                      </Badge>
                    </div>

                    <h3 className="font-bold text-lg text-gray-900 mb-2">{workshop.title}</h3>
                    <p className="text-sm text-gray-600 mb-4">{workshop.description}</p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        {new Date(workshop.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="h-4 w-4 mr-2" />
                        {workshop.instructor} • {workshop.instructorTitle}
                      </div>
                    </div>

                    <Button variant="outline" className="w-full" onClick={handleRegister}>
                      <Video className="h-4 w-4 mr-2" />
                      Watch Recording
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* MENTORS TAB */}
        <TabsContent value="mentors" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {mentors.map((mentor) => (
              <Card key={mentor.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="text-center mb-4">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 mx-auto mb-3 flex items-center justify-center text-white font-bold text-2xl">
                      {mentor.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <h3 className="font-bold text-lg text-gray-900">{mentor.name}</h3>
                    <p className="text-sm text-gray-600">{mentor.title}</p>
                    <p className="text-xs text-gray-500">{mentor.company}</p>
                  </div>

                  <div className="flex items-center justify-center space-x-4 mb-4 text-sm">
                    <div className="flex items-center text-yellow-600">
                      <Star className="h-4 w-4 mr-1 fill-current" />
                      {mentor.rating}
                    </div>
                    <div className="text-gray-600">
                      {mentor.sessionsCompleted} sessions
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {mentor.expertise.map((skill) => (
                      <Badge key={skill} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>

                  <p className="text-sm text-gray-700 mb-4 line-clamp-3">
                    {mentor.bio}
                  </p>

                  <div className="text-sm text-gray-600 mb-4 flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    {mentor.availability}
                  </div>

                  <Button className="w-full" onClick={handleRegister}>
                    Book 1:1 Session
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}

            {/* Coming Soon Card */}
            <Card className="hover:shadow-lg transition-shadow border-dashed border-2">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                <Sparkles className="h-12 w-12 text-gray-400 mb-3" />
                <h3 className="font-bold text-gray-700 mb-2">More Mentors Coming Soon</h3>
                <p className="text-sm text-gray-500">We&apos;re adding new expert mentors every week</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* PROGRAMS TAB */}
        <TabsContent value="programs" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {openPrograms.map((program) => (
              <Card key={program.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{program.name}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{program.duration} • Cohort-based</p>
                    </div>
                    <Badge className="bg-green-500 text-white">Applications Open</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4">{program.description}</p>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Start Date:</span>
                      <span className="font-medium">
                        {new Date(program.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Cohort Size:</span>
                      <span className="font-medium">{program.cohortSize} founders</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Spots Left:</span>
                      <span className="font-medium text-orange-600">{program.spotsLeft} remaining</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Min Q-Score:</span>
                      <span className="font-medium">{program.requirements.minQScore}</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-sm text-gray-900 mb-2">Curriculum:</h4>
                    <ul className="space-y-1">
                      {program.curriculum.map((module, idx) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-start">
                          <span className="text-purple-600 mr-2">•</span>
                          {module}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button className="w-full" onClick={handleRegister}>
                    Apply to Program
                    <Award className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}

            {/* Closed Program Example */}
            {academyPrograms.filter(p => p.status === 'closed').map((program) => (
              <Card key={program.id} className="opacity-60">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{program.name}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{program.duration} • Cohort-based</p>
                    </div>
                    <Badge variant="outline" className="bg-gray-100">Applications Closed</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4">{program.description}</p>
                  <Button variant="outline" className="w-full" disabled>
                    Applications Opening Soon
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
