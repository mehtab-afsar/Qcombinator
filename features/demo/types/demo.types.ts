/**
 * Demo Mode Type Definitions
 */

export interface DemoStep {
  id: string;
  title: string;
  description: string;
  targetElement?: string;
  action?: 'navigate' | 'highlight' | 'click' | 'message';
  actionParams?: Record<string, unknown>;
  nextRoute?: string;
}

export interface DemoJourney {
  id: string;
  name: string;
  description: string;
  steps: DemoStep[];
  currentStep: number;
}
