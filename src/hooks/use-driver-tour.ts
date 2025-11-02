
"use client";

import { useEffect } from 'react';
import { driver, DriveStep } from 'driver.js';

interface UseDriverTourOptions {
  tourId: string;
  steps: DriveStep[];
  onTourEnd?: (tourId: string) => void;
  condition?: boolean;
  force?: boolean; // New property to force the tour
  seenTours?: string[]; // Make optional as it's not needed when forcing
}

export const useDriverTour = ({
  tourId,
  steps,
  onTourEnd,
  condition = true,
  force = false,
  seenTours = [],
}: UseDriverTourOptions) => {
  useEffect(() => {
    // If `force` is false, check if the tour has been seen.
    // If `force` is true, this check is skipped.
    const hasSeen = force ? false : seenTours.includes(tourId);

    // If the tour has not been seen (or is forced) and the general condition is met, start the tour.
    if (!hasSeen && condition) {
      const timer = setTimeout(() => {
        const driverObj = driver({
          showProgress: true,
          steps: steps,
          onDeselected: () => {
            // This callback is fired when the user clicks the overlay to close the tour.
            if (onTourEnd) {
                onTourEnd(tourId);
            }
            driverObj.destroy();
          },
          onDestroyed: () => {
            // This is fired when the tour is fully completed or destroyed.
            if (onTourEnd) {
                onTourEnd(tourId);
            }
          }
        });
        driverObj.drive();
      }, 500); // A small delay to ensure the UI is ready for the tour.

      return () => clearTimeout(timer);
    }
  }, [tourId, seenTours, condition, steps, onTourEnd, force]);
};
