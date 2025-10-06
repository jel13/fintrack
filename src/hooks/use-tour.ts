
"use client";

import { useState, useEffect, useCallback } from 'react';

export interface TourStep {
  target: string; // CSS selector for the element to highlight
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface UseTourOptions {
  tourId: string;
  steps: TourStep[];
  seenTours: string[];
  onTourEnd: (tourId: string) => void;
  condition?: boolean; // Additional condition to start the tour
}

export const useTour = ({ tourId, steps, seenTours, onTourEnd, condition = true }: UseTourOptions) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if the tour should start
    const hasSeen = seenTours.includes(tourId);
    if (!hasSeen && condition) {
      // Use a timeout to ensure the DOM is ready and elements are rendered
      const timer = setTimeout(() => {
        const firstStepElement = document.querySelector(steps[0].target);
        if (firstStepElement) {
          setIsRunning(true);
        }
      }, 500); // Delay can be adjusted
      return () => clearTimeout(timer);
    }
  }, [tourId, seenTours, condition, steps]);

  const endTour = useCallback(() => {
    setIsRunning(false);
    onTourEnd(tourId);
  }, [tourId, onTourEnd]);

  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      endTour();
    }
  }, [currentStep, steps.length, endTour]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  return {
    isRunning,
    currentStep,
    steps,
    nextStep,
    prevStep,
    endTour,
  };
};
