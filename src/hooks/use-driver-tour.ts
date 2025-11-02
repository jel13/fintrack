
"use client";

import { useEffect } from 'react';
import { driver, DriveStep } from 'driver.js';

interface UseDriverTourOptions {
  tourId: string;
  steps: DriveStep[];
  onTourEnd?: () => void;
  condition?: boolean;
}

export const useDriverTour = ({
  tourId,
  steps,
  onTourEnd,
  condition = true,
}: UseDriverTourOptions) => {
  useEffect(() => {
    if (condition) {
      const timer = setTimeout(() => {
        const driverObj = driver({
          showProgress: true,
          steps: steps,
          onDeselected: () => {
            // This callback is fired when the user clicks the overlay to close the tour.
            if (onTourEnd) {
                onTourEnd();
            }
            driverObj.destroy();
          },
          onDestroyed: () => {
            // This is fired when the tour is fully completed or destroyed.
            if (onTourEnd) {
                onTourEnd();
            }
          }
        });
        driverObj.drive();
      }, 500); // A small delay to ensure the UI is ready for the tour.

      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId, condition, steps]);
};
