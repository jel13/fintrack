
"use client";

import { useEffect } from 'react';
import { driver, DriveStep } from 'driver.js';

interface UseDriverTourOptions {
  tourId: string;
  steps: DriveStep[];
  seenTours: string[];
  onTourEnd: (tourId: string) => void;
  condition?: boolean;
}

export const useDriverTour = ({
  tourId,
  steps,
  seenTours,
  onTourEnd,
  condition = true,
}: UseDriverTourOptions) => {
  useEffect(() => {
    const hasSeen = seenTours.includes(tourId);

    if (!hasSeen && condition) {
      const timer = setTimeout(() => {
        const firstStepElement = document.querySelector(steps[0].element as string);
        if (firstStepElement) {
          const driverObj = driver({
            showProgress: true,
            steps: steps,
            onDestroyStarted: () => {
              if (!driverObj.isActivated()) {
                onTourEnd(tourId);
                driverObj.destroy();
              }
            },
          });
          driverObj.drive();
        }
      }, 500); // Delay to ensure DOM is ready

      return () => clearTimeout(timer);
    }
  }, [tourId, seenTours, condition, steps, onTourEnd]);
};
