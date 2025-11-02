
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

    // If the tour has not been seen and the condition is met, start the tour.
    if (!hasSeen && condition) {
      const timer = setTimeout(() => {
        const driverObj = driver({
          showProgress: true,
          steps: steps,
          onDeselected: () => {
            // This callback is fired when the user clicks the overlay to close the tour.
            onTourEnd(tourId);
            driverObj.destroy();
          },
          onDestroyed: () => {
            // This is fired when the tour is fully completed or destroyed.
            onTourEnd(tourId);
          }
        });
        driverObj.drive();
      }, 500); // A small delay to ensure the UI is ready for the tour.

      return () => clearTimeout(timer);
    }
  }, [tourId, seenTours, condition, steps, onTourEnd]);
};
