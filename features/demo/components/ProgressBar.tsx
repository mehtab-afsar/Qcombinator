"use client";

import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface ProgressBarProps {
  progress: number;
  currentStep: number;
  totalSteps: number;
  journeyName: string;
}

export function ProgressBar({ progress, currentStep, totalSteps, journeyName }: ProgressBarProps) {
  return (
    <Card className="fixed top-4 right-4 z-50 border-2 border-purple-300 shadow-lg">
      <div className="p-4 min-w-[280px]">
        <div className="flex items-center space-x-2 mb-3">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <div>
            <h3 className="font-bold text-sm text-gray-900">Demo Mode</h3>
            <p className="text-xs text-gray-600">{journeyName}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Step {currentStep} of {totalSteps}</span>
            <span className="font-semibold text-purple-600">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
