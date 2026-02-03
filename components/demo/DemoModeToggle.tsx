"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Play, Users, TrendingUp } from "lucide-react";

interface DemoModeToggleProps {
  onStartJourney: (journeyId: 'founder' | 'investor') => void;
}

export function DemoModeToggle({ onStartJourney }: DemoModeToggleProps) {
  const [showModal, setShowModal] = useState(false);

  const journeys = [
    {
      id: 'founder' as const,
      title: 'New Founder Journey',
      description: 'See how a founder improves their Q-Score and unlocks investor connections',
      icon: TrendingUp,
      duration: '~3 mins',
      steps: 11,
      color: 'from-blue-600 to-purple-600'
    },
    {
      id: 'investor' as const,
      title: 'Investor Discovery Journey',
      description: 'Experience how investors filter, evaluate, and connect with quality startups',
      icon: Users,
      duration: '~2 mins',
      steps: 10,
      color: 'from-green-600 to-emerald-600'
    }
  ];

  const handleStartJourney = (journeyId: 'founder' | 'investor') => {
    setShowModal(false);
    onStartJourney(journeyId);
  };

  return (
    <>
      {/* Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowModal(true)}
        className="border-purple-300 hover:bg-purple-50"
      >
        <Sparkles className="h-4 w-4 mr-2 text-purple-600" />
        <span className="font-medium">Demo Mode</span>
        <Badge className="ml-2 bg-purple-600 text-white text-xs">Try It</Badge>
      </Button>

      {/* Journey Selection Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center">
              <Sparkles className="h-6 w-6 mr-3 text-purple-600" />
              Interactive Demo Journeys
            </DialogTitle>
            <p className="text-sm text-gray-600 mt-2">
              Choose a guided tour to see Edge Alpha in action
            </p>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {journeys.map((journey) => {
              const Icon = journey.icon;
              return (
                <Card
                  key={journey.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => handleStartJourney(journey.id)}
                >
                  <CardContent className="p-6">
                    <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${journey.color} flex items-center justify-center mb-4`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>

                    <h3 className="font-bold text-lg text-gray-900 mb-2">
                      {journey.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                      {journey.description}
                    </p>

                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                      <span>{journey.steps} steps</span>
                      <span>{journey.duration}</span>
                    </div>

                    <Button
                      className={`w-full bg-gradient-to-r ${journey.color} hover:opacity-90`}
                      size="sm"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Journey
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Note:</strong> Demo mode is interactive and will guide you through the platform
              step-by-step. You can exit at any time or skip ahead if needed.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
