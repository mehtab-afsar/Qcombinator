"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { DemoStep } from "@/components/demo/GuidedTour";

interface TooltipStepProps {
  step: DemoStep;
  position: 'top' | 'bottom' | 'left' | 'right';
  isTransitioning: boolean;
}

export function TooltipStep({ step, position, isTransitioning }: TooltipStepProps) {
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (step.targetElement) {
      positionTooltip();
      window.addEventListener('resize', positionTooltip);
      return () => window.removeEventListener('resize', positionTooltip);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.targetElement, position]);

  const positionTooltip = () => {
    if (!step.targetElement) return;

    const element = document.querySelector(step.targetElement);
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const tooltipWidth = 400;
    const tooltipHeight = 150;
    const padding = 20;

    let top = 0;
    let left = 0;
    let arrowPos: React.CSSProperties = {};

    switch (position) {
      case 'top':
        top = rect.top - tooltipHeight - padding;
        left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        arrowPos = {
          bottom: '-8px',
          left: '50%',
          transform: 'translateX(-50%)',
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: '8px solid white'
        };
        break;
      case 'bottom':
        top = rect.bottom + padding;
        left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        arrowPos = {
          top: '-8px',
          left: '50%',
          transform: 'translateX(-50%)',
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderBottom: '8px solid white'
        };
        break;
      case 'left':
        top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
        left = rect.left - tooltipWidth - padding;
        arrowPos = {
          right: '-8px',
          top: '50%',
          transform: 'translateY(-50%)',
          borderTop: '8px solid transparent',
          borderBottom: '8px solid transparent',
          borderLeft: '8px solid white'
        };
        break;
      case 'right':
        top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
        left = rect.right + padding;
        arrowPos = {
          left: '-8px',
          top: '50%',
          transform: 'translateY(-50%)',
          borderTop: '8px solid transparent',
          borderBottom: '8px solid transparent',
          borderRight: '8px solid white'
        };
        break;
    }

    // Ensure tooltip stays within viewport
    if (left < 10) left = 10;
    if (left + tooltipWidth > window.innerWidth - 10) {
      left = window.innerWidth - tooltipWidth - 10;
    }
    if (top < 10) top = 10;
    if (top + tooltipHeight > window.innerHeight - 10) {
      top = window.innerHeight - tooltipHeight - 10;
    }

    setTooltipStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${tooltipWidth}px`,
      zIndex: 50
    });

    setArrowStyle(arrowPos);
  };

  if (!step.targetElement) {
    // Center tooltip for steps without target element
    return (
      <div
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
        style={{ width: '500px' }}
      >
        <Card className="border-2 border-blue-500 shadow-2xl">
          <CardContent className="p-6">
            <div className="flex items-start space-x-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{step.description}</p>
              </div>
            </div>
            {isTransitioning && (
              <div className="mt-4 flex items-center justify-center text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" />
                Processing...
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div style={tooltipStyle}>
      <Card className="border-2 border-blue-500 shadow-2xl relative">
        {/* Arrow */}
        <div
          className="absolute w-0 h-0"
          style={arrowStyle}
        />
        <CardContent className="p-5">
          <div className="flex items-start space-x-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-base text-gray-900 mb-1">{step.title}</h3>
              <p className="text-gray-700 text-sm leading-relaxed">{step.description}</p>
            </div>
          </div>
          {isTransitioning && (
            <div className="mt-3 flex items-center justify-center text-xs text-gray-600">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2" />
              Processing...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
