"use client";

import { useState, useEffect } from "react";
import { TooltipStep } from "./TooltipStep";
import { ProgressBar } from "./ProgressBar";
import { DemoControls } from "./DemoControls";

export interface DemoStepAction {
  type: 'navigate' | 'click' | 'highlight' | 'wait' | 'update-data';
  target?: string;
  duration?: number;
}

export interface DemoStep {
  id: string;
  title: string;
  description: string;
  target?: string;
  targetElement?: string;
  action?: DemoStepAction;
  position?: 'top' | 'bottom' | 'left' | 'right';
  waitForUser?: boolean;
}

interface GuidedTourProps {
  steps: DemoStep[];
  journeyName: string;
  onComplete: () => void;
  onExit: () => void;
  getProgress: (stepId: string) => number;
}

export function GuidedTour({
  steps,
  journeyName,
  onComplete,
  onExit,
  getProgress
}: GuidedTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const currentStep = steps[currentStepIndex];
  const progress = getProgress(currentStep.id);
  const isLastStep = currentStepIndex === steps.length - 1;

  useEffect(() => {
    // Execute step action if present
    if (currentStep.action) {
      executeAction(currentStep.action);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepIndex]);

  const executeAction = async (action: DemoStep['action']) => {
    if (!action) return;

    setIsTransitioning(true);

    switch (action.type) {
      case 'navigate':
        if (action.target) {
          // Allow time for tooltip to be seen before navigation
          await new Promise(resolve => setTimeout(resolve, 1000));
          window.location.href = action.target;
        }
        break;
      case 'click':
        if (action.target) {
          await new Promise(resolve => setTimeout(resolve, 500));
          const element = document.querySelector(action.target);
          if (element instanceof HTMLElement) {
            element.click();
          }
        }
        break;
      case 'highlight':
        if (action.target) {
          const element = document.querySelector(action.target);
          if (element instanceof HTMLElement) {
            element.classList.add('demo-highlight');
            setTimeout(() => {
              element.classList.remove('demo-highlight');
            }, 2000);
          }
        }
        break;
      case 'update-data':
        // This would trigger data updates in the parent component
        // For demo purposes, we just simulate it
        await new Promise(resolve => setTimeout(resolve, 500));
        break;
    }

    setIsTransitioning(false);
  };

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    setCurrentStepIndex(steps.length - 1);
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40 pointer-events-none" />

      {/* Progress Bar */}
      <ProgressBar
        progress={progress}
        currentStep={currentStepIndex + 1}
        totalSteps={steps.length}
        journeyName={journeyName}
      />

      {/* Tooltip for current step */}
      {currentStep && (
        <TooltipStep
          step={currentStep}
          position={currentStep.position || 'bottom'}
          isTransitioning={isTransitioning}
        />
      )}

      {/* Demo Controls */}
      <DemoControls
        onNext={handleNext}
        onPrevious={handlePrevious}
        onSkip={handleSkip}
        onExit={onExit}
        canGoBack={currentStepIndex > 0}
        isLastStep={isLastStep}
        isTransitioning={isTransitioning}
        waitingForUser={currentStep.waitForUser}
      />

      {/* Add CSS for demo highlight effect */}
      <style jsx global>{`
        .demo-highlight {
          animation: demo-pulse 1s ease-in-out;
          outline: 3px solid #3b82f6;
          outline-offset: 4px;
          border-radius: 8px;
        }

        @keyframes demo-pulse {
          0%, 100% {
            outline-color: #3b82f6;
            outline-width: 3px;
          }
          50% {
            outline-color: #8b5cf6;
            outline-width: 6px;
          }
        }

        [data-demo]:not(.demo-highlight) {
          position: relative;
          z-index: 45;
          background: white;
          border-radius: 8px;
        }
      `}</style>
    </>
  );
}
