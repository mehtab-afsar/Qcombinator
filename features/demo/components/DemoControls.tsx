"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, SkipForward, X } from "lucide-react";

interface DemoControlsProps {
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onExit: () => void;
  canGoBack: boolean;
  isLastStep: boolean;
  isTransitioning: boolean;
  waitingForUser?: boolean;
}

export function DemoControls({
  onNext,
  onPrevious,
  onSkip,
  onExit,
  canGoBack,
  isLastStep,
  isTransitioning,
  waitingForUser
}: DemoControlsProps) {
  return (
    <Card className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 border-2 border-blue-300 shadow-xl">
      <div className="p-4 flex items-center space-x-3">
        {/* Exit Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onExit}
          className="text-gray-600 hover:text-gray-900"
        >
          <X className="h-4 w-4 mr-1" />
          Exit Demo
        </Button>

        <div className="h-6 w-px bg-gray-300" />

        {/* Previous Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevious}
          disabled={!canGoBack || isTransitioning}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        {/* Next/Finish Button */}
        <Button
          size="sm"
          onClick={onNext}
          disabled={isTransitioning && !waitingForUser}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          {isLastStep ? (
            <>
              Finish Demo
              <ChevronRight className="h-4 w-4 ml-1" />
            </>
          ) : (
            <>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </>
          )}
        </Button>

        {!isLastStep && (
          <>
            <div className="h-6 w-px bg-gray-300" />
            {/* Skip Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              className="text-gray-600 hover:text-gray-900"
            >
              <SkipForward className="h-4 w-4 mr-1" />
              Skip to End
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
